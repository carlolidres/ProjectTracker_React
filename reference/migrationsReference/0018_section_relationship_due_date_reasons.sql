-- Refine the final-child workflow for the approved Section 1-4 relationship.

alter table public.cnf_final_child_records
  add column if not exists actual_fg_delivery_date date,
  add column if not exists batch_study_sequence text not null default 'n/a',
  add column if not exists validation_strategy_next_process_step text not null default 'n/a',
  add column if not exists validation_strategy_next_batch text not null default 'n/a',
  add column if not exists interim_report_no text not null default 'n/a',
  add column if not exists interim_report_status text not null default 'n/a',
  add column if not exists full_report_status text not null default 'n/a',
  add column if not exists endorsement_report_no text not null default 'n/a',
  add column if not exists endorsement_report_status text not null default 'n/a';

alter table public.lessons_learned
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.cnf_final_child_records
  drop constraint if exists cnf_final_child_classification_check,
  add constraint cnf_final_child_classification_check
    check (batch_study_classification in ('n/a', 'VAL', 'VER', 'CHAR', 'TRIAL', 'Commercial', 'OTHERS')),
  add constraint cnf_final_child_batch_sequence_check
    check (batch_study_sequence in ('n/a', '1st Batch', '2nd Batch', '3rd Batch', 'Other')),
  add constraint cnf_final_child_interim_status_check
    check (interim_report_status in ('n/a', 'In Process', 'Internal Routing', 'Client Approval', 'Done', 'Cancelled', 'Not Applicable')),
  add constraint cnf_final_child_full_status_check
    check (full_report_status in ('n/a', 'In Process', 'Internal Routing', 'Client Approval', 'Done', 'Cancelled')),
  add constraint cnf_final_child_endorsement_status_check
    check (endorsement_report_status in ('n/a', 'In Process', 'Internal Routing', 'Client Approval', 'Done', 'Cancelled'));

create index if not exists cnf_final_child_actual_delivery_idx
  on public.cnf_final_child_records(actual_fg_delivery_date);

create or replace function public.enforce_cnf_report_closure()
returns trigger
language plpgsql
as $$
begin
  if new.overall_status = 'closed' and old.overall_status is distinct from 'closed' then
    if not exists (
      select 1 from public.cnf_final_child_records child
      where child.cnf_record_id = new.id
        and child.record_status = 'active'
        and lower(child.full_report_status) = 'done'
    ) then
      raise exception 'CNF closure requires a Full Report in Done status.';
    end if;
    if not exists (
      select 1 from public.cnf_final_child_records child
      where child.cnf_record_id = new.id
        and child.record_status = 'active'
        and lower(child.endorsement_report_status) = 'done'
    ) then
      raise exception 'CNF closure requires an Endorsement Report in Done status.';
    end if;
  end if;
  return new;
end;
$$;

grant select, insert, update on public.cnf_final_child_records to authenticated;
grant select, insert on public.lessons_learned to authenticated;
