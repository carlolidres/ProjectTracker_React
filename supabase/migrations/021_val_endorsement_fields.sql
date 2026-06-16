-- Validation interim, full validation report, and endorsement fields on cnf_projects.

alter table public.cnf_projects
  add column if not exists val_interim_report_no text default 'N/A',
  add column if not exists val_interim_report_status text default 'N/A',
  add column if not exists val_interim_report_target_date text default 'N/A',
  add column if not exists validation_report_no text default 'N/A',
  add column if not exists validation_report_status text default 'N/A',
  add column if not exists validation_report_target_date text default 'N/A',
  add column if not exists endorsement_report_no text default 'N/A',
  add column if not exists endorsement_report_status text default 'N/A',
  add column if not exists endorsement_acceptance_target_date text default 'N/A';

-- Backfill from legacy columns where present.
update public.cnf_projects
set
  validation_report_no = coalesce(nullif(trim(val_report_no), ''), validation_report_no, 'N/A'),
  validation_report_status = case
    when trim(coalesce(report_sub_status, '')) ilike 'client approval' then 'Routing'
    when trim(coalesce(report_sub_status, '')) in ('', 'N/A', 'n/a') then coalesce(validation_report_status, 'N/A')
    else coalesce(report_sub_status, validation_report_status, 'N/A')
  end,
  validation_report_target_date = coalesce(nullif(trim(report_target_date), ''), validation_report_target_date, 'N/A')
where is_active = true;
