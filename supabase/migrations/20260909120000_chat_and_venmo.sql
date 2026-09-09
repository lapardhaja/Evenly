-- Group/DM chat + Venmo username. Evenly does not move money.

alter table public.profiles
  add column if not exists venmo_username citext;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_venmo_username_format'
  ) then
    alter table public.profiles
      add constraint profiles_venmo_username_format check (
        venmo_username is null or venmo_username::text ~ '^[a-zA-Z0-9_-]{3,30}$'
      );
  end if;
end $$;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('group', 'dm')),
  group_id uuid unique references public.groups (id) on delete cascade,
  dm_user_a uuid references auth.users (id) on delete cascade,
  dm_user_b uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint conversations_group_shape check (
    (kind = 'group' and group_id is not null and dm_user_a is null and dm_user_b is null)
    or (kind = 'dm' and group_id is null and dm_user_a is not null and dm_user_b is not null and dm_user_a < dm_user_b)
  )
);

create unique index if not exists conversations_dm_pair_idx
  on public.conversations (dm_user_a, dm_user_b)
  where kind = 'dm';

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists conversation_members_user_id_idx
  on public.conversation_members (user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('text', 'payment')),
  body text not null default '',
  payload jsonb,
  created_at timestamptz not null default now(),
  constraint messages_body_len check (char_length(body) <= 2000)
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

alter table public.conversations replica identity full;
alter table public.conversation_members replica identity full;
alter table public.messages replica identity full;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = p_conversation_id and cm.user_id = auth.uid()
  );
$$;

revoke all on function public.is_conversation_member(uuid) from public;
grant execute on function public.is_conversation_member(uuid) to authenticated;

create or replace function public.can_dm_user(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_other is not null
    and auth.uid() is not null
    and p_other <> auth.uid()
    and (
      exists (
        select 1 from public.friendships f
        where (f.user_a = auth.uid() and f.user_b = p_other)
           or (f.user_a = p_other and f.user_b = auth.uid())
      )
      or exists (
        select 1
        from public.group_members me
        join public.group_members them on them.group_id = me.group_id
        where me.user_id = auth.uid() and them.user_id = p_other
      )
    );
$$;

revoke all on function public.can_dm_user(uuid) from public;
grant execute on function public.can_dm_user(uuid) to authenticated;

drop policy if exists "conversations_select_member" on public.conversations;
create policy "conversations_select_member" on public.conversations
  for select to authenticated
  using (public.is_conversation_member(id));

drop policy if exists "conversation_members_select" on public.conversation_members;
create policy "conversation_members_select" on public.conversation_members
  for select to authenticated
  using (public.is_conversation_member(conversation_id));

drop policy if exists "conversation_members_update_self" on public.conversation_members;
create policy "conversation_members_update_self" on public.conversation_members
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "messages_select_member" on public.messages;
create policy "messages_select_member" on public.messages
  for select to authenticated
  using (public.is_conversation_member(conversation_id));

drop policy if exists "messages_insert_self" on public.messages;
create policy "messages_insert_self" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  );

