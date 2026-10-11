import { describe, it, expect } from 'vitest';
import { PROMPT_COUNT_OPTIONS } from './promptSchema';
import type { PromptCount } from './promptSchema';

describe('PROMPT_COUNT_OPTIONS', () => {
  it('exposes exactly the seven supported prompt counts', () => {
    expect(PROMPT_COUNT_OPTIONS).toEqual([1, 5, 10, 15, 20, 25, 30]);
  });

  it('includes the counts listed in the generator spec (1, 5, 10, 15, 20, 30)', () => {
    for (const count of [1, 5, 10, 15, 20, 30] as const) {
      expect(PROMPT_COUNT_OPTIONS).toContain(count);
    }
  });

  it('is sorted in ascending order', () => {
    const sorted = [...PROMPT_COUNT_OPTIONS].sort((a, b) => a - b);
    expect(PROMPT_COUNT_OPTIONS).toEqual(sorted);
  });

  it('contains no duplicate counts', () => {
    expect(new Set(PROMPT_COUNT_OPTIONS).size).toBe(PROMPT_COUNT_OPTIONS.length);
  });

  it('only contains integers within the 1-30 boundary', () => {
    for (const count of PROMPT_COUNT_OPTIONS) {
      expect(Number.isInteger(count)).toBe(true);
      expect(count).toBeGreaterThanOrEqual(1);
      expect(count).toBeLessThanOrEqual(30);
    }
  });

  it('is assignable to the PromptCount union type', () => {
    const third: PromptCount = PROMPT_COUNT_OPTIONS[2];
    expect(third).toBe(10);
  });
});
