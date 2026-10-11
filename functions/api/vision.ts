/**
 * POST /api/vision — Cloudflare Pages Function.
 *
 * Faithful port of the Vercel serverless handler in `api/vision.ts`.
 * Vision analysis is supported for the Gemini provider only; every other
 * provider gets a clear 400 explaining it is not supported.
 * Environment variables are read from `context.env` (Pages dashboard).
 */
import { GoogleGenAI } from '@google/genai';
import {
  PagesContext,
  GEMINI_VISION_FALLBACKS,
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

  // Vision accepts large base64 images, so it gets a stricter quota:
  // 20 requests/minute per IP (mirrors server.ts)
  const retryAfter = checkRateLimit(`/api/vision:${clientIp(request)}`, 60_000, 20);
  if (retryAfter > 0) {
    return jsonResponse(
      { error: 'Too many image requests. Please wait a moment and try again.' },
      429,
      { 'Retry-After': String(retryAfter) },
    );
  }

  const parsed = await readJsonBody(request);
  if ('errorResponse' in parsed) return parsed.errorResponse;

  try {
    const { imageBase64, mimeType = 'image/jpeg', prompt, provider = 'gemini', apiKey, model } = parsed.data || {};

    if (!imageBase64 || !prompt) {
      return jsonResponse({ error: 'Image data and prompt are required for vision analysis' }, 400);
    }

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

      const primaryModel = model || 'gemini-2.5-flash';
      const candidateModels = [
        primaryModel,
        ...GEMINI_VISION_FALLBACKS.filter((m) => m !== primaryModel)
      ];

      let lastError: any = null;

      for (const currentKey of keysToTry) {
        const client = new GoogleGenAI({ apiKey: currentKey });
        for (const candidate of candidateModels) {
          try {
            const response = await client.models.generateContent({
              model: candidate,
              contents: [
                {
                  inlineData: {
                    data: imageBase64,
                    mimeType,
                  },
                },
                prompt,
              ],
            });

            if (response.text) {
              return jsonResponse({ result: response.text, modelUsed: candidate }, 200);
            }
          } catch (modelErr: any) {
            lastError = modelErr;
            const errStr = String(modelErr?.message || modelErr);
            if (errStr.includes('API key not valid') || errStr.includes('API_KEY_INVALID') || errStr.includes('INVALID_ARGUMENT')) {
              break;
            }
            if (errStr.includes('429') || errStr.includes('Quota exceeded') || errStr.includes('RESOURCE_EXHAUSTED')) {
              continue;
            }
          }
        }
      }

      if (lastError) return jsonResponse({ error: lastError.message || 'Vision analysis failed' }, 400);
      return jsonResponse({ error: 'Failed to analyze image with Gemini.' }, 500);
    }

    return jsonResponse({ error: `Vision analysis not supported for provider: ${provider}` }, 400);
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'Vision analysis failed' }, 500);
  }
}
