/**
 * Tests for the direct-browser Gemini fallback helpers.
 * The browser path must survive model retirements (Google 404 NOT_FOUND)
 * even when the server proxy is unavailable.
 */
import { describe, it, expect } from 'vitest';
import {
  GEMINI_TEXT_FALLBACKS,
  GEMINI_VISION_FALLBACKS,
  candidateModels,
  isRetryableModelError,
  isInvalidKeyError,
} from './geminiFallbacks';

describe('geminiFallbacks', () => {
  it('leads with gemini-3.8-flash and keeps older models as fallbacks', () => {
    expect(GEMINI_TEXT_FALLBACKS[0]).toBe('gemini-3.8-flash');
    expect(GEMINI_VISION_FALLBACKS[0]).toBe('gemini-3.8-flash');
    expect(GEMINI_TEXT_FALLBACKS).toContain('gemini-2.5-flash');
  });

  it('puts the requested model first, deduplicated', () => {
    expect(candidateModels('gemini-2.5-flash', GEMINI_TEXT_FALLBACKS)).toEqual([
      'gemini-2.5-flash',
      'gemini-3.8-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
    ]);
    expect(candidateModels(undefined, GEMINI_TEXT_FALLBACKS)[0]).toBe('gemini-3.8-flash');
  });

  it('treats the retired-model 404 (NOT_FOUND) as retryable', () => {
    const err = new Error(
      '{"error":{"code":404,"message":"This model models/gemini-2.5-flash is no longer available to new users.","status":"NOT_FOUND"}}',
    );
    expect(isRetryableModelError(err)).toBe(true);
    expect(isInvalidKeyError(err)).toBe(false);
  });

  it('treats rate limits as retryable and bad keys as key errors', () => {
    expect(isRetryableModelError(new Error('429 Too Many Requests'))).toBe(true);
    const keyErr = new Error('API key not valid. Please pass a valid API key.');
    expect(isInvalidKeyError(keyErr)).toBe(true);
    expect(isRetryableModelError(keyErr)).toBe(false);
  });

  it('does not mark unknown errors as retryable', () => {
    expect(isRetryableModelError(new Error('socket hang up'))).toBe(false);
  });
});
