-- How receipt tax interacts with line items: 'exclusive' (US-style add-on) vs 'inclusive' (VAT in prices).
alter table public.receipts
  add column if not exists tax_behavior text not null default 'exclusive';
