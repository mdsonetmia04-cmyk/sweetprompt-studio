/**
 * POST /api/test-connection — Cloudflare Pages Function.
 *
 * Faithful port of the Vercel serverless handler in `api/test-connection.ts`.
 * Sends a tiny "ping" request to the selected provider to verify the API key
 * works, and reports latency. Environment variables are read from
 * `context.env` (Pages dashboard).
 */
import { GoogleGenAI } from '@google/genai';
import {
  PagesContext,
  getEnv,
  jsonResponse,
  readJsonBody,
  checkRateLimit,
  clientIp,
  GEMINI_TEXT_FALLBACKS,
  isRetryableModelError,
  isInvalidKeyError,
} from '../_shared';

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method Not Allowed' }, 405);
  }

  // General API throttle: 60 requests/minute per IP (mirrors server.ts)
  const retryAfter = checkRateLimit(`/api/test-connection:${clientIp(request)}`, 60_000, 60);
  if (retryAfter > 0) {
    return jsonResponse(
      { success: false, error: 'Too many requests. Please wait a moment and try again.' },
      429,
      { 'Retry-After': String(retryAfter) },
    );
  }

  const parsed = await readJsonBody(request);
  if ('errorResponse' in parsed) return parsed.errorResponse;

  const startTime = Date.now();
  try {
    const { provider = 'gemini', apiKey, model } = parsed.data || {};

    if (provider === 'gemini') {
      const activeApiKey = apiKey || getEnv(env, 'GEMINI_API_KEY') || getEnv(env, 'API_KEY');
      if (!activeApiKey) {
        return jsonResponse({ success: false, error: 'No Gemini API key provided' }, 400);
      }

      const client = new GoogleGenAI({ apiKey: activeApiKey });
      const primaryModel = model || 'gemini-3.8-flash';
      const candidateModels = [
        primaryModel,
        ...GEMINI_TEXT_FALLBACKS.filter((m) => m !== primaryModel),
      ];

      let lastError: any = null;
      let modelUsed = primaryModel;
      for (const candidate of candidateModels) {
        try {
          await client.models.generateContent({
            model: candidate,
            contents: 'Ping test. Reply: OK',
            config: { maxOutputTokens: 5 },
          });
          modelUsed = candidate;
          lastError = null;
          break;
        } catch (mErr: any) {
          lastError = mErr;
          if (isInvalidKeyError(mErr)) break;
          if (isRetryableModelError(mErr)) continue;
          throw mErr;
        }
      }
      if (lastError) throw lastError;

      const latencyMs = Date.now() - startTime;
      return jsonResponse({
        success: true,
        provider: 'gemini',
        modelUsed,
        message: `Connected to Google Gemini API successfully (${modelUsed})`,
        hasText: true,
        hasVision: true,
        latencyMs,
      }, 200);
    }

    if (provider === 'groq') {
      const groqKey = apiKey || getEnv(env, 'GROQ_API_KEY');
      if (!groqKey) return jsonResponse({ success: false, error: 'No Groq API key provided' }, 400);

      const fetchRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: model || 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: 'Ping test. Reply: OK' }],
          max_tokens: 5,
        }),
      });

      const latencyMs = Date.now() - startTime;
      if (!fetchRes.ok) {
        const err = await fetchRes.text();
        return jsonResponse({ success: false, error: err }, fetchRes.status);
      }

      return jsonResponse({
        success: true,
        provider: 'groq',
        message: 'Connected to Groq LPU successfully',
        hasText: true,
        hasVision: true,
        latencyMs,
      }, 200);
    }

    if (provider === 'huggingface') {
      const hfKey = apiKey || getEnv(env, 'HUGGINGFACE_API_KEY') || getEnv(env, 'HF_TOKEN');
      if (!hfKey) return jsonResponse({ success: false, error: 'No Hugging Face token provided' }, 400);

      const candidateEndpoints = [
        'https://router.huggingface.co/hf-inference/v1/chat/completions',
        'https://router.huggingface.co/v1/chat/completions',
        'https://api-inference.huggingface.co/v1/chat/completions',
      ];

      let lastHfErr = '';
      for (const ep of candidateEndpoints) {
        try {
          const fetchRes = await fetch(ep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hfKey}` },
            body: JSON.stringify({
              model: model || 'meta-llama/Llama-3.2-3B-Instruct',
              messages: [{ role: 'user', content: 'Ping test. Reply: OK' }],
              max_tokens: 5
            })
          });
          const latencyMs = Date.now() - startTime;
          if (fetchRes.ok) {
            return jsonResponse({
              success: true,
              provider: 'huggingface',
              message: 'Connected to Hugging Face Router API successfully',
              hasText: true,
              hasVision: false,
              latencyMs
            }, 200);
          }
          lastHfErr = await fetchRes.text();
        } catch (hErr: any) {
          lastHfErr = hErr.message || String(hErr);
        }
      }

      return jsonResponse({ success: false, error: `Hugging Face error: ${lastHfErr}` }, 400);
    }

    return jsonResponse({
      success: true,
      provider,
      message: `Connected to ${provider} successfully`,
      hasText: true,
      hasVision: true,
      latencyMs: Date.now() - startTime,
    }, 200);
  } catch (err: any) {
    return jsonResponse({ success: false, error: err.message || 'Connection test failed' }, 400);
  }
}
