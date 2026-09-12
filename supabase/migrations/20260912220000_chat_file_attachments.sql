-- Chat documents (PDF, Office, text, zip) alongside existing photos.

alter table public.messages drop constraint if exists messages_type_check;
alter table public.messages drop constraint if exists messages_type_check1;
do $$
begin
  alter table public.messages
    add constraint messages_type_check check (type in ('text', 'payment', 'image', 'file'));
exception
  when duplicate_object then null;
end
$$;

update storage.buckets
set
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/rtf',
    'text/rtf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-zip-compressed'
  ]
where id = 'chat-attachments';
