# Evenly + Supabase: data overview

## Authentication (built-in, not in `public`)

- **`auth.users`** — email, encrypted password, etc. Managed by **Supabase Auth / GoTrue**. Evenly does not store passwords in `public` tables.
- Password reset uses **`auth.resetPasswordForEmail`** → email link → temporary session → **`auth.updateUser({ password })`**.

## Application data (`public` schema)

**Automatic (production):** GitHub Action `.github/workflows/supabase-migrate.yml` runs `supabase db push --db-url` on push to `main` (and `workflow_dispatch`). It does **not** call `supabase link` (CLI `link` hits `GET /v1/projects/{ref}/api-keys` and 403s even for full-permission PATs). Secrets: `SUPABASE_PROJECT_ID` (20-char Reference ID, not `evenly`), `SUPABASE_DB_PASSWORD`, `SUPABASE_ACCESS_TOKEN` (region lookup), optional `SUPABASE_DB_URL` (session-mode URI). Do **not** run migrations from the Vercel build — Vercel is the SPA + `POST /api/scan` only.

**Manual (SQL editor):** run files in `supabase/migrations/` in timestamp order (idempotent).

### Baselining (first CLI push)

If this project was migrated only via the SQL editor, `supabase_migrations.schema_migrations` is empty and `db push` will try to re-apply every file. Files are mostly idempotent, but you should mark already-applied versions so history matches:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
# For each filename prefix already applied in prod, e.g.:
npx supabase migration repair --status applied 20260210120000
# …repeat for 20260215120000 … through the latest you’ve run by hand…
npx supabase db push
```

Then let CI own new files (including `20260423120000_group_members`, `20260423130000_receipt_attachments`, `20260424120000_group_public_shares`, `20260909120000_chat_and_venmo`, `20260909140000_friend_requests_realtime`).

**Dashboard alternative:** Supabase → Project → Integrations → GitHub → deploy migrations on push to `main` (same `supabase/migrations` folder; skip the Action if you use this).

Run `supabase/migrations/20260210120000_evenly_normalized.sql` in the Supabase SQL editor (idempotent).  
Also run `supabase/migrations/20260215120000_currency_columns.sql` for `display_currency` on groups and `currency_code` on receipts (ISO 4217).  
Run `supabase/migrations/20260218120000_group_settled_transfers.sql` for `settled_transfers` on **`groups`** (JSON array of settled transfer keys for the Settle tab).  
Run `20260419120000_profiles_and_friends.sql` and `20260419120100_group_people_linked_user.sql` for **Friends** (profiles, requests, friendships) and optional `linked_user_id` on **`group_people`**.  
Run `20260420120000_profile_first_last_name.sql` to add optional **`first_name`** / **`last_name`** on **`profiles`** and refresh search RPCs. (It drops and recreates the username/email search functions because their return shape changed — required by Postgres.)  
Run `20260421120000_username_availability_rpc.sql` for **`is_username_available(text)`** (used for live username checks at sign-up; callable by `anon`).  
Run `20260422120000_email_availability_and_sign_in_resolve.sql` for **`is_email_available(text)`** (sign-up email check vs `auth.users`) and **`resolve_sign_in_email(text)`** (username → profile email for sign-in / reset).  
Run `20260423120000_group_members.sql` for **`group_members`**, membership-based RLS on group data, and **`add_friend_to_group(uuid, uuid)`** (invite a friend into a shared group).  
Run `20260423130000_receipt_attachments.sql` for **`receipt_attachments`** (receipt file metadata) and the private **`receipt-attachments`** Storage bucket.  
Run `20260424120000_group_public_shares.sql` for **`group_public_shares`** and no-login share RPCs (`create_public_group_share`, `revoke_public_group_share`, `get_public_group_share`, `get_public_share_attachment_url`).  
Run `20260909120000_chat_and_venmo.sql` for **`conversations`**, **`conversation_members`**, **`messages`**, optional **`profiles.venmo_username`**, and chat RPCs (`get_or_create_dm`, `list_my_conversations`, `mark_payment_paid`, etc.). Evenly does not process Venmo payments — handles are for pay-link deep links only.  
Run `20260909140000_friend_requests_realtime.sql` to add **`friend_requests`** to `supabase_realtime` (app-bar badge + snackbar).  
Run `20260909160000_push_subscriptions.sql` for **`push_subscriptions`** (Web Push endpoints per user; RLS = own rows). Server fan-out uses the service role from `POST /api/chat-push`.  
Run `20260910120000_chat_images_likes_friend_search.sql` for chat **`image`** messages, **`message_likes`**, private Storage bucket **`chat-attachments`**, name-aware **`search_profiles_by_username`**, and **`add_friend_to_group`** healing a missing owner `group_members` row.

| Table | Purpose |
|--------|--------|
| **`groups`** | One row per split group; `user_id` = creator/owner (`auth.users.id`). Optional `display_currency` (default USD) for Settle tab display. Optional `settled_transfers` (JSON array of strings) for which “Settle up” rows are marked done. |
| **`group_members`** | Membership for shared groups: `(group_id, user_id, role)` where `role` is `owner` or `member`. One owner per group (partial unique index). Backfilled from `groups.user_id`; new groups get an owner row via trigger. |
| **`profiles`** | One row per `auth.users` row: `username`, `display_name`, optional `first_name` / `last_name`, optional `venmo_username` (pay-link handle), `email_lookup` (for friend search). |
| **`friend_requests`** | Pending/accepted/declined friend requests between users. |
| **`friendships`** | Accepted friendships (`user_a` &lt; `user_b`). |
| **`group_people`** | People in a group (`group_id` FK). Optional `linked_user_id` → friend’s `auth.users.id`. |
| **`receipts`** | Receipts in a group; tax/tip/discount, `person_paid_map`, `currency_code` (default USD), etc. |
| **`receipt_items`** | Line items on a receipt. |
| **`receipt_allocations`** | Who claimed how much of each line item. |
| **`receipt_attachments`** | File metadata for receipt attachments (images/PDF). `group_id` is denormalized for RLS; `storage_path` is bucket-relative. Max 10 MB per row (`byte_size` check). |
| **`group_public_shares`** | No-login share links for a group. `id` is the URL token. `revoked_at` null = active. `include_attachments` (default true) gates attachment metadata and Storage access. |
| **`conversations`** | Chat rooms: `kind` `group` (one per group) or `dm` (unique user pair). |
| **`conversation_members`** | Who can read/write a conversation; `last_read_at` for unread. Group membership is mirrored from `group_members`. |
| **`messages`** | `text`, `payment`, or `image`. Client insert only; paid/cancel via RPCs. Image `payload`: `storage_path`, `mime_type`, `byte_size`. |
| **`message_likes`** | Heart on a message. PK `(message_id, user_id)`. Members of the conversation can read; you can insert/delete only your own row. Realtime. |
| **`push_subscriptions`** | Web Push `endpoint` + keys per user. PK `(user_id, endpoint)`. Client upserts own rows; `POST /api/chat-push` reads targets via service role. |

Group data access is **membership-based** via **`group_members`**, not `groups.user_id` alone. **`is_group_member(uuid)`** and **`is_group_owner(uuid)`** (security definer) power RLS on `groups`, `group_people`, `receipts`, `receipt_items`, `receipt_allocations`, `receipt_attachments`, and **`group_public_shares`**. Clients cannot insert/update `group_members` directly; owners are created on group insert, and friends are added via **`add_friend_to_group(p_group_id, p_friend_user_id)`** (caller must be a member; if the caller owns `groups.user_id` but is missing from `group_members`, the RPC inserts the owner row then continues; friend must be in `friendships`; creates a `member` row and a linked `group_people` row if missing). **`search_profiles_by_username`** matches username prefix plus first/last/display/full name.

**Public group shares (Approach C):** Members call **`create_public_group_share(p_group_id, p_include_attachments default true)`** (returns share uuid) and **`revoke_public_group_share(p_share_id)`** (sets `revoked_at`). Those RPCs are granted to **`authenticated` only**. Clients have **SELECT/INSERT** on `group_public_shares` (no **UPDATE**; revoke is RPC-only). Anon **cannot SELECT** `group_public_shares` (or group/receipt tables). **`get_public_group_share(p_share_id)`** and **`get_public_share_attachment_url(p_share_id, p_attachment_id)`** are security definer and granted to **`anon` and `authenticated`**. They succeed only for **active** shares (`revoked_at` is null); missing and revoked both raise `share not found`.

**`groups.user_id`** (creator) is immutable: trigger **`prevent_groups_user_id_change`** rejects updates that change it.

`get_public_group_share` JSON: `id`, `group_id`, `name`, `display_currency`, `include_attachments`, `people[]` (`id`, `name`), `receipts[]` (`id`, `title`, `date_ms`, `paid_by_id`, `currency_code`, `tax_behavior`, `tax_cost`, `tip_cost`, `discount_cost`, `items[]`, `allocations[]`, `attachments[]`). Attachment objects are **`id`, `mime_type`, `file_name` only** (no `storage_path`, no signed URLs). When `include_attachments` is false, each receipt’s `attachments` is `[]`. **Transfers are not computed in SQL** — the public page should map this payload into the existing client `settlement.js` (`computeNetBalances` / `minimizeTransfers`).

`get_public_share_attachment_url` returns the bucket-relative **`storage_path`** (e.g. `{group_id}/{receipt_id}/{attachment_id}.jpg`) only if the share is active, `include_attachments` is true, and the attachment’s `group_id` matches the share. It does **not** mint signed URLs in SQL. **Task 15 client flow:** call this RPC, then `supabase.storage.from('receipt-attachments').createSignedUrl(path, 120)` (or `download`) using the anon key. Storage RLS (`has_active_attachment_share`) allows SELECT on objects in groups with an active attachment share; the RPC still gates which paths callers learn. Paths remain unguessable UUIDs.

All `public` tables use **RLS**.

## Storage (`chat-attachments`)

Private bucket (not public). Object path: `{conversation_id}/{message_id}.{ext}`.  
Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`. Max file size: 8 MB.  
Storage RLS: select/insert/delete for authenticated conversation members (`is_conversation_member(storage_path_group_id(name))` — first path segment is the conversation UUID). No LIST policy. Clients mint **`createSignedUrl`** after insert.

## Storage (`receipt-attachments`)

Private bucket (not public). Object path: `{group_id}/{receipt_id}/{attachment_id}.{ext}`.  
Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`, `application/pdf`. Max file size: 10 MB (bucket + table check).  
Storage RLS on `storage.objects`: select/insert/delete for authenticated members of the group in the first path segment (`storage_path_group_id(name)`; null if not a UUID so RLS never throws); additional **select** for `anon` and `authenticated` when **`has_active_attachment_share(group_id)`** is true (active public share with `include_attachments`). No LIST policy. Members and public-share viewers use client **`createSignedUrl`** / **`download`**; public viewers first call **`get_public_share_attachment_url`** for the path (anon cannot SELECT `receipt_attachments` rows).

## Optional: inspect in dashboard

**Table Editor** → `public.groups` (and related).  
**Authentication** → **Users** for accounts.
