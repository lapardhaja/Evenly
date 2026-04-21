# AGENTS.md

## Project overview

**Evenly** is a receipt-splitting SPA (React 18 + Vite 6 + MUI 5). Data persists in `localStorage`; optional **Supabase** email/password syncs normalized rows to Postgres (RLS). Deploy to **GitHub Pages** (static only) or **Vercel** (static + `POST /api/scan` using Gemini; env `GEMINI_API_KEY`, optional `GEMINI_MODEL`).

## Tech stack

- **UI**: React 18, MUI 5 (Material UI), @emotion
- **Routing**: react-router-dom v6 with `createHashRouter` + `RouterProvider` (hash URLs, GitHub Pages compatible; enables `useBlocker` for navigation guards)
- **State**: `localStorage` + optional cloud: `AuthContext`, `GroupsDataContext`, `src/lib/supabaseSync.js` (normalized tables). Hooks in `useGroupData.js` read/write via `useGroupsData()`.
- **Currency**: `currency.js` for precise monetary math
- **IDs**: `uuid` v4
- **Build**: Vite 6 with `@vitejs/plugin-react`, **PWA** via `vite-plugin-pwa` (manifest + SW precache)

## Dev commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 5173) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |

## Architecture

### Data model
Groups → Receipts hierarchy. People are defined at the group level and shared across all receipts.

- With **Supabase env vars set**, group/receipt data is **only** in Postgres (loaded on sign-in, saved after edits). `evenly:data:v2` localStorage is purged after a successful load. Without Supabase, data stays in `evenly:data:v2` (local-only build).
- Supabase tables: `groups`, `group_people`, `receipts`, `receipt_items`, `receipt_allocations` — see `supabase/migrations/` and `docs/SUPABASE_DATABASE.md`. Passwords live in **Auth** (`auth.users`), not `public`.
- Each receipt has a `paidById` field (who paid the bill).
- Settlement computed across all receipts in a group using greedy creditor/debtor pairing.

### Brand assets
- **`public/brand/`** — favicon (`evenly-icon.svg`), PWA icons (`pwa-192.png`, `pwa-512.png`), `apple-touch-icon.png` (referenced from `index.html` and `vite.config.js` PWA manifest).
- **`src/assets/brand/`** — optional standalone SVG sources (e.g. E mark only).
- **In-app logos** — `src/components/BrandLogo.jsx` (stacked hero), `src/components/EvenlyHeaderLockup.jsx` (app bar wordmark).

### Files
- `src/main.jsx` — Entry point, `RouterProvider` + `router.jsx`
- `src/router.jsx` — `createHashRouter` route tree (nested under `Layout` via `<Outlet />`)
- `src/core/Layout.jsx` — AppBar, theme (auto light/dark), footer, `<Outlet />` for child routes
- `src/pages/GroupsPage.jsx` — Groups list (home)
- `src/pages/GroupDetailPage.jsx` — People / Receipts / Settle tabs; open group → Receipts by default; new group from list → `/people` once then Receipts on revisit
- `src/pages/GroupReceiptsTab.jsx` — Receipt list within a group
- `src/pages/GroupPeopleTab.jsx` — People management (group level)
- `src/pages/GroupSettleTab.jsx` — Net balances + minimized transfers
- `src/pages/ReceiptInfoPage.jsx` — Receipt detail with Paid By + Items/People tabs
- `src/pages/ReceiptInfoItemsTab.jsx` — Item table + per-person breakdown
- `src/pages/ReceiptInfoPeopleTab.jsx` — People list (read-only in group context)
- `src/hooks/useGroupData.js` — All CRUD and computation logic
- `src/hooks/useLocalStorage.js` — Generic localStorage hook
- `src/functions/settlement.js` — Net balance + greedy transfer minimization
- `src/components/useEditTextModal.jsx` — Reusable edit dialog
- `src/pages/components/UseAddItemModal.jsx` — Add item dialog

## Cursor Cloud specific instructions

- **Optional Supabase** — set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`; run SQL migration. When set, **sign-in is required** (`RequireAuth`). **Forgot password** → `#/update-password` (`UpdatePasswordPage.jsx`, `supabaseAuthCallback.js`, `index.html` inline script for PWA).
- Dev server: `npm run dev -- --host 0.0.0.0 --port 5173`
- Build check: `npm run build`
- No test framework configured yet
