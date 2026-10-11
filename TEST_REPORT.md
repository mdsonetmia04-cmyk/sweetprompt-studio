# TEST_REPORT.md — SweetPrompt Studio Clone

Project: `sweetprompt-studio` v1.0.0
Date of verification: 2026-10-11
Environment: Linux VM, Node (npm), fresh `npm install` (223 packages)
Method: executed locally via `npm run typecheck`, `npm run build`, `npx vitest run`. No real API keys were used anywhere; provider behavior is verified with mocked/data-driven tests only. No deployment was performed (per task scope).

## 1. Executed results

| Check | Command | Result |
|---|---|---|
| Install | `npm install` | ✅ 223 packages added, exit 0 |
| Type check | `npm run typecheck` (`tsc --noEmit`) | ✅ 0 errors |
| Production build | `npm run build` (`vite build`) | ✅ succeeds; `dist/index.html` produced (chunk-size warning only, same class as source) |
| Unit tests | `npx vitest run` | ✅ **24 files, 435 tests, 435 passed, 0 failed** |
| Secrets scan | grep for key-like patterns / long secrets in `src/`, `api/`, `server.ts`, `.env.example` | ✅ no real keys; only placeholders and format-validation patterns |
| Hygiene scan | grep for TODO/FIXME/placeholder/dead handlers | ✅ none in core features |

### Test suite breakdown (all executed, all passing)

| Area | Files | Tests |
|---|---|---|
| prompt-engine: schema, sanitizer, quality checker, uniqueness, variations, Adobe rules, UniversalPromptGenerator | 7 | 104 |
| Exporters: CSV (escaping/quotes/newlines/Unicode/BOM), TXT, prompt exporter, export engine, export utils | 5 | 110 |
| Storage: versioned localStorage, migration, malformed-record recovery (stubbed localStorage) | 1 | 37 |
| Risk: validator + brand/IP rules (trademark, copyrighted characters, living artists, restricted subjects) | 1 | 26 |
| Adobe Stock: rules, technicalRules, ipRules, metadataEngine, preSubmissionCheck, similarityEngine, promptSanitizer | 7 | 109 |
| AI layer: provider capability matrix (6 providers, vision support), client error-message cleaner | 2 | 19 |
| Server: `cleanProviderError` incl. key redaction + stack-path scrubbing | 1 | 20 |
| **Total** | **24** | **435** |

