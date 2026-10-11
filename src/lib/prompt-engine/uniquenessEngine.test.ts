import { describe, it, expect } from 'vitest';
import { UniquenessEngine } from './uniquenessEngine';

describe('UniquenessEngine.calculateSimilarity', () => {
  it('returns 100 for identical prompts', () => {
    expect(
      UniquenessEngine.calculateSimilarity('bright red apple studio lighting', 'bright red apple studio lighting')
    ).toBe(100);
  });

  it('returns 0 for empty or token-less input', () => {
    expect(UniquenessEngine.calculateSimilarity('', 'bright red apple')).toBe(0);
    expect(UniquenessEngine.calculateSimilarity('bright red apple', '')).toBe(0);
    expect(UniquenessEngine.calculateSimilarity('', '')).toBe(0);
    // words of length <= 2 are dropped, leaving no tokens
    expect(UniquenessEngine.calculateSimilarity('an ox', 'an ox')).toBe(0);
  });

  it('computes Jaccard similarity over normalized tokens', () => {
    // A = {red, apple, white, table}, B = {red, apple, white, background} -> 3/5 = 60
    expect(
      UniquenessEngine.calculateSimilarity('red apple on white table', 'red apple on white background')
    ).toBe(60);
  });

  it('is case-insensitive and ignores punctuation and stop words', () => {
    expect(UniquenessEngine.calculateSimilarity('RED APPLE!', 'red apple')).toBe(100);
    expect(UniquenessEngine.calculateSimilarity('the apple', 'apple')).toBe(100);
  });

  it('returns 0 for completely disjoint prompts', () => {
    expect(
      UniquenessEngine.calculateSimilarity('red apple green field', 'blue car city night')
    ).toBe(0);
  });

  it('returns a mid-range score for partial overlap', () => {
    // {red, apple, field} vs {red, car, field} -> 2/4 = 50
    expect(UniquenessEngine.calculateSimilarity('red apple field', 'red car field')).toBe(50);
  });

  it('always returns an integer between 0 and 100', () => {
    const pairs: Array<[string, string]> = [
      ['a', 'b'],
      ['coffee cup steam', 'coffee cup steam rising'],
      ['x'.repeat(50), 'y'.repeat(50)]
    ];
    for (const [a, b] of pairs) {
      const sim = UniquenessEngine.calculateSimilarity(a, b);
      expect(Number.isInteger(sim)).toBe(true);
      expect(sim).toBeGreaterThanOrEqual(0);
      expect(sim).toBeLessThanOrEqual(100);
    }
  });
});

describe('UniquenessEngine.auditBatch', () => {
  it('treats a single prompt as fully unique', () => {
    const result = UniquenessEngine.auditBatch(['a lone red balloon']);
    expect(result.isUnique).toBe(true);
    expect(result.score).toBe(100);
    expect(result.duplicateIndices).toEqual([]);
    expect(result.flaggedPairs).toEqual([]);
    expect(result.summary).toContain('100% unique');
  });

  it('returns the single-prompt branch for an empty batch', () => {
    const result = UniquenessEngine.auditBatch([]);
    expect(result.isUnique).toBe(true);
    expect(result.score).toBe(100);
  });

  it('passes a diverse batch with no flags', () => {
    const result = UniquenessEngine.auditBatch([
      'red apple on white table',
      'blue sports car in city night',
      'green mountain lake sunrise'
    ]);
    expect(result.isUnique).toBe(true);
    expect(result.duplicateIndices).toEqual([]);
    expect(result.flaggedPairs).toEqual([]);
    expect(result.summary).toContain('No duplicate concepts detected');
    expect(result.score).toBeGreaterThan(90);
  });

  it('flags exact duplicates and marks the later index for regeneration', () => {
    const result = UniquenessEngine.auditBatch([
      'red apple on white table',
      'red apple on white table'
    ]);
    expect(result.isUnique).toBe(false);
    expect(result.duplicateIndices).toEqual([1]);
    expect(result.flaggedPairs).toHaveLength(1);
    expect(result.flaggedPairs[0]).toMatchObject({ indexA: 0, indexB: 1, similarity: 100 });
    expect(result.summary).toContain('1 near-duplicate');
  });

  it('flags the later index when the first and third prompts match', () => {
    const result = UniquenessEngine.auditBatch([
      'alpha beta gamma delta',
      'completely different words here now',
      'alpha beta gamma delta'
    ]);
    expect(result.isUnique).toBe(false);
    expect(result.duplicateIndices).toEqual([2]);
    expect(result.flaggedPairs[0]).toMatchObject({ indexA: 0, indexB: 2 });
  });

  it('respects a custom similarity threshold', () => {
    const prompts = ['red apple white table', 'red apple white background']; // similarity 60
    const strict = UniquenessEngine.auditBatch(prompts, 50);
    expect(strict.isUnique).toBe(false);

    const lenient = UniquenessEngine.auditBatch(prompts, 90);
    expect(lenient.isUnique).toBe(true);
  });

  it('scores diversity as 100 minus average pairwise similarity', () => {
    // identical pair -> avg similarity 100 -> diversity 0
    const dupes = UniquenessEngine.auditBatch(['same words here', 'same words here']);
    expect(dupes.score).toBe(0);

    // disjoint pair -> avg similarity 0 -> diversity 100
    const diverse = UniquenessEngine.auditBatch(['red apple green field', 'blue car city night']);
    expect(diverse.score).toBe(100);
  });

  it('reports a zero-diversity score when every pair is identical', () => {
    const result = UniquenessEngine.auditBatch(['copy paste text', 'copy paste text', 'copy paste text']);
    expect(result.isUnique).toBe(false);
    expect(result.duplicateIndices).toEqual([1, 2]);
    expect(result.score).toBe(0);
  });
});
