-- Public no-login group shares. Run after group_members + receipt_attachments.
-- Anon has no table SELECT; payload RPCs are security definer (anon + authenticated).

create table if not exists public.group_public_shares (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  include_attachments boolean not null default true
);

create index if not exists group_public_shares_group_id_idx
  on public.group_public_shares (group_id);

create index if not exists group_public_shares_group_id_active_idx
  on public.group_public_shares (group_id)
  where revoked_at is null;

alter table public.group_public_shares enable row level security;

revoke all on table public.group_public_shares from public;
revoke all on table public.group_public_shares from anon;
revoke update on table public.group_public_shares from authenticated;
grant select, insert on table public.group_public_shares to authenticated;

drop policy if exists "group_public_shares_select" on public.group_public_shares;
create policy "group_public_shares_select" on public.group_public_shares
  for select to authenticated
  using (public.is_group_member(group_id));

drop policy if exists "group_public_shares_insert" on public.group_public_shares;
create policy "group_public_shares_insert" on public.group_public_shares
  for insert to authenticated
  with check (
    public.is_group_member(group_id)
    and created_by = auth.uid()
  );

-- Revoke is RPC-only (security definer). No client UPDATE.
drop policy if exists "group_public_shares_update" on public.group_public_shares;

-- Members create/revoke via RPC (revoke is security definer; no table UPDATE).
create or replace function public.create_public_group_share(
  p_group_id uuid,
  p_include_attachments boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_group_member(p_group_id) then
    raise exception 'not a group member';
  end if;
  if not exists (select 1 from public.groups g where g.id = p_group_id) then
    raise exception 'group not found';
  end if;

  insert into public.group_public_shares (group_id, created_by, include_attachments)
  values (p_group_id, auth.uid(), coalesce(p_include_attachments, true))
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.revoke_public_group_share(p_share_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select s.group_id into v_group_id
  from public.group_public_shares s
  where s.id = p_share_id;

  if v_group_id is null then
    raise exception 'share not found';
  end if;
  if not public.is_group_member(v_group_id) then
    raise exception 'not a group member';
  end if;

  update public.group_public_shares
  set revoked_at = now()
  where id = p_share_id
    and revoked_at is null;
end;
$$;

revoke all on function public.create_public_group_share(uuid, boolean) from public;
grant execute on function public.create_public_group_share(uuid, boolean) to authenticated;

revoke all on function public.revoke_public_group_share(uuid) from public;
grant execute on function public.revoke_public_group_share(uuid) to authenticated;

-- Active share only. Missing and revoked look the same.
create or replace function public.get_public_group_share(p_share_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_share public.group_public_shares%rowtype;
  v_group public.groups%rowtype;
  v_payload jsonb;
begin
  if p_share_id is null then
    raise exception 'share not found';
  end if;

  select * into v_share
  from public.group_public_shares s
  where s.id = p_share_id
    and s.revoked_at is null;

  if not found then
    raise exception 'share not found';
  end if;

  select * into v_group
  from public.groups g
  where g.id = v_share.group_id;

  if not found then
    raise exception 'share not found';
  end if;

  select jsonb_build_object(
    'id', v_share.id,
    'group_id', v_group.id,
    'name', v_group.name,
    'display_currency', v_group.display_currency,
    'include_attachments', v_share.include_attachments,
    'people', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('id', p.id, 'name', p.name)
          order by p.name, p.id
        ),
        '[]'::jsonb
      )
      from public.group_people p
      where p.group_id = v_group.id
    ),
    'receipts', (
      select coalesce(jsonb_agg(r.obj order by r.date_ms, r.title, r.id), '[]'::jsonb)
      from (
        select
          rec.id,
          rec.date_ms,
          rec.title,
          jsonb_build_object(
            'id', rec.id,
            'title', rec.title,
            'date_ms', rec.date_ms,
            'paid_by_id', rec.paid_by_id,
            'currency_code', rec.currency_code,
            'tax_behavior', rec.tax_behavior,
            'tax_cost', rec.tax_cost,
            'tip_cost', rec.tip_cost,
            'discount_cost', rec.discount_cost,
            'items', (
              select coalesce(
                jsonb_agg(
                  jsonb_build_object(
                    'id', i.id,
                    'name', i.name,
                    'cost', i.cost,
                    'quantity', i.quantity,
                    'position', i.position
                  )
                  order by i.position, i.id
                ),
                '[]'::jsonb
              )
              from public.receipt_items i
              where i.receipt_id = rec.id
            ),
            'allocations', (
              select coalesce(
                jsonb_agg(
                  jsonb_build_object(
                    'person_id', a.person_id,
                    'item_id', a.item_id,
                    'quantity', a.quantity
                  )
                  order by a.person_id, a.item_id
                ),
                '[]'::jsonb
              )
              from public.receipt_allocations a
              where a.receipt_id = rec.id
            ),
            'attachments', case
              when v_share.include_attachments then (
                select coalesce(
                  jsonb_agg(
                    jsonb_build_object(
                      'id', att.id,
                      'mime_type', att.mime_type,
                      'file_name', att.file_name
                    )
                    order by att.created_at, att.id
                  ),
                  '[]'::jsonb
                )
                from public.receipt_attachments att
                where att.receipt_id = rec.id
                  and att.group_id = v_group.id
              )
              else '[]'::jsonb
            end
          ) as obj
        from public.receipts rec
        where rec.group_id = v_group.id
      ) r
    )
  ) into v_payload;

  return v_payload;
