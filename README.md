# Evenly

Split receipts easily — a clean, responsive web app for splitting shared expenses among friends.

## Features

- **Create Receipts** — Add receipts with titles and dates
- **Add People** — Track who's splitting the bill
- **Add Items** — Itemize the receipt with names, total costs, and quantities
- **Flexible Splitting** — Check/uncheck for single items, +/- stepper for multi-quantity items
- **Tax & Tip** — Add tax and tip by dollar amount or percentage — proportionally distributed
- **Per-Person Breakdown** — See exactly what each person owes with itemized detail
- **Lock Receipts** — Lock a receipt to prevent accidental edits
- **Responsive** — Works on mobile (iPhone, Android) and desktop
- **Data storage** — With **Supabase** configured, **sign-in is required** and groups/receipts live **only on the server** (Postgres + RLS); the app does not keep a copy in `localStorage`. Without Supabase env vars, builds stay **local-only** (`evenly:data:v2` in the browser).
- **Appearance** — Light, dark, or Auto (follow device); choice is saved in the browser
- **Mobile** — Swipe left a short way to reveal **Delete** (red); tap it to remove; **Undo** appears on a snackbar for a few seconds
- **Chat (cloud)** — Group thread plus 1:1 DMs with friends or people who share a group
- **Venmo** — Store a handle on your profile; Settle can open Venmo with amount filled in or post a pay request in chat. Evenly does not move money.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to use the app.

## Build

```bash
npm run build
```

**Vercel** (receipt scan): connect the repo. Vercel sets `VERCEL=1` during build so asset paths use `/`. Add **`GEMINI_API_KEY`** in Project → Settings → Environment Variables. Optional: **`GEMINI_MODEL`** (default `gemini-3.5-flash-lite`, then `gemini-3.1-flash-lite` if that id 404s). Do **not** set a `*-preview` model. The app calls **`POST /api/scan`** (Gemini vision); the key stays on the server. Production is Vercel (custom domain / `*.vercel.app`); there is no GitHub Pages deploy.

Also add **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`** if you want **Sign in** (cloud sync). Never put the Supabase **service role** key in the frontend.

**Supabase setup (normalized sync)**  
1. Create a project at [supabase.com](https://supabase.com).  
2. **Authentication → Providers → Email** — enable email/password.  
3. Apply SQL in `supabase/migrations/` (timestamp order), **or** after linking the project let GitHub Action `.github/workflows/supabase-migrate.yml` run `supabase db push` on `main` (secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD`). Do not run migrations from the Vercel build. If you previously ran files in the SQL editor, baseline first — see **`docs/SUPABASE_DATABASE.md`**. If you still get errors, your project may already have a different `public.groups` table from another tutorial — use a fresh Supabase project or rename/drop the conflicting table first.  
4. Copy **Project URL** and **anon public** key into `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.  
5. Rebuild/redeploy. Use the profile icon → **Sign in**. App data is read from and written to Supabase only (no `localStorage` mirror for groups/receipts). Any old `evenly:data:v2` keys are removed from the browser after a successful load.

6. **Forgot password** ([Supabase passwords](https://supabase.com/docs/guides/auth/passwords#resetting-a-password)): **Authentication → URL configuration** → add **Redirect URLs** (e.g. `https://your-domain.com/**`). The app uses `redirectTo` = `https://your-domain.com/#/update-password`. After deploy, if reset fails, **unregister the PWA service worker** once (or hard refresh) so the latest `index.html` runs. See **`docs/SUPABASE_DATABASE.md`** for tables vs `auth.users`.

Local scan: `vercel dev` then `VITE_SCAN_RECEIPT_URL=http://localhost:3000 npm run dev`.

**Chat Web Push** (banner when Evenly is closed — phone lock screen / PC with the tab gone):

1. `npx web-push generate-vapid-keys`
2. Vercel → Environment Variables (Production **and** Preview, available to **Build** so Vite can inline the public key):
   - `VITE_VAPID_PUBLIC_KEY` — public key from step 1
   - `VAPID_PRIVATE_KEY` — private key (server only)
   - `VAPID_SUBJECT` — e.g. `mailto:you@example.com`
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase **service role** (server only; never `VITE_`)
   - `SUPABASE_URL` — same as `VITE_SUPABASE_URL` if that isn’t already a Vercel runtime env
3. Redeploy so the client bundle contains the public key. Then Profile → **Enable message alerts** (iPhone: Home Screen PWA first).

`POST /api/chat-push` returns **503** `{ error: "Push is not configured" }` until those server keys are set. In-tab banners still work after the OS permission prompt, with Evenly open in the background.

## PWA (install on phone / desktop)

The build is a **Progressive Web App**: **Web App Manifest** + **service worker** (via `vite-plugin-pwa`).

**Benefits**
- **Add to Home Screen** (iOS Safari: Share → Add to Home Screen; Android Chrome: Install prompt) — opens like an app, full screen (`standalone`).
- **Faster repeat visits** — shell and assets are **cached** so the app loads quickly offline after the first visit.
- **Works offline for the UI** — with Supabase, cached shell loads offline but **edits need network** (data is server-only). Local-only builds keep data in **localStorage**.

**Limits**
- Not a native App Store app. Chat **Web Push** (banner when Evenly is closed) needs the Vercel keys above. iPhone: Add to Home Screen first, then Profile → Enable message alerts.
- **iOS home screen** uses **`public/brand/apple-touch-icon.png`** (180×180) — Safari often ignores SVG for the icon. After icon changes, **remove** the old home-screen shortcut and **Add to Home Screen** again.

## Tech Stack

- React 18 + Vite 6
- MUI 5 (Material UI)
- react-router-dom v6 (`createHashRouter` — same `#/` URLs as before)
- currency.js
- localStorage persistence; optional Supabase Auth + Postgres sync (`@supabase/supabase-js`)

## License

Copyright © 2026 Evenly  
Designed by Servet Lapardhaja.
