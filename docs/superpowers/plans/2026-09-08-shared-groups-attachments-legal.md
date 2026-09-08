# Shared Groups, Attachments, Legal Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship shared group membership (friends see the group), per-expense image/PDF attachments, legal pages + cookie notice, then harden scan API / UI.

**Architecture:** Supabase `group_members` + membership RLS; Storage bucket for attachments; static hash routes for legal; keep load/debounced-persist sync (last-write-wins). Local-only builds skip share/attach.

**Tech Stack:** React 18, MUI 5, Vite 6, Supabase (Postgres RLS + Storage), Vercel `api/scan.js`, Node `node:test` for unit tests.

**Spec:** `docs/superpowers/specs/2026-09-08-shared-groups-attachments-legal-design.md`

## Global Constraints

- Build order: shared groups → attachments → legal → security/UI.
- Members are full collaborators; only `owner` may delete the group.
- Invite: friends picker, immediate membership, no accept step.
- Attachments: per expense only; MIME allowlist images + PDF; 10 MB/file; 20/receipt.
- No realtime; no join links; no group albums; no analytics consent matrix.
- Tests: `npm test` (node:test) + `npm run build`. Manual UI on phone + desktop for UX tasks.
- Branch naming already in use: `cursor/attachments-sharing-legal-design-d448` (continue here or spawn phase branches as needed).

## File map

| File | Responsibility |
|------|----------------|
| `supabase/migrations/20260423120000_group_members.sql` | `group_members`, helper fns, RLS rewrite, `add_friend_to_group` RPC |
| `supabase/migrations/20260423130000_receipt_attachments.sql` | `receipt_attachments` table + RLS; Storage policy SQL |
| `src/lib/groupMembership.js` | Pure helpers: roles, badges, canDeleteGroup |
| `src/lib/groupMembership.test.js` | Unit tests for helpers |
| `src/lib/groupMembersApi.js` | Client wrappers: add friend, leave, remove member |
| `src/lib/supabaseSync.js` | Load/persist by membership; preserve `groups.user_id`; sync members |
| `src/hooks/useGroupData.js` | Wire remove-person → membership; expose role |
| `src/pages/GroupPeopleTab.jsx` | Call RPC when adding friend |
| `src/pages/GroupsPage.jsx` | Shared/Owned chip; leave vs delete |
| `src/pages/GroupDetailPage.jsx` | Hide delete for non-owners if present |
| `src/lib/receiptAttachments.js` | Validate MIME/size, upload, signed URL, delete |
| `src/lib/receiptAttachments.test.js` | Validation unit tests |
| `src/components/ReceiptAttachments.jsx` | Strip UI: add/open/delete |
| `src/components/AttachmentLightbox.jsx` | Image lightbox + PDF/HEIC fallback |
| `src/pages/ReceiptInfoPage.jsx` | Mount attachments strip |
| `src/pages/GroupReceiptsTab.jsx` / `ScanReceiptDialog.jsx` | Keep-photo as attachment |
| `src/pages/legal/*.jsx` | Privacy, Terms, Cookies, Copyright |
| `src/components/CookieNotice.jsx` | Essential-storage banner |
| `src/router.jsx` / `src/core/Layout.jsx` / `src/pages/LoginPage.jsx` | Routes + footer + login line |
| `api/scan.js` | Auth/CORS hardening |
| `docs/SUPABASE_DATABASE.md` / `docs/SECURITY_UI_AUDIT.md` | Docs |

---

## Phase A — Shared groups

### Task 1: Migration `group_members` + membership RLS + RPC

**Files:**
- Create: `supabase/migrations/20260423120000_group_members.sql`
- Modify: `docs/SUPABASE_DATABASE.md` (tables section)

**Interfaces:**
- Consumes: existing `groups`, `group_people`, `friendships`, `receipts`, `receipt_items`, `receipt_allocations`
- Produces: `public.is_group_member(uuid)`, `public.is_group_owner(uuid)`, `public.add_friend_to_group(uuid, uuid)`, table `group_members(group_id, user_id, role, created_at)`

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/20260423120000_group_members.sql` with this content:

```sql
-- group_members + membership-based RLS. Run after profiles/friends migrations.

create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create unique index if not exists group_members_one_owner
  on public.group_members (group_id)
  where (role = 'owner');

create index if not exists group_members_user_id_idx
  on public.group_members (user_id);

alter table public.group_members enable row level security;

-- Backfill owners from groups.user_id
insert into public.group_members (group_id, user_id, role)
select g.id, g.user_id, 'owner'
from public.groups g
on conflict (group_id, user_id) do nothing;

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = auth.uid()
  );
$$;

create or replace function public.is_group_owner(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = auth.uid()
      and gm.role = 'owner'
  );
$$;

revoke all on function public.is_group_member(uuid) from public;
grant execute on function public.is_group_member(uuid) to authenticated;
revoke all on function public.is_group_owner(uuid) from public;
grant execute on function public.is_group_owner(uuid) to authenticated;

-- group_members policies
drop policy if exists "group_members_select" on public.group_members;
create policy "group_members_select" on public.group_members
  for select using (public.is_group_member(group_id));

