# Evenly

A small **bill-splitting** web app: groups, participants, expenses (equal / exact / percent splits), net balances, **minimum-transfer settle-up**, and marking payments settled. Data lives in **localStorage** (no server).

## Stack

- React 18 (hooks) + Vite 6
- Modular helpers: `src/lib/balances.js`, `src/lib/settlement.js`

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Tests

```bash
npm test
```

Settlement uses a **greedy pairing** of net creditors and debtors (standard flow reduction); for balances that sum to zero it yields **at most n−1** transfers.

## File structure

```
index.html
package.json
vite.config.js
src/
  main.jsx          # entry
  App.jsx           # dashboard vs group route (local state)
  index.css         # theme tokens + reset
  styles.css        # layout / components
  types.js          # JSDoc typedefs
  components/       # Header, Dashboard, GroupView, ExpenseForm
  hooks/            # useAppState, useLocalStorage, useTheme
  lib/              # balances, settlement (+ tests)
```
