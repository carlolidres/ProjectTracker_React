-- Admin API Management, missing-field notifications, and CNF parent/child RLS stabilization.

create extension if not exists pgcrypto;

alter table public.cnf_records
  alter column id set default gen_random_uuid(),
  alter column archive_status set default 'active',
  alter column overall_status set default 'open',
  alter column created_at set default now(),
  alter column updated_at set default now();

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'active'
      and role in ('Admin', 'AM', 'BM', 'NB', 'PL', 'PP', 'TSD', 'VAL')
  );
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and status = 'active'
    and role in ('Admin', 'AM', 'BM', 'NB', 'PL', 'PP', 'TSD', 'VAL')
  limit 1;
$$;

create or replace function public.has_creator_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('Admin', 'AM', 'BM', 'NB', 'PL');
$$;

create or replace function public.current_user_is_active()
returns boolean language sql stable security definer set search_path = public
as $$ select public.is_active_user(); $$;

create or replace function public.current_active_role()
returns text language sql stable security definer set search_path = public
as $$ select public.current_user_role(); $$;

create or replace function public.is_active_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select public.current_user_role() = 'Admin'; $$;

create or replace function public.can_create_cnf_record()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_creator_role()
    and exists (
      select 1
      from public.role_permissions
      where role = public.current_user_role()
        and permission_key = 'cnf.create'
        and is_allowed
    );
$$;

create or replace function public.can_read_cnf_record(record_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cnf_records record
    where record.id = record_id
      and (
        public.is_active_admin()
        or (public.is_active_user() and record.archive_status = 'active')
      )
  );
$$;

create or replace function public.can_update_cnf_record(record_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cnf_records record
    where record.id = record_id
      and (
        public.is_active_admin()
        or (
          public.is_active_user()
          and record.archive_status = 'active'
          and public.current_user_role() in ('AM', 'BM', 'NB', 'PL', 'PP', 'TSD', 'VAL')
        )
      )
  );
$$;

create or replace function public.set_cnf_creator_as_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_creator_role() then
    raise exception 'Only active Admin, AM, BM, NB, and PL users can create CNF records.';
  end if;
  new.id = coalesce(new.id, gen_random_uuid());
  new.created_by = auth.uid();
  new.updated_by = auth.uid();
  new.current_owner_user_id = auth.uid();
  new.current_owner_role = public.current_user_role()::public.cnf_owner_role_enum;
  new.archive_status = coalesce(new.archive_status, 'active');
  new.overall_status = coalesce(new.overall_status, 'open');
  new.created_at = coalesce(new.created_at, now());
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_cnf_creator_as_owner on public.cnf_records;
create trigger set_cnf_creator_as_owner
  before insert on public.cnf_records
  for each row execute function public.set_cnf_creator_as_owner();

grant usage on schema public to authenticated;
grant select, insert, update on public.cnf_records to authenticated;
grant select, insert, update on public.cnf_batches to authenticated;
grant select, insert, update on public.cnf_final_child_records to authenticated;
revoke all on public.cnf_records, public.cnf_batches, public.cnf_final_child_records from anon;

alter table public.cnf_records enable row level security;
alter table public.cnf_batches enable row level security;
alter table public.cnf_final_child_records enable row level security;

drop policy if exists "Active admins can read all CNF records" on public.cnf_records;
drop policy if exists "Active users can read relevant CNF records" on public.cnf_records;
drop policy if exists "Creator roles can create CNF records" on public.cnf_records;
drop policy if exists "Role owners can update CNF records" on public.cnf_records;

create policy "Active admins can read all CNF records"
  on public.cnf_records for select to authenticated
  using (public.is_active_admin());
create policy "Active users can read active CNF records"
  on public.cnf_records for select to authenticated
  using (public.is_active_user() and archive_status = 'active');
create policy "Creator roles can create CNF records"
  on public.cnf_records for insert to authenticated
  with check (
    public.has_creator_role()
    and created_by = auth.uid()
    and updated_by = auth.uid()
    and current_owner_user_id = auth.uid()
    and current_owner_role::text = public.current_user_role()
    and archive_status = 'active'
  );
create policy "Active workflow roles can update active CNF records"
  on public.cnf_records for update to authenticated
  using (public.can_update_cnf_record(id))
  with check (public.can_update_cnf_record(id));