end;
$$;

-- Returns bucket-relative storage_path only (e.g. groupId/receiptId/id.jpg).
-- Task 15 client calls this RPC, then supabase.storage.from('receipt-attachments')
-- .createSignedUrl(path, 120) (or download) with the anon key. Storage RLS below
-- allows SELECT when the group has an active attachment share.
create or replace function public.get_public_share_attachment_url(
  p_share_id uuid,
  p_attachment_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_include boolean;
  v_path text;
begin
  if p_share_id is null or p_attachment_id is null then
    raise exception 'share not found';
  end if;

  select s.group_id, s.include_attachments
  into v_group_id, v_include
  from public.group_public_shares s
  where s.id = p_share_id
    and s.revoked_at is null;

  if v_group_id is null then
    raise exception 'share not found';
  end if;
  if not v_include then
    raise exception 'attachments not included';
  end if;

  select a.storage_path into v_path
  from public.receipt_attachments a
  where a.id = p_attachment_id
    and a.group_id = v_group_id;

  if v_path is null then
    raise exception 'share not found';
  end if;

  return v_path;
end;
$$;

create or replace function public.has_active_attachment_share(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_public_shares s
    where s.group_id = p_group_id
      and s.revoked_at is null
      and s.include_attachments = true
  );
$$;

revoke all on function public.has_active_attachment_share(uuid) from public;
grant execute on function public.has_active_attachment_share(uuid) to anon, authenticated;

create or replace function public.storage_path_group_id(p_name text)
returns uuid
language plpgsql
immutable
parallel safe
as $$
declare
  v_seg text;
begin
  v_seg := split_part(coalesce(p_name, ''), '/', 1);
  if v_seg ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return v_seg::uuid;
  end if;
  return null;
end;
$$;

revoke all on function public.storage_path_group_id(text) from public;
grant execute on function public.storage_path_group_id(text) to anon, authenticated;

drop policy if exists "receipt_attachments_storage_select_public_share" on storage.objects;
create policy "receipt_attachments_storage_select_public_share" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'receipt-attachments'
    and public.has_active_attachment_share(public.storage_path_group_id(name))
  );

revoke all on function public.get_public_group_share(uuid) from public;
grant execute on function public.get_public_group_share(uuid) to anon;
grant execute on function public.get_public_group_share(uuid) to authenticated;

revoke all on function public.get_public_share_attachment_url(uuid, uuid) from public;
grant execute on function public.get_public_share_attachment_url(uuid, uuid) to anon;
grant execute on function public.get_public_share_attachment_url(uuid, uuid) to authenticated;
