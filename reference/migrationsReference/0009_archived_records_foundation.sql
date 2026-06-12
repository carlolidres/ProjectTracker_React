-- Archived Records foundation.
-- Adds record-level archive/restore metadata while keeping archive_status as the source of truth.

alter table public.cnf_records
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.profiles(id) on delete set null,
  add column if not exists archive_reason text,
  add column if not exists restored_at timestamptz,
  add column if not exists restored_by uuid references public.profiles(id) on delete set null,
  add column if not exists restore_reason text;

create index if not exists cnf_records_archived_at_idx on public.cnf_records(archived_at desc);
create index if not exists cnf_records_archived_by_idx on public.cnf_records(archived_by);
create index if not exists cnf_records_restored_at_idx on public.cnf_records(restored_at desc);
create index if not exists cnf_records_restored_by_idx on public.cnf_records(restored_by);
