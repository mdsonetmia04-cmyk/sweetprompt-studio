import { describe, it, expect } from 'vitest';
import { evaluateBatchDiversity } from './similarityEngine';

describe('evaluateBatchDiversity — single and empty batches', () => {
  it('scores a single prompt at 100 with HIGH rating', () => {
    const result = evaluateBatchDiversity(['a tranquil mountain lake at sunrise']);
    expect(result.diversityScore).toBe(100);
    expect(result.rating).toBe('HIGH');
    expect(result.flaggedPairs).toEqual([]);
    expect(result.warningMessage).toBeUndefined();
    expect(result.summary).toContain('Single concept');
  });

  it('handles an empty batch gracefully', () => {
    const result = evaluateBatchDiversity([]);
    expect(result.diversityScore).toBe(100);
    expect(result.rating).toBe('HIGH');
    expect(result.flaggedPairs).toEqual([]);
  });
});

describe('evaluateBatchDiversity — diverse batches', () => {
  it('rates two completely different prompts as HIGH', () => {
    const result = evaluateBatchDiversity([
      'mountain lake sunrise landscape photography',
      'urban city street night traffic vehicles',
    ]);
    expect(result.diversityScore).toBe(100);
    expect(result.rating).toBe('HIGH');
    expect(result.flaggedPairs).toHaveLength(0);
    expect(result.summary).toContain('HIGH');
  });
});

describe('evaluateBatchDiversity — duplicates and near-duplicates', () => {
  it('flags identical prompts as a minor wording change with zero diversity', () => {
    const prompt = 'a red sports car parked on a city street at night';
    const result = evaluateBatchDiversity([prompt, prompt]);
    expect(result.flaggedPairs).toHaveLength(1);
    const [pair] = result.flaggedPairs;
    expect(pair.indexA).toBe(1);
    expect(pair.indexB).toBe(2);
    expect(pair.score).toBe(100);
    expect(pair.similarityType).toBe('Minor Wording Change');
    expect(pair.suggestion.length).toBeGreaterThan(0);
    expect(result.diversityScore).toBe(0);
    expect(result.rating).toBe('LOW');
    expect(result.warningMessage).toContain('High similarity');
    expect(result.summary).toContain('1 potential similarity overlap');
  });

  it('flags color-only swaps as "Only Color/Background Shift"', () => {
    const result = evaluateBatchDiversity([
      'red sports car on road',
      'blue sports car on road',
    ]);
    expect(result.flaggedPairs).toHaveLength(1);
    const [pair] = result.flaggedPairs;
    expect(pair.score).toBe(60);
    expect(pair.similarityType).toBe('Only Color/Background Shift');
  });

  it('flags high-overlap rewordings as near-identical framing', () => {
    const result = evaluateBatchDiversity([
      'cozy wooden cabin in snowy forest with warm lights',
      'cozy wooden cabin in forest with warm glowing lights',
    ]);
    expect(result.flaggedPairs).toHaveLength(1);
    const [pair] = result.flaggedPairs;
    expect(pair.score).toBe(75);
    expect(pair.similarityType).toBe('Near-Identical Framing');
  });

  it('rates a mixed batch as MEDIUM when some pairs overlap', () => {
    const result = evaluateBatchDiversity([
      'red sports car on road',
      'blue sports car on road',
      'mountain lake sunrise landscape',
    ]);
    expect(result.flaggedPairs).toHaveLength(1);
    expect(result.diversityScore).toBe(80);
    expect(result.rating).toBe('MEDIUM');
    expect(result.warningMessage).toContain('Some concepts share strong visual');
  });

  it('detects duplicate subjects across non-adjacent pairs', () => {
    const prompt = 'golden wheat field under dramatic sky';
    const result = evaluateBatchDiversity([
      prompt,
      'busy harbor with fishing boats',
      prompt,
      prompt,
    ]);
    const duplicatePairs = result.flaggedPairs.filter(
      (p) => (p.indexA === 1 && p.indexB === 3),
    );
    expect(duplicatePairs).toHaveLength(1);
    expect(duplicatePairs[0].score).toBe(100);
    // 3 of 6 pairs flagged >= ceil(4 * 0.4) => LOW
    expect(result.flaggedPairs).toHaveLength(3);
    expect(result.rating).toBe('LOW');
  });
});

describe('evaluateBatchDiversity — score sanity', () => {
  it('scores are bounded between 0 and 100', () => {
    const result = evaluateBatchDiversity([
      'red sports car on road',
      'blue sports car on road',
      'green sports car on road',
      'mountain lake sunrise',
    ]);
    expect(result.diversityScore).toBeGreaterThanOrEqual(0);
    expect(result.diversityScore).toBeLessThanOrEqual(100);
    for (const pair of result.flaggedPairs) {
      expect(pair.score).toBeGreaterThanOrEqual(60);
      expect(pair.score).toBeLessThanOrEqual(100);
    }
  });

  it('ignores filler stop words when comparing', () => {
    const result = evaluateBatchDiversity([
      'the mountain and the lake',
      'a mountain with a lake',
    ]);
    // after stop-word removal both reduce to {mountain, lake} => 100
    expect(result.flaggedPairs).toHaveLength(1);
    expect(result.flaggedPairs[0].score).toBe(100);
  });
});