create or replace function public.handle_group_chat_room()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.conversations (kind, group_id)
  values ('group', new.id)
  on conflict (group_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_group_chat_room on public.groups;
create trigger trg_group_chat_room
  after insert on public.groups
  for each row execute function public.handle_group_chat_room();

create or replace function public.sync_group_conversation_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cid uuid;
begin
  if tg_op = 'INSERT' then
    select c.id into v_cid from public.conversations c
    where c.kind = 'group' and c.group_id = new.group_id;
    if v_cid is null then
      insert into public.conversations (kind, group_id)
      values ('group', new.group_id)
      returning id into v_cid;
    end if;
    insert into public.conversation_members (conversation_id, user_id)
    values (v_cid, new.user_id)
    on conflict (conversation_id, user_id) do nothing;
    return new;
  end if;

  select c.id into v_cid from public.conversations c
  where c.kind = 'group' and c.group_id = old.group_id;
  if v_cid is not null then
    delete from public.conversation_members
    where conversation_id = v_cid and user_id = old.user_id;
  end if;
  return old;
end;
$$;

drop trigger if exists trg_group_chat_member on public.group_members;
create trigger trg_group_chat_member
  after insert or delete on public.group_members
  for each row execute function public.sync_group_conversation_member();

insert into public.conversations (kind, group_id)
select 'group', g.id from public.groups g
on conflict (group_id) do nothing;

insert into public.conversation_members (conversation_id, user_id)
select c.id, gm.user_id
from public.conversations c
join public.group_members gm on gm.group_id = c.group_id
where c.kind = 'group'
on conflict (conversation_id, user_id) do nothing;

create or replace function public.get_or_create_dm(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_a uuid;
  v_b uuid;
  v_id uuid;
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;
  if not public.can_dm_user(p_other_user_id) then
    raise exception 'cannot message this user';
  end if;
  if p_other_user_id < v_me then
    v_a := p_other_user_id;
    v_b := v_me;
  else
    v_a := v_me;
    v_b := p_other_user_id;
  end if;

  select c.id into v_id
  from public.conversations c
  where c.kind = 'dm' and c.dm_user_a = v_a and c.dm_user_b = v_b;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.conversations (kind, dm_user_a, dm_user_b)
  values ('dm', v_a, v_b)
  returning id into v_id;

  insert into public.conversation_members (conversation_id, user_id)
  values (v_id, v_a), (v_id, v_b)
  on conflict do nothing;

  return v_id;
end;
$$;

revoke all on function public.get_or_create_dm(uuid) from public;
grant execute on function public.get_or_create_dm(uuid) to authenticated;

create or replace function public.get_group_conversation(p_group_id uuid)
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
  select c.id into v_id from public.conversations c
  where c.kind = 'group' and c.group_id = p_group_id;
  if v_id is not null then
    return v_id;
  end if;
  insert into public.conversations (kind, group_id)
  values ('group', p_group_id)
  returning id into v_id;
  insert into public.conversation_members (conversation_id, user_id)
  select v_id, gm.user_id from public.group_members gm where gm.group_id = p_group_id
  on conflict do nothing;
  return v_id;
end;
$$;

revoke all on function public.get_group_conversation(uuid) from public;
grant execute on function public.get_group_conversation(uuid) to authenticated;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_conversation_member(p_conversation_id) then
    raise exception 'not a conversation member';
  end if;
  update public.conversation_members
  set last_read_at = now()
  where conversation_id = p_conversation_id and user_id = auth.uid();
end;
$$;

revoke all on function public.mark_conversation_read(uuid) from public;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

create or replace function public.mark_payment_paid(p_message_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_msg public.messages%rowtype;
  v_from uuid;
  v_to uuid;
  v_group uuid;
  v_key text;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select * into v_msg from public.messages where id = p_message_id;
  if not found then
    raise exception 'message not found';
  end if;
  if v_msg.type <> 'payment' then
    raise exception 'not a payment';
  end if;
  if not public.is_conversation_member(v_msg.conversation_id) then
    raise exception 'not a conversation member';
  end if;
  v_from := nullif(v_msg.payload->>'from_user_id', '')::uuid;
  v_to := nullif(v_msg.payload->>'to_user_id', '')::uuid;
  if auth.uid() is distinct from v_from and auth.uid() is distinct from v_to then
    raise exception 'not a party to this payment';
  end if;
  v_status := coalesce(v_msg.payload->>'status', 'requested');
  if v_status = 'canceled' then
    raise exception 'payment canceled';
  end if;

  update public.messages
  set payload = jsonb_set(coalesce(payload, '{}'::jsonb), '{status}', '"paid"'::jsonb, true)
  where id = p_message_id;

  v_group := nullif(v_msg.payload->>'group_id', '')::uuid;
  v_key := v_msg.payload->>'transfer_key';
  if v_group is not null and v_key is not null and length(v_key) > 0 then
    update public.groups
    set settled_transfers = case
      when exists (
        select 1 from jsonb_array_elements_text(coalesce(settled_transfers, '[]'::jsonb)) e
        where e = v_key
      ) then settled_transfers
      else coalesce(settled_transfers, '[]'::jsonb) || jsonb_build_array(v_key)
    end
    where id = v_group;
  end if;

  return jsonb_build_object('ok', true, 'transfer_key', v_key, 'group_id', v_group);
end;
$$;

revoke all on function public.mark_payment_paid(uuid) from public;
grant execute on function public.mark_payment_paid(uuid) to authenticated;

create or replace function public.cancel_payment_request(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_msg public.messages%rowtype;
begin
  select * into v_msg from public.messages where id = p_message_id;
  if not found then
    raise exception 'message not found';
  end if;
  if v_msg.type <> 'payment' then
    raise exception 'not a payment';
  end if;
  if v_msg.sender_id <> auth.uid() then
    raise exception 'only sender can cancel';
  end if;
  if coalesce(v_msg.payload->>'status', 'requested') <> 'requested' then
    raise exception 'cannot cancel';
  end if;
  update public.messages
  set payload = jsonb_set(coalesce(payload, '{}'::jsonb), '{status}', '"canceled"'::jsonb, true)
  where id = p_message_id;
end;
$$;

revoke all on function public.cancel_payment_request(uuid) from public;
grant execute on function public.cancel_payment_request(uuid) to authenticated;

create or replace function public.list_my_conversations()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_out jsonb;
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.sort_at desc), '[]'::jsonb)
  into v_out
  from (
    select
      c.id,
      c.kind,
      c.group_id,
      g.name as group_name,
      case when c.kind = 'dm' then (
        select cm2.user_id from public.conversation_members cm2
        where cm2.conversation_id = c.id and cm2.user_id <> v_me
        limit 1
      ) end as other_user_id,
      case when c.kind = 'dm' then (
        select jsonb_build_object(
          'user_id', p.user_id,
          'username', p.username,
          'display_name', p.display_name,
          'first_name', p.first_name,
          'last_name', p.last_name,
          'venmo_username', p.venmo_username
        )
        from public.conversation_members cm2
        join public.profiles p on p.user_id = cm2.user_id
        where cm2.conversation_id = c.id and cm2.user_id <> v_me
        limit 1
      ) end as other_profile,
      lm.body as last_body,
      lm.type as last_type,
      lm.payload as last_payload,
      lm.created_at as last_at,
      lm.sender_id as last_sender_id,
      (
        select count(*)::int
        from public.messages m
        where m.conversation_id = c.id
          and m.created_at > mem.last_read_at
          and m.sender_id <> v_me
      ) as unread_count,
      coalesce(lm.created_at, c.created_at) as sort_at
    from public.conversation_members mem
    join public.conversations c on c.id = mem.conversation_id
    left join public.groups g on g.id = c.group_id
    left join lateral (
      select m.body, m.type, m.payload, m.created_at, m.sender_id
      from public.messages m
      where m.conversation_id = c.id
      order by m.created_at desc
      limit 1
    ) lm on true
    where mem.user_id = v_me
  ) t;

  return v_out;
end;
$$;

revoke all on function public.list_my_conversations() from public;
grant execute on function public.list_my_conversations() to authenticated;

create or replace function public.count_unread_conversations()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.conversation_members mem
  where mem.user_id = auth.uid()
    and exists (
      select 1 from public.messages m
      where m.conversation_id = mem.conversation_id
        and m.created_at > mem.last_read_at
        and m.sender_id <> auth.uid()
    );
$$;

revoke all on function public.count_unread_conversations() from public;
grant execute on function public.count_unread_conversations() to authenticated;

create or replace function public.list_dm_candidates()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_out jsonb;
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;

  select coalesce(jsonb_agg(row_to_json(p)::jsonb order by coalesce(p.display_name, p.username)), '[]'::jsonb)
  into v_out
  from (
    select distinct
      pr.user_id,
      pr.username,
      pr.display_name,
      pr.first_name,
      pr.last_name,
      pr.venmo_username
    from public.profiles pr
    where pr.user_id <> v_me
      and (
        exists (
          select 1 from public.friendships f
          where (f.user_a = v_me and f.user_b = pr.user_id)
             or (f.user_a = pr.user_id and f.user_b = v_me)
        )
        or exists (
          select 1
          from public.group_members me
          join public.group_members them on them.group_id = me.group_id
          where me.user_id = v_me and them.user_id = pr.user_id
        )
      )
  ) p;

  return v_out;
end;
$$;

revoke all on function public.list_dm_candidates() from public;
grant execute on function public.list_dm_candidates() to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
    ) then
      execute 'alter publication supabase_realtime add table public.messages';
    end if;
  end if;
end $$;
