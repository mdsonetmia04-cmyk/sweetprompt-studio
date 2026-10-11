import { describe, it, expect } from 'vitest';
import { ADOBE_STOCK_RULES } from './rules';

describe('ADOBE_STOCK_RULES', () => {
  it('exposes a version string', () => {
    expect(typeof ADOBE_STOCK_RULES.version).toBe('string');
    expect(ADOBE_STOCK_RULES.version).toBe('2026.1');
  });

  it('caps keywords at 49', () => {
    expect(ADOBE_STOCK_RULES.maxKeywords).toBe(49);
  });

  it('defines sane title length limits', () => {
    expect(ADOBE_STOCK_RULES.recommendedTitleLength).toBe(70);
    expect(ADOBE_STOCK_RULES.maxTitleLength).toBe(100);
    expect(ADOBE_STOCK_RULES.recommendedTitleLength).toBeLessThan(ADOBE_STOCK_RULES.maxTitleLength);
  });

  it('lists prohibited prompt references covering IP categories', () => {
    expect(ADOBE_STOCK_RULES.prohibitedPromptReferences.length).toBeGreaterThan(5);
    const joined = ADOBE_STOCK_RULES.prohibitedPromptReferences.join(' ').toLowerCase();
    expect(joined).toContain('brand names');
    expect(joined).toContain('copyrighted characters');
    expect(joined).toContain('artist names');
  });

  it('supports the three core content types', () => {
    expect([...ADOBE_STOCK_RULES.contentTypes]).toEqual(['Photo', 'Illustration', 'Vector']);
  });

  it('provides copy space options including None', () => {
    expect(ADOBE_STOCK_RULES.copySpaceOptions).toContain('None');
    expect(ADOBE_STOCK_RULES.copySpaceOptions).toContain('Left');
    expect(ADOBE_STOCK_RULES.copySpaceOptions.length).toBe(6);
  });

  it('enables all compliance check categories', () => {
    expect(ADOBE_STOCK_RULES.checks.metadataChecks).toBe(true);
    expect(ADOBE_STOCK_RULES.checks.ipChecks).toBe(true);
    expect(ADOBE_STOCK_RULES.checks.similarityChecks).toBe(true);
    expect(ADOBE_STOCK_RULES.checks.aiLabelReminder).toBe(true);
    expect(ADOBE_STOCK_RULES.checks.releaseReminder).toBe(true);
  });

  it('ships a non-empty compliance disclaimer', () => {
    expect(ADOBE_STOCK_RULES.complianceDisclaimer.length).toBeGreaterThan(50);
    expect(ADOBE_STOCK_RULES.complianceDisclaimer.toLowerCase()).toContain('not legal advice');
  });

  it('lists commercial use cases', () => {
    expect(ADOBE_STOCK_RULES.commercialUseCases.length).toBeGreaterThan(5);
  });
});
