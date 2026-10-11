import { describe, it, expect, beforeEach } from 'vitest';
import {
  exportToCSV,
  exportToJSON,
  exportToTXT,
  exportMetadataCSV,
  exportPromptTXT,
  exportPromptJSON,
} from './exportUtils';

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

describe('exportToCSV with (headers, rows, filename)', () => {
  beforeEach(() => {
    installDownloadStubs();
  });

  it('writes quoted headers and rows with a UTF-8 BOM', () => {
    exportToCSV(['Name', 'Prompt'], [['Sunset', 'a sunset']], 'out.csv');
    const raw = lastBlobRaw();
    expect(raw.charCodeAt(0)).toBe(0xfeff);
    expect(raw.slice(1)).toBe('"Name","Prompt"\n"Sunset","a sunset"');
  });

  it('doubles embedded quotes in headers and cells', () => {
    exportToCSV(['Hea"der'], [['va"l', 'x,y']], 'out.csv');
    expect(lastBlobRaw().slice(1)).toBe('"Hea""der"\n"va""l","x,y"');
  });

  it('stringifies numbers and renders null/undefined as empty', () => {
    exportToCSV(['N'], [[42, null, undefined] as never], 'out.csv');
    expect(lastBlobRaw().slice(1)).toBe('"N"\n"42","",""');
  });

  it('appends .csv when the filename lacks the extension', () => {
    exportToCSV(['H'], [['v']], 'report');
    expect(capturedClicks[0].download).toBe('report.csv');
  });

  it('keeps a filename that already ends with .csv', () => {
    exportToCSV(['H'], [['v']], 'report.csv');
    expect(capturedClicks[0].download).toBe('report.csv');
  });

  it('uses export.csv when no filename is given', () => {
    exportToCSV(['H'], [['v']]);
    expect(capturedClicks[0].download).toBe('export.csv');
  });

  it('round-trips Bangla headers and cell values', async () => {
    exportToCSV(['শিরোনাম'], [['বাংলা মান 🌅']], 'out.csv');
    const text = await lastBlobText();
    expect(text).toContain('শিরোনাম');
    expect(text).toContain('বাংলা মান 🌅');
  });
});

describe('exportToCSV with (records, filename)', () => {
  beforeEach(() => {
    installDownloadStubs();
  });

  it('derives headers from record keys', () => {
    exportToCSV([{ a: 1, b: 2 }], 'rec.csv');
    expect(lastBlobRaw().slice(1)).toBe('"a","b"\n"1","2"');
  });

  it('renders missing values as empty strings and escapes quotes', () => {
    exportToCSV([{ a: 'x"y', b: null }], 'rec.csv');
    expect(lastBlobRaw().slice(1)).toBe('"a","b"\n"x""y",""');
  });

  it('does nothing for empty data', () => {
    exportToCSV([], 'rec.csv');
    expect(capturedBlobs).toHaveLength(0);
    expect(capturedClicks).toHaveLength(0);
  });

  it('normalizes the filename extension', () => {
    exportToCSV([{ a: 1 }], 'data');
    expect(capturedClicks[0].download).toBe('data.csv');
  });
});

describe('exportToJSON', () => {
  beforeEach(() => {
    installDownloadStubs();
  });

  it('serializes with 2-space indentation', async () => {
    exportToJSON({ a: 1, nested: { b: 'x' } }, 'data.json');
    const text = await lastBlobText();
    expect(text).toBe(JSON.stringify({ a: 1, nested: { b: 'x' } }, null, 2));
    expect(JSON.parse(text)).toEqual({ a: 1, nested: { b: 'x' } });
  });

  it('appends .json when missing', () => {
    exportToJSON({}, 'data');
    expect(capturedClicks[0].download).toBe('data.json');
  });

  it('keeps an existing .json extension', () => {
    exportToJSON({}, 'data.json');
    expect(capturedClicks[0].download).toBe('data.json');
  });

  it('preserves Unicode without escaping it away', async () => {
    exportToJSON({ title: 'বাংলা 🌅' }, 'u.json');
    expect(await lastBlobText()).toContain('বাংলা 🌅');
  });
});

