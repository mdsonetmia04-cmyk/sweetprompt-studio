import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UniversalPromptGenerator } from './UniversalPromptGenerator';
import { AIManager } from '../ai/AIManager';
import type { GeneratedStockPrompt, GenerationProgress, PromptCount, UniversalPromptRequest } from './promptSchema';

// Stub the AI client: no network, no real keys. The real AIManager is an
// instance of AIManagerClass exposing generateText / generateStructured.
vi.mock('../ai/AIManager', () => ({
  AIManager: {
    generateStructured: vi.fn(),
    generateText: vi.fn()
  }
}));

type MockAI = {
  generateStructured: ReturnType<typeof vi.fn>;
  generateText: ReturnType<typeof vi.fn>;
};

const mockAI = AIManager as unknown as MockAI;

const LONG_PROMPTS = [
  'Freshly brewed espresso coffee in a ceramic cup on rustic wooden table with soft morning window light and gentle steam rising',
  'Overhead flat lay of roasted coffee beans scattered around burlap sack with green leaves and warm golden hour glow',
  'Barista hands pouring latte art in modern cafe interior with blurred shelves and cozy ambient evening lighting',
  'Iced coffee glass with condensation drops on marble counter beside croissant and soft daylight from large windows',
  'Vintage brass coffee grinder with whole beans in glass jar on dark slate surface with dramatic side lighting'
];

function mockStructuredResponse(prompts: string[]) {
  mockAI.generateStructured.mockResolvedValue({
    prompts: prompts.map(p => ({ prompt: p, commercialUse: 'Advertising', subcategory: 'Lifestyle' }))
  });
}

describe('UniversalPromptGenerator.constructFallbackPrompt', () => {
  it('builds a vector fallback for Vector content', () => {
    const prompt = UniversalPromptGenerator.constructFallbackPrompt('red fox', 'Vector');
    expect(prompt).toContain('Clean flat vector illustration of red fox');
    expect(prompt).toContain('#ffffff');
  });

  it('builds a cutout fallback for PNG and Cutout content', () => {
    for (const contentType of ['PNG', 'Cutout']) {
      const prompt = UniversalPromptGenerator.constructFallbackPrompt('red balloon', contentType);
      expect(prompt).toContain('Isolated high-contrast cut-out commercial element of red balloon');
      expect(prompt).toContain('zero drop shadows');
    }
  });

  it('builds a silhouette fallback for Silhouette content', () => {
    const prompt = UniversalPromptGenerator.constructFallbackPrompt('cheetah', 'Silhouette');
    expect(prompt).toContain('Clean sharp solid black silhouette of cheetah');
  });

  it('builds a photographic fallback by default', () => {
    const photo = UniversalPromptGenerator.constructFallbackPrompt('coffee', 'Photo');
    expect(photo).toContain('Professional commercial stock photography of coffee');

    const def = UniversalPromptGenerator.constructFallbackPrompt('coffee');
    expect(def).toContain('Professional commercial stock photography of coffee');

    const unknown = UniversalPromptGenerator.constructFallbackPrompt('coffee', '3D Render');
    expect(unknown).toContain('Professional commercial stock photography of coffee');
  });
});