All AI-dependent paths are mocked or data-driven. Two genuine gaps were found by tests and fixed in source (in code's favor): (1) `cleanProviderError`'s generic fallback could echo provider key strings / internal stack paths to the client — now scrubbed; (2) `getStoredHistory`/`getStoredLibrary` didn't validate parsed JSON was an array — now recover with `[]`. A third fix: client-side `extractCleanErrorMessage` now recognizes "API key not valid" wording (matching the server-side cleaner).

## 2. Seventeen-point verification checklist

1. **Application installs successfully** — ✅ verified (npm install, 223 packages, exit 0).
2. **TypeScript checks pass** — ✅ verified (`tsc --noEmit`, 0 errors).
3. **Production build succeeds** — ✅ verified (`vite build`, exit 0, `dist/index.html` present).
4. **All major routes load correctly** — ⚠️ static/manual: SPA with `vercel.json` rewrite `/((?!api/).*) → /index.html` preserved unchanged from the known-good source; not executed against a live server.
5. **Prompt generators return valid structured output** — ✅ verified with mocked generation (`UniversalPromptGenerator` 19 tests; schema validation tests).
6. **Prompt-count selections work** — ✅ verified: `PROMPT_COUNT_OPTIONS = [1, 5, 10, 15, 20, 25, 30]` (7 options, verified in `promptSchema.ts`; schema tests cover valid/invalid counts).
7. **Provider switching works** — ✅ verified mocked/data-driven: capability matrix test asserts all 6 providers expose text generation with default models, and that vision is supported by Gemini/Groq/Mistral/OpenRouter but not Hugging Face/Cerebras. Live switching not executed (no API keys).
8. **Missing or invalid API keys produce understandable errors** — ✅ verified mocked: server `cleanProviderError` (20 tests) and client `extractCleanErrorMessage` (7 tests) map 401/invalid-key wording to Settings-pointing messages; proxy direct path throws a clear "API Key is missing" error before any network call (code-inspected).
9. **Image upload validation works** — ⚠️ code-inspected/manual: validation (MIME type, size limits, preview/removal) lives in the Image Scan / Image-to-Prompt UI components; no pure function was extractable for unit tests. Not executed in a browser.
10. **Metadata can be edited and exported** — ✅ verified mocked: export engine/utils tests cover edit→export flows; export validation tests cover keyword/title handling.
11. **TXT and CSV exports preserve Unicode** — ✅ verified: tests assert Unicode round-trip (incl. non-Latin scripts, emoji), RFC-4180 quoting (commas/quotes/newlines), UTF-8 BOM on CSV outputs, and no silent truncation.
12. **Saved prompts survive a page reload** — ✅ verified mocked: storage tests re-instantiate the store (simulating reload) and assert persistence; versioned keys + migration logic tested.
13. **Theme selection persists as intended** — ⚠️ code-inspected: theme lives in `ThemeContext` (dark/light/system + sweet/simple/futuristic styles) persisted to localStorage; not executed in a browser.
14. **Search, filtering, editing, and deletion work** — ✅ storage-layer verified mocked (library CRUD, dedupe, history ops); UI wiring code-inspected, not executed in a browser.
15. **API routes return appropriate HTTP status codes** — ⚠️ code-inspected: `api/*.ts` handlers and `server.ts` use shared helpers with explicit status handling (400 validation, 401/403/429 provider mapping, 500 safe messages); not executed live (no server run, no keys).
16. **Mobile and desktop layouts remain usable** — ⚠️ code-inspected: responsive Tailwind layouts preserved from source; not rendered at viewports in this run.
17. **Production routing does not produce 404 errors on page refresh** — ⚠️ static: `vercel.json` rewrite excludes `/api/*` and maps everything else to `/index.html`; `netlify.toml` keeps `/api/*` as clean 404 with SPA fallback. Preserved unchanged from the known-good source; not executed against a live host.

Legend: ✅ executed and passing · ⚠️ inspected in code / static config, not executed live · (no check was marked verified on the basis of a mock where live behavior was claimed).

## 3. Known limitations (carried into README)

- No live-provider tests: the suite uses mocks; real quota/rate-limit behavior is unverified.
- No browser execution: UI flows (image upload validation, theme persistence, responsive rendering, search/filter UI) are code-inspected, not driven in a browser.
- No live server or deployment: API status codes and Vercel/Netlify routing are verified from code/config, not against a deployed URL.
- Minor preserved quirks (source behavior kept intentionally): forbidden-pattern stripping is first-match-per-rule in `PromptQualityChecker`; brand-pattern matching can false-positive on common words (e.g. the fruit "apple"); `auditBatch([])` reports 100% unique (vacuous); no runtime count validation against `PROMPT_COUNT_OPTIONS` (source accepts arbitrary counts via fallback).
- Static hosts (Netlify/GitHub Pages) have no backend: `/api/*` returns 404 by design and all AI calls run browser-direct, requiring the user's own API key in Settings.

## 4. Source fixes made during this build (new work in the clone)

1. `api/_shared.ts` — added `scrubSecrets()`: the generic `cleanProviderError` fallback now redacts provider key formats (`sk-*`, `gsk_*`, `csk-*`, `hf_*`, `xai-*`, `AIza*`), `Bearer` tokens, `api_key=`-style assignments, and strips stack-trace frames/internal file paths before any error text reaches the client.
2. `src/lib/storage/localStorage.ts` — `getStoredHistory()` / `getStoredLibrary()` now validate parsed JSON is an array, recovering with `[]` for malformed records.
3. `src/lib/ai/proxyClient.ts` — `extractCleanErrorMessage` now recognizes "API key not valid" / `api_key_invalid` wording (matching the server-side cleaner) so Gemini-style key errors produce the friendly invalid-key message instead of a generic one.
