-- CNF Form workflow fields for PP and TSD sections.
-- Adds form-backed target/status fields without implementing field-level RLS enforcement yet.

alter table public.cnf_records
  add column if not exists target_manufacturing_date date,
  add column if not exists mo_bmr_po_submission_status text,
  add column if not exists mo_bmr_po_submission_target_date date,
  add column if not exists mo_bmr_po_activation_status text,
  add column if not exists mo_bmr_po_activation_target_date date;

alter table public.cnf_records
  drop constraint if exists cnf_records_mo_bmr_po_submission_status_check,
  add constraint cnf_records_mo_bmr_po_submission_status_check
    check (mo_bmr_po_submission_status is null or mo_bmr_po_submission_status in ('Yes', 'No'));

alter table public.cnf_records
  drop constraint if exists cnf_records_mo_bmr_po_activation_status_check,
  add constraint cnf_records_mo_bmr_po_activation_status_check
    check (mo_bmr_po_activation_status is null or mo_bmr_po_activation_status in ('Yes', 'No'));

create index if not exists cnf_records_target_manufacturing_date_idx
  on public.cnf_records(target_manufacturing_date);

create index if not exists cnf_records_mo_bmr_po_submission_status_idx
  on public.cnf_records(mo_bmr_po_submission_status);

create index if not exists cnf_records_mo_bmr_po_activation_status_idx
  on public.cnf_records(mo_bmr_po_activation_status);
