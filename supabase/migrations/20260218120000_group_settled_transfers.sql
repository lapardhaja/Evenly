-- Persist "marked settled" transfer keys per group (Settle tab checkboxes).
alter table public.groups
  add column if not exists settled_transfers jsonb not null default '[]'::jsonb;

comment on column public.groups.settled_transfers is 'JSON array of strings: fromPersonId<TAB>toPersonId for each marked Settle transfer (amount not stored — stable across FX rounding)';
