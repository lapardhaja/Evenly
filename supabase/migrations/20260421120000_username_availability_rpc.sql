-- Live username check during sign-up (works for anon — no session yet).
-- Also allows logged-in users to see "available" for their current username when editing.

create or replace function public.is_username_available(candidate text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  t text;
  uid uuid;
begin
  t := nullif(trim(candidate), '');
  if t is null or t !~ '^[a-zA-Z0-9_]{3,30}$' then
    return false;
  end if;

  uid := auth.uid();
  if uid is not null then
    if exists (
      select 1
      from public.profiles p
      where p.user_id = uid
        and p.username is not null
        and lower(p.username::text) = lower(t)
    ) then
      return true;
    end if;
  end if;

  return not exists (
    select 1
    from public.profiles p
    where p.username is not null
      and lower(p.username::text) = lower(t)
  );
end;
$$;

grant execute on function public.is_username_available(text) to anon;
grant execute on function public.is_username_available(text) to authenticated;
