# Evenly + Supabase: data overview

## Authentication (built-in, not in `public`)

- **`auth.users`** — email, encrypted password, etc. Managed by **Supabase Auth / GoTrue**. Evenly does not store passwords in `public` tables.
- Password reset uses **`auth.resetPasswordForEmail`** → email link → temporary session → **`auth.updateUser({ password })`**.

## Application data (`public` schema)

Run `supabase/migrations/20260210120000_evenly_normalized.sql` in the Supabase SQL editor (idempotent).

| Table | Purpose |
|--------|--------|
| **`groups`** | One row per split group; `user_id` = owner (`auth.users.id`). |
| **`group_people`** | People in a group (`group_id` FK). |
| **`receipts`** | Receipts in a group; tax/tip/discount, `person_paid_map`, etc. |
| **`receipt_items`** | Line items on a receipt. |
| **`receipt_allocations`** | Who claimed how much of each line item. |

All `public` tables use **RLS** so each user only sees their own `groups` (and related rows).

## Optional: inspect in dashboard

**Table Editor** → `public.groups` (and related).  
**Authentication** → **Users** for accounts.
