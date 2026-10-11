/**
 * Shared helpers for SweetPrompt Studio Cloudflare Pages Functions.
 *
 * Cloudflare Pages port of `api/_shared.ts` (used by the Vercel serverless
 * functions and the Express dev server). Single source of truth for Gemini
 * fallback model lists, provider error-message cleaning, request parsing,
 * and rate limiting — adapted for the Pages Functions runtime:
 *
 * - Environment variables come from `context.env`, NOT `process.env`.
 *   `getEnv()` prefers `context.env` and falls back to `process.env`
 *   where available (harmless in Workers, useful in local dev).
 * - No Express: plain `Response` helpers instead of `res.status().json()`.
 * - Rate limiting is in-memory per isolate (see `checkRateLimit`).
 *
 * NOTE: filenames starting with "_" are ignored by Pages Functions routing,
 * so this file never becomes an API endpoint.
 */

/** Minimal Pages Functions context shape (avoids a @cloudflare/workers-types dependency). */
export interface PagesContext {
  request: Request;
  env: Record<string, string | undefined>;
}

/** Fallback chain for Gemini text generation (most capable first). */
export const GEMINI_TEXT_FALLBACKS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

/** Fallback chain for Gemini vision analysis (most capable first). */
export const GEMINI_VISION_FALLBACKS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

/**
 * Read an environment variable, preferring the Pages Function `env`
 * (dashboard-configured) over `process.env`.
 */
export function getEnv(env: Record<string, string | undefined>, name: string): string {
  const fromPagesEnv = env?.[name];
  if (typeof fromPagesEnv === 'string' && fromPagesEnv.length > 0) return fromPagesEnv;
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name] || '';
  }
  return '';
}

/** Build a JSON Response with the given HTTP status. */
export function jsonResponse(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return Response.json(data, {
    status,
    headers: { 'Content-Type': 'application/json', ...(extraHeaders || {}) },
  });
}

/**
 * Parse a JSON request body with a size cap (mirrors
 * `express.json({ limit: '25mb' })` + the 413 handler in server.ts).
 * 25 MB is plenty for base64 images; larger payloads are rejected.
 */
const MAX_BODY_BYTES = 25 * 1024 * 1024;

export async function readJsonBody(
  request: Request,
): Promise<{ data: any } | { errorResponse: Response }> {
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { errorResponse: jsonResponse({ error: 'Could not read request body' }, 400) };
  }
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return {
      errorResponse: jsonResponse(
        { error: 'Payload too large. Please use slightly smaller images or upload fewer images at once.' },
        413,
      ),
    };
  }
  if (!raw) return { data: {} };
  try {
    return { data: JSON.parse(raw) };
  } catch {
    return { errorResponse: jsonResponse({ error: 'Invalid JSON request body' }, 400) };
  }
}

// --- Simple in-memory rate limiter (per isolate) ---
// Protects /api/* from abuse/DoS. Like the Express dev server's limiter,
// buckets are NOT shared across isolates/instances — on Cloudflare's edge
// each isolate enforces its own quota, so this is approximate under load.
// For a personal deployment this is enough.
interface RateBucket {
  count: number;
  resetAt: number;
}
const rateBuckets = new Map<string, RateBucket>();

/**
 * Check the rate limit for `key` (e.g. `/api/generate:<ip>`).
 * Returns 0 when allowed, or the Retry-After seconds when limited.
 */
export function checkRateLimit(key: string, windowMs: number, max: number): number {
  const now = Date.now();
  let bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    rateBuckets.set(key, bucket);
  }
  bucket.count += 1;
  // Prevent unbounded memory growth if many distinct keys appear
  if (rateBuckets.size > 10000) rateBuckets.clear();
  if (bucket.count > max) {
    return Math.ceil((bucket.resetAt - now) / 1000);
  }
  return 0;
}

/** Best-effort client IP (Cloudflare header), for rate-limit bucketing. */
export function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

/**
 * Scrub secrets and internal implementation details out of a provider error
 * message before it is returned to the client. Provider errors occasionally
 * echo the API key back verbatim, and SDK errors can embed stack-trace
 * frames with internal file paths. Neither may reach the browser.
 */
