import { describe, it, expect } from 'vitest';
import { IP_RULES, findIPRisks } from './ipRules';

describe('IP_RULES structure', () => {
  it('contains a comprehensive rule set', () => {
    expect(IP_RULES.length).toBeGreaterThan(30);
  });

  it('every rule carries term, category, level, reason and a safe alternative', () => {
    for (const rule of IP_RULES) {
      expect(rule.pattern).toBeInstanceOf(RegExp);
      expect(rule.term.length).toBeGreaterThan(0);
      expect(['HIGH', 'MEDIUM']).toContain(rule.level);
      expect(rule.reason.length).toBeGreaterThan(0);
      expect(rule.safeAlternative.length).toBeGreaterThan(0);
      // safe alternatives must be generic: no famous brand names
      expect(/\bnike\b|\bdisney\b|\bapple\b/i.test(rule.safeAlternative)).toBe(false);
    }
  });
});

describe('findIPRisks — input guards', () => {
  it('returns an empty array for empty input', () => {
    expect(findIPRisks('')).toEqual([]);
  });

  it('returns an empty array for non-string input', () => {
    expect(findIPRisks(null as unknown as string)).toEqual([]);
    expect(findIPRisks(undefined as unknown as string)).toEqual([]);
  });

  it('returns an empty array for a benign landscape prompt', () => {
    expect(findIPRisks('a tranquil forest landscape at dawn with soft light')).toEqual([]);
  });

  it('is case-insensitive', () => {
    const lower = findIPRisks('nike shoes');
    const upper = findIPRisks('NIKE SHOES');
    expect(lower.length).toBeGreaterThan(0);
    expect(upper.length).toBeGreaterThan(0);
    expect(lower[0].term).toBe(upper[0].term);
  });
});

describe('findIPRisks — brand and trademark detection', () => {
  it('flags Nike with HIGH level and a generic alternative', () => {
    const [match] = findIPRisks('nike air jordan sneakers on white background');
    expect(match.term).toBe('Nike Brand');
    expect(match.category).toBe('Brand');
    expect(match.level).toBe('HIGH');
    expect(match.rawMatch.toLowerCase()).toBe('nike');
    expect(match.safeAlternative.toLowerCase()).toContain('unbranded');
  });

  it('flags Apple hardware trademarks', () => {
    const matches = findIPRisks('person using a macbook pro');
    expect(matches.some((m) => m.term === 'Apple Brand & Devices')).toBe(true);
  });

  it('flags Coca-Cola beverage trademarks', () => {
    const matches = findIPRisks('coca-cola bottle with condensation');
    expect(matches.some((m) => m.term === 'Beverage Trademark')).toBe(true);
  });

  it('flags Tesla', () => {
    const matches = findIPRisks('cybertruck driving through the desert');
    expect(matches.some((m) => m.term === 'Tesla Brand')).toBe(true);
  });

  it('flags a bare "logo" keyword as a trademark signal', () => {
    const matches = findIPRisks('a minimalist logo concept sketch');
    expect(matches).toHaveLength(1);
    expect(matches[0].term).toBe('Visible Trademark / Logo Keyword');
    expect(matches[0].level).toBe('HIGH');
  });

  it('does not double-report logo keywords already covered by a rule', () => {
    const matches = findIPRisks('brand logo on a storefront');
    expect(matches.some((m) => m.term === 'Visible Corporate Logo / Trademark')).toBe(true);
    expect(matches.some((m) => m.term === 'Visible Trademark / Logo Keyword')).toBe(false);
  });

  it('flags watermark references', () => {
    const matches = findIPRisks('getty watermark in the corner');
    expect(matches.some((m) => m.term === 'Watermark / Signature / Stamp')).toBe(true);
  });
});

describe('findIPRisks — characters, franchises and artists', () => {
  it('flags Disney/Pixar franchise references', () => {
    const matches = findIPRisks('disney castle fireworks show');
    expect(matches.some((m) => m.term === 'Disney / Pixar Franchise')).toBe(true);
    expect(matches[0].category).toBe('Franchise');
  });

  it('flags Spider-Man as a fictional character', () => {
    const matches = findIPRisks('spider-man swinging through the city');
    expect(matches.some((m) => m.term === 'Spider-Man Character')).toBe(true);
    expect(matches.some((m) => m.category === 'Fictional Character')).toBe(true);
  });

  it('flags Star Wars universe references', () => {
    const matches = findIPRisks('lightsaber duel on a desert planet');
    expect(matches.some((m) => m.term === 'Star Wars Universe')).toBe(true);
  });

  it('flags "in the style of" artist references (both generic and named rules)', () => {
    const matches = findIPRisks('a portrait in the style of Greg Rutkowski');
    expect(matches).toHaveLength(2);
    expect(matches.every((m) => m.category === 'Artist Style')).toBe(true);
    expect(matches.some((m) => m.term === 'Artist/Creator Style Reference')).toBe(true);
  });

  it('flags celebrity and public figure likenesses', () => {
    const musk = findIPRisks('portrait of elon musk');
    expect(musk.some((m) => m.term === 'Tech Executive / Public Figure')).toBe(true);

    const swift = findIPRisks('taylor swift on stage');
    expect(swift.some((m) => m.term === 'Celebrity Musician / Performer')).toBe(true);

    const messi = findIPRisks('lionel messi scoring a goal');
    expect(messi.some((m) => m.term === 'Professional Athlete Likeness')).toBe(true);

    const obama = findIPRisks('barack obama giving a speech');
    expect(obama.some((m) => m.term === 'Political Figure')).toBe(true);
  });
});

describe('findIPRisks — faces, property and prohibited content', () => {
  it('flags human face close-ups', () => {
    const matches = findIPRisks('close-up of human face portrait');
    expect(matches).toHaveLength(1);
    expect(matches[0].term).toBe('Recognizable Human Face / Close-up Portrait');
    expect(matches[0].category).toBe('Human Face');
  });

  it('flags studio headshots as MEDIUM risk', () => {
    const matches = findIPRisks('corporate headshot of a professional');
    expect(matches.some((m) => m.term === 'Studio Headshot Portrait')).toBe(true);
    expect(matches.find((m) => m.term === 'Studio Headshot Portrait')!.level).toBe('MEDIUM');
  });

  it('flags restricted landmarks like the Eiffel Tower at night', () => {
    const matches = findIPRisks('eiffel tower at night with light show');
    expect(matches.some((m) => m.term === 'Restricted Architectural Landmark / Property')).toBe(true);
    expect(matches.some((m) => m.category === 'Protected Property')).toBe(true);
  });

  it('flags real currency depictions', () => {
    const matches = findIPRisks('a 100 dollar bill on the table');
    expect(matches.some((m) => m.term === 'Real Currency / Banknote Depiction')).toBe(true);
  });

  it('flags government badges and IDs', () => {
    const matches = findIPRisks('fbi badge on a desk');
    expect(matches.some((m) => m.term === 'Official Government Seal / ID / Badge')).toBe(true);
  });

  it('does not flag generic people words without face detail', () => {
    const matches = findIPRisks('two people walking on a beach, seen from behind');
    expect(matches.filter((m) => m.category === 'Human Face')).toHaveLength(0);
  });
});
