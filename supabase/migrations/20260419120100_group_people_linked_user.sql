-- Optional link from group_people row to an app user (friend)
alter table public.group_people
  add column if not exists linked_user_id uuid references auth.users (id) on delete set null;

create index if not exists group_people_linked_user_idx on public.group_people (linked_user_id)
  where linked_user_id is not null;
