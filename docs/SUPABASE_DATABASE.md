# Evenly + Supabase: data overview

## Authentication (built-in, not in `public`)

- **`auth.users`** — email, encrypted password, etc. Managed by **Supabase Auth / GoTrue**. Evenly does not store passwords in `public` tables.
- Password reset uses **`auth.resetPasswordForEmail`** → email link → temporary session → **`auth.updateUser({ password })`**.

## Application data (`public` schema)

Run `supabase/migrations/20260210120000_evenly_normalized.sql` in the Supabase SQL editor (idempotent).  
Also run `supabase/migrations/20260215120000_currency_columns.sql` for `display_currency` on groups and `currency_code` on receipts (ISO 4217).  
Run `supabase/migrations/20260218120000_group_settled_transfers.sql` for `settled_transfers` on **`groups`** (JSON array of settled transfer keys for the Settle tab).  
Run `20260419120000_profiles_and_friends.sql` and `20260419120100_group_people_linked_user.sql` for **Friends** (profiles, requests, friendships) and optional `linked_user_id` on **`group_people`**.

| Table | Purpose |
|--------|--------|
| **`groups`** | One row per split group; `user_id` = owner (`auth.users.id`). Optional `display_currency` (default USD) for Settle tab display. Optional `settled_transfers` (JSON array of strings) for which “Settle up” rows are marked done. |
| **`profiles`** | One row per `auth.users` row: `username`, `display_name`, `email_lookup` (for friend search). |
| **`friend_requests`** | Pending/accepted/declined friend requests between users. |
| **`friendships`** | Accepted friendships (`user_a` &lt; `user_b`). |
| **`group_people`** | People in a group (`group_id` FK). Optional `linked_user_id` → friend’s `auth.users.id`. |
| **`receipts`** | Receipts in a group; tax/tip/discount, `person_paid_map`, `currency_code` (default USD), etc. |
| **`receipt_items`** | Line items on a receipt. |
| **`receipt_allocations`** | Who claimed how much of each line item. |

All `public` tables use **RLS** so each user only sees their own `groups` (and related rows).

## Optional: inspect in dashboard

**Table Editor** → `public.groups` (and related).  
**Authentication** → **Users** for accounts.
