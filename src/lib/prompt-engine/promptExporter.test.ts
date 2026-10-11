import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  sanitizeFilenameSlug,
  generateExportFilename,
  UniversalPromptExporter,
} from './promptExporter';
import { generateTxtContent } from './txtExporter';
import { generateCsvContent } from './csvExporter';
import type { GeneratedStockPrompt } from './promptSchema';

function makePrompt(overrides: Partial<GeneratedStockPrompt> = {}): GeneratedStockPrompt {
  return {
    id: 'p-1',
    number: 1,
    subject: 'Test Subject',
    instructions: 'Test instructions',
    prompt: 'A simple test prompt',
    category: 'Nature',
    subcategory: 'Landscape',
    contentType: 'Photo',
    commercialUse: 'Advertising',
    aspectRatio: '16:9',
    negativeSpace: 'None',
    copySpace: 'Right',
    ipRisk: 'LOW RISK',
    similarityStatus: 'DISTINCT',
    createdAt: 1728566400000,
    ...overrides,
  };
}

interface CapturedBlob { blob: Blob }
interface CapturedClick { href: string; download: string }

let capturedBlobs: CapturedBlob[] = [];
let capturedClicks: CapturedClick[] = [];
let capturedBlobParts: BlobPart[][] = [];

function installDownloadStubs(): void {
  capturedBlobs = [];
  capturedClicks = [];
  capturedBlobParts = [];
  const g = globalThis as any;
  const RealBlob: typeof Blob = g.Blob;
  // NOTE: Node's Blob implementation strips a leading U+FEFF from string parts,
  // so the BOM contract is verified against the raw Blob constructor parts
  // rather than blob.text().
  g.Blob = class extends RealBlob {
    constructor(parts: BlobPart[], options?: BlobPropertyBag) {
      super(parts, options);
      capturedBlobParts.push(parts);
    }
  };
  g.URL.createObjectURL = (blob: Blob): string => {
    capturedBlobs.push({ blob });
    return `blob:mock-${capturedBlobs.length}`;
  };
  g.URL.revokeObjectURL = (): void => {};
  g.document = {
    createElement: (_tag: string) => {
      const el: any = {
        href: '',
        download: '',
        click(): void {
          capturedClicks.push({ href: this.href, download: this.download });
        },
      };
      return el;
    },
    body: {
      appendChild: (): void => {},
      removeChild: (): void => {},
    },
  };
}

/** Raw string handed to the Blob constructor (BOM intact, unlike blob.text()). */
function lastBlobRaw(): string {
  const parts = capturedBlobParts[capturedBlobParts.length - 1];
  return String(parts[0]);
}

const todayUtc = new Date().toISOString().split('T')[0];

describe('sanitizeFilenameSlug', () => {
  it('returns "prompts" for empty input', () => {
    expect(sanitizeFilenameSlug('')).toBe('prompts');
  });

  it('lowercases and converts spaces to dashes', () => {
    expect(sanitizeFilenameSlug('My Cool Subject')).toBe('my-cool-subject');
  });

  it('strips characters outside a-z0-9, collapsing runs to one dash', () => {
    expect(sanitizeFilenameSlug('Hello, World! (2024)')).toBe('hello-world-2024');
  });

  it('trims leading and trailing dashes', () => {
    expect(sanitizeFilenameSlug('---hello---')).toBe('hello');
  });

  it('returns "prompts" when nothing alphanumeric remains', () => {
    expect(sanitizeFilenameSlug('!!! ???')).toBe('prompts');
    expect(sanitizeFilenameSlug('---')).toBe('prompts');
  });

  it('caps the slug at 32 characters', () => {
    const slug = sanitizeFilenameSlug('a'.repeat(100));
    expect(slug).toHaveLength(32);
    expect(slug).toBe('a'.repeat(32));
  });

  it('preserves digits', () => {
    expect(sanitizeFilenameSlug('Batch 2024 v2')).toBe('batch-2024-v2');
  });

  it('handles Unicode by replacing it with dashes (then trimming)', () => {
    // Non-latin letters are not in [a-z0-9], so they become separators
    expect(sanitizeFilenameSlug('বাংলা test')).toBe('test');
  });
});

