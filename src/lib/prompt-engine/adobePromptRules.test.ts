import { describe, it, expect } from 'vitest';
import { ADOBE_PROMPT_CONSTRAINTS, getComplianceSystemInstruction } from './adobePromptRules';

describe('ADOBE_PROMPT_CONSTRAINTS', () => {
  it('exposes ten forbidden patterns, each with a RegExp and a reason', () => {
    expect(ADOBE_PROMPT_CONSTRAINTS.forbiddenPatterns).toHaveLength(10);
    for (const rule of ADOBE_PROMPT_CONSTRAINTS.forbiddenPatterns) {
      expect(rule.pattern).toBeInstanceOf(RegExp);
      expect(rule.reason.length).toBeGreaterThan(0);
    }
  });

  it('declares a negative prompt standard covering faces, logos and watermarks', () => {
    const standard = ADOBE_PROMPT_CONSTRAINTS.negativePromptStandard;
    expect(standard).toContain('no human faces');
    expect(standard).toContain('no logos');
    expect(standard).toContain('no watermarks');
    expect(standard).toContain('no copyrighted characters');
  });

  describe('forbidden pattern detection', () => {
    const cases: Array<[string, string]> = [
      ['a close-up face of a model', 'Human face close-up'],
      ['in the style of Monet', 'Living artist or protected creator reference'],
      ['a disney castle', 'Protected entertainment franchise or studio'],
      ['a runner in nike shoes', 'Registered corporate brand / trademark'],
      ['mickey mouse waving', 'Copyrighted fictional character'],
      ['a speech by elon musk', 'Real public figure / celebrity likeness'],
      ['rendered in 8k octane render', 'Low-quality AI buzzword'],
      ['a guaranteed best seller', 'Forbidden market claim'],
      ['remove the watermark', 'Explicit logo or trademark mark request'],
      ['the eiffel tower at night', 'Restricted landmark / protected property']
    ];

    for (const [input, expectedReason] of cases) {
      it(`flags "${input}"`, () => {
        const rule = ADOBE_PROMPT_CONSTRAINTS.forbiddenPatterns.find(r => r.pattern.test(input));
        expect(rule).toBeDefined();
        expect(rule?.reason).toContain(expectedReason);
      });
    }

    it('does not flag ordinary commercial subjects', () => {
      const clean = 'a red balloon floating over green hills at sunrise';
      const hit = ADOBE_PROMPT_CONSTRAINTS.forbiddenPatterns.find(r => r.pattern.test(clean));
      expect(hit).toBeUndefined();
    });
  });
});

describe('getComplianceSystemInstruction', () => {
  it('defaults to photo guidance', () => {
    const instruction = getComplianceSystemInstruction();
    expect(instruction).toContain('Content Type: Photo');
    expect(instruction).toContain('faceless or anonymous');
  });

  it('selects vector guidance for Vector content', () => {
    const instruction = getComplianceSystemInstruction('Vector');
    expect(instruction).toContain('Content Type: Vector');
    expect(instruction).toContain('clean vector-friendly');
  });

  it('selects PNG cutout guidance for PNG and Cutout content', () => {
    for (const contentType of ['PNG', 'Cutout']) {
      const instruction = getComplianceSystemInstruction(contentType);
      expect(instruction).toContain('STRICT PNG CUTOUT ISOLATION');
    }
  });

  it('selects illustration guidance for Illustration content', () => {
    const instruction = getComplianceSystemInstruction('Illustration');
    expect(instruction).toContain('editorial color palettes');
  });

  it('selects silhouette guidance for Silhouette content', () => {
    const instruction = getComplianceSystemInstruction('Silhouette');
    expect(instruction).toContain('solid black silhouettes');
  });

  it('always includes the core compliance rules and negative constraints', () => {
    for (const contentType of ['Photo', 'Vector', 'PNG', 'Illustration', 'Silhouette']) {
      const instruction = getComplianceSystemInstruction(contentType);
      expect(instruction).toContain('NO HUMAN FACES');
      expect(instruction).toContain('NO LOGOS & NO TRADEMARKS');
      expect(instruction).toContain('NO SPAM BUZZWORDS');
      expect(instruction).toContain('no human faces, no recognizable face');
    }
  });

  it('warns against false safety claims', () => {
    const instruction = getComplianceSystemInstruction('Photo');
    expect(instruction).toContain('Never claim "Adobe Approved"');
  });
});
