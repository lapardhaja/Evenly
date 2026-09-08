-- receipt_attachments table + private Storage bucket. Run after group_members migration.

create table if not exists public.receipt_attachments (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null,
  file_name text not null,
  byte_size int not null check (byte_size > 0 and byte_size <= 10485760),
  uploaded_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists receipt_attachments_receipt_id_idx
  on public.receipt_attachments (receipt_id);

alter table public.receipt_attachments enable row level security;

drop policy if exists "receipt_attachments_select" on public.receipt_attachments;
create policy "receipt_attachments_select" on public.receipt_attachments
  for select using (public.is_group_member(group_id));
drop policy if exists "receipt_attachments_insert" on public.receipt_attachments;
create policy "receipt_attachments_insert" on public.receipt_attachments
  for insert with check (
    public.is_group_member(group_id)
    and uploaded_by = auth.uid()
    and exists (select 1 from public.receipts r where r.id = receipt_id and r.group_id = group_id)
  );
drop policy if exists "receipt_attachments_delete" on public.receipt_attachments;
create policy "receipt_attachments_delete" on public.receipt_attachments
  for delete using (public.is_group_member(group_id));

-- Storage bucket (run in SQL editor; ignore if dashboard-created)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipt-attachments',
  'receipt-attachments',
  false,
  10485760,
  array[
    'image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "receipt_attachments_storage_select" on storage.objects;
create policy "receipt_attachments_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipt-attachments'
    and public.is_group_member((split_part(name, '/', 1))::uuid)
  );

drop policy if exists "receipt_attachments_storage_insert" on storage.objects;
create policy "receipt_attachments_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipt-attachments'
    and public.is_group_member((split_part(name, '/', 1))::uuid)
  );

drop policy if exists "receipt_attachments_storage_delete" on storage.objects;
create policy "receipt_attachments_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'receipt-attachments'
    and public.is_group_member((split_part(name, '/', 1))::uuid)
  );
