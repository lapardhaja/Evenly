# Security (operators)

How Evenly is hardened in production. Public copy lives at `#/security`. Contact and disclosure: repo root `SECURITY.md` and `public/.well-known/security.txt`.

## Browser headers (Vercel)

`vercel.json` applies the list in `src/lib/securityHeaders.js` to `/(.*)`:

| Header | Intent |
| --- | --- |
| `Content-Security-Policy` | Default `'self'`. Inline script is required for the password-reset capture in `index.html`. Inline styles are required for MUI/Emotion. Fonts: Google Fonts. Images/connect: this origin + `*.supabase.co` (HTTPS + WSS). |
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
| `POST /api/scan` | CORS allowlist (`CORS_ALLOW_ORIGIN`, never `*`), optional `SCAN_API_SECRET`, MIME/size/money clamps, **15 req / 15 min / IP** (in-memory, per isolate), generic 5xx bodies (no Gemini/key text). |
| `POST /api/chat-push` | CORS, bearer access token, sender must own the message, **120 req / 5 min / IP**, 204 on success. |

JSON responses also set `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`. Rate limits reset on serverless cold start — they are a speed bump, not a WAF.

## Secrets (never `VITE_`)

- `GEMINI_API_KEY`
- `VAPID_PRIVATE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SCAN_API_SECRET` (optional)

`VITE_*` is inlined into the bundle. The anon key is public by design; RLS must stay correct.

## Storage

- `receipt-attachments` and `chat-attachments` are **private**.
- Receipt signed URLs: 120s. Chat photo signed URLs: 600s (`CHAT_SIGNED_URL_TTL_SECONDS`).
- Public share RPCs gate which paths the UI learns.

## Residual product risks (do not “fix” without a product decision)

- Username / email enumeration via friend search and availability RPCs.
- Active `#/share/:id` URLs are world-readable by design.
- Legacy `#/shared-settlement/:token` encodes data in the URL.

## Related

- `docs/SECURITY_UI_AUDIT.md` — 2026-09-08 shared-groups / attachments / legal pass.
- `docs/SUPABASE_DATABASE.md` — tables and RLS.