drop policy if exists "group_members_delete" on public.group_members;
create policy "group_members_delete" on public.group_members
  for delete using (
    (user_id = auth.uid() and role = 'member')
    or (public.is_group_owner(group_id) and user_id <> auth.uid())
  );

-- No direct INSERT/UPDATE from clients; use RPC + trigger on group create
drop policy if exists "group_members_insert" on public.group_members;
drop policy if exists "group_members_update" on public.group_members;

create or replace function public.handle_group_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.user_id, 'owner')
  on conflict (group_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_group_owner_member on public.groups;
create trigger trg_group_owner_member
  after insert on public.groups
  for each row execute function public.handle_group_owner_member();

create or replace function public.add_friend_to_group(p_group_id uuid, p_friend_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_group_member(p_group_id) then
    raise exception 'not a group member';
  end if;
  if p_friend_user_id = auth.uid() then
    raise exception 'cannot add self via friend invite';
  end if;
  if not exists (
    select 1 from public.friendships f
    where f.user_a = auth.uid() and f.user_b = p_friend_user_id
  ) then
    raise exception 'not friends';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (p_group_id, p_friend_user_id, 'member')
  on conflict (group_id, user_id) do nothing;

  select coalesce(
    nullif(trim(both from concat_ws(' ', p.first_name, p.last_name)), ''),
    nullif(trim(p.display_name), ''),
    nullif(trim(p.username), ''),
    'Friend'
  ) into v_name
  from public.profiles p
  where p.user_id = p_friend_user_id;

  if v_name is null then
    v_name := 'Friend';
  end if;

  if not exists (
    select 1 from public.group_people gp
    where gp.group_id = p_group_id and gp.linked_user_id = p_friend_user_id
  ) then
    insert into public.group_people (id, group_id, name, linked_user_id)
    values (gen_random_uuid(), p_group_id, v_name, p_friend_user_id);
  end if;
end;
$$;

revoke all on function public.add_friend_to_group(uuid, uuid) from public;
grant execute on function public.add_friend_to_group(uuid, uuid) to authenticated;

-- Rewrite groups RLS
drop policy if exists "groups_select_own" on public.groups;
drop policy if exists "groups_insert_own" on public.groups;
drop policy if exists "groups_update_own" on public.groups;
drop policy if exists "groups_delete_own" on public.groups;

create policy "groups_select_member" on public.groups
  for select using (public.is_group_member(id));
create policy "groups_insert_own" on public.groups
  for insert with check (auth.uid() = user_id);
create policy "groups_update_member" on public.groups
  for update using (public.is_group_member(id));
create policy "groups_delete_owner" on public.groups
  for delete using (public.is_group_owner(id));

-- group_people
drop policy if exists "group_people_select" on public.group_people;
drop policy if exists "group_people_insert" on public.group_people;
drop policy if exists "group_people_update" on public.group_people;
drop policy if exists "group_people_delete" on public.group_people;
create policy "group_people_select" on public.group_people
  for select using (public.is_group_member(group_id));
create policy "group_people_insert" on public.group_people
  for insert with check (public.is_group_member(group_id));
create policy "group_people_update" on public.group_people
  for update using (public.is_group_member(group_id));
create policy "group_people_delete" on public.group_people
  for delete using (public.is_group_member(group_id));

-- receipts
drop policy if exists "receipts_select" on public.receipts;
drop policy if exists "receipts_insert" on public.receipts;
drop policy if exists "receipts_update" on public.receipts;
drop policy if exists "receipts_delete" on public.receipts;
create policy "receipts_select" on public.receipts
  for select using (public.is_group_member(group_id));
create policy "receipts_insert" on public.receipts
  for insert with check (public.is_group_member(group_id));
create policy "receipts_update" on public.receipts
  for update using (public.is_group_member(group_id));
create policy "receipts_delete" on public.receipts
  for delete using (public.is_group_member(group_id));

-- receipt_items (via receipt → group)
drop policy if exists "receipt_items_select" on public.receipt_items;
drop policy if exists "receipt_items_insert" on public.receipt_items;
drop policy if exists "receipt_items_update" on public.receipt_items;
drop policy if exists "receipt_items_delete" on public.receipt_items;
create policy "receipt_items_select" on public.receipt_items
  for select using (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_id and public.is_group_member(r.group_id)
    )
  );
create policy "receipt_items_insert" on public.receipt_items
  for insert with check (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_id and public.is_group_member(r.group_id)
    )
  );
create policy "receipt_items_update" on public.receipt_items
  for update using (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_id and public.is_group_member(r.group_id)
    )
  );
create policy "receipt_items_delete" on public.receipt_items
  for delete using (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_id and public.is_group_member(r.group_id)
    )
  );

-- receipt_allocations
drop policy if exists "receipt_allocations_select" on public.receipt_allocations;
drop policy if exists "receipt_allocations_insert" on public.receipt_allocations;
drop policy if exists "receipt_allocations_update" on public.receipt_allocations;
drop policy if exists "receipt_allocations_delete" on public.receipt_allocations;
create policy "receipt_allocations_select" on public.receipt_allocations
  for select using (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_id and public.is_group_member(r.group_id)
    )
  );
