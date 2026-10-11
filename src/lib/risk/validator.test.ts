import { describe, it, expect } from 'vitest';
import { validateStockRisk } from './validator';
import { RISK_RULES, type RiskRule } from './rules';

describe('RISK_RULES structure', () => {
  it('contains a non-empty set of rules', () => {
    expect(Array.isArray(RISK_RULES)).toBe(true);
    expect(RISK_RULES.length).toBeGreaterThan(10);
  });

  it('every rule has the required fields with valid values', () => {
    const categories: RiskRule['category'][] = [
      'Human Face', 'Brand', 'Entertainment', 'Technology', 'Celebrity',
      'Property', 'Text', 'Artist Style', 'Prohibited Content',
    ];
    for (const rule of RISK_RULES) {
      expect(rule.pattern).toBeInstanceOf(RegExp);
      expect(rule.term.length).toBeGreaterThan(0);
      expect(categories).toContain(rule.category);
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(rule.level);
      expect(rule.reason.length).toBeGreaterThan(0);
      expect(rule.recommendation.length).toBeGreaterThan(0);
    }
  });

  it('covers trademark, copyrighted character, artist style and restricted subjects', () => {
    const terms = RISK_RULES.map((r) => r.term);
    expect(terms.some((t) => /brand/i.test(t))).toBe(true);
    expect(terms.some((t) => /character|franchise/i.test(t))).toBe(true);
    expect(terms.some((t) => /artist/i.test(t))).toBe(true);
    expect(terms.some((t) => /logo|watermark/i.test(t))).toBe(true);
  });
});

describe('validateStockRisk — empty and benign input', () => {
  it('returns SAFE with empty findings for an empty string', () => {
    const result = validateStockRisk('');
    expect(result.overall).toBe('SAFE');
    expect(result.findings).toEqual([]);
    expect(result.summary).toContain('No text provided');
  });

  it('returns SAFE for whitespace-only input', () => {
    const result = validateStockRisk('   ');
    expect(result.overall).toBe('SAFE');
    expect(result.findings).toHaveLength(0);
  });

  it('returns SAFE for a benign landscape prompt', () => {
    const result = validateStockRisk('a peaceful mountain lake at sunrise with soft morning mist');
    expect(result.overall).toBe('SAFE');
    expect(result.findings).toHaveLength(0);
    expect(result.summary).toContain('No major trademark');
  });

  it('does not flag generic commercial words like "business" or "modern"', () => {
    const result = validateStockRisk('modern business office interior, clean professional workspace');
    expect(result.overall).toBe('SAFE');
    expect(result.findings).toHaveLength(0);
  });
});

describe('validateStockRisk — trademark and brand detection', () => {
  it('flags Nike as a HIGH risk brand reference', () => {
    const result = validateStockRisk('a pair of Nike running shoes on a track');
    expect(result.overall).toBe('HIGH');
    expect(result.findings.some((f) => f.term === 'Luxury / Sportswear Brand')).toBe(true);
    const finding = result.findings.find((f) => f.term === 'Luxury / Sportswear Brand')!;
    expect(finding.level).toBe('HIGH');
    expect(finding.category).toBe('Brand');
    expect(finding.recommendation.length).toBeGreaterThan(0);
  });

  it('flags automotive trademarks such as Tesla', () => {
    const result = validateStockRisk('red Tesla parked on a city street');
    expect(result.overall).toBe('HIGH');
    expect(result.findings.some((f) => f.term === 'Automotive Brand / Trademark')).toBe(true);
  });

  it('deduplicates findings when two brands share the same rule', () => {
    const result = validateStockRisk('Nike and Adidas sneakers');
    const brandFindings = result.findings.filter((f) => f.term === 'Luxury / Sportswear Brand');
    expect(brandFindings).toHaveLength(1);
  });

  it('flags explicit logo requests as HIGH plus a LOW explicit-keyword finding', () => {
    const result = validateStockRisk('design a company logo');
    expect(result.overall).toBe('HIGH');
    expect(result.findings.some((f) => f.term === 'Visible Corporate Logo / Trademark')).toBe(true);
    const keywordFinding = result.findings.find((f) => f.term === 'Explicit Trademark/Logo Keyword');
    expect(keywordFinding).toBeDefined();
    expect(keywordFinding!.level).toBe('LOW');
  });

  it('flags a bare "trademark" mention as LOW risk via the explicit-keyword fallback', () => {
    const result = validateStockRisk('verify trademark ownership status');
    expect(result.overall).toBe('LOW');
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].term).toBe('Explicit Trademark/Logo Keyword');
  });
});

