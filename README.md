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
- **Offline-First** — All data stored locally in your browser
- **Appearance** — Light, dark, or Auto (follow device); choice is saved in the browser

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

Local scan: `vercel dev` then `VITE_SCAN_RECEIPT_URL=http://localhost:3000 npm run dev`.

## PWA (install on phone / desktop)

The build is a **Progressive Web App**: **Web App Manifest** + **service worker** (via `vite-plugin-pwa`).

**Benefits**
- **Add to Home Screen** (iOS Safari: Share → Add to Home Screen; Android Chrome: Install prompt) — opens like an app, full screen (`standalone`).
- **Faster repeat visits** — shell and assets are **cached** so the app loads quickly offline after the first visit.
- **Works offline for the UI** — your data is already in **localStorage**; new scans still need network for `/api/scan`.

**Limits**
- Not a native App Store app (no push unless you add more work; iOS PWA limits apply).
- **iOS home screen** uses **`apple-touch-icon.png`** (180×180) in `public/` — Safari often ignores SVG for the icon. After icon changes, **remove** the old home-screen shortcut and **Add to Home Screen** again.

## Tech Stack

- React 18 + Vite 6
- MUI 5 (Material UI)
- react-router-dom v6 (HashRouter)
- currency.js
- localStorage persistence

## License

Copyright © 2026 Evenly  
Designed by Servet Lapardhaja.
