import { describe, it, expect } from 'vitest';
import {
  parseAndCleanKeywords,
  cleanStockTitle,
  evaluateMetadataQuality,
} from './metadataEngine';

describe('parseAndCleanKeywords', () => {
  it('normalizes, dedupes and keeps benign keywords', () => {
    const result = parseAndCleanKeywords(['Mountain Landscape', 'mountain landscape', 'Sunrise']);
    expect(result.all).toEqual(['mountain landscape', 'sunrise']);
    expect(result.top10).toEqual(['mountain landscape', 'sunrise']);
    expect(result.other).toEqual([]);
    expect(result.blocked).toEqual([]);
  });

  it('blocks keywords with IP signals and records the offending term', () => {
    const result = parseAndCleanKeywords(['mountain', 'nike', 'disney']);
    expect(result.all).toEqual(['mountain']);
    expect(result.blocked).toHaveLength(2);
    expect(result.blocked[0]).toBe('nike (IP signal: Nike Brand)');
    expect(result.blocked[1]).toContain('Disney / Pixar Franchise');
  });

  it('blocks marketplace spam keywords', () => {
    const result = parseAndCleanKeywords(['free', 'stock', 'photo', 'download', 'mountain']);
    expect(result.all).toEqual(['mountain']);
    expect(result.blocked).toHaveLength(4);
    expect(result.blocked[0]).toBe('free (Marketplace spam keyword)');
  });

  it('drops empty and single-character keywords', () => {
    const result = parseAndCleanKeywords(['', 'x', '  ', 'lake']);
    expect(result.all).toEqual(['lake']);
  });

  it('trims output to the 49-keyword Adobe Stock cap with a 10-keyword top list', () => {
    const many = Array.from({ length: 60 }, (_, i) => `keyword${i + 1}`);
    const result = parseAndCleanKeywords(many);
    expect(result.all).toHaveLength(49);
    expect(result.top10).toHaveLength(10);
    expect(result.other).toHaveLength(39);
    expect(result.top10[0]).toBe('keyword1');
    expect(result.all[48]).toBe('keyword49');
  });
});

describe('cleanStockTitle', () => {
  it('strips prompt artifacts and capitalizes a clean title', () => {
    const { title, warnings } = cleanStockTitle('photo of a mountain landscape at sunrise');
    expect(title).toBe('A mountain landscape at sunrise');
    expect(warnings).toEqual([]);
  });

  it('replaces trademark references with safe alternatives and warns', () => {
    const { title, warnings } = cleanStockTitle('Nike sneakers product photo');
    expect(title.toLowerCase()).not.toContain('nike');
    expect(title.toLowerCase()).toContain('unbranded');
    expect(warnings.some((w) => w.includes('Nike Brand'))).toBe(true);
  });

  it('warns when the cleaned title exceeds the 70-character recommendation', () => {
    const longTitle = 'A very long and detailed descriptive title that keeps going beyond seventy characters for sure';
    const { warnings } = cleanStockTitle(longTitle);
    expect(warnings.some((w) => w.includes('exceeds recommended'))).toBe(true);
  });

  it('capitalizes the first letter', () => {
    const { title } = cleanStockTitle('mountain lake');
    expect(title[0]).toBe('M');
  });
});

describe('evaluateMetadataQuality', () => {
  const benignKeywords = [
    'mountain', 'lake', 'sunrise', 'landscape', 'nature', 'serene', 'calm water',
    'reflection', 'morning', 'scenic', 'wilderness', 'peaceful', 'outdoor',
    'travel', 'adventure', 'hiking', 'panorama', 'dawn', 'mist', 'valley',
    'peak', 'blue sky', 'green forest', 'rocky shore', 'tranquil',
  ];

  it('rates strong benign metadata as EXCELLENT with the default feedback', () => {
    const score = evaluateMetadataQuality(
      'A mountain landscape at sunrise with calm lake reflection',
      benignKeywords,
      'Landscapes',
    );
    expect(score.totalScore).toBe(98);
    expect(score.rating).toBe('EXCELLENT');
    expect(score.breakdown.relevance).toBe(20);
    expect(score.breakdown.ipSafety).toBe(20);
    expect(score.breakdown.keywordCount).toBe(15);
    expect(score.breakdown.titleQuality).toBe(10);
    expect(score.feedback).toEqual([
      'Metadata complies with Adobe Stock formatting, keyword priority, and brand safety guidelines.',
    ]);
  });

  it('downgrades short titles and thin keyword sets to GOOD with feedback', () => {
    const score = evaluateMetadataQuality('Short', ['mountain', 'lake']);
    expect(score.totalScore).toBe(85);
    expect(score.rating).toBe('GOOD');
    expect(score.breakdown.titleQuality).toBe(5);
    expect(score.breakdown.keywordCount).toBe(7);
    expect(score.feedback.some((f) => f.includes('too short'))).toBe(true);
    expect(score.feedback.some((f) => f.includes('Fewer than 15 keywords'))).toBe(true);
  });

  it('penalizes IP signals in metadata and drops to NEEDS_REVIEW', () => {
    const score = evaluateMetadataQuality('Short', ['nike', 'disney', 'lake']);
    expect(score.breakdown.ipSafety).toBe(4);
    expect(score.totalScore).toBe(69);
    expect(score.rating).toBe('NEEDS_REVIEW');
    expect(score.feedback.some((f) => f.includes('IP signals'))).toBe(true);
    expect(score.feedback.some((f) => f.includes('Nike Brand'))).toBe(true);
  });

  it('penalizes overly long titles', () => {
    const score = evaluateMetadataQuality(
      'A '.repeat(50).trim(),
      benignKeywords,
    );
    expect(score.breakdown.titleQuality).toBe(7);
    expect(score.feedback.some((f) => f.includes('overly lengthy'))).toBe(true);
  });

  it('penalizes keyword lists above the 49 cap', () => {
    const many = Array.from({ length: 55 }, (_, i) => `keyword${i + 1}`);
    const score = evaluateMetadataQuality('A mountain landscape at sunrise', many);
    expect(score.breakdown.keywordCount).toBe(10);
    expect(score.feedback.some((f) => f.includes('Exceeds 49 keywords'))).toBe(true);
  });

  it('breakdown always sums to the total score', () => {
    const score = evaluateMetadataQuality('Short', ['nike', 'disney', 'lake']);
    const { relevance, specificity, searchIntent, ipSafety, keywordCount, titleQuality } = score.breakdown;
    expect(relevance + specificity + searchIntent + ipSafety + keywordCount + titleQuality).toBe(score.totalScore);
  });
});
