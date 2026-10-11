/**
 * Tests for src/lib/storage/localStorage.ts
 *
 * There is no DOM in node, so globalThis.localStorage is stubbed with a
 * minimal in-memory implementation BEFORE the module under test is imported.
 * The module only touches `localStorage` at call time (never at module scope),
 * so hoisted imports are safe.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string): string | null {
    return this.store.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.store.set(k, v);
  }
  removeItem(k: string): void {
    this.store.delete(k);
  }
  clear(): void {
    this.store.clear();
  }
  keys(): string[] {
    return Array.from(this.store.keys());
  }
}

let store: MemoryStorage;

function installStorageStub(): void {
  store = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    value: store,
    configurable: true,
    writable: true,
  });
}

installStorageStub();

import {
  DEFAULT_SETTINGS,
  getStoredSettings,
  saveStoredSettings,
  getStoredHistory,
  saveHistoryItem,
  deleteHistoryItem,
  clearAllHistory,
  getStoredLibrary,
  saveLibraryItem,
  deleteLibraryItem,
  clearAllLibrary,
} from './localStorage';
import type { AISettings, HistoryItem } from '../../types';

const SETTINGS_KEY = 'sweetprompts_pro_settings_v1';
const HISTORY_KEY = 'sweetprompts_pro_history_v1';
const LIBRARY_KEY = 'sweetprompts_pro_library_v1';

const PROVIDERS = ['gemini', 'groq', 'mistral', 'openrouter', 'huggingface', 'cerebras'] as const;

function makeHistoryInput(overrides: Partial<Omit<HistoryItem, 'id' | 'createdAt'>> = {}) {
  return {
    type: 'prompt' as const,
    title: 'Test title',
    summary: 'Test summary',
    data: { foo: 'bar' },
    provider: 'gemini' as const,
    model: 'gemini-3.8-flash',
    ...overrides,
  };
}

function customSettings(overrides: Partial<AISettings> = {}): AISettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

beforeEach(() => {
  installStorageStub();
});

describe('getStoredSettings', () => {
  it('returns the default settings when nothing is stored', () => {
    expect(getStoredSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('merges a partial stored record over the defaults', () => {
    store.setItem(SETTINGS_KEY, JSON.stringify({ provider: 'groq', temperature: 0.2 }));
    const s = getStoredSettings();
    expect(s.provider).toBe('groq');
    expect(s.temperature).toBe(0.2);
    // untouched defaults survive the merge
    expect(s.model).toBe(DEFAULT_SETTINGS.model);
    expect(s.maxTokens).toBe(DEFAULT_SETTINGS.maxTokens);
    expect(s.theme).toBe(DEFAULT_SETTINGS.theme);
  });

  it('backfills all six provider slots in apiKeys even when stored apiKeys is partial', () => {
    store.setItem(SETTINGS_KEY, JSON.stringify({ apiKeys: { groq: 'GROQ-KEY' } }));
    const s = getStoredSettings();
    for (const p of PROVIDERS) {
      expect(Object.prototype.hasOwnProperty.call(s.apiKeys, p)).toBe(true);
    }
    expect(s.apiKeys?.groq).toBe('GROQ-KEY');
    expect(s.apiKeys?.gemini).toBe('');
  });

  it('migrates a legacy single apiKey into apiKeys for the active provider', () => {
    // Legacy shape: one apiKey + provider, no per-provider map
    store.setItem(
      SETTINGS_KEY,
      JSON.stringify({ provider: 'groq', apiKey: 'LEGACY-KEY', apiKeys: { gemini: 'G' } }),
    );
    const s = getStoredSettings();
    expect(s.apiKeys?.groq).toBe('LEGACY-KEY');
    expect(s.apiKeys?.gemini).toBe('G');
  });

  it('does not overwrite an existing per-provider key with the legacy apiKey', () => {
    store.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        provider: 'groq',
        apiKey: 'LEGACY-KEY',
        apiKeys: { groq: 'EXISTING-KEY' },
      }),
    );
    const s = getStoredSettings();
    expect(s.apiKeys?.groq).toBe('EXISTING-KEY');
  });

  it('recovers to defaults when the stored JSON is malformed', () => {
    store.setItem(SETTINGS_KEY, 'not-json{{{');
    expect(getStoredSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('recovers to defaults when the stored JSON is a truncated payload', () => {
    store.setItem(SETTINGS_KEY, '{"provider":"groq","temperature":');
    expect(getStoredSettings()).toEqual(DEFAULT_SETTINGS);
  });
});

describe('saveStoredSettings', () => {
  it('round-trips settings through storage', () => {
    const s = customSettings({ provider: 'mistral', temperature: 0.9, maxTokens: 2000 });
    saveStoredSettings(s);
    const loaded = getStoredSettings();
    expect(loaded.provider).toBe('mistral');
    expect(loaded.temperature).toBe(0.9);
    expect(loaded.maxTokens).toBe(2000);
  });

  it('syncs the legacy apiKey field with the active provider\u2019s key', () => {
    const s = customSettings({
      provider: 'groq',
      apiKey: '',
      apiKeys: { ...DEFAULT_SETTINGS.apiKeys, groq: 'GROQ-KEY' } as AISettings['apiKeys'],
    });
    saveStoredSettings(s);
    const raw = JSON.parse(store.getItem(SETTINGS_KEY) as string);
    expect(raw.apiKey).toBe('GROQ-KEY');
    expect(raw.apiKeys.groq).toBe('GROQ-KEY');
  });

  it('writes the active provider\u2019s key back into the apiKeys map', () => {
    const s = customSettings({
      provider: 'openrouter',
      apiKey: 'OR-KEY',
      apiKeys: { ...DEFAULT_SETTINGS.apiKeys } as AISettings['apiKeys'],
    });
    saveStoredSettings(s);
    expect(getStoredSettings().apiKeys?.openrouter).toBe('OR-KEY');
  });

  it('persists provider switches across saves', () => {
    saveStoredSettings(customSettings({ provider: 'gemini' }));
    saveStoredSettings(customSettings({ provider: 'cerebras' }));
    expect(getStoredSettings().provider).toBe('cerebras');
  });
});

describe('storage key versioning', () => {
  it('stores settings under the versioned settings key', () => {
    saveStoredSettings(customSettings({ temperature: 0.3 }));
    expect(store.getItem(SETTINGS_KEY)).not.toBeNull();
    expect(store.keys()).toContain(SETTINGS_KEY);
  });

  it('stores history under the versioned history key', () => {
    saveHistoryItem(makeHistoryInput());
    expect(store.getItem(HISTORY_KEY)).not.toBeNull();
  });

  it('stores library items under the versioned library key', () => {
    saveLibraryItem({ title: 'x' });
    expect(store.getItem(LIBRARY_KEY)).not.toBeNull();
  });

  it('ignores legacy unversioned keys', () => {
    store.setItem('sweetprompts_pro_settings', JSON.stringify({ temperature: 0.1 }));
    expect(getStoredSettings().temperature).toBe(DEFAULT_SETTINGS.temperature);
  });

  it('persists across a module reload (fresh import re-reads the same storage)', async () => {
    saveStoredSettings(customSettings({ provider: 'groq', temperature: 0.3 }));
    saveHistoryItem(makeHistoryInput({ title: 'before reload' }));

    vi.resetModules();
    const fresh = await import('./localStorage');

    expect(fresh.getStoredSettings().provider).toBe('groq');
    expect(fresh.getStoredSettings().temperature).toBe(0.3);
    expect(fresh.getStoredHistory()).toHaveLength(1);
    expect(fresh.getStoredHistory()[0].title).toBe('before reload');
  });
});

describe('history', () => {
  it('returns an empty array when nothing is stored', () => {
    expect(getStoredHistory()).toEqual([]);
  });

  it('saves items newest-first with generated id and createdAt', () => {
    const a = saveHistoryItem(makeHistoryInput({ title: 'first' }));
    const b = saveHistoryItem(makeHistoryInput({ title: 'second' }));
    expect(a.id.startsWith('hist_')).toBe(true);
    expect(b.id.startsWith('hist_')).toBe(true);
    expect(a.id).not.toBe(b.id);
    expect(typeof a.createdAt).toBe('number');

    const history = getStoredHistory();
    expect(history).toHaveLength(2);
    expect(history[0].title).toBe('second');
    expect(history[1].title).toBe('first');
  });

  it('preserves the payload data verbatim, including Unicode', () => {
    saveHistoryItem(makeHistoryInput({ title: 'বাংলা শিরোনাম 🌅', data: { prompt: '日本語' } }));
    const history = getStoredHistory();
    expect(history[0].title).toBe('বাংলা শিরোনাম 🌅');
    expect(history[0].data).toEqual({ prompt: '日本語' });
  });

  it('caps history at 150 items, dropping the oldest', () => {
    for (let i = 0; i < 160; i++) {
      saveHistoryItem(makeHistoryInput({ title: `item-${i}` }));
    }
    const history = getStoredHistory();
    expect(history).toHaveLength(150);
    expect(history[0].title).toBe('item-159');
    // the 10 oldest (item-0 .. item-9) were dropped
    expect(history.some((h) => h.title === 'item-0')).toBe(false);
    expect(history.some((h) => h.title === 'item-9')).toBe(false);
    expect(history.some((h) => h.title === 'item-10')).toBe(true);
  });

  it('deletes a single item by id', () => {
    const a = saveHistoryItem(makeHistoryInput({ title: 'keep' }));
    const b = saveHistoryItem(makeHistoryInput({ title: 'drop' }));
    void a;
    const remaining = deleteHistoryItem(b.id);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].title).toBe('keep');
    expect(getStoredHistory()).toHaveLength(1);
  });

  it('clearAllHistory removes the history key entirely', () => {
    saveHistoryItem(makeHistoryInput());
    clearAllHistory();
    expect(store.getItem(HISTORY_KEY)).toBeNull();
    expect(getStoredHistory()).toEqual([]);
  });

  it('recovers to an empty array on malformed JSON', () => {
    store.setItem(HISTORY_KEY, 'broken{{{');
    expect(getStoredHistory()).toEqual([]);
  });
});

describe('library', () => {
  it('returns an empty array when nothing is stored', () => {
    expect(getStoredLibrary()).toEqual([]);
  });

  it('saves items newest-first with generated id when none is provided', () => {
    const item = saveLibraryItem({ title: 'Lib item', prompt: 'p' });
    expect(item.id.startsWith('lib_')).toBe(true);
    expect(typeof item.createdAt).toBe('number');
    const lib = getStoredLibrary();
    expect(lib).toHaveLength(1);
    expect(lib[0].title).toBe('Lib item');
  });

  it('preserves a caller-provided id and createdAt', () => {
    const item = saveLibraryItem({ id: 'custom-1', createdAt: 12345, title: 'T' });
    expect(item.id).toBe('custom-1');
    expect(item.createdAt).toBe(12345);
  });

  it('replaces (dedupes) an existing item with the same id instead of duplicating', () => {
    saveLibraryItem({ id: 'dup-1', title: 'original' });
    saveLibraryItem({ id: 'dup-1', title: 'updated' });
    const lib = getStoredLibrary();
    expect(lib).toHaveLength(1);
    expect(lib[0].title).toBe('updated');
  });

  it('keeps Unicode payloads intact', () => {
    saveLibraryItem({ title: 'বাংলা', prompt: 'ঢাকা 🌅', keywords: ['a', 'b'] });
    const lib = getStoredLibrary();
    expect(lib[0].title).toBe('বাংলা');
    expect(lib[0].keywords).toEqual(['a', 'b']);
  });

  it('deletes a single item by id', () => {
    const a = saveLibraryItem({ id: 'l1', title: 'keep' });
    const b = saveLibraryItem({ id: 'l2', title: 'drop' });
    void a;
    const remaining = deleteLibraryItem(b.id);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('l1');
  });

  it('clearAllLibrary removes the library key entirely', () => {
    saveLibraryItem({ title: 'x' });
    clearAllLibrary();
    expect(store.getItem(LIBRARY_KEY)).toBeNull();
    expect(getStoredLibrary()).toEqual([]);
  });

  it('recovers to an empty array on malformed JSON', () => {
    store.setItem(LIBRARY_KEY, 'broken{{{');
    expect(getStoredLibrary()).toEqual([]);
  });
});

describe('storage failure recovery', () => {
  function installThrowingStorage(): void {
    const throwing = {
      getItem(): string | null {
        throw new Error('denied');
      },
      setItem(): void {
        throw new Error('denied');
      },
      removeItem(): void {
        throw new Error('denied');
      },
      clear(): void {
        throw new Error('denied');
      },
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: throwing,
      configurable: true,
      writable: true,
    });
  }

  beforeEach(() => {
    installThrowingStorage();
  });

  it('getStoredSettings returns defaults instead of throwing', () => {
    expect(getStoredSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('saveStoredSettings does not throw', () => {
    expect(() => saveStoredSettings(customSettings())).not.toThrow();
  });

  it('getStoredHistory returns [] instead of throwing', () => {
    expect(getStoredHistory()).toEqual([]);
  });

  it('saveHistoryItem still returns the constructed item without throwing', () => {
    const item = saveHistoryItem(makeHistoryInput({ title: 't' }));
    expect(item.title).toBe('t');
    expect(item.id.startsWith('hist_')).toBe(true);
  });

  it('getStoredLibrary returns [] instead of throwing', () => {
    expect(getStoredLibrary()).toEqual([]);
  });

  it('deleteHistoryItem and clearAllHistory do not throw', () => {
    expect(() => deleteHistoryItem('x')).not.toThrow();
    expect(() => clearAllHistory()).not.toThrow();
    expect(() => clearAllLibrary()).not.toThrow();
  });
});
