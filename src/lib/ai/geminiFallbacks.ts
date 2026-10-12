/**
 * Shared Gemini fallback-model lists and retryable-error detection for the
 * direct browser execution path (src/lib/ai/proxyClient.ts).
 *
 * Mirrors the server-side helpers in api/_shared.ts and functions/_shared.ts
 * so the browser-direct mode survives model retirements (e.g. Google's
 * 404 NOT_FOUND for gemini-2.5-flash on new API keys) even when the server
 * proxy is unavailable.
 */

/** Fallback chain for Gemini text generation (most capable first). */
export const GEMINI_TEXT_FALLBACKS = [
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

/** Fallback chain for Gemini vision analysis (most capable first). */
export const GEMINI_VISION_FALLBACKS = [
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

/**
 * Returns true when a model-call failure is worth retrying with the next
 * fallback model: rate limits, quota exhaustion, and "model not found /
 * retired" (404 / NOT_FOUND) errors. Invalid-key errors are NOT retryable.
 * Matching is case-insensitive to cover SDK error formats.
 */
export function isRetryableModelError(raw: unknown): boolean {
  const s = String((raw as { message?: unknown })?.message ?? raw ?? '').toLowerCase();
  return (
    s.includes('429') ||
    s.includes('404') ||
    s.includes('not_found') ||
    s.includes('not found') ||
    s.includes('no longer available') ||
    s.includes('quota') ||
    s.includes('rate limit') ||
    s.includes('rate_limit') ||
    s.includes('too many requests') ||
    s.includes('resource_exhausted') ||
    s.includes('resource exhausted')
  );
}

/** Returns true when the failure means the API key itself is invalid. */
export function isInvalidKeyError(raw: unknown): boolean {
  const s = String((raw as { message?: unknown })?.message ?? raw ?? '');
  return (
    s.includes('API key not valid') ||
    s.includes('API_KEY_INVALID') ||
    s.includes('INVALID_ARGUMENT')
  );
}

/**
 * Builds the ordered candidate model list: the requested model first,
 * then the fallback chain (deduplicated).
 */
export function candidateModels(requested: string | undefined, fallbacks: string[]): string[] {
  const primary = requested || fallbacks[0];
  return [primary, ...fallbacks.filter((m) => m !== primary)];
}
