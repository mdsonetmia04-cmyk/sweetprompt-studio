import { describe, it, expect } from 'vitest';
import { cleanProviderError, GEMINI_TEXT_FALLBACKS, GEMINI_VISION_FALLBACKS, isRetryableModelError, isInvalidKeyError } from './_shared';

describe('fallback model lists', () => {
  it('lists text fallback models, most capable first', () => {
    expect(GEMINI_TEXT_FALLBACKS.length).toBeGreaterThan(1);
    expect(GEMINI_TEXT_FALLBACKS[0]).toBe('gemini-3.8-flash');
    expect(GEMINI_TEXT_FALLBACKS.every((m) => typeof m === 'string')).toBe(true);
  });

  it('lists vision fallback models, most capable first', () => {
    expect(GEMINI_VISION_FALLBACKS.length).toBeGreaterThan(1);
    expect(GEMINI_VISION_FALLBACKS[0]).toBe('gemini-3.8-flash');
  });
});

describe('cleanProviderError — empty and trivial inputs', () => {
  it('returns a generic failure message for null/undefined/empty input', () => {
    expect(cleanProviderError('Gemini', null)).toBe('Gemini request failed');
    expect(cleanProviderError('Gemini', undefined)).toBe('Gemini request failed');
    expect(cleanProviderError('Gemini', '')).toBe('Gemini request failed');
  });

  it('passes through short Error messages with the provider prefix', () => {
    expect(cleanProviderError('Gemini', new Error('boom'))).toBe('Gemini: boom');
  });

  it('accepts plain string errors', () => {
    expect(cleanProviderError('Groq', 'connection reset')).toBe('Groq: connection reset');
  });

  it('accepts objects with a message property', () => {
    expect(cleanProviderError('OpenAI', { message: 'bad thing' })).toBe('OpenAI: bad thing');
  });
});

describe('cleanProviderError — rate limit handling', () => {
  it('maps embedded JSON 429 errors to a friendly quota message', () => {
    const raw = '{"error": {"code": 429, "message": "quota exceeded"}}';
    const result = cleanProviderError('Groq', raw);
    expect(result).toContain('API quota or rate limit reached');
    expect(result).not.toContain('{');
  });

  it('maps RESOURCE_EXHAUSTED status to the quota message', () => {
    const raw = '{"error": {"status": "RESOURCE_EXHAUSTED", "message": "slow down"}}';
    expect(cleanProviderError('Gemini', raw)).toContain('API quota or rate limit reached');
  });

  it('honors an explicit 429 status code', () => {
    expect(cleanProviderError('Gemini', 'something broke', 429)).toContain('API quota or rate limit reached');
  });

  it('catches textual rate-limit phrasing', () => {
    expect(cleanProviderError('Gemini', 'Rate limit exceeded, try later')).toContain(
      'API quota or rate limit reached',
    );
  });
});

describe('cleanProviderError — invalid key handling', () => {
  it('maps API_KEY_INVALID JSON reasons to the invalid-key message', () => {
    const raw = '{"error": {"reason": "API_KEY_INVALID", "message": "bad key"}}';
    const result = cleanProviderError('OpenAI', raw);
    expect(result).toContain('Invalid API Key');
    expect(result).not.toContain('bad key');
  });

  it('honors an explicit 401 status code', () => {
    expect(cleanProviderError('OpenAI', 'Unauthorized', 401)).toContain('Invalid API Key');
  });

  it('catches textual invalid-key phrasing', () => {
    expect(cleanProviderError('Gemini', 'API key not valid. Pass a valid key.')).toContain('Invalid API Key');
  });
});

describe('cleanProviderError — tier and generic errors', () => {
  it('maps 403 to the tier/model message', () => {
    const result = cleanProviderError('OpenAI', 'forbidden', 403);
    expect(result).toContain('Model not supported on your key tier');
  });

  it('unwraps JSON error messages into clean text', () => {
    const raw = '{"error": {"message": "model overloaded"}}';
    expect(cleanProviderError('Gemini', raw)).toBe('Gemini: model overloaded');
  });

  it('truncates long generic messages without a status', () => {
    const long = 'a'.repeat(500);
    const result = cleanProviderError('Groq', long);
    expect(result.length).toBeLessThanOrEqual('Groq: '.length + 160);
    expect(result.startsWith('Groq: ')).toBe(true);
  });

  it('truncates long generic messages with a status code', () => {
    const long = 'a'.repeat(500);
    const result = cleanProviderError('Groq', long, 500);
    expect(result).toBe(`Groq (500): ${'a'.repeat(120)}`);
  });

  it('collapses JSON punctuation out of generic messages', () => {
    const result = cleanProviderError('Gemini', '{"detail": "bad\\nrequest"}');
    expect(result).not.toContain('{');
    expect(result).not.toContain('"');
  });
});

// Hardened: cleanProviderError now scrubs API-key patterns (sk-..., gsk-...,
// AIza..., hf_..., Bearer ...) and internal stack-trace paths from generic
// (non-401/429) provider errors before they reach the client.
describe('cleanProviderError — key redaction and path scrubbing', () => {
  it('redacts API-key-like strings from generic error text', () => {
    const result = cleanProviderError('Groq', 'timeout contacting api with key gsk-abc123xyz');
    expect(result).not.toContain('gsk-abc123xyz');
  });

  it('removes internal stack-trace paths from error text', () => {
    const result = cleanProviderError('X', 'Error: boom\n    at handler (/app/server.ts:42:10)');
    expect(result).not.toContain('/app/server.ts');
  });
});

describe('isRetryableModelError / isInvalidKeyError', () => {
  it('treats the retired-model 404 (NOT_FOUND) as retryable', () => {
    const err = new Error('{"error":{"code":404,"message":"This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash","status":"NOT_FOUND"}}');
    expect(isRetryableModelError(err)).toBe(true);
    expect(isInvalidKeyError(err)).toBe(false);
  });
  it('treats rate limits and quota errors as retryable', () => {
    expect(isRetryableModelError(new Error('429 Too Many Requests'))).toBe(true);
    expect(isRetryableModelError(new Error('Quota exceeded for quota metric'))).toBe(true);
    expect(isRetryableModelError(new Error('RESOURCE_EXHAUSTED'))).toBe(true);
  });
  it('detects invalid keys separately from retryable errors', () => {
    const err = new Error('API key not valid. Please pass a valid API key.');
    expect(isInvalidKeyError(err)).toBe(true);
    expect(isRetryableModelError(err)).toBe(false);
  });
  it('does not mark unknown errors as retryable', () => {
    expect(isRetryableModelError(new Error('socket hang up'))).toBe(false);
    expect(isRetryableModelError(null)).toBe(false);
  });
});
