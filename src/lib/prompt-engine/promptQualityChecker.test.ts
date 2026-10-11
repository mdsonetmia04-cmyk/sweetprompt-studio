import { describe, it, expect } from 'vitest';
import { PromptQualityChecker } from './promptQualityChecker';

const RICH_CLEAN_PROMPT =
  'A rustic wooden farmhouse kitchen interior with warm morning sunlight streaming through tall windows, ' +
  'copper pots hanging above a marble island, fresh herbs in ceramic pots, linen curtains, terracotta tiles, ' +
  'cozy artisanal atmosphere with rich textures and soft shadows';

describe('PromptQualityChecker.check', () => {
  describe('clean prompts', () => {
    it('passes a rich compliant prompt with a perfect score', () => {
      const result = PromptQualityChecker.check(RICH_CLEAN_PROMPT, 'Photo');
      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.issues).toEqual([]);
      expect(result.cleanPrompt).toContain('farmhouse kitchen');
    });

    it('enriches short prompts with commercial detail', () => {
      const result = PromptQualityChecker.check('A red balloon', 'Photo');
      expect(result.issues).toEqual([]);
      expect(result.passed).toBe(true);
      expect(result.cleanPrompt).toContain('natural diffuse lighting');
      expect(result.cleanPrompt).toContain('commercial advertising quality');
      expect(result.cleanPrompt.split(/\s+/).filter(Boolean).length).toBeGreaterThanOrEqual(15);
    });

    it('returns an enriched prompt instead of an empty one', () => {
      const result = PromptQualityChecker.check('', 'Photo');
      expect(result.cleanPrompt.length).toBeGreaterThan(0);
      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
    });
  });

  describe('human face safety', () => {
    it('converts face close-ups and records an issue', () => {
      const result = PromptQualityChecker.check('close-up face of a smiling woman, studio lighting', 'Photo');
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toContain('Identifiable human face');
      expect(result.cleanPrompt).toContain('faceless anonymous lifestyle composition');
      expect(result.cleanPrompt).not.toMatch(/close-up face/i);
      expect(result.passed).toBe(false);
      expect(result.score).toBe(80);
    });
  });

  describe('forbidden patterns', () => {
    it('flags buzzwords, strips the first hit and lowers the score', () => {
      const result = PromptQualityChecker.check('A photorealistic 8k masterpiece of a cat sitting', 'Photo');
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toContain('Low-quality AI buzzword');
      expect(result.cleanPrompt).not.toMatch(/photorealistic/i);
      // NOTE: the strip uses a non-global replace, so later buzzwords in the same
      // rule remain in the text. Documenting current behavior.
      expect(result.cleanPrompt).toContain('8k');
      expect(result.passed).toBe(false);
      expect(result.score).toBe(80);
    });

    it('flags brands, franchises and characters', () => {
      const disney = PromptQualityChecker.check('a disney castle at dawn', 'Photo');
      expect(disney.issues[0]).toContain('Protected entertainment franchise');

      const nike = PromptQualityChecker.check('a runner wearing nike shoes', 'Photo');
      expect(nike.issues[0]).toContain('Registered corporate brand');

      const musk = PromptQualityChecker.check('a portrait of elon musk', 'Photo');
      expect(musk.issues[0]).toContain('Real public figure');
    });

    it('floors the score at 20 when many rules are violated', () => {
      const result = PromptQualityChecker.check(
        'close-up face in the style of Banksy, disney mickey mouse with elon musk, nike logo, 8k, best seller, eiffel tower at night',
        'Photo'
      );
      expect(result.issues.length).toBeGreaterThanOrEqual(9);
      expect(result.score).toBe(20);
      expect(result.passed).toBe(false);
    });

    it('deducts 20 points per issue', () => {
      const one = PromptQualityChecker.check('a disney castle at dawn', 'Photo');
      expect(one.score).toBe(80);
      const two = PromptQualityChecker.check('a disney castle with mickey mouse', 'Photo');
      expect(two.score).toBe(60);
    });
  });

  describe('transparent cutout enforcement', () => {
    it('appends isolation tags for PNG content and removes scene clutter', () => {
      const result = PromptQualityChecker.check('A red balloon on a table', 'PNG');
      expect(result.cleanPrompt).toContain('isolated on pure solid white background');
      expect(result.cleanPrompt).not.toMatch(/on a table/i);
      expect(result.cleanPrompt).toContain('zero drop shadows');
    });

    it('triggers isolation from instructions or background context', () => {
      const viaInstructions = PromptQualityChecker.check('A red balloon', 'Photo', {
        instructions: 'make it an isolated transparent cutout'
      });
      expect(viaInstructions.cleanPrompt).toContain('isolated on pure solid white background');

      const viaBackground = PromptQualityChecker.check('A red balloon', 'Photo', {
        background: 'isolated on white'
      });
      expect(viaBackground.cleanPrompt).toContain('isolated on pure solid white background');
    });

    it('does not append isolation tags for ordinary photo prompts', () => {
      const result = PromptQualityChecker.check(RICH_CLEAN_PROMPT, 'Photo');
      expect(result.cleanPrompt).not.toContain('isolated on pure solid white background');
    });
  });

  describe('content-type adjustments', () => {
    it('appends vector aesthetics for Vector prompts lacking them', () => {
      const result = PromptQualityChecker.check('A geometric red fox', 'Vector');
      expect(result.cleanPrompt).toContain('clean flat vector aesthetic');
    });

    it('skips vector enrichment when vector terms are already present', () => {
      const result = PromptQualityChecker.check('A geometric red fox icon', 'Vector');
      expect(result.cleanPrompt).not.toContain('clean flat vector aesthetic');
    });

    it('prefixes Silhouette prompts with the solid-black framing', () => {
      const result = PromptQualityChecker.check('A running cheetah', 'Silhouette');
      expect(result.cleanPrompt.startsWith('Clean sharp solid black silhouette of')).toBe(true);
      expect(result.cleanPrompt).toContain('high-contrast isolated on pure white');
    });
  });

  describe('text cleanup', () => {
    it('strips JSON key prefixes and surrounding quotes', () => {
      const result = PromptQualityChecker.check('"prompt": "A red balloon floating over green hills"', 'Photo');
      expect(result.cleanPrompt).not.toContain('"prompt"');
      expect(result.cleanPrompt).toContain('red balloon');
    });

    it('collapses double commas and repeated spaces', () => {
      const result = PromptQualityChecker.check('A red balloon,,  with soft light', 'Photo');
      expect(result.cleanPrompt).not.toContain(',,');
      expect(result.cleanPrompt).not.toMatch(/\s{2,}/);
    });
  });
});
