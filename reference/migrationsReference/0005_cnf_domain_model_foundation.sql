-- CNF Tracker domain model, database architecture, and RLS foundation.
-- This migration intentionally prepares records, batches, ownership, archive behavior, and RLS helpers only.

do $$
begin
  create type public.cnf_status_enum as enum ('Internal Routing', 'For Client Approval', 'Others');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.cnf_classification_enum as enum ('VAL', 'VER', 'STAB', 'COMML');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.validation_strategy_enum as enum ('Prospective', 'Concurrent', 'Other');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.archive_status_enum as enum ('active', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.overall_status_enum as enum ('open', 'in_progress', 'completed', 'closed', 'overdue');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.cnf_owner_role_enum as enum ('Admin', 'AM', 'BM', 'NB', 'PL', 'PP', 'TSD', 'VAL');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.user_status_enum as enum ('pending', 'active', 'inactive');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.cnf_records (
  id uuid primary key default gen_random_uuid(),
  cnf_reference text not null,
  client_name text not null,
  so_no text,
  fg_code text,
  product text not null,
  batch_no text not null,
  unique_batch boolean not null default false,
  order_quantity numeric(14, 3),
  uom text,
  product_version text,
  fg_delivery_due_date date,
  change_description text not null,
  cnf_status public.cnf_status_enum not null default 'Internal Routing',
  specific_cnf_status text,
  updated_docs_ver text not null,
  remarks text,
  current_owner_role public.cnf_owner_role_enum not null,
  current_owner_user_id uuid references public.profiles(id) on delete set null,
  overall_status public.overall_status_enum not null default 'open',
  archive_status public.archive_status_enum not null default 'active',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint cnf_records_reference_batch_unique unique (cnf_reference, batch_no),
  constraint cnf_records_order_quantity_check check (order_quantity is null or order_quantity >= 0)
);

create table if not exists public.cnf_batches (
  id uuid primary key default gen_random_uuid(),
  cnf_record_id uuid not null references public.cnf_records(id) on delete cascade,
  batch_sequence integer not null,
  batch_type public.cnf_classification_enum not null,
  stability_required boolean not null default false,
  protocol_status text,
  protocol_target_date date,
  report_submission_status text,
  report_target_date date,
  validation_strategy public.validation_strategy_enum,
  strategy_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cnf_batches_record_sequence_unique unique (cnf_record_id, batch_sequence),
  constraint cnf_batches_batch_sequence_check check (batch_sequence > 0)
);

create index if not exists cnf_records_cnf_reference_idx on public.cnf_records(cnf_reference);
create index if not exists cnf_records_client_name_idx on public.cnf_records(client_name);
create index if not exists cnf_records_product_idx on public.cnf_records(product);
create index if not exists cnf_records_batch_no_idx on public.cnf_records(batch_no);
create index if not exists cnf_records_cnf_status_idx on public.cnf_records(cnf_status);
create index if not exists cnf_records_owner_role_idx on public.cnf_records(current_owner_role);
create index if not exists cnf_records_owner_user_idx on public.cnf_records(current_owner_user_id);
create index if not exists cnf_records_overall_status_idx on public.cnf_records(overall_status);
create index if not exists cnf_records_archive_status_idx on public.cnf_records(archive_status);
create index if not exists cnf_records_due_date_idx on public.cnf_records(fg_delivery_due_date);
create index if not exists cnf_records_created_by_idx on public.cnf_records(created_by);
create index if not exists cnf_batches_record_id_idx on public.cnf_batches(cnf_record_id);
create index if not exists cnf_batches_batch_type_idx on public.cnf_batches(batch_type);

create or replace function public.current_active_role()
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
  limit 1;
$$;

create or replace function public.current_user_is_active()
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
  );
$$;