describe('UniversalPromptGenerator.extractValidPromptText', () => {
  const LONG = 'A detailed commercial photograph of fresh coffee beans in burlap sacks with warm window light';

  it('falls back for null, undefined, empty or too-short input', () => {
    for (const bad of [null, undefined, '', '   ', 'tiny']) {
      const result = UniversalPromptGenerator.extractValidPromptText(bad, 'coffee', 'Photo');
      expect(result).toContain('Professional commercial stock photography of coffee');
    }
  });

  it('returns a valid long string trimmed of surrounding quotes and spaces', () => {
    const result = UniversalPromptGenerator.extractValidPromptText(`  "${LONG}"  `, 'coffee', 'Photo');
    expect(result).toBe(LONG);
  });

  it('extracts the prompt from an object with a prompt field', () => {
    const result = UniversalPromptGenerator.extractValidPromptText({ prompt: LONG }, 'coffee', 'Photo');
    expect(result).toBe(LONG);
  });

  it('extracts from alternative object fields (description, text, concept)', () => {
    expect(UniversalPromptGenerator.extractValidPromptText({ description: LONG }, 'coffee')).toBe(LONG);
    expect(UniversalPromptGenerator.extractValidPromptText({ text: LONG }, 'coffee')).toBe(LONG);
    expect(UniversalPromptGenerator.extractValidPromptText({ concept: LONG }, 'coffee')).toBe(LONG);
  });

  it('parses a JSON string containing a prompt object', () => {
    const json = JSON.stringify({ prompt: LONG, commercialUse: 'Advertising' });
    const result = UniversalPromptGenerator.extractValidPromptText(json, 'coffee', 'Photo');
    expect(result).toBe(LONG);
  });

  it('falls back when the JSON has no usable prompt field', () => {
    const result = UniversalPromptGenerator.extractValidPromptText('{"foo": "bar"}', 'coffee', 'Photo');
    expect(result).toContain('Professional commercial stock photography of coffee');
  });

  it('falls back when the object prompt is too short or looks like JSON', () => {
    const short = UniversalPromptGenerator.extractValidPromptText({ prompt: 'short' }, 'coffee', 'Photo');
    expect(short).toContain('Professional commercial stock photography of coffee');

    const jsonish = UniversalPromptGenerator.extractValidPromptText({ prompt: 'key": "value' }, 'coffee');
    expect(jsonish).toContain('Professional commercial stock photography of coffee');
  });
});

describe('UniversalPromptGenerator.parsePromptsFromRawText (private fallback parser)', () => {
  // Accessed via a typed cast: the method is real but not part of the public API.
  const internals = UniversalPromptGenerator as unknown as {
    parsePromptsFromRawText(
      rawText: string,
      expectedCount: number,
      subject: string,
      contentType?: string
    ): Array<{ prompt: string; commercialUse: string }>;
  };

  const line1 = 'A detailed commercial photograph of fresh coffee beans in burlap sacks with warm light';
  const line2 = 'Overhead view of roasted coffee beans scattered on dark slate with soft shadows';

  it('strips numbering, dashes and PROMPT prefixes from lines', () => {
    const raw = [`1. ${line1}`, `- ${line2}`, `PROMPT 3: ${line1}`].join('\n');
    const results = internals.parsePromptsFromRawText(raw, 3, 'coffee');
    expect(results).toHaveLength(3);
    expect(results[0].prompt).toBe(line1);
    expect(results[1].prompt).toBe(line2);
    expect(results[2].prompt).toBe(line1);
    for (const r of results) {
      expect(r.commercialUse).toBe('Commercial Stock');
    }
  });

  it('skips junk lines and pads up to the expected count with fallbacks', () => {
    const raw = ['{"not": "a prompt"}', 'short', '', line1].join('\n');
    const results = internals.parsePromptsFromRawText(raw, 3, 'coffee', 'Photo');
    expect(results).toHaveLength(3);
    expect(results[0].prompt).toBe(line1);
    expect(results[1].prompt).toContain('coffee variation 2');
    expect(results[2].prompt).toContain('coffee variation 3');
  });
});

