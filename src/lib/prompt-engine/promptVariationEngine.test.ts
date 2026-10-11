import { describe, it, expect } from 'vitest';
import { PromptVariationEngine } from './promptVariationEngine';
import type { UniversalPromptRequest } from './promptSchema';

const baseRequest: UniversalPromptRequest = { subject: 'espresso coffee', count: 5 };

describe('PromptVariationEngine.generateConceptStrategies', () => {
  it('returns exactly the requested number of strategies', () => {
    expect(PromptVariationEngine.generateConceptStrategies(5, baseRequest)).toHaveLength(5);
    expect(PromptVariationEngine.generateConceptStrategies(1, baseRequest)).toHaveLength(1);
    expect(PromptVariationEngine.generateConceptStrategies(30, baseRequest)).toHaveLength(30);
  });

  it('returns an empty array for a zero count', () => {
    expect(PromptVariationEngine.generateConceptStrategies(0, baseRequest)).toEqual([]);
  });

  it('is deterministic: the same request always yields the same strategies', () => {
    const first = PromptVariationEngine.generateConceptStrategies(10, baseRequest);
    const second = PromptVariationEngine.generateConceptStrategies(10, baseRequest);
    expect(first).toEqual(second);
  });

  it('labels each strategy with a sequential perspective angle', () => {
    const strategies = PromptVariationEngine.generateConceptStrategies(5, baseRequest);
    strategies.forEach((strategy, i) => {
      expect(strategy.angle).toBe(`Perspective Variation ${i + 1}`);
    });
  });

  it('cycles through distinct environments without immediate repetition', () => {
    const strategies = PromptVariationEngine.generateConceptStrategies(10, baseRequest);
    const environments = strategies.map(s => s.environment);
    expect(new Set(environments).size).toBe(10);
  });

  it('embeds the subject in every strategy focus line', () => {
    const strategies = PromptVariationEngine.generateConceptStrategies(5, baseRequest);
    strategies.forEach((strategy, i) => {
      expect(strategy.focus).toBe(`Concept ${i + 1}: Distinctive visual facet of espresso coffee`);
    });
  });

  it('populates lighting and composition for every strategy', () => {
    const strategies = PromptVariationEngine.generateConceptStrategies(8, baseRequest);
    for (const strategy of strategies) {
      expect(strategy.lighting.length).toBeGreaterThan(0);
      expect(strategy.composition.length).toBeGreaterThan(0);
      expect(strategy.commercialUse.length).toBeGreaterThan(0);
    }
  });

  it('appends negative-space guidance when negativeSpace is set', () => {
    const left = PromptVariationEngine.generateConceptStrategies(3, { ...baseRequest, negativeSpace: 'Left' });
    for (const strategy of left) {
      expect(strategy.composition).toContain('dedicated negative space on the left');
    }

    const top = PromptVariationEngine.generateConceptStrategies(1, { ...baseRequest, negativeSpace: 'Top' });
    expect(top[0].composition).toContain('dedicated negative space on the top');
  });

  it('leaves composition untouched when negativeSpace is None or unset', () => {
    const none = PromptVariationEngine.generateConceptStrategies(3, { ...baseRequest, negativeSpace: 'None' });
    const unset = PromptVariationEngine.generateConceptStrategies(3, baseRequest);
    for (const strategy of [...none, ...unset]) {
      expect(strategy.composition).not.toContain('dedicated negative space');
    }
  });

  it('uses a clutter-free environment for Vector and Silhouette content types', () => {
    const vector = PromptVariationEngine.generateConceptStrategies(3, { ...baseRequest, contentType: 'Vector' });
    const silhouette = PromptVariationEngine.generateConceptStrategies(3, { ...baseRequest, contentType: 'Silhouette' });
    for (const strategy of [...vector, ...silhouette]) {
      expect(strategy.environment).toBe('clean vector-friendly isolated background with zero clutter');
    }
  });

  it('uses photographic environments for Photo content type', () => {
    const photo = PromptVariationEngine.generateConceptStrategies(3, { ...baseRequest, contentType: 'Photo' });
    for (const strategy of photo) {
      expect(strategy.environment).not.toBe('clean vector-friendly isolated background with zero clutter');
    }
  });

  it('honors the request commercialIntent, falling back to a built-in application', () => {
    const custom = PromptVariationEngine.generateConceptStrategies(2, {
      ...baseRequest,
      commercialIntent: 'E-commerce'
    });
    expect(custom[0].commercialUse).toBe('E-commerce');
    expect(custom[1].commercialUse).toBe('E-commerce');

    const fallback = PromptVariationEngine.generateConceptStrategies(2, baseRequest);
    expect(fallback[0].commercialUse.length).toBeGreaterThan(0);
  });
});