describe('generateExportFilename', () => {
  it('builds sweetprompts-<slug>-<date>.txt', () => {
    expect(generateExportFilename('My Subject', 'txt')).toBe(
      `sweetprompts-my-subject-${todayUtc}.txt`,
    );
  });

  it('builds sweetprompts-<slug>-<date>.csv', () => {
    expect(generateExportFilename('My Subject', 'csv')).toBe(
      `sweetprompts-my-subject-${todayUtc}.csv`,
    );
  });

  it('falls back to the "prompts" slug for an empty subject', () => {
    expect(generateExportFilename('', 'txt')).toBe(`sweetprompts-prompts-${todayUtc}.txt`);
  });

  it('uses the default empty subject when called without one', () => {
    expect(generateExportFilename(undefined, 'csv')).toBe(`sweetprompts-prompts-${todayUtc}.csv`);
  });
});

describe('UniversalPromptExporter.downloadTXT', () => {
  beforeEach(() => {
    installDownloadStubs();
  });

  it('does nothing when the prompt list is empty', () => {
    UniversalPromptExporter.downloadTXT([]);
    expect(capturedBlobs).toHaveLength(0);
    expect(capturedClicks).toHaveLength(0);
  });

  it('does nothing for null/undefined input', () => {
    UniversalPromptExporter.downloadTXT(null as never);
    UniversalPromptExporter.downloadTXT(undefined as never);
    expect(capturedBlobs).toHaveLength(0);
  });

  it('uses customFilename when provided', () => {
    UniversalPromptExporter.downloadTXT([makePrompt()], { customFilename: 'custom-name.txt' });
    expect(capturedClicks).toHaveLength(1);
    expect(capturedClicks[0].download).toBe('custom-name.txt');
  });

  it('generates a filename from the subject otherwise', () => {
    UniversalPromptExporter.downloadTXT([makePrompt({ subject: 'My Subject' })]);
    expect(capturedClicks[0].download).toBe(`sweetprompts-my-subject-${todayUtc}.txt`);
  });

  it('downloads the exact content produced by generateTxtContent', () => {
    const prompts = [makePrompt({ prompt: 'বাংলা প্রম্পট 🌅' })];
    UniversalPromptExporter.downloadTXT(prompts, { subject: 'S', instructions: 'I' });
    const raw = lastBlobRaw();
    expect(raw.slice(1)).toBe(generateTxtContent(prompts, { subject: 'S', instructions: 'I' }));
    expect(raw.charCodeAt(0)).toBe(0xfeff); // BOM present
  });
});

describe('UniversalPromptExporter.downloadCSV', () => {
  beforeEach(() => {
    installDownloadStubs();
  });

  it('does nothing when the prompt list is empty', () => {
    UniversalPromptExporter.downloadCSV([]);
    expect(capturedBlobs).toHaveLength(0);
    expect(capturedClicks).toHaveLength(0);
  });

  it('uses customFilename when provided', () => {
    UniversalPromptExporter.downloadCSV([makePrompt()], { customFilename: 'custom.csv' });
    expect(capturedClicks[0].download).toBe('custom.csv');
  });

  it('generates a filename from the subject otherwise', () => {
    UniversalPromptExporter.downloadCSV([makePrompt({ subject: 'CSV Subject' })]);
    expect(capturedClicks[0].download).toBe(`sweetprompts-csv-subject-${todayUtc}.csv`);
  });

  it('downloads the exact content produced by generateCsvContent, with BOM', () => {
    const prompts = [makePrompt({ prompt: 'a, "b"\nc' })];
    UniversalPromptExporter.downloadCSV(prompts);
    const raw = lastBlobRaw();
    expect(raw.charCodeAt(0)).toBe(0xfeff);
    expect(raw.slice(1)).toBe(generateCsvContent(prompts));
  });
});

describe('UniversalPromptExporter.copyAllToClipboard', () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText } },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves false and writes nothing for an empty list', async () => {
    const result = await UniversalPromptExporter.copyAllToClipboard([]);
    expect(result).toBe(false);
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies prompts in numbered PROMPT NN format', async () => {
    const result = await UniversalPromptExporter.copyAllToClipboard([
      makePrompt({ prompt: 'first' }),
      makePrompt({ prompt: 'second' }),
    ]);
    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith('PROMPT 01\nfirst\n\nPROMPT 02\nsecond');
  });

  it('zero-pads numbers and trims trailing whitespace', async () => {
    await UniversalPromptExporter.copyAllToClipboard([makePrompt({ prompt: 'only' })]);
    const text: string = writeText.mock.calls[0][0];
    expect(text).toBe('PROMPT 01\nonly');
    expect(text.endsWith('\n')).toBe(false);
  });

  it('resolves false when the clipboard write rejects', async () => {
    writeText.mockRejectedValueOnce(new Error('denied'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await UniversalPromptExporter.copyAllToClipboard([makePrompt()]);
    expect(result).toBe(false);
    errSpy.mockRestore();
  });
});
