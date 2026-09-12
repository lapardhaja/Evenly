-- Account deletion + durable API rate limits.
-- receipt_attachments.uploaded_by had no ON DELETE, so auth.users delete would fail.

alter table public.receipt_attachments
  alter column uploaded_by drop not null;

do $$
declare
  v_con text;
begin
  select c.conname into v_con
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'receipt_attachments'
    and c.contype = 'f'
    and pg_get_constraintdef(c.oid) ilike '%uploaded_by%';
  if v_con is not null then
    execute format('alter table public.receipt_attachments drop constraint %I', v_con);
  end if;
end
$$;

alter table public.receipt_attachments
  add constraint receipt_attachments_uploaded_by_fkey
  foreign key (uploaded_by) references auth.users (id) on delete set null;

create table if not exists public.api_rate_events (
  bucket text not null,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists api_rate_events_lookup_idx
  on public.api_rate_events (bucket, ip_hash, created_at);

alter table public.api_rate_events enable row level security;

create or replace function public.consume_rate_limit(
  p_bucket text,
  p_ip_hash text,
  p_window_seconds integer,
  p_max integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_oldest timestamptz;
  v_retry integer;
begin
  if p_bucket is null or p_ip_hash is null or p_window_seconds < 1 or p_max < 1 then
    return jsonb_build_object('ok', false, 'retry_after_sec', 60);
  end if;
  if char_length(p_bucket) > 64 or char_length(p_ip_hash) > 64 then
    return jsonb_build_object('ok', false, 'retry_after_sec', 60);
  end if;

  delete from public.api_rate_events
  where bucket = p_bucket
    and ip_hash = p_ip_hash
    and created_at < now() - make_interval(secs => p_window_seconds);

  delete from public.api_rate_events
  where created_at < now() - interval '2 hours';

  select count(*)::integer, min(created_at)
    into v_count, v_oldest
  from public.api_rate_events
  where bucket = p_bucket and ip_hash = p_ip_hash;

  if v_count >= p_max then
    v_retry := greatest(
      1,
      ceil(extract(epoch from (v_oldest + make_interval(secs => p_window_seconds) - now())))::integer
    );
    return jsonb_build_object('ok', false, 'retry_after_sec', v_retry);
  end if;

  insert into public.api_rate_events (bucket, ip_hash) values (p_bucket, p_ip_hash);
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on table public.api_rate_events from anon;
revoke all on table public.api_rate_events from authenticated;
grant all on table public.api_rate_events to service_role;

revoke all on function public.consume_rate_limit(text, text, integer, integer) from public;
revoke all on function public.consume_rate_limit(text, text, integer, integer) from anon;
revoke all on function public.consume_rate_limit(text, text, integer, integer) from authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;
