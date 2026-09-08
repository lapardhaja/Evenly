# Security and UI audit (2026-09-08)

Notes from the shared-groups / attachments / legal / public-share pass. Marks **fixed in this PR** vs **residual risk**. Spec: `docs/superpowers/specs/2026-09-08-shared-groups-attachments-legal-design.md` §4.

## Scan API (`POST /api/scan`)

**Fixed (Task 12).** Guard in `api/scanGuard.js`, wired in `api/scan.js`.

| Env | Role |
| --- | --- |
| `SCAN_API_SECRET` (server) | Optional. When set, require header `x-evenly-scan-secret` with the same value (401 otherwise). Intended for non-browser callers (scripts, CI). |
| `CORS_ALLOW_ORIGIN` (server) | Optional comma-separated origin allowlist. Request `Origin` must match when configured; matching origins are reflected. **`Access-Control-Allow-Origin: *` is never emitted.** |
| `VITE_SCAN_API_SECRET` (client) | Optional. If set, the SPA sends `x-evenly-scan-secret`. Only for simple deploys where putting the secret in the bundle is acceptable. |

**GitHub Pages → Vercel `/api/scan`:** set `CORS_ALLOW_ORIGIN` to the Pages origin(s) (comma-separated). Without that allowlist, the browser CORS check fails; `Access-Control-Allow-Origin: *` is never emitted.

**Production browsers (same Vercel host):** set `CORS_ALLOW_ORIGIN` to the production origin(s) and leave `SCAN_API_SECRET` unset so `/api/scan` stays same-origin without a secret in the client. Set the server secret for non-browser callers.

**Clamps retained:** image MIME only (PDF rejected); base64 length cap; money fields clamped in `api/scan.js`.

**Residual:** no live Vercel/`GEMINI_API_KEY` integration test in this environment (unit tests cover the guard). Cross-origin calls without a matching `CORS_ALLOW_ORIGIN` fail CORS by design; same-origin SPA calls are unaffected.

## Storage (attachments)

**Fixed (Tasks 7–8, 14–15).**

- Bucket `receipt-attachments` is **private** (`public = false`), 10 MB, MIME allowlist.
- Object path `{group_id}/{receipt_id}/{attachment_id}.{ext}` (UUIDs; first segment via `storage_path_group_id(name)`, which returns null instead of throwing if the segment is not a UUID). Client builds paths from UUIDs — no user-controlled traversal into other prefixes.
- Authenticated **SELECT/INSERT/DELETE** require `is_group_member(group_id)`.
- Extra **SELECT** for `anon` and `authenticated` when `has_active_attachment_share(group_id)` (active public share with `include_attachments`).
- **No LIST policy.** Viewers use short-TTL **signed URLs** (120s) via `createSignedUrl` after members know `storage_path`, or after the public-share RPC returns a path.
- Members and public viewers never get permanent public object URLs.

**Residual:** guessing a full UUID path could theoretically hit Storage SELECT while an **attachment-including** share is active for that group. Paths are unguessable; the RPC still gates which paths the UI learns. Revoked shares fail the RPC (`share not found`) and drop `has_active_attachment_share`, so new signed URLs must not mint.

## RLS / IDOR

**Fixed (Tasks 1, 7, 14).** Group tables (`groups`, `group_people`, `receipts`, items, allocations, attachments) gate on membership. `groups` DELETE is owner-only. Attachment **INSERT** requires `receipts.group_id` to match `receipt_attachments.group_id`. Anon has **no SELECT** on `group_public_shares` or group/receipt tables.

**Residual:** last-write-wins sync (not a security IDOR). Operators must apply all migrations in order.

## Membership RPC

**Fixed (Task 2).** `add_friend_to_group` is security definer, **authenticated only**. Caller must be a member; target must be an accepted friend; insert role is always `member` (`on conflict do nothing`). Cannot add self. No path to promote to owner.

UI: Friends already in the group are disabled with “(already in group)”.

## XSS

**Fixed.** No `dangerouslySetInnerHTML` in the app. Attachment display names are stripped of path segments and control characters (`sanitizeFileName` in attachment UI and public share). React text nodes encode names.

## Anon profile / search enumeration

