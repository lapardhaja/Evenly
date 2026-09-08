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
grant select, insert, update on table public.group_public_shares to authenticated;

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

drop policy if exists "group_public_shares_update" on public.group_public_shares;
create policy "group_public_shares_update" on public.group_public_shares
  for update to authenticated
  using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

-- Members create/revoke via RPC (also allowed by RLS above).
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

-- Signed Storage URL (120s). Uses Auth JWT secret GUCs (Storage still accepts
-- legacy HS256 tokens). Task 15 maps people/receipts into settlement.js.
create or replace function public.get_public_share_attachment_url(
  p_share_id uuid,
  p_attachment_id uuid
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_group_id uuid;
  v_include boolean;
  v_path text;
  v_secret text;
  v_host text;
  v_scheme text;
  v_headers jsonb;
  v_header text;
  v_payload text;
  v_sig text;
  v_token text;
  v_now int;
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

  v_secret := nullif(current_setting('app.settings.jwt_secret', true), '');
  if v_secret is null then
    v_secret := nullif(current_setting('pgrst.jwt_secret', true), '');
  end if;
  if v_secret is null then
    raise exception 'jwt secret not configured for signed urls';
  end if;

  begin
    v_headers := current_setting('request.headers', true)::jsonb;
  exception when others then
    v_headers := '{}'::jsonb;
  end;

  v_host := coalesce(
    nullif(v_headers->>'x-forwarded-host', ''),
    nullif(v_headers->>'host', '')
  );
  v_scheme := coalesce(nullif(v_headers->>'x-forwarded-proto', ''), 'https');
  if v_host is null then
    raise exception 'request host not available for signed urls';
  end if;

  v_now := floor(extract(epoch from now()))::int;
  v_header := rtrim(replace(replace(encode(convert_to('{"alg":"HS256","typ":"JWT"}', 'UTF8'), 'base64'), '+', '-'), '/', '_'), '=');
  v_payload := rtrim(replace(replace(encode(
    convert_to(
      jsonb_build_object(
        'url', 'receipt-attachments/' || v_path,
        'scope', 'download',
        'iat', v_now,
        'exp', v_now + 120
      )::text,
      'UTF8'
    ),
    'base64'
  ), '+', '-'), '/', '_'), '=');
  v_sig := rtrim(replace(replace(encode(
    hmac(v_header || '.' || v_payload, v_secret, 'sha256'),
    'base64'
  ), '+', '-'), '/', '_'), '=');
  v_token := v_header || '.' || v_payload || '.' || v_sig;

  return v_scheme || '://' || v_host || '/storage/v1/object/sign/receipt-attachments/'
    || v_path || '?token=' || v_token;
end;
$$;

revoke all on function public.get_public_group_share(uuid) from public;
grant execute on function public.get_public_group_share(uuid) to anon;
grant execute on function public.get_public_group_share(uuid) to authenticated;

revoke all on function public.get_public_share_attachment_url(uuid, uuid) from public;
grant execute on function public.get_public_share_attachment_url(uuid, uuid) to anon;
grant execute on function public.get_public_share_attachment_url(uuid, uuid) to authenticated;
