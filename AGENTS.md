# AGENTS.md

## Cursor Cloud specific instructions

**Evenly** is a client-side React 18 + Vite 6 bill-splitting app. No backend/database — data lives in localStorage.

### Commands (see `package.json` scripts)
- `npm run dev` — start Vite dev server (port 5173)
- `npm test` — run settlement algorithm tests (Node built-in test runner)
- `npm run build` — production build to `dist/`

### Notes
- Single service, no docker/database/env vars needed.
- No linter is configured in the repo currently.
- Tests use `node --test` (no Jest/Vitest), so only `src/lib/settlement.test.js` runs.
