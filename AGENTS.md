# AGENTS.md

## Project overview

**Evenly** is a receipt-splitting SPA (React 18 + Vite 6 + MUI 5). Data persists in `localStorage`; optional **Supabase** email/password syncs normalized rows to Postgres (RLS). Deploy to **GitHub Pages** (static only) or **Vercel** (static + `POST /api/scan` using Gemini; env `GEMINI_API_KEY`, optional `GEMINI_MODEL`).

## Tech stack

- **UI**: React 18, MUI 5 (Material UI), @emotion
- **Routing**: react-router-dom v6 with `HashRouter` (GitHub Pages compatible)
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
- Supabase tables: `groups`, `group_people`, `receipts`, `receipt_items`, `receipt_allocations` — see `supabase/migrations/`.
- Each receipt has a `paidById` field (who paid the bill).
- Settlement computed across all receipts in a group using greedy creditor/debtor pairing.

### Files
- `src/main.jsx` — Entry point, renders HashRouter + Layout + BaseRouter
- `src/core/Layout.jsx` — AppBar, theme (auto light/dark), footer
- `src/core/BaseRouter.jsx` — Routes: `/`, `/groups/:id/:tab?`, `/groups/:id/receipt/:rid/:tab?`
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

- **Optional Supabase** — set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`; run SQL migration. When set, **sign-in is required** (`RequireAuth`); without env vars, app stays local-only with no login gate. No in-app forgot-password / email reset (use Supabase dashboard for user support if needed).
- Dev server: `npm run dev -- --host 0.0.0.0 --port 5173`
- Build check: `npm run build`
- No test framework configured yet