describe('validateStockRisk — copyrighted characters and franchises', () => {
  it('flags Disney as a HIGH entertainment risk', () => {
    const result = validateStockRisk('Disney castle with fireworks at night');
    expect(result.overall).toBe('HIGH');
    expect(result.findings.some((f) => f.term === 'Copyrighted Character / Franchise')).toBe(true);
  });

  it('flags Pikachu as a copyrighted character', () => {
    const result = validateStockRisk('cute Pikachu illustration');
    expect(result.overall).toBe('HIGH');
    expect(result.findings.some((f) => f.term === 'Copyrighted Character / Franchise')).toBe(true);
  });

  it('flags Spider-Man', () => {
    const result = validateStockRisk('Spider-Man swinging through the city');
    expect(result.overall).toBe('HIGH');
  });
});

describe('validateStockRisk — artist style, celebrity, restricted subjects', () => {
  it('flags "in the style of <name>" references as HIGH', () => {
    const result = validateStockRisk('a painting in the style of John Smith');
    expect(result.overall).toBe('HIGH');
    expect(result.findings.some((f) => f.term === 'Living Artist / Creator Style Reference')).toBe(true);
    expect(result.findings[0].category).toBe('Artist Style');
  });

  it('flags celebrity likeness references', () => {
    const result = validateStockRisk('Taylor Swift performing on stage');
    expect(result.overall).toBe('HIGH');
    expect(result.findings.some((f) => f.term === 'Celebrity Likeness / Public Figure')).toBe(true);
  });

  it('flags recognizable human face close-ups as HIGH', () => {
    const result = validateStockRisk('close-up of human face, smiling');
    expect(result.overall).toBe('HIGH');
    expect(result.findings.some((f) => f.term === 'Recognizable Human Face / Portrait')).toBe(true);
  });

  it('flags watermark requests as HIGH with an additional LOW keyword finding', () => {
    const result = validateStockRisk('remove the watermark from the photo');
    expect(result.overall).toBe('HIGH');
    expect(result.findings.some((f) => f.term === 'Watermark or Signature Artifact')).toBe(true);
    expect(result.findings.some((f) => f.term === 'Explicit Trademark/Logo Keyword')).toBe(true);
  });

  it('flags government emblems and currency as prohibited HIGH risk', () => {
    const result = validateStockRisk('a police badge and a dollar bill on the desk');
    expect(result.overall).toBe('HIGH');
    expect(result.findings.some((f) => f.term === 'Official Government Emblem / Currency')).toBe(true);
  });

  it('flags restricted landmarks such as the Hollywood sign', () => {
    const result = validateStockRisk('the hollywood sign at sunset');
    expect(result.overall).toBe('HIGH');
    expect(result.findings.some((f) => f.term === 'Restricted Architectural Landmark')).toBe(true);
  });

  it('flags branded hardware like iPhone as HIGH technology risk', () => {
    const result = validateStockRisk('a hand holding an iPhone');
    expect(result.overall).toBe('HIGH');
    expect(result.findings.some((f) => f.term === 'Branded Hardware Device')).toBe(true);
  });
});

describe('validateStockRisk — MEDIUM and LOW overall levels', () => {
  it('reports MEDIUM overall for AI buzzword spam only', () => {
    const result = validateStockRisk('photorealistic masterpiece in 8k');
    expect(result.overall).toBe('MEDIUM');
    expect(result.findings.some((f) => f.term === 'AI Buzzword Spam Filter Trigger')).toBe(true);
    expect(result.findings[0].level).toBe('MEDIUM');
  });

  it('reports LOW overall for an operating-system trademark only', () => {
    const result = validateStockRisk('windows 11 desktop interface mockup');
    expect(result.overall).toBe('LOW');
    expect(result.findings.some((f) => f.term === 'Operating System Trademark')).toBe(true);
  });

  it('uses HIGH overall when both HIGH and MEDIUM findings exist', () => {
    const result = validateStockRisk('Nike shoes, photorealistic 8k masterpiece');
    expect(result.overall).toBe('HIGH');
    expect(result.findings.length).toBeGreaterThan(1);
  });

  it('summary counts the detected signals', () => {
    const result = validateStockRisk('Nike shoes, photorealistic 8k masterpiece');
    expect(result.summary).toContain(`${result.findings.length} potential risk signal(s)`);
  });
});
