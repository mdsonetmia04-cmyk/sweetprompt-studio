# SweetPrompt Studio - Netlify, Vercel, Cloudflare Pages & GitHub Deployment Guide

SweetPrompt Studio is configured with **Dual-Mode Execution (Serverless Proxy + 100% Direct Client Browser Execution)**.
It will work seamlessly when pushed to GitHub and deployed on **Netlify**, **Vercel**, **Cloudflare Pages**, or **GitHub Pages**.

---

## Which mode runs where? (read this first)

- **Vercel:** Serverless proxy works — the functions in `api/` (`generate.ts`, `vision.ts`, `test-connection.ts`) run on Vercel and proxy AI requests. The browser-direct mode is the fallback.
- **Cloudflare Pages:** Serverless proxy works — the Pages Functions in `functions/api/` (`generate.ts`, `vision.ts`, `test-connection.ts`, sharing `functions/_shared.ts`) run on Cloudflare's edge and proxy AI requests. Faithful port of the `api/` handlers: same validation, providers, model fallbacks, error cleaning, rate limits (60/min per IP per endpoint, 20/min for vision — per isolate, so approximate under load), and 25 MB body cap. `api/` itself is untouched, so Vercel keeps working.
- **Local dev (`npm run dev`):** `server.ts` (Express) serves the API routes.
- **Netlify / GitHub Pages:** there is **no backend**. The `api/*.ts` files are Vercel-style functions and do not run on Netlify. `netlify.toml` and `public/_redirects` deliberately return a clean 404 for `/api/*` (instead of the SPA rewrite) so the app detects the missing backend and runs **100% directly from the browser**. On these hosts you must enter your own API key in Settings.

---

## Deploy to Netlify (Recommended - 2 Minutes)

### Step 1: Push Code to GitHub
1. Create a new repository on GitHub (e.g. `sweetprompts-pro`).
2. Run the following commands in your local terminal:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - SweetPrompt Studio"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/sweetprompts-pro.git
   git push -u origin main
   ```

### Step 2: Deploy on Netlify
1. Log in to [netlify.com](https://app.netlify.com/).
2. Click **Add new site** -> **Import an existing project**.
3. Choose **GitHub** and select your repository (`sweetprompts-pro`).
4. Netlify will automatically detect:
   - **Build Command:** `npm run build`
   - **Publish directory:** `dist`
5. Click **Deploy sweetprompts-pro**.

---

## How It Works on Netlify & Browser Mode
1. **SPA Routing Configured:**
   - `public/_redirects` and `netlify.toml` are included, ensuring all page reloads work smoothly without 404 errors.
   - `/api/*` is excluded from the SPA rewrite so API calls get a clean 404 (no backend on Netlify) instead of `index.html`.
2. **100% Client-Side Direct Execution:**
   - When users enter ANY single API key (Google Gemini, Groq, Mistral, OpenRouter, Cerebras, or Hugging Face) in the website's **Settings**, all AI features (PNG Creator, Vector Studio, JPG Creator, Image Scan, Metadata Studio) run **100% directly from their browser**.
   - No backend server required for user operations.

---

## Deploy to Vercel (for the serverless proxy)

1. Import the repository in [vercel.com](https://vercel.com/).
2. Keep the default Vite settings; `vercel.json` already excludes `/api/*` from the SPA rewrite so the functions in `api/` stay reachable.
3. Optional: set server-side API keys (e.g. `GEMINI_API_KEY`) in Vercel Project Settings to let the proxy use them. **Never use `VITE_`-prefixed names for secrets** — Vite bakes those into the public JS bundle.

## Deploy to Cloudflare Pages (with Pages Functions proxy)

1. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**, select the `sweetprompt-studio` repository.
2. Build settings — Framework preset **Vite** (or custom):
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Production branch:** `main`
3. (Optional) After the project is created: **Settings → Environment Variables** → add any of `GEMINI_API_KEY`, `GROQ_API_KEY`, `MISTRAL_API_KEY`, `OPENROUTER_API_KEY`, `HUGGINGFACE_API_KEY`, `CEREBRAS_API_KEY` (and optionally `APP_URL`, used as the OpenRouter `HTTP-Referer`). **Never use `VITE_`-prefixed names for secrets.**
4. **Save and Deploy.** Every push to `main` redeploys automatically.

### How Pages routing works here (verified with `wrangler pages dev`)

- `functions/api/*.ts` serve `/api/*` as Pages Functions. They take precedence over the `/* → /index.html` SPA rewrite in `public/_redirects`, so API calls always reach the Functions (verified: `POST /api/test-connection` with no key returns JSON `400 {"success":false,"error":"No Gemini API key provided"}`; `GET /api/generate` returns JSON `405`).
- The Netlify-specific `/api/* → 404!` rule in `public/_redirects` is **ignored by Pages** (Pages only accepts status codes 200/301/302/303/307/308) — which is exactly what we want when the Functions are deployed.
- `public/_routes.json` (`include: ["/api/*"]`) ensures only `/api/*` requests invoke Functions; static assets stay on Pages' unlimited free tier.
- Note: newer `wrangler` versions print an "infinite loop" warning for the `/* /index.html 200` SPA rule. It is a validator false positive — the rewrite works (deep-link fallback verified in dev), and this app navigates via internal React state rather than URL routes, so deep-link fallback is non-critical anyway.
- No `wrangler.toml` needed: `@google/genai` ships a pure-`fetch` web build that runs in Workers without `nodejs_compat`, and Pages Functions need no build config beyond the dashboard settings above.
- Rate limiting is in-memory **per isolate** (not shared across Cloudflare's edge), so it is approximate under load — same caveat as the single-instance Express dev server.

## Production
- Live site: _(fill in after you deploy — update this line)_
- Netlify auto-deploys from `main`; a push triggers a fresh production build.