describe('exportToTXT', () => {
  beforeEach(() => {
    installDownloadStubs();
  });

  it('downloads the content verbatim', async () => {
    exportToTXT('line1\nline2', 'notes.txt');
    expect(await lastBlobText()).toBe('line1\nline2');
  });

  it('appends .txt when missing', () => {
    exportToTXT('x', 'notes');
    expect(capturedClicks[0].download).toBe('notes.txt');
  });

  it('keeps an existing .txt extension', () => {
    exportToTXT('x', 'notes.txt');
    expect(capturedClicks[0].download).toBe('notes.txt');
  });
});

describe('exportMetadataCSV', () => {
  beforeEach(() => {
    installDownloadStubs();
  });

  it('writes the fixed metadata header row', () => {
    exportMetadataCSV('T', ['k1'], 'Nature', 'Photo');
    expect(lastBlobRaw().slice(1).split('\n')[0]).toBe('Title,Keywords,Category,Content Type');
  });

  it('keeps ALL keywords — no silent truncation', () => {
    const keywords = Array.from({ length: 60 }, (_, i) => `keyword-${i}`);
    exportMetadataCSV('My very long title that must not be cut', keywords, 'Nature', 'Photo');
    const row = lastBlobRaw().slice(1).split('\n')[1];
    expect(row).toContain(`"My very long title that must not be cut"`);
    for (const kw of keywords) {
      expect(row).toContain(kw);
    }
    // the joined keyword list is a single quoted field
    expect(row).toContain(`"${keywords.join(', ')}"`);
  });

  it('doubles quotes inside title and keywords', () => {
    exportMetadataCSV('Say "hi"', ['a"b', 'c,d'], 'Nature', 'Photo');
    const row = lastBlobRaw().slice(1).split('\n')[1];
    expect(row).toContain('"Say ""hi"""');
    expect(row).toContain('"a""b, c,d"');
  });

  it('prepends a UTF-8 BOM', () => {
    exportMetadataCSV('T', [], 'C', 'Photo');
    expect(lastBlobRaw().charCodeAt(0)).toBe(0xfeff);
  });

  it('round-trips Bangla titles and keywords', async () => {
    exportMetadataCSV('বাংলা শিরোনাম', ['ঢাকা', 'রিকশা 🌅'], 'Nature', 'Photo');
    const text = await lastBlobText();
    expect(text).toContain('বাংলা শিরোনাম');
    expect(text).toContain('ঢাকা, রিকশা 🌅');
  });

  it('names the file adobe-stock-metadata-<timestamp>.csv', () => {
    exportMetadataCSV('T', [], 'C', 'Photo');
    expect(capturedClicks[0].download).toMatch(/^adobe-stock-metadata-\d+\.csv$/);
  });

  it('uses a CSV mime type on the blob', () => {
    exportMetadataCSV('T', [], 'C', 'Photo');
    expect(capturedBlobs[0].blob.type).toContain('text/csv');
  });
});

describe('exportPromptTXT', () => {
  beforeEach(() => {
    installDownloadStubs();
  });

  it('prefixes the title with a blank line when a title is given', async () => {
    exportPromptTXT('my prompt body', 'My Title');
    expect(await lastBlobText()).toBe('My Title\n\nmy prompt body');
  });

  it('exports just the prompt when no title is given', async () => {
    exportPromptTXT('my prompt body');
    expect(await lastBlobText()).toBe('my prompt body');
  });

  it('names the file sweetprompt-<timestamp>.txt', () => {
    exportPromptTXT('x');
    expect(capturedClicks[0].download).toMatch(/^sweetprompt-\d+\.txt$/);
  });

  it('does not truncate long prompts', async () => {
    const long = 'p'.repeat(6000);
    exportPromptTXT(long, 'T');
    expect(await lastBlobText()).toContain(long);
  });
});

describe('exportPromptJSON', () => {
  beforeEach(() => {
    installDownloadStubs();
  });

  it('serializes with 2-space indentation', async () => {
    const data = { prompt: 'p', tags: ['a', 'b'] };
    exportPromptJSON(data);
    const text = await lastBlobText();
    expect(text).toBe(JSON.stringify(data, null, 2));
    expect(JSON.parse(text)).toEqual(data);
  });

  it('names the file sweetprompt-data-<timestamp>.json', () => {
    exportPromptJSON({});
    expect(capturedClicks[0].download).toMatch(/^sweetprompt-data-\d+\.json$/);
  });

  it('round-trips Unicode payloads', async () => {
    exportPromptJSON({ prompt: 'বাংলা 🌅' });
    expect(await lastBlobText()).toContain('বাংলা 🌅');
  });
});
