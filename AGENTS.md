# AGENTS.md

## Project overview

**Evenly** is a client-only receipt-splitting SPA built with React 18 + Vite 6 + MUI 5. Data persists in `localStorage`. Deployed to GitHub Pages via GitHub Actions.

## Tech stack

- **UI**: React 18, MUI 5 (Material UI), @emotion
- **Routing**: react-router-dom v6 with `HashRouter` (GitHub Pages compatible)
- **State**: `localStorage` via custom `useLocalStorage` hook
- **Currency**: `currency.js` for precise monetary math
- **IDs**: `uuid` v4
- **Build**: Vite 6 with `@vitejs/plugin-react`

## Dev commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 5173) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |

## Architecture

### Data model
Groups → Receipts hierarchy. People are defined at the group level and shared across all receipts.

- `evenly:data:v2` localStorage key holds all groups, people, and receipts.
- Each receipt has a `paidById` field (who paid the bill).
- Settlement computed across all receipts in a group using greedy creditor/debtor pairing.

### Files
- `src/main.jsx` — Entry point, renders HashRouter + Layout + BaseRouter
- `src/core/Layout.jsx` — AppBar, theme (auto light/dark), footer
- `src/core/BaseRouter.jsx` — Routes: `/`, `/groups/:id/:tab?`, `/groups/:id/receipt/:rid/:tab?`
- `src/pages/GroupsPage.jsx` — Groups list (home)
- `src/pages/GroupDetailPage.jsx` — Group detail with Receipts/People/Settle tabs
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

- **No external services required** — all data is in localStorage
- Dev server: `npm run dev -- --host 0.0.0.0 --port 5173`
- Build check: `npm run build`
- No test framework configured yet
