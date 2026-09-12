# Security (operators)

How Evenly is hardened in production. Public copy lives at `#/security`. Contact and disclosure: repo root `SECURITY.md` and `public/.well-known/security.txt`.

## Browser headers (Vercel)

`vercel.json` applies the list in `src/lib/securityHeaders.js` to `/(.*)`:

| Header | Intent |
| --- | --- |
| `Content-Security-Policy` | Default `'self'`. Scripts are same-origin only (`/auth-capture.js` for password-reset capture — **no** script `'unsafe-inline'`). Inline styles are required for MUI/Emotion. Fonts: Google Fonts. Images: this origin + `*.supabase.co`. Connect: this origin + `*.supabase.co` (HTTPS + WSS) + FX (`open.er-api.com`, `cdn.jsdelivr.net`, `api.frankfurter.dev`). |
| `Strict-Transport-Security` | Two years, `includeSubDomains`. **No `preload`.** |
| `X-Frame-Options` / `frame-ancestors` | Deny clickjacking. |
| `X-Content-Type-Options` | `nosniff`. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` (also a `<meta>` in `index.html`). |
| `Permissions-Policy` | Camera, mic, geo, Payment Request, USB, Topics off. Receipt scan uses a file input (`capture="environment"`), not `getUserMedia`. |
| `Cross-Origin-Opener-Policy` | `same-origin-allow-popups` so Venmo `window.open` still works. **Do not set COEP** — it breaks Google Fonts and Supabase signed images. |

`src/lib/securityHeaders.test.js` fails if `vercel.json` drifts.

## APIs

| Route | Guards |
| --- | --- |
| `POST /api/scan` | CORS allowlist (`CORS_ALLOW_ORIGIN`, never `*`), optional `SCAN_API_SECRET`, MIME/size/money clamps, **15 req / 15 min / IP**, generic 5xx bodies (no Gemini/key text). |
| `POST /api/chat-push` | CORS, bearer access token, sender must own the message, **120 req / 5 min / IP**, 204 on success. |
| `POST /api/delete-account` | CORS, bearer token, body `{ confirm: "DELETE" }`, **5 req / 60 min / IP**. Deletes `auth.users` (cascades Postgres) then removes owned Storage objects. 503 if service role is missing. |

JSON responses also set `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`.

Only those three files sit in `api/` as Vercel functions. Helpers and `node --test` files live in `api/_lib/` (underscore directory is not deployed as functions — Hobby is capped at 12).

### Rate-limit stores (first that is configured)

1. **Upstash Redis** — `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (fixed window, shared across isolates).
2. **Postgres** — `consume_rate_limit` RPC via `SUPABASE_SERVICE_ROLE_KEY` (migration `20260912180000_account_delete_and_rate_limit.sql`). IPs are stored as HMAC/SHA-256 hashes, not raw.
3. **In-memory** — per serverless isolate; resets on cold start.

Optional `RATE_LIMIT_PEPPER` for the IP hash (defaults to the service role key if set).

## Secrets (never `VITE_`)

- `GEMINI_API_KEY`
- `VAPID_PRIVATE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SCAN_API_SECRET` (optional)
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (optional shared rate limit)
- `RATE_LIMIT_PEPPER` (optional; IP hashing)

`VITE_*` is inlined into the bundle. The anon key is public by design; RLS must stay correct.

## Storage

- `receipt-attachments` and `chat-attachments` are **private**.
- Receipt signed URLs: 120s. Chat attachment signed URLs: 600s (`CHAT_SIGNED_URL_TTL_SECONDS`). Voice notes use the same private bucket and signed URLs as photos/files.
- Public share RPCs gate which paths the UI learns.

## Residual product risks (do not “fix” without a product decision)

- Username / email enumeration via friend search and availability RPCs.
- Active `#/share/:id` URLs are world-readable by design.
- Legacy `#/shared-settlement/:token` encodes data in the URL.

## Related

- `docs/SECURITY_UI_AUDIT.md` — 2026-09-08 shared-groups / attachments / legal pass.
- `docs/SUPABASE_DATABASE.md` — tables and RLS.
