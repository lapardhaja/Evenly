-- Chat photos + likes, friend search by name, heal missing owner membership.

-- messages.type: allow image (empty body = photo only)
alter table public.messages drop constraint if exists messages_type_check;
alter table public.messages drop constraint if exists messages_type_check1;
do $$
begin
  alter table public.messages
    add constraint messages_type_check check (type in ('text', 'payment', 'image'));
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.message_likes (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists message_likes_user_id_idx on public.message_likes (user_id);

alter table public.message_likes enable row level security;

drop policy if exists "message_likes_select_member" on public.message_likes;
create policy "message_likes_select_member"
  on public.message_likes for select to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_id and public.is_conversation_member(m.conversation_id)
    )
  );

drop policy if exists "message_likes_insert_self" on public.message_likes;
create policy "message_likes_insert_self"
  on public.message_likes for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.messages m
      where m.id = message_id and public.is_conversation_member(m.conversation_id)
    )
  );

drop policy if exists "message_likes_delete_self" on public.message_likes;
create policy "message_likes_delete_self"
  on public.message_likes for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on table public.message_likes to authenticated;

alter table public.message_likes replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.message_likes;
exception
  when duplicate_object then null;
  when undefined_object then null;
end
$$;

-- Private chat photo bucket. Path: {conversation_id}/{message_id}.ext
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "chat_attachments_select_member" on storage.objects;
create policy "chat_attachments_select_member"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and public.is_conversation_member(public.storage_path_group_id(name))
  );

drop policy if exists "chat_attachments_insert_member" on storage.objects;
create policy "chat_attachments_insert_member"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and public.is_conversation_member(public.storage_path_group_id(name))
  );

drop policy if exists "chat_attachments_delete_own_prefix" on storage.objects;
create policy "chat_attachments_delete_own_prefix"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'chat-attachments'
    and public.is_conversation_member(public.storage_path_group_id(name))
  );

-- Search username, first, last, or full name (UI says "name or email").
drop function if exists public.search_profiles_by_username(text, int);
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
  where p.user_id <> auth.uid()
    and length(trim(prefix)) >= 2
    and (
      (p.username is not null and lower(p.username::text) like lower(trim(prefix)) || '%')
      or lower(coalesce(p.first_name, '')) like '%' || lower(trim(prefix)) || '%'
      or lower(coalesce(p.last_name, '')) like '%' || lower(trim(prefix)) || '%'
      or lower(coalesce(p.display_name, '')) like '%' || lower(trim(prefix)) || '%'
      or lower(trim(both from concat_ws(' ', p.first_name, p.last_name)))
        like '%' || lower(trim(prefix)) || '%'
    )
  order by
    case
      when p.username is not null and lower(p.username::text) like lower(trim(prefix)) || '%' then 0
      else 1
    end,
    p.username asc nulls last
  limit greatest(1, least(coalesce(lim, 20), 50));
$$;

grant execute on function public.search_profiles_by_username(text, int) to authenticated;

-- Owner missing from group_members used to raise "not a group member" when inviting friends.
create or replace function public.add_friend_to_group(p_group_id uuid, p_friend_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_group_member(p_group_id) then
    insert into public.group_members (group_id, user_id, role)
    select g.id, auth.uid(), 'owner'
    from public.groups g
    where g.id = p_group_id and g.user_id = auth.uid()
    on conflict (group_id, user_id) do nothing;
  end if;

  if not public.is_group_member(p_group_id) then
    raise exception 'not a group member';
  end if;
  if p_friend_user_id = auth.uid() then
    raise exception 'cannot add self via friend invite';
  end if;
  if not exists (
    select 1 from public.friendships f
    where (f.user_a = auth.uid() and f.user_b = p_friend_user_id)
       or (f.user_a = p_friend_user_id and f.user_b = auth.uid())
  ) then
    raise exception 'not friends';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (p_group_id, p_friend_user_id, 'member')
  on conflict (group_id, user_id) do nothing;

  select coalesce(
    nullif(trim(both from concat_ws(' ', p.first_name, p.last_name)), ''),
    nullif(trim(p.display_name), ''),
    nullif(trim(p.username), ''),
    'Friend'
  ) into v_name
  from public.profiles p
  where p.user_id = p_friend_user_id;

  if v_name is null then
    v_name := 'Friend';
  end if;

  if not exists (
    select 1 from public.group_people gp
    where gp.group_id = p_group_id and gp.linked_user_id = p_friend_user_id
  ) then
    insert into public.group_people (id, group_id, name, linked_user_id)
    values (gen_random_uuid(), p_group_id, v_name, p_friend_user_id);
  end if;
end;
$$;
