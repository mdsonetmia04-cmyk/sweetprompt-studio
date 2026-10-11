import { describe, it, expect, beforeEach } from 'vitest';
import { generateTxtContent, downloadTxtFile } from './txtExporter';
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

describe('generateTxtContent', () => {
  it('includes the SweetPrompt Studio branding header', () => {
    const txt = generateTxtContent([makePrompt()]);
    expect(txt).toContain('SweetPrompt Studio');
    expect(txt).toContain('Adobe Stock Prompt Batch');
  });

  it('uses subject/instructions from options when provided', () => {
    const txt = generateTxtContent([makePrompt()], {
      subject: 'Option Subject',
      instructions: 'Option instructions here',
    });
    expect(txt).toContain('Option Subject');
    expect(txt).toContain('Option instructions here');
  });

  it('falls back to the first prompt\u2019s subject/instructions', () => {
    const txt = generateTxtContent([makePrompt({ subject: 'Fallback Subj', instructions: 'Fallback instr' })]);
    expect(txt).toContain('Fallback Subj');
    expect(txt).toContain('Fallback instr');
  });

  it('uses placeholder defaults when the prompt list is empty', () => {
    const txt = generateTxtContent([]);
    expect(txt).toContain('Stock Concepts');
    expect(txt).toContain('None');
    expect(txt).toContain('Prompt Count:\n0');
    expect(txt).toContain('End of Batch (0 Prompts)');
  });

  it('embeds today\u2019s UTC date and the prompt count', () => {
    const txt = generateTxtContent([makePrompt(), makePrompt()]);
    expect(txt).toContain(todayUtc);
    expect(txt).toContain('Prompt Count:\n2');
  });

  it('numbers prompts zero-padded (01, 02, ...)', () => {
    const prompts = Array.from({ length: 3 }, (_, i) => makePrompt({ id: `p-${i}` }));
    const txt = generateTxtContent(prompts);
    expect(txt).toContain('PROMPT 01');
    expect(txt).toContain('PROMPT 02');
    expect(txt).toContain('PROMPT 03');
    expect(txt).not.toContain('PROMPT 1\n');
  });

  it('zero-pads double-digit numbers correctly', () => {
    const prompts = Array.from({ length: 10 }, (_, i) => makePrompt({ id: `p-${i}` }));
    const txt = generateTxtContent(prompts);
    expect(txt).toContain('PROMPT 10');
  });

  it('embeds each prompt body verbatim', () => {
    const prompts = [
      makePrompt({ prompt: 'First prompt body' }),
      makePrompt({ prompt: 'Second prompt body' }),
    ];
    const txt = generateTxtContent(prompts);
    expect(txt).toContain('First prompt body');
    expect(txt).toContain('Second prompt body');
  });

  it('does not truncate long prompts', () => {
    const longPrompt = 'বাংলা '.repeat(1000); // 7000 chars of Bangla text
    const txt = generateTxtContent([makePrompt({ prompt: longPrompt })]);
    expect(txt).toContain(longPrompt);
  });

  it('round-trips Unicode (Bangla, Japanese, emoji) in prompt bodies', () => {
    const prompt = 'ঢাকার রিকশা 🎨, 東京の夜景';
    const txt = generateTxtContent([makePrompt({ prompt })]);
    expect(txt).toContain(prompt);
  });

  it('renders the metadata line with actual values', () => {
    const txt = generateTxtContent([
      makePrompt({ commercialUse: 'Editorial', contentType: 'Vector', ipRisk: 'REVIEW' }),
    ]);
    expect(txt).toContain('[Commercial Use: Editorial | Type: Vector | IP Risk: REVIEW]');
  });

  it('falls back to defaults in the metadata line for missing values', () => {
    const txt = generateTxtContent([
      makePrompt({ commercialUse: '', contentType: '', ipRisk: '' as never }),
    ]);
    expect(txt).toContain('[Commercial Use: Commercial | Type: Photo | IP Risk: LOW RISK]');
  });

  it('ends with the End of Batch footer including the count', () => {
    const txt = generateTxtContent([makePrompt(), makePrompt(), makePrompt()]);
    expect(txt).toContain('End of Batch (3 Prompts)');
    expect(txt).toContain('SweetPrompt Studio - Stock Contributor Suite');
  });

  it('keeps multi-line prompts intact', () => {
    const txt = generateTxtContent([makePrompt({ prompt: 'line one\nline two\nline three' })]);
    expect(txt).toContain('line one\nline two\nline three');
  });
});

describe('downloadTxtFile', () => {
  beforeEach(() => {
    installDownloadStubs();
  });

  it('prepends a UTF-8 BOM (\\uFEFF) to the blob content', () => {
    const content = generateTxtContent([makePrompt()]);
    downloadTxtFile(content, 'batch.txt');
    expect(capturedBlobs).toHaveLength(1);
    const raw = lastBlobRaw();
    expect(raw.charCodeAt(0)).toBe(0xfeff);
    expect(raw.slice(1)).toBe(content);
  });

  it('sets the filename on the anchor and triggers a click', () => {
    downloadTxtFile('hello', 'batch.txt');
    expect(capturedClicks).toHaveLength(1);
    expect(capturedClicks[0].download).toBe('batch.txt');
  });

  it('creates the blob with a plain-text mime type', () => {
    downloadTxtFile('hello', 'batch.txt');
    expect(capturedBlobs[0].blob.type).toContain('text/plain');
  });
});
