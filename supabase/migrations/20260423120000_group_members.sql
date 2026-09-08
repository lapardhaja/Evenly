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
    where (f.user_a = auth.uid() and f.user_b = p_friend_user_id)
       or (f.user_a = p_friend_user_id and f.user_b = auth.uid())
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
