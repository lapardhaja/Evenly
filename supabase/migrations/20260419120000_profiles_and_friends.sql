-- Profiles (username), friend requests, friendships. Run in Supabase SQL editor.

create extension if not exists citext;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username citext unique,
  display_name text,
  email_lookup text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (
    username is null or username::text ~ '^[a-zA-Z0-9_]{3,30}$'
  )
);

create unique index if not exists profiles_email_lookup_lower_idx
  on public.profiles (lower(email_lookup))
  where email_lookup is not null;

create index if not exists profiles_username_lower_idx on public.profiles (lower(username::text));

create table if not exists public.friendships (
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  constraint friendship_order check (user_a < user_b)
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users (id) on delete cascade,
  to_user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  constraint friend_req_no_self check (from_user_id <> to_user_id)
);

create unique index if not exists friend_requests_pending_unique
  on public.friend_requests (from_user_id, to_user_id)
  where status = 'pending';

create index if not exists friend_requests_to_pending_idx
  on public.friend_requests (to_user_id) where status = 'pending';

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.friend_requests enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "friendships_select_participant" on public.friendships;
create policy "friendships_select_participant"
  on public.friendships for select
  to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

-- Friendships created only via accept_friend_request (security definer), not direct client insert
drop policy if exists "friendships_insert_participant" on public.friendships;

drop policy if exists "friendships_delete_participant" on public.friendships;
create policy "friendships_delete_participant"
  on public.friendships for delete
  to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "friend_req_select_parties" on public.friend_requests;
create policy "friend_req_select_parties"
  on public.friend_requests for select
  to authenticated
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

drop policy if exists "friend_req_insert_sender" on public.friend_requests;
create policy "friend_req_insert_sender"
  on public.friend_requests for insert
  to authenticated
  with check (auth.uid() = from_user_id);

drop policy if exists "friend_req_update_receiver" on public.friend_requests;
create policy "friend_req_update_receiver"
  on public.friend_requests for update
  to authenticated
  using (auth.uid() = to_user_id or auth.uid() = from_user_id)
  with check (auth.uid() = to_user_id or auth.uid() = from_user_id);

drop policy if exists "friend_req_delete_parties" on public.friend_requests;
create policy "friend_req_delete_parties"
  on public.friend_requests for delete
  to authenticated
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

create or replace function public.search_profiles_by_username(prefix text, lim int default 20)
returns table (user_id uuid, username citext, display_name text)
language sql
stable
security invoker
set search_path = public
as $$
  select p.user_id, p.username, p.display_name
  from public.profiles p
  where p.username is not null
    and lower(p.username::text) like lower(trim(prefix)) || '%'
    and p.user_id <> auth.uid()
  order by p.username asc
  limit greatest(1, least(coalesce(lim, 20), 50));
$$;

grant execute on function public.search_profiles_by_username(text, int) to authenticated;

create or replace function public.find_profile_by_email_exact(lookup_email text)
returns table (user_id uuid, username citext, display_name text)
language sql
stable
security invoker
set search_path = public
as $$
  select p.user_id, p.username, p.display_name
  from public.profiles p
  where p.email_lookup is not null
    and lower(trim(p.email_lookup)) = lower(trim(lookup_email))
    and p.user_id <> auth.uid()
  limit 1;
$$;

grant execute on function public.find_profile_by_email_exact(text) to authenticated;

create or replace function public.accept_friend_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.friend_requests
  where id = request_id and to_user_id = auth.uid() and status = 'pending';
  if not found then
    raise exception 'Request not found or already handled';
  end if;
  update public.friend_requests set status = 'accepted' where id = request_id;
  if r.from_user_id < r.to_user_id then
    insert into public.friendships (user_a, user_b) values (r.from_user_id, r.to_user_id)
    on conflict do nothing;
  else
    insert into public.friendships (user_a, user_b) values (r.to_user_id, r.from_user_id)
    on conflict do nothing;
  end if;
end;
$$;

grant execute on function public.accept_friend_request(uuid) to authenticated;

create or replace function public.decline_friend_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.friend_requests
  set status = 'declined'
  where id = request_id and to_user_id = auth.uid() and status = 'pending';
end;
$$;

grant execute on function public.decline_friend_request(uuid) to authenticated;

create or replace function public.cancel_friend_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.friend_requests
  where id = request_id and from_user_id = auth.uid() and status = 'pending';
end;
$$;

grant execute on function public.cancel_friend_request(uuid) to authenticated;

create or replace function public.remove_friendship(other_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a uuid;
  b uuid;
begin
  if auth.uid() = other_user_id then
    raise exception 'Invalid';
  end if;
  if auth.uid() < other_user_id then
    a := auth.uid();
    b := other_user_id;
  else
    a := other_user_id;
    b := auth.uid();
  end if;
  delete from public.friendships where user_a = a and user_b = b;
end;
$$;

grant execute on function public.remove_friendship(uuid) to authenticated;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, email_lookup)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, ''), '@', 1)),
    case when new.email is not null then lower(trim(new.email)) else null end
  )
  on conflict (user_id) do update set
    email_lookup = coalesce(excluded.email_lookup, public.profiles.email_lookup),
    display_name = coalesce(public.profiles.display_name, excluded.display_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();
