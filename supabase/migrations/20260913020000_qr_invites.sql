-- Group join QR / personal friend QR. Tokens are invite secrets; join does not require friendship.
create table if not exists public.group_join_codes (
  group_id uuid primary key references public.groups (id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now(),
  constraint group_join_token_format check (token ~ '^g_[0-9a-f]{32}$')
);

create table if not exists public.friend_invite_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now(),
  constraint friend_invite_token_format check (token ~ '^f_[0-9a-f]{32}$')
);

alter table public.group_join_codes enable row level security;
alter table public.friend_invite_codes enable row level security;

drop policy if exists "group_join_codes_member_select" on public.group_join_codes;
create policy "group_join_codes_member_select"
  on public.group_join_codes for select
  to authenticated
  using (public.is_group_member(group_id));

drop policy if exists "friend_invite_codes_own_select" on public.friend_invite_codes;
create policy "friend_invite_codes_own_select"
  on public.friend_invite_codes for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.ensure_group_join_code(p_group_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_group_member(p_group_id) then
    raise exception 'not a group member';
  end if;
  insert into public.group_join_codes (group_id, token)
  values (p_group_id, 'g_' || encode(gen_random_bytes(16), 'hex'))
  on conflict (group_id) do nothing;
  select token into v_token from public.group_join_codes where group_id = p_group_id;
  return v_token;
end;
$$;

create or replace function public.rotate_group_join_code(p_group_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_group_member(p_group_id) then
    raise exception 'not a group member';
  end if;
  v_token := 'g_' || encode(gen_random_bytes(16), 'hex');
  insert into public.group_join_codes (group_id, token)
  values (p_group_id, v_token)
  on conflict (group_id) do update
    set token = excluded.token, created_at = now();
  return v_token;
end;
$$;

create or replace function public.ensure_friend_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  insert into public.friend_invite_codes (user_id, token)
  values (auth.uid(), 'f_' || encode(gen_random_bytes(16), 'hex'))
  on conflict (user_id) do nothing;
  select token into v_token from public.friend_invite_codes where user_id = auth.uid();
  return v_token;
end;
$$;

create or replace function public.peek_invite_code(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_group_id uuid;
  v_name text;
  v_user uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_token := lower(trim(coalesce(p_token, '')));
  if v_token ~ '^g_[0-9a-f]{32}$' then
    select g.id, g.name into v_group_id, v_name
    from public.group_join_codes c
    join public.groups g on g.id = c.group_id
    where c.token = v_token;
    if v_group_id is null then
      raise exception 'Invite not found';
    end if;
    return json_build_object('kind', 'group', 'group_id', v_group_id, 'name', coalesce(v_name, 'Group'));
  end if;
  if v_token ~ '^f_[0-9a-f]{32}$' then
    select p.user_id,
      coalesce(
        nullif(trim(both from concat_ws(' ', p.first_name, p.last_name)), ''),
        nullif(trim(p.display_name), ''),
        nullif(trim(p.username), ''),
        'Someone'
      )
    into v_user, v_name
    from public.friend_invite_codes c
    join public.profiles p on p.user_id = c.user_id
    where c.token = v_token;
    if v_user is null then
      raise exception 'Invite not found';
    end if;
    return json_build_object(
      'kind', 'friend',
      'name', v_name,
      'self', v_user = auth.uid()
    );
  end if;
  raise exception 'Invite not found';
end;
$$;

create or replace function public.join_group_by_code(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_group_id uuid;
  v_name text;
  v_already boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_token := lower(trim(coalesce(p_token, '')));
  if v_token !~ '^g_[0-9a-f]{32}$' then
    raise exception 'Invite not found';
  end if;
  select group_id into v_group_id from public.group_join_codes where token = v_token;
  if v_group_id is null then
    raise exception 'Invite not found';
  end if;

  select exists (
    select 1 from public.group_members gm
    where gm.group_id = v_group_id and gm.user_id = auth.uid()
  ) into v_already;

  if not v_already then
    insert into public.group_members (group_id, user_id, role)
    values (v_group_id, auth.uid(), 'member')
    on conflict (group_id, user_id) do nothing;
  end if;

  select coalesce(
    nullif(trim(both from concat_ws(' ', p.first_name, p.last_name)), ''),
    nullif(trim(p.display_name), ''),
    nullif(trim(p.username), ''),
    'Member'
  ) into v_name
  from public.profiles p
  where p.user_id = auth.uid();
  if v_name is null then
    v_name := 'Member';
  end if;

  if not exists (
    select 1 from public.group_people gp
    where gp.group_id = v_group_id and gp.linked_user_id = auth.uid()
  ) then
    insert into public.group_people (id, group_id, name, linked_user_id)
    values (gen_random_uuid(), v_group_id, v_name, auth.uid());
  end if;

  return json_build_object('group_id', v_group_id, 'already_member', v_already);
end;
$$;

create or replace function public.add_friend_by_code(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_other uuid;
  v_a uuid;
  v_b uuid;
  v_already boolean := false;
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_token := lower(trim(coalesce(p_token, '')));
  if v_token !~ '^f_[0-9a-f]{32}$' then
    raise exception 'Invite not found';
  end if;
  select user_id into v_other from public.friend_invite_codes where token = v_token;
  if v_other is null then
    raise exception 'Invite not found';
  end if;
  if v_other = auth.uid() then
    raise exception 'That’s your own code';
  end if;

  select exists (
    select 1 from public.friendships f
    where (f.user_a = auth.uid() and f.user_b = v_other)
       or (f.user_a = v_other and f.user_b = auth.uid())
  ) into v_already;

  if auth.uid() < v_other then
    v_a := auth.uid();
    v_b := v_other;
  else
    v_a := v_other;
    v_b := auth.uid();
  end if;
  insert into public.friendships (user_a, user_b)
  values (v_a, v_b)
  on conflict do nothing;

  update public.friend_requests
  set status = 'accepted'
  where status = 'pending'
    and (
      (from_user_id = auth.uid() and to_user_id = v_other)
      or (from_user_id = v_other and to_user_id = auth.uid())
    );

  select coalesce(
    nullif(trim(both from concat_ws(' ', p.first_name, p.last_name)), ''),
    nullif(trim(p.display_name), ''),
    nullif(trim(p.username), ''),
    'Someone'
  ) into v_name
  from public.profiles p
  where p.user_id = v_other;

  return json_build_object(
    'user_id', v_other,
    'name', coalesce(v_name, 'Someone'),
    'already_friends', v_already
  );
end;
$$;

revoke all on function public.ensure_group_join_code(uuid) from public;
revoke all on function public.rotate_group_join_code(uuid) from public;
revoke all on function public.ensure_friend_code() from public;
revoke all on function public.peek_invite_code(text) from public;
revoke all on function public.join_group_by_code(text) from public;
revoke all on function public.add_friend_by_code(text) from public;

grant execute on function public.ensure_group_join_code(uuid) to authenticated;
grant execute on function public.rotate_group_join_code(uuid) to authenticated;
grant execute on function public.ensure_friend_code() to authenticated;
grant execute on function public.peek_invite_code(text) to authenticated;
grant execute on function public.join_group_by_code(text) to authenticated;
grant execute on function public.add_friend_by_code(text) to authenticated;