describe('UniversalPromptGenerator.generateBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const request: UniversalPromptRequest = {
    subject: 'coffee',
    count: 5,
    contentType: 'Photo',
    sectionContext: 'Bulk Generator'
  };

  it('rejects when the subject is missing or blank', async () => {
    await expect(
      UniversalPromptGenerator.generateBatch({ subject: '', count: 5 })
    ).rejects.toThrow('A subject or topic is required');

    await expect(
      UniversalPromptGenerator.generateBatch({ subject: '   ', count: 5 })
    ).rejects.toThrow('A subject or topic is required');
  });

  it('generates exactly the requested count with structured metadata', async () => {
    mockStructuredResponse(LONG_PROMPTS);
    const progress: GenerationProgress[] = [];

    const result = await UniversalPromptGenerator.generateBatch(request, {
      onProgress: p => progress.push(p)
    });

    expect(result.prompts).toHaveLength(5);
    expect(result.requestedCount).toBe(5);
    expect(result.generatedCount).toBe(5);
    expect(result.subject).toBe('coffee');
    expect(result.section).toBe('Bulk Generator');
    expect(typeof result.diversityScore).toBe('number');
    expect(result.diversityScore).toBeGreaterThanOrEqual(0);
    expect(result.diversityScore).toBeLessThanOrEqual(100);
    expect(typeof result.timestamp).toBe('number');

    result.prompts.forEach((prompt: GeneratedStockPrompt, i: number) => {
      expect(prompt.number).toBe(i + 1);
      expect(prompt.id.startsWith('prm_')).toBe(true);
      expect(prompt.prompt.length).toBeGreaterThanOrEqual(20);
      expect(prompt.category).toBe('General Commercial');
      expect(prompt.commercialUse).toBe('Advertising');
      expect(prompt.subcategory).toBe('Lifestyle');
      expect(prompt.contentType).toBe('Photo');
      expect(prompt.ipRisk).toBe('LOW RISK');
      expect(typeof prompt.createdAt).toBe('number');
    });

    const ids = result.prompts.map(p => p.id);
    expect(new Set(ids).size).toBe(5);
  });

  it('reports progress through Analyze, Generate, Check and Refine in order', async () => {
    mockStructuredResponse(LONG_PROMPTS);
    const steps: string[] = [];

    await UniversalPromptGenerator.generateBatch(request, {
      onProgress: p => steps.push(p.step)
    });

    const firstIndex = (step: string) => steps.indexOf(step);
    expect(firstIndex('Analyze')).toBeGreaterThanOrEqual(0);
    expect(firstIndex('Generate')).toBeGreaterThan(firstIndex('Analyze'));
    expect(firstIndex('Check')).toBeGreaterThan(firstIndex('Generate'));
    expect(firstIndex('Refine')).toBeGreaterThan(firstIndex('Check'));
  });

  it('tracks sanitization of risky subjects and sets the notice', async () => {
    mockStructuredResponse(LONG_PROMPTS);

    const result = await UniversalPromptGenerator.generateBatch({
      subject: 'iphone product shot',
      count: 5
    });

    expect(result.sanitizedCount).toBe(1);
    expect(result.prompts[0].sanitizedNotice).toBe('Protected reference removed from prompt.');
    expect(result.prompts[0].ipRisk).toBe('LOW RISK');
    expect(result.subject).toBe('iphone product shot');
  });

  it('regenerates near-duplicate prompts via the AI client', async () => {
    const duplicate =
      'Freshly brewed espresso coffee in a ceramic cup on rustic wooden table with soft morning light';
    mockStructuredResponse([duplicate, duplicate, duplicate]);

    let replacements = 0;
    mockAI.generateText.mockImplementation(async () => {
      replacements += 1;
      return `Replacement concept ${replacements}: barista pouring oat milk latte art in a sunlit cafe with plants and warm bokeh`;
    });

    const result = await UniversalPromptGenerator.generateBatch({
      subject: 'coffee',
      count: 3 as PromptCount
    });

    // The duplicate-retry path calls fetchSingleReplacement for indices 1 and 2
    expect(mockAI.generateText).toHaveBeenCalled();
    expect(result.prompts).toHaveLength(3);
    expect(result.requestedCount).toBe(3);
    expect(result.generatedCount).toBe(3);
    for (const prompt of result.prompts) {
      expect(prompt.prompt.length).toBeGreaterThan(0);
    }
  });

  it('falls back to text parsing when structured generation throws', async () => {
    mockAI.generateStructured.mockRejectedValue(new Error('model unavailable'));
    const line1 = 'A detailed commercial photograph of fresh coffee beans in burlap sacks with warm light';
    const line2 = 'Overhead view of roasted coffee beans scattered on dark slate with soft shadows';
    mockAI.generateText.mockResolvedValue(`1. ${line1}\n2. ${line2}`);

    const result = await UniversalPromptGenerator.generateBatch({
      subject: 'coffee',
      count: 2 as PromptCount
    });

    expect(result.prompts).toHaveLength(2);
    expect(result.generatedCount).toBe(2);
  });
});
