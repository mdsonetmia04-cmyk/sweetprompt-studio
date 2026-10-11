import { describe, it, expect } from 'vitest';
import { UniversalPromptSanitizer } from './promptSanitizer';

describe('UniversalPromptSanitizer.sanitize', () => {
  describe('edge cases', () => {
    it('returns an empty result for an empty string', () => {
      const result = UniversalPromptSanitizer.sanitize('');
      expect(result.originalText).toBe('');
      expect(result.sanitizedText).toBe('');
      expect(result.hasReplaced).toBe(false);
      expect(result.replacements).toEqual([]);
      expect(result.notice).toBeUndefined();
    });

    it('handles non-string input defensively', () => {
      const result = UniversalPromptSanitizer.sanitize(null as unknown as string);
      expect(result.originalText).toBe('');
      expect(result.sanitizedText).toBe('');
      expect(result.hasReplaced).toBe(false);
      expect(result.replacements).toEqual([]);
    });

    it('trims whitespace-only input and reports no replacements', () => {
      const result = UniversalPromptSanitizer.sanitize('   ');
      expect(result.sanitizedText).toBe('');
      expect(result.hasReplaced).toBe(false);
    });

    it('leaves clean commercial text untouched', () => {
      const input = 'A mountain landscape at sunrise with soft clouds';
      const result = UniversalPromptSanitizer.sanitize(input);
      expect(result.hasReplaced).toBe(false);
      expect(result.replacements).toEqual([]);
      expect(result.notice).toBeUndefined();
      expect(result.sanitizedText).toBe(input);
    });

    it('preserves the original text verbatim in originalText', () => {
      const input = 'A photo of an iPhone on a desk';
      const result = UniversalPromptSanitizer.sanitize(input);
      expect(result.originalText).toBe(input);
    });
  });

  describe('brand and trademark replacement', () => {
    it('replaces a brand term with its safe generic equivalent', () => {
      const result = UniversalPromptSanitizer.sanitize('A photo of an iPhone on a desk');
      expect(result.hasReplaced).toBe(true);
      expect(result.sanitizedText).toContain('modern sleek smartphone');
      expect(result.sanitizedText).not.toMatch(/iphone/i);
      expect(result.notice).toBeDefined();
    });

    it('matches brand terms case-insensitively', () => {
      const result = UniversalPromptSanitizer.sanitize('NIKE shoes and Adidas sneakers');
      expect(result.hasReplaced).toBe(true);
      expect(result.sanitizedText).not.toMatch(/nike/i);
      expect(result.sanitizedText).not.toMatch(/adidas/i);
      expect(result.sanitizedText).toContain('athletic performance sportswear');
      expect(result.replacements).toHaveLength(2);
    });

    it('records the original term, replacement and reason for each hit', () => {
      const result = UniversalPromptSanitizer.sanitize('drinking a coke');
      expect(result.replacements).toHaveLength(1);
      expect(result.replacements[0].original).toBe('coke');
      expect(result.replacements[0].replacement).toBe('effervescent cola soda can');
      expect(result.replacements[0].reason).toContain('Protected brand');
    });

    it('handles multi-word and punctuated dictionary keys', () => {
      const tower = UniversalPromptSanitizer.sanitize('photo of the eiffel tower at night');
      expect(tower.sanitizedText).toContain('illuminated European metropolis tower at twilight');

      const mcd = UniversalPromptSanitizer.sanitize("a kid eating mcdonald's fries");
      expect(mcd.hasReplaced).toBe(true);
      expect(mcd.sanitizedText).toContain('fast food meal packaging');
    });

    it('accumulates replacements across multiple distinct terms', () => {
      const result = UniversalPromptSanitizer.sanitize('iphone and tesla on the table');
      expect(result.replacements).toHaveLength(2);
      expect(result.sanitizedText).toContain('modern sleek smartphone');
      expect(result.sanitizedText).toContain('modern streamlined electric vehicle');
    });
  });

  describe('artist reference stripping', () => {
    it('removes "in the style of [Artist]" references', () => {
      const result = UniversalPromptSanitizer.sanitize('A landscape in the style of Van Gogh with swirling skies');
      expect(result.hasReplaced).toBe(true);
      expect(result.sanitizedText).toContain('in a refined expressive artistic aesthetic');
      expect(result.sanitizedText).not.toContain('Van Gogh');
      expect(result.replacements[0].original).toBe('Van Gogh');
      expect(result.replacements[0].reason).toContain('artist');
    });
  });

  describe('human face cleanup', () => {
    it('converts direct camera-gaze requests to faceless compositions', () => {
      const result = UniversalPromptSanitizer.sanitize('a woman looking directly at the camera, studio light');
      expect(result.hasReplaced).toBe(true);
      expect(result.sanitizedText).toContain('faceless anonymous lifestyle composition');
      expect(result.sanitizedText).not.toMatch(/looking directly at the camera/i);
    });

    it('converts close-up face dictionary terms', () => {
      const result = UniversalPromptSanitizer.sanitize('close-up face portrait of a model');
      expect(result.hasReplaced).toBe(true);
      expect(result.sanitizedText).toContain('anonymous faceless perspective');
    });
  });

  describe('stock spam buzzword removal', () => {
    it('strips low-quality AI buzzwords with empty replacements', () => {
      const result = UniversalPromptSanitizer.sanitize('photorealistic 8k masterpiece of a mountain');
      expect(result.hasReplaced).toBe(true);
      expect(result.sanitizedText).not.toMatch(/photorealistic/i);
      expect(result.sanitizedText).not.toMatch(/8k/i);
      expect(result.sanitizedText).not.toMatch(/masterpiece/i);
      const buzzwordHits = result.replacements.filter(r => r.replacement === '');
      expect(buzzwordHits.length).toBeGreaterThanOrEqual(3);
      expect(buzzwordHits[0].reason).toContain('buzzword');
    });
  });

  describe('unicode handling', () => {
    it('replaces brand terms while preserving emoji and non-Latin scripts', () => {
      const result = UniversalPromptSanitizer.sanitize('iPhone 📱 カフェラテ');
      expect(result.hasReplaced).toBe(true);
      expect(result.sanitizedText).toContain('📱');
      expect(result.sanitizedText).toContain('カフェラテ');
      expect(result.sanitizedText).toContain('modern sleek smartphone');
      expect(result.sanitizedText).not.toMatch(/iphone/i);
    });
  });

  describe('notice semantics', () => {
    it('sets a notice only when a replacement happened', () => {
      const dirty = UniversalPromptSanitizer.sanitize('a tesla car');
      expect(dirty.notice).toContain('Protected brand');

      const clean = UniversalPromptSanitizer.sanitize('a red balloon in the sky');
      expect(clean.notice).toBeUndefined();
    });
  });
});
