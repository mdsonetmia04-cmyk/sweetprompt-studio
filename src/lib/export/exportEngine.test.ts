import { describe, it, expect, beforeEach } from 'vitest';
import {
  sanitizeFilename,
  formatExportDate,
  downloadFile,
  downloadTXT,
  downloadCSV,
  type CSVRowItem,
} from './exportEngine';

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

async function lastBlobText(): Promise<string> {
  return capturedBlobs[capturedBlobs.length - 1].blob.text();
}

/** Raw string handed to the Blob constructor (BOM intact, unlike blob.text()). */
function lastBlobRaw(): string {
  const parts = capturedBlobParts[capturedBlobParts.length - 1];
  return String(parts[0]);
}

describe('sanitizeFilename', () => {
  it('lowercases the name', () => {
    expect(sanitizeFilename('MyBatch')).toBe('mybatch');
  });

  it('replaces disallowed characters with dashes', () => {
    expect(sanitizeFilename('my batch! (1)')).toBe('my-batch-1');
  });

  it('keeps letters, digits, underscores and dashes', () => {
    expect(sanitizeFilename('batch_2024-v2')).toBe('batch_2024-v2');
  });

  it('collapses consecutive dashes into one', () => {
    expect(sanitizeFilename('a   b---c')).toBe('a-b-c');
  });

  it('trims leading and trailing dashes', () => {
    expect(sanitizeFilename('---hello---')).toBe('hello');
  });

  it('returns an empty string for empty input', () => {
    expect(sanitizeFilename('')).toBe('');
  });
});

describe('formatExportDate', () => {
  it('returns an 8-digit YYYYMMDD string', () => {
    expect(formatExportDate()).toMatch(/^\d{8}$/);
  });

  it('matches the local calendar date', () => {
    const d = new Date();
    const expected =
      `${d.getFullYear()}` +
      `${String(d.getMonth() + 1).padStart(2, '0')}` +
      `${String(d.getDate()).padStart(2, '0')}`;
    expect(formatExportDate()).toBe(expected);
  });

  it('zero-pads month and day', () => {
    const result = formatExportDate();
    expect(result).toHaveLength(8);
  });
});

describe('downloadFile', () => {
  beforeEach(() => {
    installDownloadStubs();
  });

  it('creates a blob with the given content and mime type', async () => {
    downloadFile('hello world', 'file.txt', 'text/plain;charset=utf-8;');
    expect(capturedBlobs).toHaveLength(1);
    expect(await capturedBlobs[0].blob.text()).toBe('hello world');
    expect(capturedBlobs[0].blob.type).toBe('text/plain;charset=utf-8;');
  });

  it('sets the filename and clicks the anchor', () => {
    downloadFile('x', 'report.csv', 'text/csv');
    expect(capturedClicks).toHaveLength(1);
    expect(capturedClicks[0].download).toBe('report.csv');
    expect(capturedClicks[0].href.startsWith('blob:mock-')).toBe(true);
  });

  it('preserves Unicode content byte-for-byte', async () => {
    const content = 'বাংলা টেক্সট 🌅 日本語';
    downloadFile(content, 'u.txt', 'text/plain');
    expect(await capturedBlobs[0].blob.text()).toBe(content);
  });
});

describe('downloadTXT', () => {
  beforeEach(() => {
    installDownloadStubs();
  });

  it('downloads a plain string as-is', async () => {
    downloadTXT('just some text', 'notes');
    expect(await lastBlobText()).toBe('just some text');
    expect(capturedClicks[0].download).toBe(
      `sweetprompts-notes-${formatExportDate()}.txt`,
    );
  });

  it('formats a string array with zero-padded prompt headers and separators', async () => {
    downloadTXT(['first prompt', 'second prompt'], 'batch');
    const text = await lastBlobText();
    const sep = '='.repeat(40);
    expect(text).toBe(`[Prompt #01]\nfirst prompt\n\n${sep}\n\n[Prompt #02]\nsecond prompt`);
  });

  it('sanitizes the section name in the filename', () => {
    downloadTXT('x', 'My Batch! 2024');
    expect(capturedClicks[0].download).toBe(
      `sweetprompts-my-batch-2024-${formatExportDate()}.txt`,
    );
  });

  it('defaults the section name to "batch"', () => {
    downloadTXT('x');
    expect(capturedClicks[0].download).toBe(`sweetprompts-batch-${formatExportDate()}.txt`);
  });

  it('does not truncate long prompt strings', async () => {
    const long = 'z'.repeat(8000);
    downloadTXT([long], 'big');
    expect(await lastBlobText()).toContain(long);
  });
});

