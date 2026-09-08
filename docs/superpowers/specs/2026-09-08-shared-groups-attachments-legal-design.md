# Shared groups, expense attachments, legal pack, and security audit

**Date:** 2026-09-08  
**Status:** Approved for implementation planning  
**Approach:** Supabase-native (membership RLS + Storage + static legal routes)

## Problem

Evenly today is single-owner: friends can be labeled on a group via `linked_user_id`, but they never see that group on their account. Receipt scan OCR discards the source image, so members cannot reopen proof of a charge. There are no Privacy / Terms / Cookies / Copyright pages. Scan API and related surfaces need a security pass once new collaboration and file features exist.

## Goals

1. When a friend is added to a group, that group appears on their account with full edit access.
2. Each expense can hold 0..n attachments (images or PDF: receipts, statements, charge screenshots) that any member can open.
3. Ship Privacy, Terms, Cookies, and Copyright pages with footer / login discovery and a lightweight cookie notice.
4. Audit and harden security + mobile/desktop UI after the above land.

## Non-goals (v1)

- Realtime multiplayer sync (keep load + save; last-write-wins).
- Invite accept/decline flow or join-by-link/code.
- Group-level media albums (attachments are per-expense only).
- Role matrix beyond owner vs member (members are full collaborators; only owner deletes the group).
- Analytics / marketing cookies or consent matrices.
- Attachments or shared membership in local-only builds (no Supabase).
- Changing settlement share-link behavior (remains public snapshot).

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Build order | Shared groups → attachments → legal → security/UI |
| Permissions | Full collaborators for all members |
| Invite | Friends picker; immediate membership; no accept step |
| Attachments | Per expense; images + PDF |
| Backend | Supabase Auth + Postgres RLS + Storage |
| Local-only | No share / no persisted attachments |

---

## 1. Shared groups

### Data model

New table `group_members`:

| Column | Type | Notes |
|--------|------|--------|
| `group_id` | uuid PK part | FK → `groups.id` ON DELETE CASCADE |
| `user_id` | uuid PK part | FK → `auth.users.id` ON DELETE CASCADE |
| `role` | text | `owner` \| `member` |
| `created_at` | timestamptz | default now() |

Constraints: unique `(group_id, user_id)`; at most one `owner` per group (enforce in trigger or app + check).

`groups.user_id` remains the creator / billing pointer. **Access control uses `group_members` only.**

Migration steps:

1. Create `group_members`.
2. Backfill: for each existing group, insert `(group_id, user_id, 'owner')` from `groups.user_id`.
3. On group create (app + optional DB trigger): insert creator as `owner`.

### RLS

Rewrite policies on `groups`, `group_people`, `receipts`, `receipt_items`, `receipt_allocations` (and later `receipt_attachments`) so SELECT/INSERT/UPDATE/DELETE require:

```sql
EXISTS (
  SELECT 1 FROM group_members gm
  WHERE gm.group_id = <row's group_id>
    AND gm.user_id = auth.uid()
)
```

Additional rules:

- `DELETE` on `groups`: caller must be `role = 'owner'`.
- `group_members` INSERT: existing member may add a user who is already their friend (enforced in RPC or app + friendship check in policy/RPC).
- `group_members` DELETE: user may delete own row (leave); owner may remove non-owner members; owner cannot remove self without deleting the group.

Prefer a security-definer RPC `add_friend_to_group(group_id, friend_user_id)` that:

1. Asserts caller is a member.
2. Asserts an accepted friendship exists.
3. Upserts `group_members` as `member`.
4. Ensures a `group_people` row with `linked_user_id = friend_user_id` (create if missing).

### App sync

- `loadNormalizedData`: return all groups where `auth.uid()` ∈ `group_members` (join), not only `groups.user_id = auth.uid()`.
- `persistNormalizedData`: same membership gate via RLS.
- Groups home: list shared groups alongside owned; optional subtle “Shared” vs “Owned” badge.
- People tab: “Add from friends” calls the RPC (or equivalent) so membership + person stay in sync.
- Removing a person who has `linked_user_id`: also remove their `group_members` row if role ≠ owner.
- Leave group: member removes own membership; person row remains as a guest label unless deleted separately.
- Owner leave: not supported in v1 — must delete the group (or a later transfer-ownership feature).

### Error handling

- Add friend who is already a member → no-op / toast “Already in group”.
- Add non-friend → rejected by RPC.
- Member tries to delete group → forbidden; UI hides/disables delete for non-owners.

---

## 2. Expense attachments

### Data model

Table `receipt_attachments`:

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid PK | |
| `receipt_id` | uuid | FK → `receipts.id` ON DELETE CASCADE |
| `group_id` | uuid | Denormalized for Storage RLS; must match receipt’s group |
| `storage_path` | text | Bucket-relative path |
| `mime_type` | text | Allowlisted |
| `file_name` | text | Display name; sanitize in UI |
| `byte_size` | int | |
| `uploaded_by` | uuid | `auth.uid()` |
| `created_at` | timestamptz | |

