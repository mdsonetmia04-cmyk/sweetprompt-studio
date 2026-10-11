/**
 * Tests for Cloudflare Pages Functions shared helpers (functions/_shared.ts).
 * Pure-logic tests with mocked inputs — no real API keys, no network.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getEnv,
  jsonResponse,
  readJsonBody,
  checkRateLimit,
  clientIp,
  GEMINI_TEXT_FALLBACKS,
  GEMINI_VISION_FALLBACKS,
  cleanProviderError,
} from './_shared';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getEnv', () => {
  it('prefers the Pages env over process.env', () => {
    vi.stubEnv('GEMINI_API_KEY', 'from-process');
    expect(getEnv({ GEMINI_API_KEY: 'from-pages' }, 'GEMINI_API_KEY')).toBe('from-pages');
  });

  it('falls back to process.env when Pages env is missing', () => {
    vi.stubEnv('GROQ_API_KEY', 'gsk_test123');
    expect(getEnv({}, 'GROQ_API_KEY')).toBe('gsk_test123');
  });

  it('returns empty string when unset everywhere', () => {
    expect(getEnv({}, 'DEFINITELY_NOT_SET_XYZ')).toBe('');
  });
});

describe('jsonResponse', () => {
  it('returns a JSON response with the given status', async () => {
    const res = jsonResponse({ error: 'nope' }, 400);
    expect(res.status).toBe(400);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(await res.json()).toEqual({ error: 'nope' });
  });

  it('passes through extra headers (e.g. Retry-After)', async () => {
    const res = jsonResponse({ error: 'slow down' }, 429, { 'Retry-After': '42' });
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('42');
  });
});

describe('readJsonBody', () => {
  it('parses a JSON body', async () => {
    const req = new Request('https://x.test/api/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'hello' }),
    });
    const out = await readJsonBody(req);
    expect('data' in out && (out as any).data).toEqual({ prompt: 'hello' });
  });

  it('returns {} for an empty body', async () => {
    const req = new Request('https://x.test/api/generate', { method: 'POST' });
    const out = await readJsonBody(req);
    expect('data' in out && (out as any).data).toEqual({});
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('https://x.test/api/generate', { method: 'POST', body: 'not-json{{' });
    const out = await readJsonBody(req);
    expect('errorResponse' in out).toBe(true);
    if ('errorResponse' in out) expect(out.errorResponse.status).toBe(400);
  });
});

describe('checkRateLimit', () => {
  it('allows up to max requests then limits', () => {
    const key = `test-${Date.now()}-a`;
    expect(checkRateLimit(key, 60_000, 3)).toBe(0);
    expect(checkRateLimit(key, 60_000, 3)).toBe(0);
    expect(checkRateLimit(key, 60_000, 3)).toBe(0);
    const limited = checkRateLimit(key, 60_000, 3);
    expect(limited).toBeGreaterThan(0);
    expect(limited).toBeLessThanOrEqual(60);
  });

  it('uses separate buckets per key', () => {
    const a = `test-${Date.now()}-b1`;
    const b = `test-${Date.now()}-b2`;
    checkRateLimit(a, 60_000, 1);
    expect(checkRateLimit(a, 60_000, 1)).toBeGreaterThan(0);
    expect(checkRateLimit(b, 60_000, 1)).toBe(0);
  });

  it('resets after the window expires', async () => {
    const key = `test-${Date.now()}-c`;
    expect(checkRateLimit(key, 30, 1)).toBe(0);
    expect(checkRateLimit(key, 30, 1)).toBeGreaterThan(0);
    await new Promise((r) => setTimeout(r, 40));
    expect(checkRateLimit(key, 30, 1)).toBe(0);
  });
});

describe('clientIp', () => {
  it('reads CF-Connecting-IP', () => {
    const req = new Request('https://x.test/', { headers: { 'CF-Connecting-IP': '1.2.3.4' } });
    expect(clientIp(req)).toBe('1.2.3.4');
  });

  it('falls back to unknown', () => {
    expect(clientIp(new Request('https://x.test/'))).toBe('unknown');
  });
});

describe('ported constants and error cleaner', () => {
  it('keeps the same Gemini fallback chains as api/_shared', () => {
    expect(GEMINI_TEXT_FALLBACKS[0]).toBe('gemini-3.8-flash');
    expect(GEMINI_VISION_FALLBACKS).toContain('gemini-2.0-flash');
    expect(GEMINI_TEXT_FALLBACKS.length).toBeGreaterThanOrEqual(3);
  });

  it('cleans quota and invalid-key errors like the Vercel version', () => {
    expect(cleanProviderError('Groq', '429 rate limit', 429)).toContain('quota or rate limit');
    expect(cleanProviderError('Gemini', 'API key not valid', 401)).toContain('Invalid API Key');
  });

  it('scrubs secrets from the generic fallback message', () => {
    const msg = cleanProviderError('X', 'oops sk-or-v1-abcdefgh12345678 happened', 500);
    expect(msg).not.toContain('sk-or-v1-abcdefgh12345678');
    expect(msg).toContain('[REDACTED]');
  });
});
