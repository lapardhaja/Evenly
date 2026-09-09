# Group chat, DMs, and Venmo payment cards

**Date:** 2026-09-09  
**Status:** Approved (user: proceed autonomously)  
**Approach:** Unified `conversations` + Venmo deep links (Evenly does not move money)

## Problem

Shared groups have no place to talk, and Settle only has a checkbox. People already pay on Venmo; Evenly cannot process money (no public Venmo P2P API; product is not a processor).

## Goals

1. One chat thread per group (members) and 1:1 DMs (friends **or** shared-group members).
2. Profile Venmo username; Settle + chat cards open Venmo with amount/note prefilled (USD).
3. **Request** posts a payment card to the debtor–creditor DM (optional copy in the group thread). **I paid** marks the card paid and the Settle transfer settled.
4. Cloud-only (Supabase Auth + Realtime). Local-only builds hide chat/Venmo.

## Non-goals (v1)

- Evenly moving money (Stripe/PayPal/Venmo API)
- Images, edits, message delete (except cancel a requested card)
- Push / email notifications
- Proof that Venmo cleared (honor system)
- DMs with guest people (no `linked_user_id`)
- Local-only chat

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Money | Venmo deep links + in-app requested/paid records |
| Chat | Unified `conversations` (`group` \| `dm`) |
| DM who | Friends **or** anyone who shares a group |
| Card lands | DM with that person; optional also-post to group (default off) |
| FX | Venmo is USD; convert from settle display currency or hide Pay |
| Unread | `last_read_at`; in-app badge only |

---

## 1. Data model

`profiles.venmo_username` optional citext, format `^[a-zA-Z0-9_-]{3,30}$`.

`conversations`: `kind` group|dm; group has unique `group_id`; dm has `dm_user_a < dm_user_b` unique pair.

`conversation_members` `(conversation_id, user_id, last_read_at)` — group rows mirrored from `group_members` via trigger; DMs created by `get_or_create_dm`.

`messages`: `type` text|payment; `body`; `payload jsonb`; `sender_id`; no client UPDATE/DELETE.

Payment payload: `{ group_id, from_user_id, to_user_id, from_person_id, to_person_id, amount, currency, transfer_key, status: requested|paid|canceled, venmo_username }`.

**RLS:** read/insert messages iff conversation member and `sender_id = auth.uid()`. Payment status via RPCs `mark_payment_paid` / `cancel_payment_request`. `get_or_create_dm` rejects self and non-eligible pairs.

**Triggers:** group insert → group conversation; `group_members` insert/delete → members; backfill existing groups.

## 2. UI

- App bar Chat icon + account menu Chat; badge = unread conversations. `#/chat` inbox, `#/chat/:id` thread, `#/groups/:id/chat` same group conversation.
- New DM picker: `list_dm_candidates`.
- Payment card: Pay on Venmo / I paid / Cancel; paid is inert.
- Settle row (current user is from or to, other party linked): Pay on Venmo, Request, optional “also post in group”.
- Profile: Venmo username field.
- Pull-to-refresh disabled on `/chat` threads (composer). Inbox may refresh.

## 3. Realtime and sync

- Realtime on `messages` (replica identity full). Thread subscribes by `conversation_id`. Inbox refetches on any insert + visibility.
- `mark_payment_paid` sets payload `paid` and appends `transfer_key` to `groups.settled_transfers`. Client also `setSettledTransfers` so the snapshot persist does not clobber immediately.
- Other clients: on payment `paid` event, merge `transfer_key` if that group is loaded.

## 4. Errors

- No Venmo handle: card still posts; CTA copy amount + “add Venmo on Profile”.
- Guest person: no DM/card; Settle copy amount only.
- FX fail: hide Pay on Venmo; Request still uses settle currency in the card (`currency` field).
- RPC/network: snackbar; do not mark settled.
- Venmo app missing: fall back to `https://venmo.com/...`.

## 5. Testing

- Unit: Venmo URL builder, username validation, payment payload/preview, `appShell` PTR on `/chat`.
- `npm test` + `npm run build`.
- Manual: inbox, group tab, DM, Settle Request + Pay, I paid → Settle checkbox, unread badge.

## Security

- Chat is members-only; public share pages do not include messages.
- Venmo handles visible to authenticated users (same as profiles today).
- Evenly never claims a Venmo payment completed.
- Message body ≤ 2000 chars.
