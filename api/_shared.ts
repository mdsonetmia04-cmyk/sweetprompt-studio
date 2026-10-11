/**
 * Shared server-side helpers for SweetPrompt Studio API routes.
 *
 * Single source of truth for Gemini fallback model lists and provider
 * error-message cleaning. Used by both the Express dev server (server.ts)
 * and the Vercel serverless functions (api/*.ts) so the two implementations
 * can no longer drift apart.
 *
 * NOTE: filenames starting with "_" are ignored by Vercel's routing,
 * so this file never becomes an API endpoint.
 */

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
