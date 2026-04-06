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

- `src/main.jsx` — Entry point, renders HashRouter + Layout + BaseRouter
- `src/core/Layout.jsx` — AppBar, theme (auto light/dark), footer
- `src/core/BaseRouter.jsx` — Routes: `/receipts`, `/receipts/:receiptId/:tab?`
- `src/pages/ReceiptsPage.jsx` — Receipt list with create FAB
- `src/pages/ReceiptInfoPage.jsx` — Receipt detail with Items/People tabs
- `src/pages/ReceiptInfoItemsTab.jsx` — Scrollable item table + per-person breakdown
- `src/pages/ReceiptInfoPeopleTab.jsx` — People management
- `src/hooks/useReceiptData.js` — All CRUD and computation logic
- `src/hooks/useLocalStorage.js` — Generic localStorage hook
- `src/components/useEditTextModal.jsx` — Reusable edit dialog
- `src/pages/components/UseAddItemModal.jsx` — Add item dialog

## Cursor Cloud specific instructions

- **No external services required** — all data is in localStorage
- Dev server: `npm run dev -- --host 0.0.0.0 --port 5173`
- Build check: `npm run build`
- No test framework configured yet
