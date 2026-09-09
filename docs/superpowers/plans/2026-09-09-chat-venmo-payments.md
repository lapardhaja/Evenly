# Chat + Venmo Payment Cards Implementation Plan

> **For agentic workers:** Execute inline in this session (user: proceed autonomously). Spec: `docs/superpowers/specs/2026-09-09-chat-venmo-payments-design.md`

**Goal:** Cloud-only group chat, 1:1 DMs, Venmo pay links, and payment cards that mark Settle transfers paid.

**Architecture:** Unified `conversations`/`messages` with RLS + Realtime. Evenly does not move money. Venmo deep links + honor-system `I paid`.

**Tech Stack:** React 18, MUI 5, Supabase Postgres RLS + Realtime, `node:test`.

## Global Constraints

- Evenly is not a payment processor.
- DMs: friends OR shared group members; no guests.
- Local-only: hide chat and Venmo.
- Tests: `npm test` + `npm run build`.

## File map

| File | Responsibility |
|------|----------------|
| `supabase/migrations/20260909120000_chat_and_venmo.sql` | Schema, RLS, RPCs, triggers, realtime |
| `src/lib/venmoLinks.js` | Username rules, pay URLs, open helper |
| `src/lib/chatPayment.js` | Payload + preview + USD convert helper |
| `src/lib/chatApi.js` | Client RPCs + message CRUD + realtime |
| `src/components/ChatThread.jsx` | Shared bubble list + composer |
| `src/components/PaymentMessageCard.jsx` | Payment card UI |
| `src/pages/ChatInboxPage.jsx` | Conversation list + new DM |
| `src/pages/ChatThreadPage.jsx` | `#/chat/:id` |
| `src/pages/GroupChatTab.jsx` | Group Chat tab |
| `src/router.jsx` / `Layout.jsx` / `GroupDetailPage.jsx` / `GroupSettleTab.jsx` / `ProfilePage.jsx` | Wiring |
| `src/lib/friendsApi.js` | Persist `venmo_username` |
| Legal + `docs/SUPABASE_DATABASE.md` | Copy |

Execute tasks in order: unit libs → migration → API → UI → legal → test/build.
