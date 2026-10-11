/**
 * Tests for the client-side provider error cleaner in proxyClient.
 * Covers the missing/invalid API key error path: users must get an
 * understandable message pointing them to Settings, never a raw dump.
 */
import { describe, it, expect } from 'vitest';
import { extractCleanErrorMessage } from './proxyClient';

describe('extractCleanErrorMessage — understandable provider errors', () => {
  it('maps 401 to an invalid-key message pointing at Settings', () => {
    const msg = extractCleanErrorMessage('Groq', 401, 'Unauthorized');
    expect(msg).toContain('Groq');
    expect(msg).toMatch(/invalid api key/i);
    expect(msg).toMatch(/settings/i);
  });

  it('detects invalid-key wording without a status code', () => {
    const msg = extractCleanErrorMessage('Gemini', 400, 'API key not valid. Please pass a valid API key.');
    expect(msg).toMatch(/invalid api key/i);
  });

  it('maps 429 to a rate-limit message with a wait/switch suggestion', () => {
    const msg = extractCleanErrorMessage('Mistral', 429, 'Too Many Requests');
    expect(msg).toMatch(/rate limit|quota/i);
  });

  it('maps network failures to a connectivity message', () => {
    const msg = extractCleanErrorMessage('OpenRouter', 0, 'fetch failed');
    expect(msg).toMatch(/network|internet|unreachable/i);
  });

  it('extracts the message from JSON error bodies', () => {
    const msg = extractCleanErrorMessage(
      'Gemini',
      400,
      JSON.stringify({ error: { message: 'API key not valid' } }),
    );
    expect(msg).toMatch(/invalid api key/i);
  });

  it('truncates long unknown messages to a readable length', () => {
    const msg = extractCleanErrorMessage('X', 500, 'a'.repeat(500));
    expect(msg.length).toBeLessThan(200);
    expect(msg).toContain('X');
  });

  it('never throws on garbage input', () => {
    expect(() => extractCleanErrorMessage('X', 0, '')).not.toThrow();
    expect(() => extractCleanErrorMessage('X', 0, '{{{not json')).not.toThrow();
  });
});
