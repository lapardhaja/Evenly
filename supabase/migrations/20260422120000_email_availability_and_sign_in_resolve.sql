-- Email availability at sign-up (checks auth.users).
-- Resolve username → email for sign-in / password reset (profiles.email_lookup).

create or replace function public.is_email_available(candidate_email text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  e text;
begin
  e := nullif(trim(lower(candidate_email)), '');
  if e is null or position('@' in e) = 0 then
    return false;
  end if;
  return not exists (
    select 1 from auth.users u where lower(trim(u.email::text)) = e
  );
end;
$$;

grant execute on function public.is_email_available(text) to anon;
grant execute on function public.is_email_available(text) to authenticated;

create or replace function public.resolve_sign_in_email(id text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s text;
  em text;
begin
  s := nullif(trim(id), '');
  if s is null then return null; end if;
  if position('@' in s) > 0 then
    return lower(s);
  end if;
  if s !~ '^[a-zA-Z0-9_]{3,30}$' then
    return null;
  end if;
  select p.email_lookup into em
  from public.profiles p
  where p.username is not null
    and lower(p.username::text) = lower(s)
  limit 1;
  return em;
end;
$$;

grant execute on function public.resolve_sign_in_email(text) to anon;
grant execute on function public.resolve_sign_in_email(text) to authenticated;
