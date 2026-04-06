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
- **Venmo Integration** — Quick Venmo charge links for each person
- **Responsive** — Works on mobile (iPhone, Android) and desktop
- **Offline-First** — All data stored locally in your browser

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

**Vercel** (recommended for receipt scan): connect the repo. Vercel sets `VERCEL=1` during build so asset paths use `/`. Add **`GOOGLE_VISION_API_KEY`** in Project → Settings → Environment Variables and enable **Cloud Vision API** on that Google Cloud project. The app serves `POST /api/scan-receipt` as a serverless function; the key stays on the server.

Local scan dev: run `vercel dev` in the project root and start Vite with  
`VITE_SCAN_RECEIPT_URL=http://localhost:3000 npm run dev` (port from `vercel dev`).

## Tech Stack

- React 18 + Vite 6
- MUI 5 (Material UI)
- react-router-dom v6 (HashRouter)
- currency.js
- localStorage persistence

## License

Copyright © 2026 Evenly — Designed by Servet Lapardhaja.
