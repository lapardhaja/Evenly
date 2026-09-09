-- Realtime friend requests for the app-bar badge (same pattern as messages).
-- REPLICA IDENTITY FULL so UPDATE/DELETE payloads include to_user_id for RLS.

alter table public.friend_requests replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friend_requests'
    ) then
      execute 'alter publication supabase_realtime add table public.friend_requests';
    end if;
  end if;
end $$;
