-- First / last name on profiles (optional for legacy rows)
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text;

-- Refresh RPCs to expose names for search UI
create or replace function public.search_profiles_by_username(prefix text, lim int default 20)
returns table (
  user_id uuid,
  username citext,
  display_name text,
  first_name text,
  last_name text
)
language sql
stable
security invoker
set search_path = public
as $$
  select p.user_id, p.username, p.display_name, p.first_name, p.last_name
  from public.profiles p
  where p.username is not null
    and lower(p.username::text) like lower(trim(prefix)) || '%'
    and p.user_id <> auth.uid()
  order by p.username asc
  limit greatest(1, least(coalesce(lim, 20), 50));
$$;

create or replace function public.find_profile_by_email_exact(lookup_email text)
returns table (
  user_id uuid,
  username citext,
  display_name text,
  first_name text,
  last_name text
)
language sql
stable
security invoker
set search_path = public
as $$
  select p.user_id, p.username, p.display_name, p.first_name, p.last_name
  from public.profiles p
  where p.email_lookup is not null
    and lower(trim(p.email_lookup)) = lower(trim(lookup_email))
    and p.user_id <> auth.uid()
  limit 1;
$$;

-- New users: copy first/last from auth metadata into profiles
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fn text;
  ln text;
  full_display text;
begin
  fn := nullif(trim(new.raw_user_meta_data->>'first_name'), '');
  ln := nullif(trim(new.raw_user_meta_data->>'last_name'), '');
  full_display := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    case when fn is not null and ln is not null then fn || ' ' || ln
         when fn is not null then fn
         when ln is not null then ln
         else split_part(coalesce(new.email, ''), '@', 1) end
  );
  insert into public.profiles (user_id, display_name, email_lookup, first_name, last_name)
  values (
    new.id,
    full_display,
    case when new.email is not null then lower(trim(new.email)) else null end,
    fn,
    ln
  )
  on conflict (user_id) do update set
    email_lookup = coalesce(excluded.email_lookup, public.profiles.email_lookup),
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    first_name = coalesce(public.profiles.first_name, excluded.first_name),
    last_name = coalesce(public.profiles.last_name, excluded.last_name);
  return new;
end;
$$;