create or replace function public.can_create_cnf_record()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_active_role() in ('Admin', 'AM', 'BM', 'NB', 'PL');
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
        or (
          public.current_user_is_active()
          and record.archive_status = 'active'
          and (
            record.created_by = auth.uid()
            or record.current_owner_user_id = auth.uid()
            or record.current_owner_role::text = public.current_active_role()
          )
        )
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
          public.current_user_is_active()
          and record.archive_status = 'active'
          and public.current_active_role() in ('AM', 'BM', 'NB', 'PL', 'PP', 'TSD', 'VAL')
          and (
            record.created_by = auth.uid()
            or record.current_owner_user_id = auth.uid()
            or record.current_owner_role::text = public.current_active_role()
          )
        )
      )
  );
$$;

create or replace function public.set_cnf_record_audit_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by = coalesce(new.created_by, auth.uid());
    new.updated_by = coalesce(new.updated_by, auth.uid());
    new.created_at = coalesce(new.created_at, now());
    new.updated_at = coalesce(new.updated_at, now());
  elsif tg_op = 'UPDATE' then
    new.updated_by = auth.uid();
    new.updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists set_cnf_records_audit_fields on public.cnf_records;
create trigger set_cnf_records_audit_fields
  before insert or update on public.cnf_records
  for each row
  execute function public.set_cnf_record_audit_fields();

drop trigger if exists set_cnf_batches_updated_at on public.cnf_batches;
create trigger set_cnf_batches_updated_at
  before update on public.cnf_batches
  for each row
  execute function public.set_updated_at();

alter table public.cnf_records enable row level security;
alter table public.cnf_batches enable row level security;

drop policy if exists "Active admins can read all CNF records" on public.cnf_records;
drop policy if exists "Active users can read relevant CNF records" on public.cnf_records;
drop policy if exists "Creator roles can create CNF records" on public.cnf_records;
drop policy if exists "Role owners can update CNF records" on public.cnf_records;
drop policy if exists "Active admins can read all CNF batches" on public.cnf_batches;
drop policy if exists "Active users can read relevant CNF batches" on public.cnf_batches;
drop policy if exists "Role owners can create CNF batches" on public.cnf_batches;
drop policy if exists "Role owners can update CNF batches" on public.cnf_batches;

create policy "Active admins can read all CNF records"
  on public.cnf_records
  for select
  to authenticated
  using (public.is_active_admin());

create policy "Active users can read relevant CNF records"
  on public.cnf_records
  for select
  to authenticated
  using (public.can_read_cnf_record(id));

create policy "Creator roles can create CNF records"
  on public.cnf_records
  for insert
  to authenticated
  with check (
    public.can_create_cnf_record()
    and created_by = auth.uid()
    and archive_status = 'active'
  );

create policy "Role owners can update CNF records"
  on public.cnf_records
  for update
  to authenticated
  using (public.can_update_cnf_record(id))
  with check (public.can_update_cnf_record(id));

create policy "Active admins can read all CNF batches"
  on public.cnf_batches
  for select
  to authenticated
  using (public.is_active_admin());

create policy "Active users can read relevant CNF batches"
  on public.cnf_batches
  for select
  to authenticated
  using (public.can_read_cnf_record(cnf_record_id));

create policy "Role owners can create CNF batches"
  on public.cnf_batches
  for insert
  to authenticated
  with check (public.can_update_cnf_record(cnf_record_id));

create policy "Role owners can update CNF batches"
  on public.cnf_batches
  for update
  to authenticated
  using (public.can_update_cnf_record(cnf_record_id))
  with check (public.can_update_cnf_record(cnf_record_id));

alter table public.auth_activity_log
  drop constraint if exists auth_activity_log_event_type_check,
  add constraint auth_activity_log_event_type_check
    check (
      event_type in (
        'sign_up_created',
        'login_success',
        'failed_login',
        'status_check',
        'sign_out',
        'user_activated',
        'user_deactivated',
        'user_reactivated',
        'user_role_changed',
        'user_department_changed',
        'user_profile_updated',
        'cnf_created',
        'cnf_updated',
        'cnf_archived',
        'cnf_restored'
      )
    );
