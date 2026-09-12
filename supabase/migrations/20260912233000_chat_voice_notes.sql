-- Voice notes in chat (Instagram-style mic).

alter table public.messages drop constraint if exists messages_type_check;
alter table public.messages drop constraint if exists messages_type_check1;
do $$
begin
  alter table public.messages
    add constraint messages_type_check check (type in ('text', 'payment', 'image', 'file', 'audio'));
exception
  when duplicate_object then null;
end
$$;

update storage.buckets
set
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
    'application/x-zip-compressed',
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/ogg',
    'audio/aac',
    'audio/wav'
  ]
where id = 'chat-attachments';
