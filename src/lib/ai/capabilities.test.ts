/**
 * Provider capability matrix tests (data-driven, no network, no API keys).
 *
 * Verifies the provider-switching contract: every supported provider exposes
 * text generation; only vision-capable providers accept image analysis.
 * The app must surface a clear message for providers without vision support
 * (huggingface, cerebras) instead of sending image data to them.
 */
import { describe, it, expect } from 'vitest';
import {
  PROVIDER_CAPABILITIES,
  getProviderCapabilities,
  validateProviderCapability,
} from './capabilities';
import type { AIProviderName } from '../../types';

const ALL_PROVIDERS: AIProviderName[] = [
  'gemini',
  'groq',
  'mistral',
  'openrouter',
  'huggingface',
  'cerebras',
];

describe('PROVIDER_CAPABILITIES — provider registry completeness', () => {
  it('declares exactly the six supported providers', () => {
    expect(Object.keys(PROVIDER_CAPABILITIES).sort()).toEqual([...ALL_PROVIDERS].sort());
  });

  it('every provider supports text generation with a default text model', () => {
    for (const p of ALL_PROVIDERS) {
      const caps = getProviderCapabilities(p);
      expect(caps.supportsText, `${p} supportsText`).toBe(true);
      expect(caps.defaultTextModel, `${p} defaultTextModel`).toBeTruthy();
      expect(caps.supportedModels, `${p} supportedModels`).toContain(caps.defaultTextModel);
    }
  });

  it('every provider has a non-empty supported model list', () => {
    for (const p of ALL_PROVIDERS) {
      expect(getProviderCapabilities(p).supportedModels.length, p).toBeGreaterThan(0);
    }
  });
});

describe('validateProviderCapability — vision support matrix', () => {
  const visionProviders: AIProviderName[] = ['gemini', 'groq', 'mistral', 'openrouter'];
  const nonVisionProviders: AIProviderName[] = ['huggingface', 'cerebras'];

  it.each(visionProviders)('%s supports vision analysis', (p) => {
    expect(validateProviderCapability(p, 'vision')).toBe(true);
    expect(getProviderCapabilities(p).supportsVision).toBe(true);
  });

  it.each(nonVisionProviders)('%s does NOT support vision analysis', (p) => {
    expect(validateProviderCapability(p, 'vision')).toBe(false);
    expect(getProviderCapabilities(p).supportsVision).toBe(false);
  });

  it('vision-capable providers declare a default vision model', () => {
    for (const p of visionProviders) {
      expect(getProviderCapabilities(p).defaultVisionModel, p).toBeTruthy();
    }
  });

  it('unknown capability strings return false (fail closed)', () => {
    expect(validateProviderCapability('gemini', 'teleport' as never)).toBe(false);
  });
});

describe('getProviderCapabilities — unknown provider fallback', () => {
  it('falls back to gemini capabilities for unknown provider names', () => {
    const caps = getProviderCapabilities('nonexistent' as AIProviderName);
    expect(caps).toEqual(PROVIDER_CAPABILITIES.gemini);
  });
});
