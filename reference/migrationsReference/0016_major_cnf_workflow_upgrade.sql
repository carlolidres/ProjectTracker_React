-- Major CNF workflow upgrade.
-- Adds flattened final-child records, creator ownership enforcement, and audit-ready password reset requests.

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

create table if not exists public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  request_status text not null default 'pending',
  requested_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  constraint password_reset_requests_status_check
    check (request_status in ('pending', 'completed', 'rejected'))
);

create unique index if not exists password_reset_requests_one_pending_idx
  on public.password_reset_requests(user_id)
  where request_status = 'pending';

alter table public.password_reset_requests enable row level security;

create policy "Users can create their password reset request"
  on public.password_reset_requests
  for insert
  to authenticated
  with check (user_id = auth.uid() and lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create policy "Users can read their password reset requests"
  on public.password_reset_requests
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_active_admin());

create policy "Admins can update password reset requests"
  on public.password_reset_requests
  for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create or replace function public.request_password_reset(request_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  select id into target_user_id
  from public.profiles
  where lower(email) = lower(trim(request_email))
  limit 1;

  if target_user_id is not null then
    insert into public.password_reset_requests(user_id, email)
    values (target_user_id, lower(trim(request_email)))
    on conflict (user_id) where request_status = 'pending' do nothing;
  end if;
end;
$$;

revoke all on function public.request_password_reset(text) from public;
grant execute on function public.request_password_reset(text) to anon, authenticated;

create table if not exists public.cnf_final_child_records (
  id uuid primary key default gen_random_uuid(),
  cnf_record_id uuid not null references public.cnf_records(id) on delete cascade,
  section1_entry_id uuid not null default gen_random_uuid(),
  parent_key text not null,
  product_key text not null,
  sales_order_key text not null,
  unique_batch_key text not null,
  mo_batch_key text not null,
  po_control_key text not null,
  cnf_reference text not null,
  change_description text not null default 'n/a',
  cnf_status_text text not null default 'Internal Routing',
  updated_docs_ver text not null default 'n/a',
  remarks text not null default 'n/a',
  parent_status text not null default 'active',
  parent_status_reason text not null default 'n/a',
  client_name text not null default 'n/a',
  product_name text not null default 'n/a',
  product_code text not null default 'n/a',
  product_status text not null default 'active',
  product_status_reason text not null default 'n/a',
  so_no text not null default 'n/a',
  fg_code text not null default 'n/a',
  order_quantity numeric(14, 3),
  uom text not null default 'n/a',
  product_version text not null default 'n/a',
  fg_delivery_due_date date,
  sales_order_status text not null default 'active',
  sales_order_status_reason text not null default 'n/a',
  unique_batch_no text not null default 'n/a',
  unique_batch_status text not null default 'active',
  unique_batch_status_reason text not null default 'n/a',
  mo_batch_no text not null default 'n/a',
  mo_batch_status text not null default 'active',
  mo_batch_status_reason text not null default 'n/a',
  po_control_no text not null default 'n/a',
  po_control_status text not null default 'active',
  po_control_status_reason text not null default 'n/a',
  record_status text not null default 'active',
  record_status_reason text not null default 'n/a',
  batch_study_classification text not null default 'n/a',
  stability_required boolean,
  target_manufacturing_date date,
  mo_bmr_po_submission_status text not null default 'n/a',
  mo_bmr_po_submission_actual_date date,
  mo_bmr_po_submission_commitment_date date,
  mo_bmr_po_activation_status text not null default 'n/a',
  mo_bmr_po_activation_actual_date date,
  mo_bmr_po_activation_commitment_date date,
  qrmr_no text not null default 'n/a',
  protocol_no text not null default 'n/a',
  protocol_status text not null default 'n/a',
  protocol_actual_completion_date date,
  protocol_commitment_date date,
  validation_strategy text not null default 'n/a',
  validation_strategy_justification text not null default 'n/a',
  report_no text not null default 'n/a',
  report_type text not null default 'n/a',
  report_status text not null default 'n/a',
  report_submission_status text not null default 'n/a',
  report_submission_actual_date date,
  report_submission_commitment_date date,
  full_report_no text not null default 'n/a',
  linked_interim_report_nos text[] not null default '{}',
  extension_delay_history jsonb not null default '[]'::jsonb,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint cnf_final_child_path_unique unique
    (cnf_record_id, parent_key, product_key, sales_order_key, unique_batch_key, mo_batch_key, po_control_key),
  constraint cnf_final_child_status_checks check (
    parent_status in ('active', 'inactive')
    and product_status in ('active', 'inactive')
    and sales_order_status in ('active', 'inactive')
    and unique_batch_status in ('active', 'inactive')
    and mo_batch_status in ('active', 'inactive')
    and po_control_status in ('active', 'inactive')
    and record_status in ('active', 'inactive')
  ),
  constraint cnf_final_child_classification_check
    check (batch_study_classification in ('n/a', 'VAL', 'VER', 'CHAR', 'TRIAL', 'Commercial')),
  constraint cnf_final_child_report_type_check
    check (report_type in ('n/a', 'Interim Report', 'Full Report', 'Endorsement Report'))
);

create index if not exists cnf_final_child_record_idx on public.cnf_final_child_records(cnf_record_id);
create index if not exists cnf_final_child_reference_idx on public.cnf_final_child_records(cnf_reference);
create index if not exists cnf_final_child_due_idx on public.cnf_final_child_records(fg_delivery_due_date);
create index if not exists cnf_final_child_owner_workflow_idx
  on public.cnf_final_child_records(target_manufacturing_date, protocol_commitment_date, report_submission_commitment_date);
create unique index if not exists cnf_final_child_one_endorsement_per_full_idx
  on public.cnf_final_child_records(cnf_record_id, full_report_no)
  where report_type = 'Endorsement Report' and full_report_no <> 'n/a' and record_status = 'active';

alter table public.cnf_final_child_records enable row level security;

create policy "Active users can read permitted final child records"
  on public.cnf_final_child_records
  for select
  to authenticated
  using (public.can_read_cnf_record(cnf_record_id));

create policy "Role owners can create final child records"
  on public.cnf_final_child_records
  for insert
  to authenticated
  with check (
    public.can_update_cnf_record(cnf_record_id)
    and created_by = auth.uid()
    and updated_by = auth.uid()
  );

create policy "Role owners can update final child records"
  on public.cnf_final_child_records
  for update
  to authenticated
  using (public.can_update_cnf_record(cnf_record_id))
  with check (public.can_update_cnf_record(cnf_record_id));

create or replace function public.set_cnf_creator_as_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by = auth.uid();
    new.updated_by = auth.uid();
    new.current_owner_user_id = auth.uid();
    new.current_owner_role = public.current_active_role()::public.cnf_owner_role_enum;
  end if;
  return new;
end;
$$;

drop trigger if exists set_cnf_creator_as_owner on public.cnf_records;
create trigger set_cnf_creator_as_owner
  before insert on public.cnf_records
  for each row
  execute function public.set_cnf_creator_as_owner();

create or replace function public.set_final_child_audit_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by = auth.uid();
    new.updated_by = auth.uid();
  else
    new.updated_by = auth.uid();
    new.updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists set_final_child_audit_fields on public.cnf_final_child_records;
create trigger set_final_child_audit_fields
  before insert or update on public.cnf_final_child_records
  for each row
  execute function public.set_final_child_audit_fields();

create or replace function public.enforce_qrmr_per_cnf()
returns trigger
language plpgsql
as $$
declare
  existing_qrmr text;
begin
  if new.qrmr_no = 'n/a' then
    return new;
  end if;

  select qrmr_no into existing_qrmr
  from public.cnf_final_child_records
  where cnf_record_id = new.cnf_record_id
    and qrmr_no <> 'n/a'
    and id <> new.id
  limit 1;

  if existing_qrmr is not null and existing_qrmr <> new.qrmr_no then
    raise exception 'One CNF Number can have only one QRMR No.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_qrmr_per_cnf on public.cnf_final_child_records;
create trigger enforce_qrmr_per_cnf
  before insert or update of qrmr_no on public.cnf_final_child_records
  for each row
  execute function public.enforce_qrmr_per_cnf();

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
        and child.report_type = 'Full Report'
        and lower(child.report_status) = 'done'
    ) then
      raise exception 'CNF closure requires a Full Report in Done status.';
    end if;
    if not exists (
      select 1 from public.cnf_final_child_records child
      where child.cnf_record_id = new.id
        and child.record_status = 'active'
        and child.report_type = 'Endorsement Report'
        and lower(child.report_status) = 'done'
    ) then
      raise exception 'CNF closure requires an Endorsement Report in Done status.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_cnf_report_closure on public.cnf_records;