Caps: **10 MB per file**, **20 attachments per receipt**.  
MIME allowlist: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`, `application/pdf`.

### Storage

- Bucket: `receipt-attachments` (private, not public).
- Object path: `{group_id}/{receipt_id}/{attachment_id}.{ext}`.
- Storage policies: allow read/write/delete only if `auth.uid()` is in `group_members` for `group_id` parsed from the first path segment (or via a mapping table / signed upload that checks membership first).
- View via **short-TTL signed URLs**; never permanent public URLs.

### UX

- Receipt detail: Attachments strip — image thumbnails; PDF icon + filename.
- Add: camera / photo library / file picker (images + PDF).
- Open: fullscreen lightbox for images; in-app PDF view or system open/download for PDFs.
- HEIC/HEIF: accept upload; if the browser cannot render in-lightbox, show download / “Open externally” fallback (no server-side transcode in v1).
- Delete: any member.
- Scan flow: checkbox **“Keep photo as attachment”** (default **on**).
- Independent “Add attachment” without running OCR.
- Receipt list: paperclip badge when `attachment_count > 0`.
- Mobile + desktop: same flows; large touch targets; safe-area aware overlays.

### Client flow

1. Validate MIME + size client-side.
2. Create attachment id; upload to Storage path.
3. Insert `receipt_attachments` row.
4. On failure after upload: delete Storage object (no orphans).
5. Optimistic UI with rollback on error toasts.

Local-only builds: hide or disable with copy that cloud sign-in is required for attachments.

---

## 3. Legal / compliance pack

### Routes (public, hash router)

| Route | Page |
|-------|------|
| `#/privacy` | Privacy Policy |
| `#/terms` | Terms of Service |
| `#/cookies` | Cookie Policy |
| `#/copyright` | Copyright / IP notice |

### Content scope

Product-accurate descriptions of:

- localStorage usage (`evenly:data:v2` when local-only)
- Supabase auth, profiles, friends, group sync, Storage attachments
- Gemini OCR via `/api/scan` (images processed by Google; not retained as attachments unless user opts to keep)
- Public settlement share links
- Contact / operator placeholders (email, jurisdiction) clearly marked for fill-in

Tone: usable shipping template, not fake legalese claiming counsel review.

### Discovery

- Footer links: Privacy · Terms · Cookies · Copyright (wrap on narrow screens).
- Login: “By continuing you agree to Terms and Privacy.”
- Cookie banner: essential-storage only notice + link to Cookies; dismiss stored in localStorage; no marketing toggles until analytics exist.

---

## 4. Security and UI audit

Run after features 1–3. Deliver code fixes plus a short notes file under `docs/` (e.g. `docs/SECURITY_UI_AUDIT.md`).

### Security checklist

- [ ] Scan API: require auth or app secret; restrict CORS; retain size/MIME/money clamps.
- [ ] Storage private; membership-gated; UUID paths; no path traversal.
- [ ] RLS: no IDOR across groups; `receipt_id` / `group_id` consistency on attachments.
- [ ] Membership RPC: friends-only; no privilege escalation to owner.
- [ ] XSS: no `dangerouslySetInnerHTML`; sanitize displayed file names.
- [ ] Document anon profile/search enumeration surfaces.
- [ ] Privacy policy mentions settlement share links and OCR.

### UI checklist (phone + desktop)

- [ ] FAB / safe-area vs attachment actions.
- [ ] Lightbox / PDF viewer: scroll lock, hash back navigation.
- [ ] Owned vs shared badge on groups list.
- [ ] Duplicate friend-add prevented.
- [ ] Upload empty / error / offline states.
- [ ] Legal pages + cookie banner in light and dark themes.
- [ ] Touch targets and keyboard access for attach/delete/open.

---

## Architecture sketch

```text
Auth user
   │
   ├─ group_members ──► groups ──► people / receipts / items / allocations
   │                         └──► receipt_attachments ──► Storage objects
   │
   ├─ friends (existing) ──► add_friend_to_group RPC
   │
   └─ public legal routes + cookie banner
```

Sync remains: sign-in load → in-memory/context → persist on edit (RLS enforces membership).

## Testing strategy

- Migration: backfill owners; member can SELECT/UPDATE; non-member denied; non-owner cannot DELETE group.
- RPC: friend add creates member + person; non-friend rejected; duplicate no-op.
- Attachments: upload image/PDF within caps; reject bad MIME/oversize; member can signed-URL view; non-member denied; delete cleans DB + Storage.
- UI: manual phone + desktop pass for attach/view/delete, shared group list, legal links, cookie dismiss.
- Build: `npm run build`; scan API hardening verified with rejected unauthenticated or cross-origin abuse attempts as applicable.

## Implementation order

1. Migration `group_members` + RLS rewrite + load/persist + People-tab invite + leave/remove.
2. Migration `receipt_attachments` + Storage + receipt UI + scan keep-photo.
3. Legal routes + footer + login line + cookie banner.
4. Security/UI audit doc + concrete fixes (especially `/api/scan`).

## Open placeholders (content only, not design blockers)

- Operator contact email for Privacy / Copyright / DMCA.
- Governing jurisdiction string in Terms.

These are fill-in strings in page copy; implementation can ship with clearly marked placeholders.