drop policy if exists "Active admins can read all CNF batches" on public.cnf_batches;
drop policy if exists "Active users can read relevant CNF batches" on public.cnf_batches;
drop policy if exists "Role owners can create CNF batches" on public.cnf_batches;
drop policy if exists "Role owners can update CNF batches" on public.cnf_batches;
create policy "Active users can read permitted CNF batches"
  on public.cnf_batches for select to authenticated
  using (public.can_read_cnf_record(cnf_record_id));
create policy "Active workflow roles can create CNF batches"
  on public.cnf_batches for insert to authenticated
  with check (public.can_update_cnf_record(cnf_record_id));
create policy "Active workflow roles can update CNF batches"
  on public.cnf_batches for update to authenticated
  using (public.can_update_cnf_record(cnf_record_id))
  with check (public.can_update_cnf_record(cnf_record_id));

drop policy if exists "Active users can read permitted final child records" on public.cnf_final_child_records;
drop policy if exists "Role owners can create final child records" on public.cnf_final_child_records;
drop policy if exists "Role owners can update final child records" on public.cnf_final_child_records;
create policy "Active users can read permitted final child records"
  on public.cnf_final_child_records for select to authenticated
  using (public.can_read_cnf_record(cnf_record_id));
create policy "Active workflow roles can create final child records"
  on public.cnf_final_child_records for insert to authenticated
  with check (
    public.can_update_cnf_record(cnf_record_id)
    and created_by = auth.uid()
    and updated_by = auth.uid()
  );
create policy "Active workflow roles can update final child records"
  on public.cnf_final_child_records for update to authenticated
  using (public.can_update_cnf_record(cnf_record_id))
  with check (public.can_update_cnf_record(cnf_record_id));

create table if not exists public.api_integrations (
  id uuid primary key default gen_random_uuid(),
  integration_key text not null unique,
  display_name text not null,
  is_enabled boolean not null default false,
  supabase_project_url text,
  supabase_anon_key_configured boolean not null default false,
  openai_secret_configured boolean not null default false,
  edge_function_name text,
  last_test_status text,
  last_tested_at timestamptz,
  configured_by uuid references public.profiles(id) on delete set null,
  configured_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint api_integrations_project_url_check
    check (supabase_project_url is null or supabase_project_url like 'https://%')
);

drop trigger if exists set_api_integrations_updated_at on public.api_integrations;
create trigger set_api_integrations_updated_at
  before update on public.api_integrations
  for each row execute function public.set_updated_at();

alter table public.api_integrations enable row level security;
drop policy if exists "Active admins can manage API integrations" on public.api_integrations;
drop policy if exists "Active users can read enabled API status" on public.api_integrations;
create policy "Active admins can manage API integrations"
  on public.api_integrations for all to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());
create policy "Active users can read enabled API status"
  on public.api_integrations for select to authenticated
  using (public.is_active_user() and is_enabled);
grant select, insert, update on public.api_integrations to authenticated;
revoke all on public.api_integrations from anon;

alter table public.notifications
  add column if not exists dedupe_key text,
  add column if not exists resolved_at timestamptz;
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (notification_type in (
    'fg_due_date', 'target_manufacturing_date', 'mo_bmr_po_submission_target',
    'mo_bmr_po_activation_target', 'protocol_availability_target',
    'report_submission_target', 'missing_field', 'cnf_record_updated',
    'cnf_record_archived', 'cnf_record_restored'
  ));
create unique index if not exists notifications_dedupe_key_idx
  on public.notifications(responsible_user_id, dedupe_key)
  where dedupe_key is not null;

alter table public.auth_activity_log drop constraint if exists auth_activity_log_event_type_check;
alter table public.auth_activity_log add constraint auth_activity_log_event_type_check
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
    'so_details_copied_from_first_cnf', 'updated_docs_ver_changed',
    'role_owned_field_completed', 'role_owned_field_changed',
    'notification_created', 'notification_read', 'notification_unread',
    'notification_all_read', 'missing_field_notification_generated',
    'missing_field_resolved', 'report_exported', 'target_date_missed',
    'target_date_revised', 'missed_target_reason_encoded', 'lesson_learned_added',
    'kpi_recalculated', 'api_management_opened', 'api_activation_attempted',
    'api_activation_succeeded', 'api_activation_failed', 'api_connection_tested',
    'api_connection_test_failed', 'api_integration_toggled'
  ));

revoke all on function public.is_active_user() from public, anon;
revoke all on function public.current_user_role() from public, anon;
revoke all on function public.has_creator_role() from public, anon;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.has_creator_role() to authenticated;
