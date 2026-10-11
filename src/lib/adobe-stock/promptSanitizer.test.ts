import { describe, it, expect } from 'vitest';
import {
  sanitizePromptInput,
  autoSanitizePrompt,
  buildCommercialStockPrompt,
} from './promptSanitizer';

describe('sanitizePromptInput', () => {
  it('returns a clean scan for a benign prompt', () => {
    const result = sanitizePromptInput('a tranquil mountain lake at sunrise');
    expect(result.hasRisk).toBe(false);
    expect(result.detectedCount).toBe(0);
    expect(result.risks).toEqual([]);
    expect(result.sanitizedPrompt).toBe('a tranquil mountain lake at sunrise');
  });

  it('replaces a detected brand with its safe alternative', () => {
    const result = sanitizePromptInput('pair of nike running shoes on white background');
    expect(result.hasRisk).toBe(true);
    expect(result.detectedCount).toBe(1);
    expect(result.risks[0].term).toBe('Nike Brand');
    expect(result.risks[0].rawMatch.toLowerCase()).toBe('nike');
    expect(result.sanitizedPrompt.toLowerCase()).not.toContain('nike');
    expect(result.sanitizedPrompt.toLowerCase()).toContain('unbranded');
  });

  it('replaces a copyrighted character reference', () => {
    const result = sanitizePromptInput('spider-man swinging through the city');
    expect(result.hasRisk).toBe(true);
    expect(result.sanitizedPrompt.toLowerCase()).not.toContain('spider-man');
    expect(result.sanitizedPrompt.toLowerCase()).toContain('acrobatic athletic hero');
  });

  it('always attaches the commercial negative constraints', () => {
    const result = sanitizePromptInput('anything');
    expect(result.commercialNegativeConstraints).toContain('no logos');
    expect(result.commercialNegativeConstraints).toContain('no watermarks');
    expect(result.commercialNegativeConstraints).toContain('no human faces');
  });

  it('trims surrounding whitespace from the sanitized prompt', () => {
    const result = sanitizePromptInput('  a tranquil lake  ');
    expect(result.sanitizedPrompt).toBe('a tranquil lake');
  });
});

describe('autoSanitizePrompt', () => {
  it('strips AI buzzwords and records them as removed terms', () => {
    const result = autoSanitizePrompt('photorealistic mountain landscape, 8k masterpiece');
    expect(result.sanitizedPrompt.toLowerCase()).not.toContain('photorealistic');
    expect(result.sanitizedPrompt.toLowerCase()).not.toContain('8k');
    expect(result.sanitizedPrompt.toLowerCase()).not.toContain('masterpiece');
    const buzzwordEntries = result.replacedTerms.filter((t) => t.replacement === '');
    expect(buzzwordEntries.length).toBeGreaterThanOrEqual(3);
    expect(buzzwordEntries.every((t) => t.reason.toLowerCase().includes('buzzword'))).toBe(true);
    expect(result.hasRisk).toBe(true);
  });

  it('replaces IP risks and buzzwords together', () => {
    const result = autoSanitizePrompt('photorealistic nike shoes');
    expect(result.sanitizedPrompt.toLowerCase()).not.toContain('nike');
    expect(result.sanitizedPrompt.toLowerCase()).not.toContain('photorealistic');
    const brandEntry = result.replacedTerms.find((t) => t.original.toLowerCase() === 'nike');
    expect(brandEntry).toBeDefined();
    expect(brandEntry!.replacement.toLowerCase()).toContain('unbranded');
  });

  it('leaves a clean prompt untouched with no replaced terms', () => {
    const result = autoSanitizePrompt('a tranquil mountain lake');
    expect(result.hasRisk).toBe(false);
    expect(result.sanitizedPrompt).toBe('a tranquil mountain lake');
    expect(result.replacedTerms).toEqual([]);
  });

  it('rewrites stray face close-up requests as faceless compositions', () => {
    const result = autoSanitizePrompt('close-up of human face, soft light');
    expect(result.sanitizedPrompt).toContain('faceless anonymous lifestyle composition, seen from behind');
  });
});

describe('buildCommercialStockPrompt', () => {
  it('appends a faceless guard for human subjects missing one', () => {
    const prompt = buildCommercialStockPrompt({ subject: 'business executive' });
    expect(prompt).toContain('faceless anonymous composition seen from behind or over-the-shoulder');
  });

  it('does not duplicate the faceless guard when already present', () => {
    const prompt = buildCommercialStockPrompt({ subject: 'doctor from behind' });
    const occurrences = prompt.split('from behind').length - 1;
    expect(occurrences).toBe(1);
  });

  it('adds environment, composition, lighting and style sections', () => {
    const prompt = buildCommercialStockPrompt({
      subject: 'mountain lake',
      environment: 'misty forest',
      composition: 'rule of thirds',
      lighting: 'soft daylight',
      visualStyle: 'cinematic',
    });
    expect(prompt).toContain('in misty forest');
    expect(prompt).toContain('composition: rule of thirds');
    expect(prompt).toContain('lighting: soft daylight');
    expect(prompt).toContain('style: cinematic');
  });

  it('places copy space on the requested side only', () => {
    const withSpace = buildCommercialStockPrompt({ subject: 'vase', copySpace: 'Left' });
    expect(withSpace).toContain('generous clean left negative space');

    const withoutSpace = buildCommercialStockPrompt({ subject: 'vase', copySpace: 'None' });
    expect(withoutSpace).not.toContain('negative space');
  });

  it('describes isolated subjects for cutout assets', () => {
    const prompt = buildCommercialStockPrompt({ subject: 'vase', isIsolated: true });
    expect(prompt).toContain('isolated subject on pure white');
  });

  it('appends --ar for non-square aspect ratios and skips it for 1:1', () => {
    expect(buildCommercialStockPrompt({ subject: 'vase', aspectRatio: '16:9' })).toContain('--ar 16:9');
    expect(buildCommercialStockPrompt({ subject: 'vase', aspectRatio: '1:1' })).not.toContain('--ar');
  });

  it('always ends with strict commercial compliance negatives', () => {
    const prompt = buildCommercialStockPrompt({ subject: 'vase' });
    expect(prompt).toContain('no human faces');
    expect(prompt).toContain('no visible brand marks');
    expect(prompt).toContain('no watermarks');
  });
});
