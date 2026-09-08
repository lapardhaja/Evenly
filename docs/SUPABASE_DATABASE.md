# Evenly + Supabase: data overview

## Authentication (built-in, not in `public`)

- **`auth.users`** — email, encrypted password, etc. Managed by **Supabase Auth / GoTrue**. Evenly does not store passwords in `public` tables.
- Password reset uses **`auth.resetPasswordForEmail`** → email link → temporary session → **`auth.updateUser({ password })`**.

## Application data (`public` schema)

Run `supabase/migrations/20260210120000_evenly_normalized.sql` in the Supabase SQL editor (idempotent).  
Also run `supabase/migrations/20260215120000_currency_columns.sql` for `display_currency` on groups and `currency_code` on receipts (ISO 4217).  
Run `supabase/migrations/20260218120000_group_settled_transfers.sql` for `settled_transfers` on **`groups`** (JSON array of settled transfer keys for the Settle tab).  
Run `20260419120000_profiles_and_friends.sql` and `20260419120100_group_people_linked_user.sql` for **Friends** (profiles, requests, friendships) and optional `linked_user_id` on **`group_people`**.  
Run `20260420120000_profile_first_last_name.sql` to add optional **`first_name`** / **`last_name`** on **`profiles`** and refresh search RPCs. (It drops and recreates the username/email search functions because their return shape changed — required by Postgres.)  
Run `20260421120000_username_availability_rpc.sql` for **`is_username_available(text)`** (used for live username checks at sign-up; callable by `anon`).  
Run `20260422120000_email_availability_and_sign_in_resolve.sql` for **`is_email_available(text)`** (sign-up email check vs `auth.users`) and **`resolve_sign_in_email(text)`** (username → profile email for sign-in / reset).  
Run `20260423120000_group_members.sql` for **`group_members`**, membership-based RLS on group data, and **`add_friend_to_group(uuid, uuid)`** (invite a friend into a shared group).  
Run `20260423130000_receipt_attachments.sql` for **`receipt_attachments`** (receipt file metadata) and the private **`receipt-attachments`** Storage bucket.

| Table | Purpose |
|--------|--------|
| **`groups`** | One row per split group; `user_id` = creator/owner (`auth.users.id`). Optional `display_currency` (default USD) for Settle tab display. Optional `settled_transfers` (JSON array of strings) for which “Settle up” rows are marked done. |
| **`group_members`** | Membership for shared groups: `(group_id, user_id, role)` where `role` is `owner` or `member`. One owner per group (partial unique index). Backfilled from `groups.user_id`; new groups get an owner row via trigger. |
| **`profiles`** | One row per `auth.users` row: `username`, `display_name`, optional `first_name` / `last_name`, `email_lookup` (for friend search). |
| **`friend_requests`** | Pending/accepted/declined friend requests between users. |
| **`friendships`** | Accepted friendships (`user_a` &lt; `user_b`). |
| **`group_people`** | People in a group (`group_id` FK). Optional `linked_user_id` → friend’s `auth.users.id`. |
| **`receipts`** | Receipts in a group; tax/tip/discount, `person_paid_map`, `currency_code` (default USD), etc. |
| **`receipt_items`** | Line items on a receipt. |
| **`receipt_allocations`** | Who claimed how much of each line item. |
| **`receipt_attachments`** | File metadata for receipt attachments (images/PDF). `group_id` is denormalized for RLS; `storage_path` is bucket-relative. Max 10 MB per row (`byte_size` check). |

Group data access is **membership-based** via **`group_members`**, not `groups.user_id` alone. **`is_group_member(uuid)`** and **`is_group_owner(uuid)`** (security definer) power RLS on `groups`, `group_people`, `receipts`, `receipt_items`, `receipt_allocations`, and `receipt_attachments`. Clients cannot insert/update `group_members` directly; owners are created on group insert, and friends are added via **`add_friend_to_group(p_group_id, p_friend_user_id)`** (caller must be a member; friend must be in `friendships`; creates a `member` row and a linked `group_people` row if missing).

All `public` tables use **RLS**.

## Storage (`receipt-attachments`)

Private bucket (not public). Object path: `{group_id}/{receipt_id}/{attachment_id}.{ext}`.  
Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`, `application/pdf`. Max file size: 10 MB (bucket + table check).  
Storage RLS on `storage.objects`: select/insert/delete for authenticated users who are members of the group in the first path segment (`split_part(name, '/', 1)`). Clients should use signed URLs for viewing.

## Optional: inspect in dashboard

**Table Editor** → `public.groups` (and related).  
**Authentication** → **Users** for accounts.
