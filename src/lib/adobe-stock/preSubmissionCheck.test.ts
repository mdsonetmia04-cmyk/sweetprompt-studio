import { describe, it, expect } from 'vitest';
import { runPreSubmissionCheck, type PreSubmissionItem } from './preSubmissionCheck';

const benignKeywords = [
  'mountain', 'lake', 'sunrise', 'landscape', 'nature', 'serene', 'calm water',
  'reflection', 'morning', 'scenic', 'wilderness', 'peaceful', 'outdoor',
  'travel', 'adventure', 'hiking', 'panorama', 'dawn', 'mist', 'valley',
  'peak', 'blue sky', 'green forest', 'rocky shore', 'tranquil',
];

function getItem(report: ReturnType<typeof runPreSubmissionCheck>, id: string): PreSubmissionItem {
  const item = report.items.find((i) => i.id === id);
  if (!item) throw new Error(`missing checklist item: ${id}`);
  return item;
}

describe('runPreSubmissionCheck — report structure', () => {
  it('returns the full 17-item checklist with typed statuses', () => {
    const report = runPreSubmissionCheck({ prompt: 'a tranquil mountain lake' });
    expect(report.items).toHaveLength(17);
    for (const item of report.items) {
      expect(item.id.length).toBeGreaterThan(0);
      expect(item.label.length).toBeGreaterThan(0);
      expect(['Safety', 'Quality', 'Metadata', 'Legal']).toContain(item.category);
      expect(['PASS', 'WARNING', 'FAIL']).toContain(item.status);
      expect(item.detail.length).toBeGreaterThan(0);
    }
  });

  it('always requires the AI label and ships release notices', () => {
    const report = runPreSubmissionCheck({ prompt: 'a tranquil mountain lake' });
    expect(report.aiLabelRequired).toBe(true);
    expect(report.modelReleaseNotice.length).toBeGreaterThan(0);
    expect(report.propertyReleaseNotice.length).toBeGreaterThan(0);
  });
});

describe('runPreSubmissionCheck — GREEN path', () => {
  it('passes a clean, fully-specified submission', () => {
    const report = runPreSubmissionCheck({
      prompt: 'a tranquil mountain lake at sunrise, seen from a wide angle',
      title: 'Calm mountain lake at sunrise',
      keywords: benignKeywords,
      category: 'Landscapes',
    });
    expect(report.overallStatus).toBe('GREEN');
    expect(report.headline).toContain('All Adobe Stock compliance checks passed');
    expect(report.items.every((i) => i.status === 'PASS')).toBe(true);
  });
});

describe('runPreSubmissionCheck — RED paths (hard fails)', () => {
  it('fails on trademarked brand names', () => {
    const report = runPreSubmissionCheck({ prompt: 'nike sneakers product shot' });
    expect(report.overallStatus).toBe('RED');
    expect(getItem(report, 'no-trademark').status).toBe('FAIL');
    expect(report.headline).toContain('Critical compliance issues');
  });

  it('fails on recognizable human faces', () => {
    const report = runPreSubmissionCheck({ prompt: 'close-up of human face portrait' });
    expect(report.overallStatus).toBe('RED');
    expect(getItem(report, 'no-human-face').status).toBe('FAIL');
  });

  it('fails on copyrighted characters and franchises', () => {
    const report = runPreSubmissionCheck({ prompt: 'disney castle illustration' });
    expect(report.overallStatus).toBe('RED');
    expect(getItem(report, 'no-character').status).toBe('FAIL');
  });

  it('fails on artist-name references', () => {
    const report = runPreSubmissionCheck({ prompt: 'a portrait in the style of Greg Rutkowski' });
    expect(report.overallStatus).toBe('RED');
    expect(getItem(report, 'no-artist-ref').status).toBe('FAIL');
  });

  it('fails on real-person references', () => {
    const report = runPreSubmissionCheck({ prompt: 'taylor swift on stage' });
    expect(report.overallStatus).toBe('RED');
    expect(getItem(report, 'no-real-person').status).toBe('FAIL');
  });

  it('fails on restricted landmarks', () => {
    const report = runPreSubmissionCheck({ prompt: 'eiffel tower at night' });
    expect(report.overallStatus).toBe('RED');
    expect(getItem(report, 'no-restricted-landmarks').status).toBe('FAIL');
  });

  it('fails on watermark mentions', () => {
    const report = runPreSubmissionCheck({ prompt: 'landscape with a small watermark overlay' });
    expect(report.overallStatus).toBe('RED');
    expect(getItem(report, 'no-watermark').status).toBe('FAIL');
  });
});

describe('runPreSubmissionCheck — YELLOW paths (warnings)', () => {
  it('warns on spam buzzwords without failing', () => {
    const report = runPreSubmissionCheck({
      prompt: 'photorealistic 8k mountain render',
      title: 'Mountain render',
      keywords: benignKeywords,
      category: 'Landscapes',
    });
    expect(report.overallStatus).toBe('YELLOW');
    expect(getItem(report, 'no-spam-buzzwords').status).toBe('WARNING');
    expect(report.headline).toContain('Review recommended');
  });

  it('warns when metadata is thin or missing', () => {
    const report = runPreSubmissionCheck({ prompt: 'a tranquil mountain lake' });
    expect(getItem(report, 'accurate-title').status).toBe('WARNING');
    expect(getItem(report, 'relevant-keywords').status).toBe('WARNING');
    expect(getItem(report, 'category-selected').status).toBe('WARNING');
    expect(report.overallStatus).toBe('YELLOW');
  });

  it('warns on title length outside the 10–80 range', () => {
    const tooShort = runPreSubmissionCheck({ prompt: 'lake', title: 'Lake' });
    expect(getItem(tooShort, 'accurate-title').status).toBe('WARNING');

    const okLength = runPreSubmissionCheck({ prompt: 'lake', title: 'A calm mountain lake' });
    expect(getItem(okLength, 'accurate-title').status).toBe('PASS');
  });

  it('warns about releases when people are present', () => {
    const report = runPreSubmissionCheck({
      prompt: 'two hikers on a mountain trail, seen from behind',
      title: 'Hikers on a mountain trail',
      keywords: benignKeywords,
      category: 'Landscapes',
      hasPeople: true,
    });
    expect(getItem(report, 'release-requirement').status).toBe('WARNING');
    expect(report.overallStatus).toBe('YELLOW');
  });

  it('warns about property releases for private property', () => {
    const report = runPreSubmissionCheck({
      prompt: 'a modern house exterior',
      title: 'Modern house exterior',
      keywords: benignKeywords,
      category: 'Architecture',
      hasProperty: true,
    });
    expect(getItem(report, 'release-requirement').status).toBe('WARNING');
  });
});

describe('runPreSubmissionCheck — always-on checks', () => {
  it('keeps anatomical and artifact checks as PASS informational items', () => {
    const report = runPreSubmissionCheck({ prompt: 'anything at all' });
    expect(getItem(report, 'no-anatomical-errors').status).toBe('PASS');
    expect(getItem(report, 'no-visual-artifacts').status).toBe('PASS');
  });

  it('keeps the AI label reminder as a PASS legal item', () => {
    const report = runPreSubmissionCheck({ prompt: 'anything at all' });
    expect(getItem(report, 'ai-label-reminder').status).toBe('PASS');
    expect(getItem(report, 'ai-label-reminder').category).toBe('Legal');
  });
});