create policy "receipt_allocations_insert" on public.receipt_allocations
  for insert with check (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_id and public.is_group_member(r.group_id)
    )
  );
create policy "receipt_allocations_update" on public.receipt_allocations
  for update using (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_id and public.is_group_member(r.group_id)
    )
  );
create policy "receipt_allocations_delete" on public.receipt_allocations
  for delete using (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_id and public.is_group_member(r.group_id)
    )
  );
```

`group_people` columns used by the RPC: `id`, `group_id`, `name`, `linked_user_id` (see `20260210120000_evenly_normalized.sql` + `20260419120100_group_people_linked_user.sql`). Profiles name fields: `first_name`, `last_name`, `display_name`, `username` per friends migrations.

- [ ] **Step 2: Update `docs/SUPABASE_DATABASE.md`**

Add `group_members` to the tables list and note that access is membership-based, not `groups.user_id` alone. Document `add_friend_to_group`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260423120000_group_members.sql docs/SUPABASE_DATABASE.md
git commit -m "feat(db): group_members table, membership RLS, add_friend_to_group RPC"
```

---

### Task 2: Membership helpers + unit tests

**Files:**
- Create: `src/lib/groupMembership.js`
- Create: `src/lib/groupMembership.test.js`

**Interfaces:**
- Consumes: none
- Produces:
  - `canDeleteGroup(role: string | null | undefined): boolean`
  - `groupListBadge(role: string | null | undefined, ownerUserId: string | null | undefined, currentUserId: string | null | undefined): 'owned' | 'shared'`
  - `normalizeMemberRole(role: unknown): 'owner' | 'member' | null`

- [ ] **Step 1: Write failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canDeleteGroup,
  groupListBadge,
  normalizeMemberRole,
} from './groupMembership.js';

test('normalizeMemberRole', () => {
  assert.equal(normalizeMemberRole('owner'), 'owner');
  assert.equal(normalizeMemberRole('member'), 'member');
  assert.equal(normalizeMemberRole('nope'), null);
  assert.equal(normalizeMemberRole(null), null);
});

test('canDeleteGroup only owner', () => {
  assert.equal(canDeleteGroup('owner'), true);
  assert.equal(canDeleteGroup('member'), false);
  assert.equal(canDeleteGroup(null), false);
});