function scrubSecrets(text: string): string {
  return (
    text
      // Known provider key formats (OpenAI/OpenRouter/Groq/Cerebras/HF/xAI/Gemini)
      .replace(/\bsk-(?:or-v1-|proj-)?[A-Za-z0-9_\-]{8,}/g, 'sk-[REDACTED]')
      .replace(/\bgsk[-_][A-Za-z0-9]{8,}/g, 'gsk_[REDACTED]')
      .replace(/\bcsk[-_][A-Za-z0-9_\-]{8,}/g, 'csk-[REDACTED]')
      .replace(/\bhf_[A-Za-z0-9]{8,}/g, 'hf_[REDACTED]')
      .replace(/\bAIza[0-9A-Za-z_\-]{20,}/g, '[REDACTED]')
      .replace(/\bxai-[A-Za-z0-9]{8,}/g, 'xai-[REDACTED]')
      // Authorization header values
      .replace(/\bBearer\s+[A-Za-z0-9_\-\.~+/=]{8,}/gi, 'Bearer [REDACTED]')
      // Generic assignments like api_key=..., "secret": "...", token: xxx
      .replace(
        /((?:api[_-]?key|apikey|secret|token|password)\s*[:=]\s*)(['"]?)[A-Za-z0-9_\-.~+/=]{8,}\2/gi,
        '$1[REDACTED]',
      )
      // Stack-trace frames: "at handler (/app/server.ts:42:10)"
      .replace(/\s+at\s+[^\s(]+\s*\([^()\s]*:\d+:\d+\)/g, '')
      // Any remaining parenthesized internal path with line numbers
      .replace(/\([^\s()]*\/[^\s()]*:\d+(?::\d+)?\)/g, '([internal path])')
  );
}

/**
 * Turn a raw provider error (Error object, string, or anything else) into a
 * short, human-readable message. `status` is the HTTP status when known
 * (e.g. from a fetch response); it is optional.
 */
export function cleanProviderError(provider: string, raw: unknown, status?: number): string {
  let text = '';
  if (!raw) {
    text = '';
  } else if (typeof raw === 'string') {
    text = raw;
  } else if (raw instanceof Error) {
    text = raw.message || String(raw);
  } else {
    try {
      text = (raw as { message?: unknown }).message as string || JSON.stringify(raw);
    } catch {
      text = String(raw);
    }
  }

  if (!text) return `${provider} request failed`;

  // Try to pull a message out of embedded JSON first.
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.error?.code === 429 || parsed.error?.status === 'RESOURCE_EXHAUSTED') {
        return `${provider}: API quota or rate limit reached. Please wait a moment, or switch to Groq / Mistral / OpenRouter in Settings.`;
      }
      if (parsed.error?.reason === 'API_KEY_INVALID' || parsed.error?.message?.includes('API key not valid')) {
        return `${provider}: Invalid API Key. Please enter a valid API key in Settings or switch AI providers.`;
      }
      const msg = parsed.error?.message || parsed.error || parsed.message;
      if (msg) text = typeof msg === 'string' ? msg : JSON.stringify(msg);
    } else {
      const parsed = JSON.parse(text);
      const msg = parsed?.message || parsed?.error?.message || parsed?.error || parsed?.detail;
      if (msg) text = typeof msg === 'string' ? msg : JSON.stringify(msg);
    }
  } catch {
    // Not JSON — keep the raw text.
  }

  const lower = text.toLowerCase();

  if (
    status === 429 ||
    lower.includes('429') ||
    lower.includes('rate limit') ||
    lower.includes('quota') ||
    lower.includes('too many requests') ||
    lower.includes('resource_exhausted')
  ) {
    return `${provider}: API quota or rate limit reached. Please wait a moment, or switch to Groq / Mistral / OpenRouter in Settings.`;
  }

  if (
    status === 401 ||
    lower.includes('api key not valid') ||
    lower.includes('api_key_invalid') ||
    lower.includes('invalid api key') ||
    lower.includes('invalid_api_key') ||
    lower.includes('unauthorized') ||
    lower.includes('invalid_argument')
  ) {
    return `${provider}: Invalid API Key. Please enter a valid API key in Settings or switch AI providers.`;
  }

  if (status === 403 || lower.includes('subscription tier')) {
    return `${provider}: Model not supported on your key tier. Retrying backup model...`;
  }

  const shortMsg = scrubSecrets(text).replace(/[{}\"\\]/g, ' ').replace(/\s+/g, ' ').trim();
  return status
    ? `${provider} (${status}): ${shortMsg.slice(0, 120)}`
    : `${provider}: ${shortMsg.slice(0, 160)}`;
}
