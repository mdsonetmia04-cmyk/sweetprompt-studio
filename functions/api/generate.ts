/**
 * POST /api/generate — Cloudflare Pages Function.
 *
 * Faithful port of the Vercel serverless handler in `api/generate.ts`
 * (which mirrors the Express dev server in `server.ts`). Same routes,
 * validation, provider logic, model fallbacks, and error cleaning.
 * Environment variables are read from `context.env` (Pages dashboard).
 */
import { GoogleGenAI } from '@google/genai';
import {
  PagesContext,
  GEMINI_TEXT_FALLBACKS,
  cleanProviderError,
  isRetryableModelError,
  isInvalidKeyError,
  getEnv,
  jsonResponse,
  readJsonBody,
  checkRateLimit,
  clientIp,
} from '../_shared';

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method Not Allowed' }, 405);
  }

  // General API throttle: 60 requests/minute per IP (mirrors server.ts)
  const retryAfter = checkRateLimit(`/api/generate:${clientIp(request)}`, 60_000, 60);
  if (retryAfter > 0) {
    return jsonResponse(
      { error: 'Too many requests. Please wait a moment and try again.' },
      429,
      { 'Retry-After': String(retryAfter) },
    );
  }

  const parsed = await readJsonBody(request);
  if ('errorResponse' in parsed) return parsed.errorResponse;

  try {
    const {
      prompt,
      provider = 'gemini',
      apiKey,
      model,
      systemInstruction,
      jsonMode,
      temperature = 0.7,
      maxTokens = 1500,
    } = parsed.data || {};

    if (!prompt) {
      return jsonResponse({ error: 'Prompt is required' }, 400);
    }

    const cleanSystem = systemInstruction || 'You are SweetPrompt Studio, an expert AI microstock creation assistant for Adobe Stock contributors.';

    // Gemini Provider
    if (provider === 'gemini') {
      const clientKey = typeof apiKey === 'string' ? apiKey.trim() : '';
      const systemEnvKey = (getEnv(env, 'GEMINI_API_KEY') || getEnv(env, 'API_KEY') || '').trim();
      if (!systemEnvKey && getEnv(env, 'VITE_GEMINI_API_KEY')) {
        console.warn('[security] VITE_GEMINI_API_KEY is set, but VITE_ variables are baked into the public JS bundle. Rename it to GEMINI_API_KEY (see .env.example).');
      }

      const keysToTry: string[] = [];
      if (clientKey) keysToTry.push(clientKey);
      if (systemEnvKey && systemEnvKey !== clientKey) keysToTry.push(systemEnvKey);

      if (keysToTry.length === 0) {
        return jsonResponse({ error: 'Gemini API key not configured. Please add your key in Settings or switch AI providers.' }, 400);
      }

      const primaryModel = model || 'gemini-3.8-flash';
      const candidateModels = [
        primaryModel,
        ...GEMINI_TEXT_FALLBACKS.filter((m) => m !== primaryModel)
      ];

      let lastError: any = null;

      for (const currentKey of keysToTry) {
        const client = new GoogleGenAI({ apiKey: currentKey });
        for (const candidate of candidateModels) {
          try {
            const response = await client.models.generateContent({
              model: candidate,
              contents: prompt,
              config: {
                systemInstruction: cleanSystem,
                responseMimeType: jsonMode ? 'application/json' : 'text/plain',
                temperature,
              },
            });

            if (response.text) {
              return jsonResponse({ result: response.text, modelUsed: candidate }, 200);
            }
          } catch (modelErr: any) {
            lastError = modelErr;
            if (isInvalidKeyError(modelErr)) {
              break; // try next API key
            }
            if (isRetryableModelError(modelErr)) {
              continue; // try next fallback model (rate limit / retired model)
            }
            throw modelErr;
          }
        }
      }

      if (lastError) {
        return jsonResponse({ error: cleanProviderError('Google Gemini', lastError.message || String(lastError), 400) }, 400);
      }
      return jsonResponse({ error: 'Failed to generate content with Gemini.' }, 500);
    }

    // Groq Provider
    if (provider === 'groq') {
      const groqKey = apiKey || getEnv(env, 'GROQ_API_KEY');
      if (!groqKey) return jsonResponse({ error: 'Groq API key not configured. Please add your key in Settings.' }, 400);

      const initialModel = model || 'llama-3.1-8b-instant';
      const candidateModels = Array.from(new Set([initialModel, 'llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'llama-4-scout-17b-16e-instruct', 'openai/gpt-oss-20b']));

      let lastGroqErr: any = null;
      for (const candidate of candidateModels) {
        try {
          const fetchRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model: candidate,
              messages: [
                { role: 'system', content: cleanSystem },
                { role: 'user', content: prompt }
              ],
              response_format: jsonMode ? { type: 'json_object' } : undefined,
              temperature,
              max_tokens: maxTokens,
            }),
          });

          if (!fetchRes.ok) {
            const errText = await fetchRes.text();
            if (fetchRes.status === 404 || fetchRes.status === 429 || fetchRes.status === 403 || errText.includes('does not exist') || errText.includes('model_not_found') || errText.includes('access')) {
              lastGroqErr = cleanProviderError('Groq', errText, fetchRes.status);
              continue;
            }
            return jsonResponse({ error: cleanProviderError('Groq', errText, fetchRes.status) }, fetchRes.status);
          }

          const data = await fetchRes.json();
          return jsonResponse({ result: data.choices?.[0]?.message?.content || '', modelUsed: candidate }, 200);
        } catch (gErr: any) {
          lastGroqErr = gErr.message || String(gErr);
          continue;
        }
      }

      return jsonResponse({ error: cleanProviderError('Groq', lastGroqErr || 'Rate limit or model access error', 429) }, 400);
    }

    // OpenRouter Provider
    if (provider === 'openrouter') {
      const orKey = apiKey || getEnv(env, 'OPENROUTER_API_KEY');
      if (!orKey) return jsonResponse({ error: 'OpenRouter API key not configured.' }, 400);

      const initialModel = model || 'google/gemini-2.0-flash-lite-001';
      const candidateModels = Array.from(new Set([
        initialModel,
        'google/gemini-2.0-flash-lite-001',
        'meta-llama/llama-3.3-70b-instruct',
        'meta-llama/llama-3.1-8b-instruct:free',
        'mistralai/mistral-7b-instruct:free',
        'deepseek/deepseek-r1:free'
      ]));

      let lastOrErr = '';
      for (const candidate of candidateModels) {
        try {
          const fetchRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${orKey}`,
              'HTTP-Referer': getEnv(env, 'APP_URL') || 'http://localhost:3000',
              'X-Title': 'SweetPrompt Studio',
            },
            body: JSON.stringify({
              model: candidate,
              messages: [
                { role: 'system', content: cleanSystem },
                { role: 'user', content: prompt }
              ],
              response_format: jsonMode ? { type: 'json_object' } : undefined,
              temperature,
              max_tokens: maxTokens,
            }),
          });

          if (!fetchRes.ok) {
            lastOrErr = await fetchRes.text();
            if (fetchRes.status === 404 || fetchRes.status === 429 || fetchRes.status === 403) {
              continue;
            }
            return jsonResponse({ error: cleanProviderError('OpenRouter', lastOrErr, fetchRes.status) }, fetchRes.status);
          }
          const data = await fetchRes.json();
          return jsonResponse({ result: data.choices?.[0]?.message?.content || '', modelUsed: candidate }, 200);
        } catch (oErr: any) {
          lastOrErr = oErr.message || String(oErr);
          continue;
        }
      }

      return jsonResponse({ error: cleanProviderError('OpenRouter', lastOrErr || 'Rate limited or model unavailable', 429) }, 400);
    }

    // Mistral Provider
    if (provider === 'mistral') {
      const mistralKey = apiKey || getEnv(env, 'MISTRAL_API_KEY');
      if (!mistralKey) return jsonResponse({ error: 'Mistral API key not configured.' }, 400);

      const initialModel = (model && model !== 'mistral-large-latest') ? model : 'mistral-small-latest';
      const candidateModels = Array.from(new Set([initialModel, 'mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest']));

      let lastMistralErr = '';
      for (const candidate of candidateModels) {
        try {
          const fetchRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${mistralKey}`,
            },
            body: JSON.stringify({
              model: candidate,
              messages: [
                { role: 'system', content: cleanSystem },
                { role: 'user', content: prompt }
              ],
              response_format: jsonMode ? { type: 'json_object' } : undefined,
              temperature,
              max_tokens: maxTokens,
            }),
          });

          if (!fetchRes.ok) {
            lastMistralErr = await fetchRes.text();
            if (fetchRes.status === 403 || fetchRes.status === 429 || lastMistralErr.includes('subscription tier') || lastMistralErr.includes('rate limit')) {
              continue; // Try next candidate
            }
            return jsonResponse({ error: cleanProviderError('Mistral', lastMistralErr, fetchRes.status) }, fetchRes.status);
          }

          const data = await fetchRes.json();
          return jsonResponse({ result: data.choices?.[0]?.message?.content || '', modelUsed: candidate }, 200);
        } catch (mErr: any) {
          lastMistralErr = mErr.message || String(mErr);
          continue;
        }
      }

      return jsonResponse({ error: cleanProviderError('Mistral', lastMistralErr || 'Rate limit or free tier quota reached', 429) }, 400);
    }

    // Cerebras Provider
    if (provider === 'cerebras') {
      const cKey = apiKey || getEnv(env, 'CEREBRAS_API_KEY');
      if (!cKey) return jsonResponse({ error: 'Cerebras API key not configured.' }, 400);

      const initialModel = model || 'llama3.1-8b';
      const candidateModels = Array.from(new Set([initialModel, 'llama3.1-8b', 'llama-3.3-70b']));

      let lastCErr = '';
      for (const candidate of candidateModels) {
        try {
          const fetchRes = await fetch('https://api.cerebras.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${cKey}`,
            },
            body: JSON.stringify({
              model: candidate,
              messages: [
                { role: 'system', content: cleanSystem },
                { role: 'user', content: prompt }
              ],
              temperature,
              max_tokens: maxTokens,
            }),
          });

          if (!fetchRes.ok) {
            lastCErr = await fetchRes.text();
            continue;
          }

          const data = await fetchRes.json();
          return jsonResponse({ result: data.choices?.[0]?.message?.content || '', modelUsed: candidate }, 200);
        } catch (cErr: any) {
          lastCErr = cErr.message || String(cErr);
          continue;
        }
      }

      return jsonResponse({ error: cleanProviderError('Cerebras', lastCErr, 400) }, 400);
    }

    // Hugging Face Provider
    if (provider === 'huggingface') {
      const hfKey = apiKey || getEnv(env, 'HUGGINGFACE_API_KEY');
      if (!hfKey) return jsonResponse({ error: 'Hugging Face API key not configured.' }, 400);

      const initialModel = model || 'meta-llama/Llama-3.2-3B-Instruct';
      const candidateModels = Array.from(new Set([initialModel, 'meta-llama/Llama-3.2-3B-Instruct', 'meta-llama/Llama-3.2-1B-Instruct', 'mistralai/Mistral-7B-Instruct-v0.3']));

      let lastHfErr = '';
      for (const candidate of candidateModels) {
        try {
          const fetchRes = await fetch('https://api-inference.huggingface.co/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${hfKey}`,
            },
            body: JSON.stringify({
              model: candidate,
              messages: [
                { role: 'system', content: cleanSystem },
                { role: 'user', content: prompt }
              ],
              temperature,
              max_tokens: maxTokens,
            }),
          });

          if (!fetchRes.ok) {
            lastHfErr = await fetchRes.text();
            continue;
          }

          const data = await fetchRes.json();
          return jsonResponse({ result: data.choices?.[0]?.message?.content || '', modelUsed: candidate }, 200);
        } catch (hErr: any) {
          lastHfErr = hErr.message || String(hErr);
          continue;
        }
      }

      return jsonResponse({ error: cleanProviderError('Hugging Face', lastHfErr, 400) }, 400);
    }

    return jsonResponse({ error: `Unsupported AI provider: ${provider}` }, 400);
  } catch (err: any) {
    return jsonResponse({ error: cleanProviderError('AI Service', err.message || String(err), 500) }, 500);
  }
}
