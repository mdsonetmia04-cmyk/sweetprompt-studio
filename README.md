# SweetPrompt Studio Clone

**SweetPrompt Studio Clone** is an AI Microstock Prompt Studio — a web app for generating, refining, and validating AI-image prompts for stock marketplaces (Adobe Stock and similar). It combines a multi-provider AI prompt engine with metadata generation, IP/compliance checking tools, image-to-prompt analysis, and a local library for saving your work.

This is an **independent derivative clone** of [SweetPrompt Studio](https://github.com/sonetmia/SweetPromptsPro) by [sonetmia](https://github.com/sonetmia), created with the original repository owner's explicit authorization and request. See [ATTRIBUTION.md](./ATTRIBUTION.md) for full attribution and the changes made in the clone. It is self-maintained and deployable on its own.

## Features

### Prompt Studio (Creators)
- **Bulk Generator** — generate many prompts in one batch from a topic and settings.
- **Idea Generator** — seed new microstock concepts and angles.
- **JPG Creator / PNG Creator** — build prompts optimized for photo-style and PNG-style outputs.
- **Vector Prompt Studio** — prompts tuned for vector illustrations.

### AI Prompt Tools
- **Prompt Improver**, **Prompt Variations**, **Prompt Expander**, **Prompt Fixer**, **Prompt Translator** — rewrite, expand, repair, translate, and multiply your prompts.
- **Brainstormer** and **Silhouette Finder** — explore creative directions and silhouette-style subjects.

### Stock Tools (Metadata & Compliance)
- **Image Scan** — vision-based analysis of an image (subject, environment, composition, lighting, colors, commercial use, target audience, stock category) plus automatic prompt regeneration.
- **Metadata Studio** — titles, keyword sets, categories, and content types for stock submissions.
- **IP & Risk Checker** — flags potential IP/compliance risks (human faces, brands, celebrities, entertainment, technology, property, text, artist styles, prohibited content) with LOW / MEDIUM / HIGH levels and recommendations.
- **Commercial Optimizer** — tunes prompts for commercial viability.
- **Similarity Checker** — compares prompts for duplication.
- **Pre-Submission Check** — a final pass before submitting to a marketplace.

### Image-to-Prompt
- **Image to Prompt** — upload an image and get a detailed, reusable generation prompt back (requires a vision-capable provider: Gemini, Groq, Mistral, or OpenRouter).

### Library & History
- **Library** — save prompts with category, content type (Photo / Illustration / Vector), aspect ratio, copy space, keywords, notes, tags, and draft/ready/submitted status. Stored locally in your browser (versioned `localStorage` keys).
- **History** — past generations across prompts, vision, microstock, metadata, and risk checks.

### Provider Settings
- 6 AI providers: **Gemini, Groq, Mistral, OpenRouter, Hugging Face, Cerebras**.
- Vision support: **Gemini, Groq, Mistral, OpenRouter**. Vision is **not** supported on Hugging Face or Cerebras (see `src/lib/ai/capabilities.ts`).
- Per-provider API keys, model selection, temperature, max tokens, default prompt count, commercial mode, and default copy space / content type — all in the **Settings** module.

### Themes
- Dark / light / system modes, plus theme styles: **sweet**, **simple**, **futuristic**.

## Compliance note

The app's automated IP/risk checks and scores are **heuristic aids only** — they cannot guarantee marketplace approval, and they are **not legal opinions**. Each marketplace (Adobe Stock, Shutterstock, Freepik, etc.) has its own contributor rules and AI-content policies, and rules change. Always review the current official rules of the marketplace you submit to, and do your own IP due diligence before uploading anything.

## Tech stack

| Piece | Version (pinned) |
|---|---|
| React / React DOM | ^19.0.1 |
| Vite (+ @vitejs/plugin-react) | ^8.3.0 |
| Tailwind CSS (+ @tailwindcss/vite) | ^4.3.3 |
| lucide-react | ^0.546.0 |
| motion | ^12.23.24 |
| Express (local dev server) | ^4.21.2 |
| @google/genai | ^2.4.0 |
| dotenv | ^17.2.3 |
| TypeScript | ^7.0.2 |
| vitest (dev) | ^3.2.4 |
| tsx (dev, runs `server.ts`) | ^4.21.0 |

Dependency versions were kept pinned exactly as in the source at the time of cloning.

## Local setup

Requirements: Node.js (LTS recommended) and npm.

```bash
npm install
npm run dev        # start local dev (tsx runs server.ts; Express serves /api/*)
npm run typecheck  # tsc --noEmit
npm run test       # vitest run
npm run build      # vite build -> dist/
npm run preview    # preview the production build locally
```

`npm run lint` also exists and currently maps to `tsc --noEmit`.

## Environment config

Copy `.env.example` to `.env` for local development (never commit real keys).

**Server-side keys (stay on the server, never exposed to the browser):**
`GEMINI_API_KEY`, `GROQ_API_KEY`, `MISTRAL_API_KEY`, `OPENROUTER_API_KEY`, `HUGGINGFACE_API_KEY`, `CEREBRAS_API_KEY`.

> ⚠️ **Security warning:** never use `VITE_`-prefixed names for secrets. Vite bakes `VITE_*` variables into the public JS bundle, so anyone visiting the site could steal the key. Use the plain names above — they stay on the server only (used by `api/*.ts` serverless functions and the local Express server).

**Settings keys (in-app, browser-side):** the Settings module also lets you enter API keys directly in the app. Those are stored in your browser's `localStorage` under the versioned key `sweetprompts_pro_settings_v1`.

> ⚠️ **Trust caveat:** only enter API keys in Settings on devices you fully trust. Keys in `localStorage` are accessible to scripts on the page, are sent to this app's server (`/api/*` proxy) when one exists, and are forwarded to the external AI provider you selected. On shared or untrusted devices, prefer server-side env keys instead (see Vercel deployment below).

## Deploying on Vercel

1. Push the repo to GitHub.
2. In [Vercel](https://vercel.com/), **Import** the repository. Keep the default **Vite** preset.
3. (Optional) In Project Settings → Environment Variables, add any of `GEMINI_API_KEY`, `GROQ_API_KEY`, `MISTRAL_API_KEY`, `OPENROUTER_API_KEY`, `HUGGINGFACE_API_KEY`, `CEREBRAS_API_KEY` so the serverless proxy can use them. Never use `VITE_`-prefixed names.
4. Deploy.

- The files in `api/` (`generate.ts`, `vision.ts`, `test-connection.ts`) become Vercel serverless functions and proxy AI requests server-side.
- `vercel.json` already contains an SPA rewrite that **excludes `/api/*`**, so the functions stay reachable while all other routes serve `index.html`.
- The browser-direct mode remains as a fallback if no server keys are configured.

## Deploying on Cloudflare Pages

SweetPrompt Studio also runs on **Cloudflare Pages** with the same server-proxy mode, via **Pages Functions** in `functions/` (a faithful port of the `api/` Vercel handlers — `api/` itself is untouched and keeps working on Vercel).

**Dashboard setup (Git integration, like the owner's other Cloudflare project):**

1. In the Cloudflare dashboard go to **Workers & Pages → Create → Pages → Connect to Git** and select the `sweetprompt-studio` repository.
2. Build settings — Framework preset **Vite** (or custom):
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Production branch: `main`
3. (Optional) After creation, go to **Settings → Environment Variables** and add any of `GEMINI_API_KEY`, `GROQ_API_KEY`, `MISTRAL_API_KEY`, `OPENROUTER_API_KEY`, `HUGGINGFACE_API_KEY`, `CEREBRAS_API_KEY` so the Pages Functions proxy can use them server-side. **Never use `VITE_`-prefixed names** — Vite bakes those into the public JS bundle. You can also set `APP_URL` (used as the `HTTP-Referer` header for OpenRouter).
4. **Save and Deploy.** Every push to `main` redeploys automatically.

**How it works on Pages:**

- `functions/api/generate.ts`, `functions/api/vision.ts`, `functions/api/test-connection.ts` become Pages Functions serving `/api/*` — same validation, same provider logic and model fallbacks, same error cleaning, same rate limits (60/min per IP per endpoint, 20/min for vision — enforced per isolate, so approximate under load), same 25 MB body cap. Env vars are read from the Function's `env` (dashboard).
- `public/_routes.json` (`{"include": ["/api/*"]}`) means only `/api/*` requests invoke Functions; all static assets stay on Pages' unlimited free tier.
- The shared logic lives in `functions/_shared.ts` (port of `api/_shared.ts`, adapted for `context.env`).
- Routing note: Pages Functions take precedence over the `/* → /index.html` SPA rewrite in `public/_redirects`, so `/api/*` always reaches the Functions (verified locally with `wrangler pages dev`). Note the Netlify-specific `/api/* → 404!` rule in that file is ignored by Pages (Pages only allows 200/301/302/303/307/308) — which is exactly what we want when Functions are deployed.
- If you deploy Pages **without** Functions (not the default here), the app behaves like on Netlify: `/api/*` misses and the `proxyClient` falls back to **100% direct browser-side AI execution** with a user-supplied key in Settings.

No `wrangler.toml` is needed: `@google/genai` ships a pure-`fetch` web build that runs in Workers without `nodejs_compat`, and Pages Functions need no build config beyond the dashboard settings above.

## Netlify / static hosts

On Netlify and other static hosts (GitHub Pages, etc.) there is **no backend**:

- `api/*.ts` are Vercel-style serverless functions and do not run — they are ignored.
- `netlify.toml` and `public/_redirects` deliberately return a clean **404** for `/api/*` (instead of the SPA rewrite) **by design**, so the app's `proxyClient` detects the missing backend and falls back to **100% direct browser-side AI execution**.
- This requires you to enter **your own API key** in the app's Settings module — all AI features (JPG/PNG Creators, Vector Studio, Image Scan, Metadata Studio, and the rest) then run directly from the browser.

## Tests

The project ships a [vitest](https://vitest.dev/) suite (`npm run test` → `vitest run`) covering the pure-logic modules with **mocked AI providers** — no real API keys are used in tests. Mocked-provider tests verify offline behavior and error handling; they do not validate live provider responses.

**Final verification results (2026-10-11, executed locally):**

- Test files: **24**, all passing
- Tests: **435 passed, 0 failed**
- Coverage areas: prompt schema/sanitizer/quality/uniqueness/variations/generators (prompt-engine), CSV/TXT/prompt exporters + export engine + export utils (Unicode, quoting, BOM), versioned `localStorage` (migration + malformed-record recovery), risk validator + IP/brand rules, Adobe Stock metadata/similarity/pre-submission/technical rules, provider capability matrix (vision support per provider), server `cleanProviderError` key-redaction, client `extractCleanErrorMessage` error mapping
- `npm run typecheck` (`tsc --noEmit`): **0 errors**
- `npm run build` (Vite production): **succeeds**, `dist/index.html` produced

See [TEST_REPORT.md](TEST_REPORT.md) for the full report, including the 17-point verification checklist.

## Known limitations

- **Local-first, no accounts:** there is no database and no login. Library, history, and settings live in the browser's `localStorage` (keys like `sweetprompts_pro_settings_v1`, `sweetprompts_pro_history_v1`, `sweetprompts_pro_library_v1`) — data does not sync across devices or browsers.
- **Vision unsupported on Hugging Face and Cerebras:** image-based features (Image Scan, Image to Prompt) require Gemini, Groq, Mistral, or OpenRouter.
- **Compliance checks are heuristic:** see the Compliance note above — automated checks cannot guarantee marketplace approval.
- **Mocked vs live tests:** the vitest suite tests offline logic with mocked providers; it does not verify live AI provider behavior or quota/rate limits.
- **Static hosts have no backend:** on Netlify/GitHub Pages the `/api/*` proxy returns 404 by design and all AI calls go directly from the browser, which requires a user-supplied API key in Settings.

## License

Apache License 2.0 — see [LICENSE](./LICENSE).

Original work copyright 2026 **sonetmia**; this clone is an independent derivative maintained separately, created with the original owner's authorization. See [ATTRIBUTION.md](./ATTRIBUTION.md) for details.