describe('downloadCSV with a string array', () => {
  beforeEach(() => {
    installDownloadStubs();
  });

  it('does nothing for empty data', () => {
    downloadCSV([], 'batch');
    expect(capturedBlobs).toHaveLength(0);
    expect(capturedClicks).toHaveLength(0);
  });

  it('writes the #,"Prompt" header followed by numbered rows', () => {
    downloadCSV(['alpha', 'beta'], 'batch');
    const body = lastBlobRaw().slice(1); // strip BOM
    expect(body).toBe('#,"Prompt"\n1,"alpha"\n2,"beta"');
  });

  it('prepends a UTF-8 BOM', () => {
    downloadCSV(['alpha'], 'batch');
    expect(lastBlobRaw().charCodeAt(0)).toBe(0xfeff);
  });

  it('doubles embedded quotes in prompt strings', async () => {
    downloadCSV(['say "hi"'], 'batch');
    const text = await lastBlobText();
    expect(text).toContain('1,"say ""hi"""');
  });

  it('round-trips Unicode prompts', async () => {
    downloadCSV(['বাংলা প্রম্পট 🌅', '日本語プロンプト'], 'batch');
    const text = await lastBlobText();
    expect(text).toContain('বাংলা প্রম্পট 🌅');
    expect(text).toContain('日本語プロンプト');
  });

  it('names the file sweetprompts-<section>-<date>.csv', () => {
    downloadCSV(['a'], 'My Batch');
    expect(capturedClicks[0].download).toBe(
      `sweetprompts-my-batch-${formatExportDate()}.csv`,
    );
  });
});

describe('downloadCSV with an object array', () => {
  beforeEach(() => {
    installDownloadStubs();
  });

  it('derives quoted headers from the first record\u2019s keys', () => {
    const rows: CSVRowItem[] = [
      { id: 1, title: 'Sunset', prompt: 'a sunset' },
      { id: 2, title: 'Dawn', prompt: 'a dawn' },
    ];
    downloadCSV(rows, 'batch');
    expect(lastBlobRaw().slice(1).split('\n')[0]).toBe('"id","title","prompt"');
  });

  it('quotes every value and escapes embedded quotes', async () => {
    downloadCSV([{ title: 'Say "hi", ok', prompt: 'p' }], 'batch');
    const text = await lastBlobText();
    expect(text).toContain('"Say ""hi"", ok"');
  });

  it('joins array values (e.g. keywords) with ", " without dropping any', async () => {
    const keywords = Array.from({ length: 25 }, (_, i) => `keyword${i}`);
    downloadCSV([{ title: 'T', prompt: 'p', keywords }], 'batch');
    const text = await lastBlobText();
    const joined = keywords.join(', ');
    expect(text).toContain(`"${joined}"`);
    for (const kw of keywords) {
      expect(text).toContain(kw);
    }
  });

  it('renders null/undefined values as empty quoted fields', () => {
    downloadCSV([{ title: null as never, prompt: undefined as never }], 'batch');
    expect(lastBlobRaw().slice(1).split('\n')[1]).toBe('"",""');
  });

  it('prepends a UTF-8 BOM for object rows too', () => {
    downloadCSV([{ prompt: 'p' }], 'batch');
    expect(lastBlobRaw().charCodeAt(0)).toBe(0xfeff);
  });
});
