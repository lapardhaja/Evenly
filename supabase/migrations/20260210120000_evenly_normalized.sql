-- Evenly normalized schema (option B) + RLS
-- Safe to re-run: skips existing tables/indexes; recreates policies.
--
-- If public.groups already exists with a *different* shape (another app/tutorial),
-- drop or rename those tables first, or this migration will not alter them.

create extension if not exists "pgcrypto";

-- Groups (owned by auth user)
create table if not exists public.groups (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  date_ms bigint not null,
  updated_at timestamptz not null default now()
);

create index if not exists groups_user_id_idx on public.groups (user_id);

-- People per group
create table if not exists public.group_people (
  id uuid primary key,
  group_id uuid not null references public.groups (id) on delete cascade,
  name text not null,
  updated_at timestamptz not null default now()
);

create index if not exists group_people_group_id_idx on public.group_people (group_id);

-- Receipts
create table if not exists public.receipts (
  id uuid primary key,
  group_id uuid not null references public.groups (id) on delete cascade,
  title text not null,
  date_ms bigint not null,
  locked boolean not null default false,
  paid_by_id uuid references public.group_people (id) on delete set null,
  tax_cost numeric not null default 0,
  tip_cost numeric not null default 0,
  discount_cost numeric not null default 0,
  person_paid_map jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists receipts_group_id_idx on public.receipts (group_id);

-- Line items
create table if not exists public.receipt_items (
  id uuid primary key,
  receipt_id uuid not null references public.receipts (id) on delete cascade,
  name text not null,
  cost numeric not null,
  quantity integer not null default 1,
  position integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists receipt_items_receipt_id_idx on public.receipt_items (receipt_id);

-- Per-person quantity per item
create table if not exists public.receipt_allocations (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts (id) on delete cascade,
  person_id uuid not null references public.group_people (id) on delete cascade,
  item_id uuid not null references public.receipt_items (id) on delete cascade,
  quantity numeric not null default 0,
  unique (receipt_id, person_id, item_id)
);

create index if not exists receipt_allocations_receipt_id_idx on public.receipt_allocations (receipt_id);

alter table public.groups enable row level security;
alter table public.group_people enable row level security;
alter table public.receipts enable row level security;
alter table public.receipt_items enable row level security;
alter table public.receipt_allocations enable row level security;

-- Policies (drop first so re-run does not fail)
drop policy if exists "groups_select_own" on public.groups;
drop policy if exists "groups_insert_own" on public.groups;
drop policy if exists "groups_update_own" on public.groups;
drop policy if exists "groups_delete_own" on public.groups;
create policy "groups_select_own" on public.groups
  for select using (auth.uid() = user_id);
create policy "groups_insert_own" on public.groups
  for insert with check (auth.uid() = user_id);
create policy "groups_update_own" on public.groups
  for update using (auth.uid() = user_id);
create policy "groups_delete_own" on public.groups
  for delete using (auth.uid() = user_id);

drop policy if exists "group_people_select" on public.group_people;
drop policy if exists "group_people_insert" on public.group_people;
drop policy if exists "group_people_update" on public.group_people;
drop policy if exists "group_people_delete" on public.group_people;
create policy "group_people_select" on public.group_people
  for select using (
    exists (select 1 from public.groups g where g.id = group_id and g.user_id = auth.uid())
  );
create policy "group_people_insert" on public.group_people
  for insert with check (
    exists (select 1 from public.groups g where g.id = group_id and g.user_id = auth.uid())
  );
create policy "group_people_update" on public.group_people
  for update using (
    exists (select 1 from public.groups g where g.id = group_id and g.user_id = auth.uid())
  );
create policy "group_people_delete" on public.group_people
  for delete using (
    exists (select 1 from public.groups g where g.id = group_id and g.user_id = auth.uid())
  );

drop policy if exists "receipts_select" on public.receipts;
drop policy if exists "receipts_insert" on public.receipts;
drop policy if exists "receipts_update" on public.receipts;
drop policy if exists "receipts_delete" on public.receipts;
create policy "receipts_select" on public.receipts
  for select using (
    exists (select 1 from public.groups g where g.id = group_id and g.user_id = auth.uid())
  );
create policy "receipts_insert" on public.receipts
  for insert with check (
    exists (select 1 from public.groups g where g.id = group_id and g.user_id = auth.uid())
  );
create policy "receipts_update" on public.receipts
  for update using (
    exists (select 1 from public.groups g where g.id = group_id and g.user_id = auth.uid())
  );
create policy "receipts_delete" on public.receipts
  for delete using (
    exists (select 1 from public.groups g where g.id = group_id and g.user_id = auth.uid())
  );

drop policy if exists "receipt_items_select" on public.receipt_items;
drop policy if exists "receipt_items_insert" on public.receipt_items;
drop policy if exists "receipt_items_update" on public.receipt_items;
drop policy if exists "receipt_items_delete" on public.receipt_items;
create policy "receipt_items_select" on public.receipt_items
  for select using (
    exists (
      select 1 from public.receipts r
      join public.groups g on g.id = r.group_id
      where r.id = receipt_id and g.user_id = auth.uid()
    )
  );
create policy "receipt_items_insert" on public.receipt_items
  for insert with check (
    exists (
      select 1 from public.receipts r
      join public.groups g on g.id = r.group_id
      where r.id = receipt_id and g.user_id = auth.uid()
    )
  );
create policy "receipt_items_update" on public.receipt_items
  for update using (
    exists (
      select 1 from public.receipts r
      join public.groups g on g.id = r.group_id
      where r.id = receipt_id and g.user_id = auth.uid()
    )
  );
create policy "receipt_items_delete" on public.receipt_items
  for delete using (
    exists (
      select 1 from public.receipts r
      join public.groups g on g.id = r.group_id
      where r.id = receipt_id and g.user_id = auth.uid()
    )
  );

drop policy if exists "receipt_allocations_select" on public.receipt_allocations;
drop policy if exists "receipt_allocations_insert" on public.receipt_allocations;
drop policy if exists "receipt_allocations_update" on public.receipt_allocations;
drop policy if exists "receipt_allocations_delete" on public.receipt_allocations;
create policy "receipt_allocations_select" on public.receipt_allocations
  for select using (
    exists (
      select 1 from public.receipts r
      join public.groups g on g.id = r.group_id
      where r.id = receipt_id and g.user_id = auth.uid()
    )
  );
create policy "receipt_allocations_insert" on public.receipt_allocations
  for insert with check (
    exists (
      select 1 from public.receipts r
      join public.groups g on g.id = r.group_id
      where r.id = receipt_id and g.user_id = auth.uid()
    )
  );
create policy "receipt_allocations_update" on public.receipt_allocations
  for update using (
    exists (
      select 1 from public.receipts r
      join public.groups g on g.id = r.group_id
      where r.id = receipt_id and g.user_id = auth.uid()
    )
  );
create policy "receipt_allocations_delete" on public.receipt_allocations
  for delete using (
    exists (
      select 1 from public.receipts r
      join public.groups g on g.id = r.group_id
      where r.id = receipt_id and g.user_id = auth.uid()
    )
  );
