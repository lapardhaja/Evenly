-- Token RPCs used gen_random_bytes() with search_path = public.
-- On hosted Supabase pgcrypto lives in extensions, so the QR dialog died with
-- "function gen_random_bytes(integer) does not exist".
-- gen_random_uuid() is in pg_catalog (always on the path) and strips to 32 hex chars.

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
  values (p_group_id, 'g_' || replace(gen_random_uuid()::text, '-', ''))
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
  v_token := 'g_' || replace(gen_random_uuid()::text, '-', '');
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
  values (auth.uid(), 'f_' || replace(gen_random_uuid()::text, '-', ''))
  on conflict (user_id) do nothing;
  select token into v_token from public.friend_invite_codes where user_id = auth.uid();
  return v_token;
end;
$$;
