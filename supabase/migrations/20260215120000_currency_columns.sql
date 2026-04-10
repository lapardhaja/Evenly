-- Optional: display currency per group + receipt currency (ISO 4217)
alter table public.groups
  add column if not exists display_currency text not null default 'USD';

alter table public.receipts
  add column if not exists currency_code text not null default 'USD';
