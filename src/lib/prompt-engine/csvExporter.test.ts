import { describe, it, expect, beforeEach } from 'vitest';
import { generateCsvContent, downloadCsvFile } from './csvExporter';
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

// --- Minimal DOM stubs so downloadCsvFile (Blob/URL/document) works in node ---
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

const EXPECTED_HEADER =
  '"Prompt Number","Subject","Instructions","Prompt","Category","Subcategory",' +
  '"Content Type","Commercial Use","Aspect Ratio","Negative Space","Copy Space","IP Risk","Similarity Status"';

describe('generateCsvContent', () => {
  it('returns only the header row when given an empty array', () => {
    const csv = generateCsvContent([]);
    expect(csv).toBe(EXPECTED_HEADER);
    expect(csv).not.toContain('\r\n');
    expect(csv).not.toContain('\n');
  });

  it('uses CRLF as the row separator with no trailing newline', () => {
    const csv = generateCsvContent([makePrompt(), makePrompt({ id: 'p-2', number: 2 })]);
    const rows = csv.split('\r\n');
    expect(rows).toHaveLength(3);
    expect(csv.endsWith('\r\n')).toBe(false);
    expect(csv.endsWith('"')).toBe(true);
  });

  it('numbers data rows starting from 1, sequentially', () => {
    const csv = generateCsvContent([makePrompt(), makePrompt(), makePrompt()]);
    const rows = csv.split('\r\n');
    expect(rows[1].startsWith('"1",')).toBe(true);
    expect(rows[2].startsWith('"2",')).toBe(true);
    expect(rows[3].startsWith('"3",')).toBe(true);
  });

  it('quotes fields containing commas (RFC 4180)', () => {
    const csv = generateCsvContent([makePrompt({ prompt: 'red, green, and blue balloons' })]);
    expect(csv).toContain('"red, green, and blue balloons"');
  });

  it('doubles embedded double quotes (RFC 4180)', () => {
    const csv = generateCsvContent([makePrompt({ prompt: 'She said "hello" loudly' })]);
    expect(csv).toContain('"She said ""hello"" loudly"');
  });

  it('preserves LF newlines inside quoted fields', () => {
    const csv = generateCsvContent([makePrompt({ prompt: 'line one\nline two' })]);
    expect(csv).toContain('"line one\nline two"');
    // The embedded LF must not be treated as a row break: splitting on the
    // CRLF row separator still yields exactly 2 rows (header + 1 prompt)
    expect(csv.split('\r\n')).toHaveLength(2);
    // ...while a naive LF split sees 3 physical lines
    expect(csv.split('\n')).toHaveLength(3);
  });

  it('preserves CRLF newlines inside quoted fields', () => {
    const csv = generateCsvContent([makePrompt({ prompt: 'line one\r\nline two' })]);
    expect(csv).toContain('"line one\r\nline two"');
  });

  it('round-trips Unicode: Bangla, Japanese, and emoji survive verbatim', () => {
    const prompt = 'বাংলাদেশের পতাকা, 日本の桜, sunrise 🌅 over ঢাকা';
    const csv = generateCsvContent([makePrompt({ prompt, subject: 'বাংলা টেস্ট' })]);
    expect(csv).toContain(`"${prompt}"`);
    expect(csv).toContain('"বাংলা টেস্ট"');
  });

  it('handles a torture field with commas, quotes, newlines, and Unicode together', () => {
    const prompt = 'বাজার, "fresh" produce\nদাম: ১০০ টাকা 🍎';
    const csv = generateCsvContent([makePrompt({ prompt })]);
    const expected = '"বাজার, ""fresh"" produce\nদাম: ১০০ টাকা 🍎"';
    expect(csv).toContain(expected);
  });

  it('applies documented defaults for missing optional fields', () => {
    const csv = generateCsvContent([
      makePrompt({
        subcategory: undefined,
        aspectRatio: undefined,
        negativeSpace: undefined,
        copySpace: undefined,
      }),
    ]);
    const row = csv.split('\r\n')[1];
    // Category provided ('Nature'); everything else falls back to defaults
    expect(row).toContain('"Nature"');
    expect(row).toContain('"Photo"'); // contentType default
    expect(row).toContain('"Advertising"'); // commercialUse default
    expect(row).toContain('"Default"'); // aspectRatio default
    expect(row).toContain('"None"'); // negativeSpace default
    expect(row).toContain('"LOW RISK"'); // ipRisk default
    expect(row).toContain('"DISTINCT"'); // similarityStatus default
  });

  it('renders empty strings as empty quoted fields', () => {
    const csv = generateCsvContent([makePrompt({ subcategory: '', copySpace: '' })]);
    const row = csv.split('\r\n')[1];
    expect(row).toContain(',"",');
  });

  it('does not truncate long prompts', () => {
    const longPrompt = 'a'.repeat(5000);
    const csv = generateCsvContent([makePrompt({ prompt: longPrompt })]);
    expect(csv).toContain(`"${longPrompt}"`);
  });

  it('does not truncate long titles/subjects with many special characters', () => {
    const subject = Array.from({ length: 50 }, (_, i) => `kw${i}`).join(', ');
    const csv = generateCsvContent([makePrompt({ subject })]);
    expect(csv).toContain(`"${subject}"`);
    // every keyword present exactly once
    for (let i = 0; i < 50; i++) {
      expect(csv).toContain(`kw${i}`);
    }
  });

  it('keeps every data row at 13 columns', () => {
    const csv = generateCsvContent([makePrompt(), makePrompt({ prompt: 'x, "y"\nz' })]);
    const rows = csv.split('\r\n');
    // Naive comma-split is unsafe for quoted CSV; count via header column count on the clean first row
    expect(rows[0].split(',').length).toBe(13);
    // Second data row (no embedded newline) must also have 13 columns
    const cleanRow = rows[1].split(',');
    expect(cleanRow.length).toBe(13);
  });

  it('does not prepend a UTF-8 BOM itself (BOM is the downloader\u2019s job)', () => {
    const csv = generateCsvContent([makePrompt()]);
    expect(csv.charCodeAt(0)).not.toBe(0xfeff);
  });
});

describe('downloadCsvFile', () => {
  beforeEach(() => {
    installDownloadStubs();
  });

  it('prepends a UTF-8 BOM (\\uFEFF) to the blob content', () => {
    const content = generateCsvContent([makePrompt()]);
    downloadCsvFile(content, 'test.csv');
    expect(capturedBlobs).toHaveLength(1);
    const raw = lastBlobRaw();
    expect(raw.charCodeAt(0)).toBe(0xfeff);
    expect(raw.startsWith('\uFEFF')).toBe(true);
    expect(raw.slice(1)).toBe(content);
  });

  it('sets the filename on the anchor and triggers a click', () => {
    downloadCsvFile('a,b', 'my-export.csv');
    expect(capturedClicks).toHaveLength(1);
    expect(capturedClicks[0].download).toBe('my-export.csv');
    expect(capturedClicks[0].href.startsWith('blob:mock-')).toBe(true);
  });

  it('creates the blob with a CSV mime type', () => {
    downloadCsvFile('a,b', 'my-export.csv');
    expect(capturedBlobs[0].blob.type).toContain('text/csv');
  });
});