**Residual (documented, not closed).** Signed-in users can prefix-search usernames (`search_profiles_by_username`, limit 25) and look up an exact email (`find_profile_by_email_exact`). Anon can call `is_username_available`, `is_email_available`, and `resolve_sign_in_email` (username → email for password sign-in). Treat usernames and emails as enumerable to anyone who uses the product. Privacy copy already states this. Tightening (rate limits, dropping email resolve) is a later product decision.

## Privacy copy

**Fixed (Tasks 10, 16).** Privacy describes: localStorage; Supabase auth/profiles/friends/sync; Storage attachments; Gemini OCR via `/api/scan` (image not kept unless the user keeps the photo); **public `#/share/:id`** (receipts + optional attachments, revoke); **legacy `#/shared-settlement/:token`**. Operator contact is `servetlap29@gmail.com`; place of operation is New York, New York.

## Public share RPCs (`#/share/:id`)

**Fixed (Tasks 14–16).**

| RPC | Grants | Behavior |
| --- | --- | --- |
| `create_public_group_share` | authenticated | Member only; returns share uuid |
| `revoke_public_group_share` | authenticated | Member of that group; sets `revoked_at` |
| `get_public_group_share` | anon + authenticated | Active shares only; missing/revoked → `share not found` |
| `get_public_share_attachment_url` | anon + authenticated | Path only if active + `include_attachments` + attachment in that group; else `share not found` / `attachments not included` |

- Anon cannot SELECT `group_public_shares` or group tables.
- Public page is **read-only** (no persist, no membership RPCs, no attachment upload/delete).
- Client mints 120s signed URLs after the path RPC. Revoked shares must not mint.

**Residual:** anyone with an **active** URL sees receipts (and attachments if included). That is the product. Multiple active links per group are allowed. Legacy settlement tokens remain public-by-URL (data in the hash).

## Security checklist (spec §4)

| Item | Status |
| --- | --- |
| Scan API auth/secret + CORS, no `*`, size/MIME/money clamps | **Fixed** (Task 12) |
| Storage private; membership + public-share SELECT; UUID paths | **Fixed** |
| RLS / IDOR; attachment `receipt_id`/`group_id` consistency | **Fixed** |
| Membership RPC friends-only; no owner escalation | **Fixed** |
| XSS: no `dangerouslySetInnerHTML`; sanitize file names | **Fixed** |
| Document anon profile/search enumeration | **Documented residual** |
| Privacy: public shares, legacy settlement tokens, OCR | **Fixed** |
| Public share RPCs: valid share id; revoke; no edit | **Fixed** |

## UI checklist (phone + desktop)

| Item | Status |
| --- | --- |
| FAB / safe-area vs attachment actions | **Fixed this pass:** FABs/SpeedDials use `fabFixedPlacementSx` (home indicator + cookie-banner offset). Attachment/scan snackbars already pad `safe-area-inset-bottom`. **Residual:** cookie banner still sits over the footer until dismissed. |
| Lightbox / PDF: scroll lock, hash back | **Fixed this pass:** fullscreen Dialog (body scroll lock); hardware/browser back pops a dummy history state and closes. Close control is a back affordance. HEIC/PDF still Open/Download. |
| Owned vs shared badge | **Fixed** (Task 5) |
| Duplicate friend-add prevented | **Fixed** (menu disable + RPC no-op) |
| Upload empty / error / offline | **Mostly fixed:** MIME/size/empty rejected client-side; errors via Snackbar. **Residual:** no dedicated offline empty-state copy. |
| Legal pages + cookie banner light/dark | **Fixed this pass:** `code` chips use theme `action.hover`; cookie bar uses `background.paper` + safe-area padding. |
| Touch targets / keyboard attach-delete-open | **Fixed** (buttons/IconButtons; **residual:** 80px thumbs are small but ≥44px hit area on Add/delete/open) |
| Public share page: receipts + settle + attachments, no auth | **Fixed** (Tasks 15–16). **This pass:** create-dialog warning follows the include-attachments toggle. |
| Local-only scan “Keep photo” | **Fixed this pass:** checkbox hidden when Supabase is not configured (keep would not persist). |

## Follow-up fixes in this audit pass

- Hide scan “Keep photo as attachment” when attachments are cloud-only.
- Share-create warning: receipts-only vs receipts + attachments based on the toggle.
- Lightbox: back control + `history` so device back closes the overlay.
- Cookie banner safe-area; FAB offset while the banner is visible.
- Legal `<code>` contrast in dark theme.
