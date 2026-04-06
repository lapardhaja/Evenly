# Evenly

A polished **bill-splitting** web app for shared trips, meals, and household expenses. Features: **quick expenses** (equal / exact / percent / by quantity), **itemized receipts** (line items + unit grid), proportional **tax & tip**, balances, **minimum-transfer settle-up**, optional **Venmo** links, and **localStorage** persistence with no backend required.

## Stack

- React 18 (hooks) + Vite 6
- Modular helpers: `src/lib/balances.js`, `src/lib/settlement.js`, `src/lib/receiptSplit.js`

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

Production builds use a **relative asset base** (`./`) so the app works on **GitHub project Pages** (`https://<user>.github.io/<repo>/`). Without that, JS/CSS load from the site root and the page stays blank.

### GitHub Pages

After merging, enable **Settings → Pages → Build and deployment → GitHub Actions**. The workflow `.github/workflows/pages.yml` builds with `npm ci` and deploys `dist/`.

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
  components/       # Dashboard, GroupView, Modal, forms
  hooks/            # useAppState, useLocalStorage, useTheme
  lib/              # balances, settlement (+ tests)
```