create trigger enforce_cnf_report_closure
  before update of overall_status on public.cnf_records
  for each row
  execute function public.enforce_cnf_report_closure();

alter table public.auth_activity_log
  drop constraint if exists auth_activity_log_event_type_check,
  add constraint auth_activity_log_event_type_check
    check (event_type in (
      'sign_up_created', 'login_success', 'failed_login', 'status_check', 'sign_out',
      'user_activated', 'user_deactivated', 'user_reactivated', 'user_role_changed',
      'user_department_changed', 'user_profile_updated', 'permission_changed',
      'password_reset_requested', 'password_reset_completed', 'password_changed',
      'cnf_created', 'cnf_updated', 'cnf_archived', 'cnf_restored',
      'section1_entry_created', 'cnf_parent_added', 'cnf_product_added',
      'cnf_sales_order_added', 'cnf_unique_batch_added', 'cnf_mo_batch_added',
      'cnf_po_control_added', 'cnf_final_child_created', 'cnf_final_child_updated',
      'cnf_hierarchy_status_changed', 'cnf_linked_field_synced',
      'notification_created', 'notification_read', 'notification_unread',
      'notification_all_read', 'report_exported', 'target_date_missed',
      'target_date_revised', 'missed_target_reason_encoded', 'lesson_learned_added',
      'kpi_recalculated'
    ));

grant select, insert, update on public.cnf_final_child_records to authenticated;
grant select, insert, update on public.password_reset_requests to authenticated;