test('groupListBadge owned vs shared', () => {
  assert.equal(groupListBadge('owner', 'u1', 'u1'), 'owned');
  assert.equal(groupListBadge('member', 'u1', 'u2'), 'shared');
  assert.equal(groupListBadge(null, 'u1', 'u1'), 'owned');
  assert.equal(groupListBadge(null, 'u1', 'u2'), 'shared');
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- src/lib/groupMembership.test.js
```

Expected: cannot find module / FAIL

- [ ] **Step 3: Implement helpers**

```js
export function normalizeMemberRole(role) {
  if (role === 'owner' || role === 'member') return role;
  return null;
}

export function canDeleteGroup(role) {
  return normalizeMemberRole(role) === 'owner';
}

export function groupListBadge(role, ownerUserId, currentUserId) {
  const r = normalizeMemberRole(role);
  if (r === 'owner') return 'owned';
  if (r === 'member') return 'shared';
  if (ownerUserId && currentUserId && ownerUserId === currentUserId) return 'owned';
  if (ownerUserId && currentUserId && ownerUserId !== currentUserId) return 'shared';
  return 'owned';
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- src/lib/groupMembership.test.js
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/groupMembership.js src/lib/groupMembership.test.js
git commit -m "feat: add group membership role helpers"
```

---

### Task 3: `supabaseSync` load/persist by membership

**Files:**
- Modify: `src/lib/supabaseSync.js`
- Create: `src/lib/groupMembersApi.js`

**Interfaces:**
- Consumes: `is_group_member` RLS (implicit), table `group_members`
- Produces:
  - `loadNormalizedData(supabase, userId)` returns groups with `_membershipRole` and `_ownerUserId` on each group object (strip before persist or ignore unknown cols)
  - `persistNormalizedData` must NOT reassign `groups.user_id` to the current user on update; must NOT delete groups the user does not own; on create insert still sets `user_id` to creator
  - `addFriendToGroup(groupId, friendUserId)`, `leaveGroup(groupId)`, `removeMember(groupId, userId)` in `groupMembersApi.js`

- [ ] **Step 1: Add `src/lib/groupMembersApi.js`**

```js
import { getSupabase, isSupabaseConfigured } from './supabaseClient.js';

function clientOrThrow() {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
  const c = getSupabase();
  if (!c) throw new Error('Supabase not configured');
  return c;
}

export async function addFriendToGroup(groupId, friendUserId) {
  const supabase = clientOrThrow();
  const { error } = await supabase.rpc('add_friend_to_group', {
    p_group_id: groupId,
    p_friend_user_id: friendUserId,
  });
  if (error) throw error;
}

export async function leaveGroup(groupId) {
  const supabase = clientOrThrow();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) throw new Error('Not signed in');
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', uid)
    .eq('role', 'member');
  if (error) throw error;
}

export async function removeMember(groupId, userId) {
  const supabase = clientOrThrow();
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .eq('role', 'member');
  if (error) throw error;
}
```

- [ ] **Step 2: Change `loadNormalizedData` group query**

Replace `.from('groups').select('*').eq('user_id', userId)` with membership join:

```js
  const { data: memberRows, error: mErr } = await supabase
    .from('group_members')
    .select('group_id, role, groups(*)')
    .eq('user_id', userId);
  if (mErr) throw mErr;

  const groups = (memberRows || [])
    .map((row) => {
      const g = row.groups;
      if (!g) return null;
      return { ...g, _membershipRole: row.role, _ownerUserId: g.user_id };
    })
    .filter(Boolean);
```

Then continue existing people/receipts loading using `groups.map(g => g.id)`.

When building the client `data.groups[id]` object, set:

```js
membershipRole: g._membershipRole,
ownerUserId: g._ownerUserId || g.user_id,
```

Do not persist these as DB columns; they are client-only fields on the in-memory group.

- [ ] **Step 3: Fix `persistNormalizedData` ownership**

Critical behaviors:

1. List remote groups via `group_members` for `userId`, not `groups.user_id`.
2. For groups present locally: upsert group row. On **insert**, `user_id: userId`. On **update**, do **not** change `user_id` (omit it from update payload or read existing).
3. For remote group ids missing locally: if current user's role is `owner`, delete the group; if `member`, call leave (`delete` from `group_members` only) — never delete the group row as a member.
4. After upserting a new group, rely on trigger for owner `group_members` row (already in migration).

Sketch for delete branch:

```js
  const { data: myMemberships } = await supabase
    .from('group_members')
    .select('group_id, role')
    .eq('user_id', userId);
  const remote = myMemberships || [];
  for (const row of remote) {
    if (localGroupIds.includes(row.group_id)) continue;
    if (row.role === 'owner') {
      await supabase.from('groups').delete().eq('id', row.group_id);
    } else {
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', row.group_id)
        .eq('user_id', userId);
    }
  }
```

- [ ] **Step 4: Manual / SQL verification notes**

Document in commit message that after applying migration in Supabase: owner creates group → member appears after `add_friend_to_group`; second account `loadNormalizedData` returns that group.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabaseSync.js src/lib/groupMembersApi.js
git commit -m "feat(sync): load and persist groups by membership"
```

---

### Task 4: People tab invite + remove person membership

**Files:**
- Modify: `src/pages/GroupPeopleTab.jsx`
- Modify: `src/hooks/useGroupData.js` (`removePerson`)

**Interfaces:**
- Consumes: `addFriendToGroup`, `removeMember` from `groupMembersApi.js`
- Produces: Friend add triggers RPC then `reloadFromServer` (or optimistic person already via RPC insert)

- [ ] **Step 1: Wire friend menu click**

In `GroupPeopleTab.jsx`, change friend `onClick` from only `addPerson(...)` to:

```js
onClick={async () => {
  const label = f.display_name || f.username || 'Friend';
  if (isSupabaseConfigured()) {
    try {
      await addFriendToGroup(groupId, f.user_id);
      await reloadFromServer();
    } catch (e) {
      setInviteError(e?.message || 'Could not add friend to group');
    }
  } else {
    addPerson(label, { linkedUserId: f.user_id });
  }
}}
```

Add `const [inviteError, setInviteError] = useState('')` and a `Snackbar` bound to it. Pull `reloadFromServer` from `useGroupsData()`. Keep `linkedIds` dedup so already-linked friends are hidden.

- [ ] **Step 2: `removePerson` also drops membership**

In `useGroupData.js` `removePerson`, after removing the person from local state, if cloud and person had `linkedUserId`, call `removeMember(groupId, linkedUserId).catch(...)`. Import from `groupMembersApi.js`. Do not call for local-only.

- [ ] **Step 3: Commit**

```bash
git add src/pages/GroupPeopleTab.jsx src/hooks/useGroupData.js
git commit -m "feat: add friends to group via RPC; remove membership with person"
```

---

### Task 5: Groups list badge + leave/delete UX

**Files:**
- Modify: `src/pages/GroupsPage.jsx`
- Modify: `src/hooks/useGroupData.js` if `useGroups` should expose `membershipRole` / `ownerUserId`
- Modify: `src/pages/GroupDetailPage.jsx` only if group delete lives there

**Interfaces:**
- Consumes: `groupListBadge`, `canDeleteGroup`, `leaveGroup`
- Produces: Chip "Shared" / "Owned"; swipe-delete for owners only; leave action for members

- [ ] **Step 1: Map fields through `useGroups`**

Ensure each group in the list includes `membershipRole` and `ownerUserId` from sync.

- [ ] **Step 2: UI**

- Show MUI `Chip` size="small": `Owned` or `Shared` using `groupListBadge(g.membershipRole, g.ownerUserId, user?.id)`.
- Swipe/delete: if `!canDeleteGroup(g.membershipRole)` and cloud, offer **Leave group** (confirm dialog → `leaveGroup` → `reloadFromServer`) instead of `deleteGroup`.
- Owner keeps existing delete + undo behavior.

- [ ] **Step 3: `npm run build`**

Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/pages/GroupsPage.jsx src/hooks/useGroupData.js src/pages/GroupDetailPage.jsx
git commit -m "feat(ui): owned/shared badges and leave group for members"
```

**Phase A checkpoint:** Two accounts, friendship, add friend to group → group on both homes; both can edit receipts; only owner deletes.

---

## Phase B — Expense attachments

### Task 6: Migration `receipt_attachments` + Storage

**Files:**
- Create: `supabase/migrations/20260423130000_receipt_attachments.sql`
- Modify: `docs/SUPABASE_DATABASE.md`

**Interfaces:**
- Produces: table `receipt_attachments`; bucket name `receipt-attachments`; path `{group_id}/{receipt_id}/{id}.{ext}`

- [ ] **Step 1: Write migration**

```sql
create table if not exists public.receipt_attachments (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null,
  file_name text not null,
  byte_size int not null check (byte_size > 0 and byte_size <= 10485760),
  uploaded_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists receipt_attachments_receipt_id_idx
  on public.receipt_attachments (receipt_id);

alter table public.receipt_attachments enable row level security;

drop policy if exists "receipt_attachments_select" on public.receipt_attachments;
create policy "receipt_attachments_select" on public.receipt_attachments
  for select using (public.is_group_member(group_id));
drop policy if exists "receipt_attachments_insert" on public.receipt_attachments;
create policy "receipt_attachments_insert" on public.receipt_attachments
  for insert with check (
    public.is_group_member(group_id)
    and uploaded_by = auth.uid()
    and exists (select 1 from public.receipts r where r.id = receipt_id and r.group_id = group_id)
  );
drop policy if exists "receipt_attachments_delete" on public.receipt_attachments;
create policy "receipt_attachments_delete" on public.receipt_attachments
  for delete using (public.is_group_member(group_id));

-- Storage bucket (run in SQL editor; ignore if dashboard-created)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipt-attachments',
  'receipt-attachments',
  false,
  10485760,
  array[
    'image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "receipt_attachments_storage_select" on storage.objects;
create policy "receipt_attachments_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipt-attachments'
    and public.is_group_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "receipt_attachments_storage_insert" on storage.objects;
create policy "receipt_attachments_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipt-attachments'
    and public.is_group_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "receipt_attachments_storage_delete" on storage.objects;
create policy "receipt_attachments_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'receipt-attachments'
    and public.is_group_member((storage.foldername(name))[1]::uuid)
  );
```

If `storage.foldername` is unavailable in the project, use `(split_part(name, '/', 1))::uuid` instead.

- [ ] **Step 2: Update docs + commit**

```bash
git add supabase/migrations/20260423130000_receipt_attachments.sql docs/SUPABASE_DATABASE.md
git commit -m "feat(db): receipt_attachments table and private storage bucket"
```

---

### Task 7: Attachment client library + tests

**Files:**
- Create: `src/lib/receiptAttachments.js`
- Create: `src/lib/receiptAttachments.test.js`

**Interfaces:**
- Produces:
  - `ATTACHMENT_MAX_BYTES = 10485760`
  - `ATTACHMENT_MAX_PER_RECEIPT = 20`
  - `ALLOWED_ATTACHMENT_MIME = Set([...])`
  - `assertAttachmentFile(file: { type: string, size: number, name?: string }): void` throws `Error` with message
  - `extensionForMime(mime: string): string`
  - `buildStoragePath(groupId, receiptId, attachmentId, mime): string`
  - `listAttachments(receiptId)`, `uploadAttachment({ groupId, receiptId, file })`, `deleteAttachment(row)`, `getAttachmentSignedUrl(path)`

- [ ] **Step 1: Failing tests for pure helpers**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertAttachmentFile,
  buildStoragePath,
  extensionForMime,
  ATTACHMENT_MAX_BYTES,
} from './receiptAttachments.js';

test('assertAttachmentFile accepts jpeg under cap', () => {
  assert.doesNotThrow(() =>
    assertAttachmentFile({ type: 'image/jpeg', size: 1000, name: 'a.jpg' }),
  );
});

test('assertAttachmentFile rejects pdf oversize and bad mime', () => {
  assert.throws(() =>
    assertAttachmentFile({ type: 'application/pdf', size: ATTACHMENT_MAX_BYTES + 1, name: 'a.pdf' }),
  );
  assert.throws(() =>
    assertAttachmentFile({ type: 'text/plain', size: 10, name: 'a.txt' }),
  );
});

test('buildStoragePath', () => {
  assert.equal(
    buildStoragePath('g', 'r', 'a', 'image/png'),
    'g/r/a.png',
  );
  assert.equal(extensionForMime('application/pdf'), 'pdf');
});
```

- [ ] **Step 2: Implement `receiptAttachments.js`** (pure helpers + supabase methods using `getSupabase`, `v4 as uuid`)

Upload algorithm:

1. `assertAttachmentFile(file)`
2. Count existing via `listAttachments`; throw if `>= ATTACHMENT_MAX_PER_RECEIPT`
3. `id = uuidv4()`; `path = buildStoragePath(...)`
4. `storage.from('receipt-attachments').upload(path, file, { contentType: file.type, upsert: false })`
5. Insert row; on insert failure `storage.from(...).remove([path])` then throw
6. Return row

Signed URL TTL: 120 seconds.

- [ ] **Step 3: `npm test -- src/lib/receiptAttachments.test.js` PASS + commit**

```bash
git add src/lib/receiptAttachments.js src/lib/receiptAttachments.test.js
git commit -m "feat: receipt attachment upload helpers and validation"
```

---

### Task 8: Attachments UI on receipt detail

**Files:**
- Create: `src/components/ReceiptAttachments.jsx`
- Create: `src/components/AttachmentLightbox.jsx`
- Modify: `src/pages/ReceiptInfoPage.jsx`

**Interfaces:**
- Consumes: `listAttachments`, `uploadAttachment`, `deleteAttachment`, `getAttachmentSignedUrl`
- Produces: UI strip below Paid By / above tabs

- [ ] **Step 1: `AttachmentLightbox`**

Dialog/fullscreen: if mime starts with `image/` and not heic/heif → `<Box component="img" src={url} />`. Else show filename + Button "Open" (`window.open(url)`) / "Download".

- [ ] **Step 2: `ReceiptAttachments`**

- Props: `groupId`, `receiptId`, `enabled` (true when `isSupabaseConfigured()`)
- On mount: `listAttachments`
- Hidden file input `accept="image/*,application/pdf,image/heic,image/heif"`
- Buttons: Add, thumbnail grid, delete IconButton
- Toasts/Snackbar for errors
- If `!enabled`, render `null` (attachments are cloud-only per spec).

- [ ] **Step 3: Mount in `ReceiptInfoPage`** after currency/tax block, before Tabs

- [ ] **Step 4: Build + commit**

```bash
npm run build
git add src/components/ReceiptAttachments.jsx src/components/AttachmentLightbox.jsx src/pages/ReceiptInfoPage.jsx
git commit -m "feat(ui): view and manage expense attachments"
```

---

### Task 9: Scan “Keep photo as attachment” + list badge

**Files:**
- Modify: `src/pages/ScanReceiptDialog.jsx`
- Modify: `src/pages/GroupReceiptsTab.jsx`
- Modify: `src/lib/scanReceipt.js` only if needed to return nothing else

**Interfaces:**
- Produces: optional checkbox default checked; on confirm, after `addReceiptWithItems`, if cloud + keep, `uploadAttachment` with File/blob from original scan data URL

- [ ] **Step 1: Keep `scanDataUrl` / `scanFile` in `GroupReceiptsTab` state** until dialog closes

- [ ] **Step 2: `ScanReceiptDialog`** — add `FormControlLabel` checkbox `keepAttachment` default `true`; pass to `onConfirm` as options field `keepAttachment`

- [ ] **Step 3: On confirm** — create receipt; if `keepAttachment && isSupabaseConfigured()`, convert data URL to `Blob`/`File` and `uploadAttachment({ groupId, receiptId, file })`. Failures toast but do not roll back receipt.

- [ ] **Step 4: Paperclip badge** on receipt list rows when attachments exist — either lazy-count via small query map or include `attachmentCount` fetched for group receipts. Simplest v1: in `GroupReceiptsTab`, when cloud, one query:

```js
supabase.from('receipt_attachments').select('receipt_id').in('receipt_id', receiptIds)
```

Aggregate counts into a map; show `AttachFile` icon if count > 0.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ScanReceiptDialog.jsx src/pages/GroupReceiptsTab.jsx
git commit -m "feat: keep scan photo as attachment; paperclip on receipt list"
```

**Phase B checkpoint:** Upload image/PDF on expense; second member opens it; scan keep-photo works.

---

## Phase C — Legal pack

### Task 10: Legal pages + routes

**Files:**
- Create: `src/pages/legal/PrivacyPolicyPage.jsx`
- Create: `src/pages/legal/TermsOfServicePage.jsx`
- Create: `src/pages/legal/CookiePolicyPage.jsx`
- Create: `src/pages/legal/CopyrightPage.jsx`
- Create: `src/pages/legal/LegalPageLayout.jsx` (shared Container + back link)
- Modify: `src/router.jsx`

**Interfaces:**
- Routes: `privacy`, `terms`, `cookies`, `copyright` under Layout, **no** `RequireAuth`

- [ ] **Step 1: `LegalPageLayout`** — title, MUI Typography body, Link to `/`

- [ ] **Step 2: Page copy** — cover localStorage, Supabase auth/sync/storage, Gemini OCR, settlement share links, friends/profiles. Placeholders: `[OPERATOR_EMAIL]`, `[JURISDICTION]`.

- [ ] **Step 3: Register routes in `router.jsx`** as public children next to `login`

- [ ] **Step 4: Commit**

```bash
git add src/pages/legal src/router.jsx
git commit -m "feat: add Privacy, Terms, Cookies, and Copyright pages"
```

---

### Task 11: Footer, login line, cookie notice

**Files:**
- Modify: `src/core/Layout.jsx`
- Modify: `src/pages/LoginPage.jsx`
- Create: `src/components/CookieNotice.jsx`
- Create: `src/lib/cookieNotice.js` + `src/lib/cookieNotice.test.js`

**Interfaces:**
- `COOKIE_NOTICE_KEY = 'evenly:cookie-notice:v1'`
- `hasDismissedCookieNotice()`, `dismissCookieNotice()`

- [ ] **Step 1: Tests for cookie notice storage helpers**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COOKIE_NOTICE_KEY,
  hasDismissedCookieNotice,
  dismissCookieNotice,
} from './cookieNotice.js';

test('dismissCookieNotice persists', () => {
  // polyfill localStorage if needed in node — use a simple in-memory mock
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  store.clear();
  assert.equal(hasDismissedCookieNotice(), false);
  dismissCookieNotice();
  assert.equal(hasDismissedCookieNotice(), true);
  assert.equal(localStorage.getItem(COOKIE_NOTICE_KEY), '1');
});
```

- [ ] **Step 2: Implement helpers + `CookieNotice` banner** (fixed bottom, essential storage copy, link to `#/cookies`, Got it → dismiss)

- [ ] **Step 3: Footer links** in `Layout.jsx`:

```jsx
<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', justifyContent: 'center' }}>
  <Link component={RouterLink} to="/privacy" variant="caption">Privacy</Link>
  <Link component={RouterLink} to="/terms" variant="caption">Terms</Link>
  <Link component={RouterLink} to="/cookies" variant="caption">Cookies</Link>
  <Link component={RouterLink} to="/copyright" variant="caption">Copyright</Link>
</Box>
```

Mount `<CookieNotice />` in Layout.

- [ ] **Step 4: LoginPage** — caption: `By continuing, you agree to our Terms and Privacy Policy.` with links.

- [ ] **Step 5: Build + commit**

```bash
npm test -- src/lib/cookieNotice.test.js
npm run build
git add src/lib/cookieNotice.js src/lib/cookieNotice.test.js src/components/CookieNotice.jsx src/core/Layout.jsx src/pages/LoginPage.jsx
git commit -m "feat: legal footer links, login consent line, cookie notice"
```

**Phase C checkpoint:** Public legal routes; footer + banner on mobile/desktop.

---

## Phase D — Security + UI audit

### Task 12: Harden `/api/scan`

**Files:**
- Modify: `api/scan.js`
- Create: `api/scanAuth.js` (pure helpers testable from node) OR put helpers in `src/lib/scanApiGuard.js` imported by api if bundling allows — prefer **`api/scanGuard.js`** with node tests via `node --test api/scanGuard.test.js` and update `package.json` test script.

**Interfaces:**
- `assertScanRequestAllowed(req, env): { ok: true } | { ok: false, status, error }`
- Env: `SCAN_API_SECRET` optional; if set, require header `x-evenly-scan-secret: <secret>`
- CORS: allow `Access-Control-Allow-Origin` only for `CORS_ALLOW_ORIGIN` env (comma list) or request Origin if in list; default same-origin reflection of configured web origins — if unset, allow only requests with secret OR omit `*` (use first configured origin). **Do not use `*` when secret is configured.**

- [ ] **Step 1: Tests for guard**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { assertScanRequestAllowed } from './scanGuard.js';

test('rejects when secret set and header missing', () => {
  const r = assertScanRequestAllowed(
    { headers: {} },
    { SCAN_API_SECRET: 's3cret' },
  );
  assert.equal(r.ok, false);
  assert.equal(r.status, 401);
});

test('allows when secret matches', () => {
  const r = assertScanRequestAllowed(
    { headers: { 'x-evenly-scan-secret': 's3cret' } },
    { SCAN_API_SECRET: 's3cret' },
  );
  assert.equal(r.ok, true);
});
```

- [ ] **Step 2: Wire guard at top of `handler` after method check; tighten CORS helpers**

- [ ] **Step 3: Client `scanReceipt.js`** — if `import.meta.env.VITE_SCAN_API_SECRET` set, send header (optional for prod; document that secret in Vercel + VITE is dual-use only for simple deployments — prefer server-only secret + same-origin browser calls without exposing secret: **for SPA on same Vercel host, rely on Origin allowlist and leave secret unset for browser; set secret for non-browser callers**). Document in `docs/SECURITY_UI_AUDIT.md`.

- [ ] **Step 4: Update `package.json` test script** to include `api/*.test.js`

- [ ] **Step 5: Commit**

```bash
git add api/scan.js api/scanGuard.js api/scanGuard.test.js src/lib/scanReceipt.js package.json
git commit -m "fix(security): harden scan API auth and CORS"
```

---

### Task 13: Audit doc + UI sweep fixes

**Files:**
- Create: `docs/SECURITY_UI_AUDIT.md`
- Modify: any files found during sweep (lightbox back button, dark theme legal, duplicate friend, FAB safe-area)

**Interfaces:** none new

- [ ] **Step 1: Write `docs/SECURITY_UI_AUDIT.md`** with checklist from the spec, mark items fixed in this PR vs residual risk (settlement share links public, profile search enumeration).

- [ ] **Step 2: Fix residual UI bugs discovered while testing Phases A–C** (only concrete bugs — no drive-by refactors).

- [ ] **Step 3: Full verify**

```bash
npm test
npm run build
```

Expected: all tests pass; build succeeds.

- [ ] **Step 4: Commit**

```bash
git add docs/SECURITY_UI_AUDIT.md
# plus any UI fix files
git commit -m "docs: security/UI audit notes and follow-up fixes"
```

---

## Testing matrix (manual)

| Case | Phone | Desktop |
|------|-------|---------|
| Add friend → shared group on both accounts | ✓ | ✓ |
| Member edits receipt; owner deletes group | ✓ | ✓ |
| Member leaves group | ✓ | ✓ |
| Attach image + PDF; other member opens | ✓ | ✓ |
| Scan keep photo | ✓ | ✓ |
| Legal links + cookie dismiss | ✓ | ✓ |
| Scan API without secret header when secret set → 401 | n/a | curl |
| Public `#/share/:id` shows receipts + settle without login | ✓ | ✓ |
| Public attachment open when include_attachments; revoke hides | ✓ | ✓ |

---

## Phase E — Public group share (Approach C)

Added after user decision: no-login link must show receipts/charges and attachments, not settlement-only. Depends on Phase A membership + Phase B attachments. Ship after legal pages (or parallel after B); security audit covers it.

### Task 14: `group_public_shares` + RPCs

**Files:**
- Create: `supabase/migrations/20260424120000_group_public_shares.sql`
- Modify: `docs/SUPABASE_DATABASE.md`

**Interfaces:**
- Table `group_public_shares(id, group_id, created_by, created_at, revoked_at, include_attachments)`
- RPC `create_public_group_share(p_group_id uuid, p_include_attachments boolean default true) returns uuid` (member-only, security definer)
- RPC `revoke_public_group_share(p_share_id uuid) returns void` (member-only)
- RPC `get_public_group_share(p_share_id uuid) returns jsonb` — granted to `anon` + `authenticated`; active shares only; payload: group name, display_currency, people[], receipts[] (items, costs, paid_by, allocations), transfers[] (server-computed or raw balances for client)
- RPC `get_public_share_attachment_url(p_share_id uuid, p_attachment_id uuid) returns text` — signed URL; requires active share + include_attachments + attachment in group

- [ ] **Step 1: Write migration** with RLS (members manage shares; no anon SELECT on table) + RPCs above.
- [ ] **Step 2: Docs + commit** `feat(db): public group shares and anon read RPCs`

### Task 15: Public share client API + page

**Files:**
- Create: `src/lib/publicGroupShare.js` (+ `.test.js` for URL builders / payload guards if pure helpers)
- Create: `src/pages/PublicGroupSharePage.jsx`
- Modify: `src/router.jsx` — public route `share/:shareId` (no RequireAuth)
- Modify: `src/core/Layout.jsx` / `appShell.js` / `useProfileGate.js` — treat like shared-settlement (no PTR noise / no profile gate)

- [ ] **Step 1: Client helpers** `createPublicGroupShare`, `revokePublicGroupShare`, `fetchPublicGroupShare`, `fetchPublicAttachmentUrl`, `publicShareAbsoluteUrl(id)`
- [ ] **Step 2: Page** — load by param; show receipts (expandable), settlement, attachments via existing lightbox patterns; error for revoked/missing
- [ ] **Step 3: Build + commit** `feat: public no-login group share page`

### Task 16: Create/revoke share UX + Privacy copy

**Files:**
- Modify: `src/components/SettlementShareDialog.jsx` and/or new `GroupShareDialog.jsx` from Settle tab
- Modify: `src/pages/GroupSettleTab.jsx` — primary CTA creates server share when cloud; keep legacy token as secondary “Settlement-only link (offline)”
- Modify: legal Privacy page (Task 10) — if already shipped, patch copy for public shares + attachments

- [ ] **Step 1: Dialog** — create link, copy, include-attachments toggle, revoke, warning copy
- [ ] **Step 2: Wire Settle tab**
- [ ] **Step 3: Privacy wording + commit** `feat: share dialog for public group links with attachments`

Update Task 13 audit checklist to include public share RPCs and anon attachment URL abuse.

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| `group_members` + backfill + owner trigger | Task 1 |
| Membership RLS on group tree | Task 1 |
| Friends immediate add RPC | Task 1 + 4 |
| Load/persist by membership; preserve creator `user_id` | Task 3 |
| Leave / remove person membership | Task 3–5 |
| Owned/Shared badge | Task 5 |
| `receipt_attachments` + private Storage | Task 6 |
| Images + PDF, caps, signed URLs | Task 7–8 |
| HEIC fallback | Task 8 |
| Keep scan photo | Task 9 |
| Paperclip badge | Task 9 |
| Legal routes + footer + login + cookie banner | Task 10–11 |
| Public share receipts + settlement + attachments | Task 14–16 |
| Scan harden + audit doc + UI sweep | Task 12–13 |
| Local-only skips share/attach | Tasks 4–8 (`isSupabaseConfigured` gates) |

No intentional TBD steps remain; operator email/jurisdiction stay as copy placeholders per spec.
