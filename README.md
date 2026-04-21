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

**Vercel** (receipt scan): connect the repo. Vercel sets `VERCEL=1` during build so asset paths use `/`. Add **`GEMINI_API_KEY`** in Project → Settings → Environment Variables. Optional: **`GEMINI_MODEL`** (default `gemini-3.1-flash-lite-preview`). The app calls **`POST /api/scan`** (Gemini vision); the key stays on the server.

Also add **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`** if you want **Sign in** (cloud sync). Never put the Supabase **service role** key in the frontend.

**Supabase setup (normalized sync)**  
1. Create a project at [supabase.com](https://supabase.com).  
2. **Authentication → Providers → Email** — enable email/password.  
3. In **SQL Editor**, run the migration in `supabase/migrations/20260210120000_evenly_normalized.sql` (tables + RLS). The file is **idempotent** (safe to run again). If you still get errors, your project may already have a different `public.groups` table from another tutorial — use a fresh Supabase project or rename/drop the conflicting table first.  
4. Copy **Project URL** and **anon public** key into `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.  
5. Rebuild/redeploy. Use the profile icon → **Sign in**. App data is read from and written to Supabase only (no `localStorage` mirror for groups/receipts). Any old `evenly:data:v2` keys are removed from the browser after a successful load.

6. **Forgot password** ([Supabase passwords](https://supabase.com/docs/guides/auth/passwords#resetting-a-password)): **Authentication → URL configuration** → add **Redirect URLs** (e.g. `https://your-domain.com/**`). The app uses `redirectTo` = `https://your-domain.com/#/update-password`. After deploy, if reset fails, **unregister the PWA service worker** once (or hard refresh) so the latest `index.html` runs. See **`docs/SUPABASE_DATABASE.md`** for tables vs `auth.users`.

Local scan: `vercel dev` then `VITE_SCAN_RECEIPT_URL=http://localhost:3000 npm run dev`.

## PWA (install on phone / desktop)

The build is a **Progressive Web App**: **Web App Manifest** + **service worker** (via `vite-plugin-pwa`).

**Benefits**
- **Add to Home Screen** (iOS Safari: Share → Add to Home Screen; Android Chrome: Install prompt) — opens like an app, full screen (`standalone`).
- **Faster repeat visits** — shell and assets are **cached** so the app loads quickly offline after the first visit.
- **Works offline for the UI** — with Supabase, cached shell loads offline but **edits need network** (data is server-only). Local-only builds keep data in **localStorage**.

**Limits**
- Not a native App Store app (no push unless you add more work; iOS PWA limits apply).
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
