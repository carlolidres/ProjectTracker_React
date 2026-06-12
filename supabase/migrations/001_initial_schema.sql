-- Project Tracker initial schema (mapped from legacy Google Sheets headers)

create type public.user_role as enum (
  'am_bm_pl', 'pp', 'tsd', 'val', 'qc', 'admin', 'view'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role public.user_role not null default 'view',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cnf_projects (
  record_id text primary key,
  project_id text not null,
  project_owner text default 'N/A',
  activity_type text default 'N/A',
  client_name text default 'N/A',
  so_no text default 'N/A',
  fg_code text default 'N/A',
  product_name text default 'N/A',
  batch_instance_id text default 'N/A',
  unique_batch text default 'N/A',
  mo_instance_id text default 'N/A',
  mo_control_no text default 'N/A',
  po_instance_id text default 'N/A',
  po_control_no text default 'N/A',
  fg_month text default 'N/A',
  business_unit text default 'N/A',
  updateddocsver text default 'N/A',
  cnf_reference text default 'N/A',
  qrmr_ref_no text default 'N/A',
  change_description text default 'N/A',
  cnf_status text default 'N/A',
  client_approval_target_date text default 'N/A',
  remarks text default 'N/A',
  cnf_entries_json text default '[]',
  manufacturing_start_week text default 'N/A',
  mo_bmr_po_submission_status text default 'N/A',
  mo_bmr_po_target_date text default 'N/A',
  mo_bmr_po_activation_status text default 'N/A',
  mo_bmr_po_activation_date text default 'N/A',
  protocol_no text default 'N/A',
  protocol_status text default 'N/A',
  protocol_target_date text default 'N/A',
  val_activity text default 'N/A',
  val_stability text default 'N/A',
  val_batch_seq_no text default 'N/A',
  val_strategy text default 'N/A',
  val_strategy_remarks text default 'N/A',
  val_report_no text default 'N/A',
  report_sub_status text default 'N/A',
  report_target_date text default 'N/A',
  ar_availability_date text default 'N/A',
  packaging_schedule text default 'N/A',
  final_status text default 'N/A',
  final_status_other text default 'N/A',
  created_by text default '',
  created_at timestamptz not null default now(),
  updated_by text default '',
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create index cnf_projects_project_id_idx on public.cnf_projects (project_id);
create index cnf_projects_is_active_idx on public.cnf_projects (is_active);

create table public.support_activities (
  activity_id text primary key,
  project_id text not null,
  activity_kind text default '',
  department text default '',
  material text default '',
  line text default '',
  bulk text default '',
  machinability_protocol text default '',
  machinability_protocol_status text default '',
  machinability_report text default '',
  machinability_report_status text default '',
  product_user text default '',
  principal text default '',
  product text default '',
  target_date text default '',
  planning_schedule text default '',
  created_by text default '',
  created_at timestamptz not null default now(),
  updated_by text default '',
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table public.notifications (
  notification_id text primary key,
  project_id text not null,
  record_id text not null,
  fg_month text default 'N/A',
  severity text not null,
  title text not null,
  message text not null,
  status text not null default 'OPEN',
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  audit_id uuid primary key default gen_random_uuid(),
  timestamp timestamptz not null default now(),
  user_email text not null,
  module text not null,
  action text not null,
  record_id text not null,
  project_id text default 'N/A',
  field_name text default '',
  old_value text default '',
  new_value text default '',
  remarks text default ''
);

create table public.registry (
  id uuid primary key default gen_random_uuid(),
  registry_type text not null,
  registry_value text not null,
  description text default '',
  status text not null default 'Active',
  created_by text default '',
  created_at timestamptz not null default now(),
  updated_by text default '',
  updated_at timestamptz not null default now(),
  unique (registry_type, registry_value)
);

create table public.admin_messages (
  message_id text primary key,
  timestamp timestamptz not null default now(),
  user_email text not null,
  category text not null,
  subject text not null,
  message text not null,
  status text not null default 'NEW'
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'view'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Seed default registry values
insert into public.registry (registry_type, registry_value, description, status, created_by, updated_by)
values
  ('activity_type', 'PILOT/TRIAL', 'PILOT/TRIAL', 'Active', 'system', 'system'),
  ('activity_type', 'TRC', 'TRC', 'Active', 'system', 'system'),
  ('activity_type', 'VAL/VER', 'VAL/VER', 'Active', 'system', 'system'),
  ('business_unit', 'CM', 'CM', 'Active', 'system', 'system'),
  ('business_unit', 'BM', 'BM', 'Active', 'system', 'system'),
  ('business_unit', 'PL', 'PL', 'Active', 'system', 'system'),
  ('cnf_status', 'CNF Creation', 'CNF Creation', 'Active', 'system', 'system'),
  ('cnf_status', 'Routing', 'Routing', 'Active', 'system', 'system'),
  ('cnf_status', 'Client Approval', 'Client Approval', 'Active', 'system', 'system'),
  ('cnf_status', 'Approved', 'Approved', 'Active', 'system', 'system'),
  ('final_status', 'OPEN', 'OPEN', 'Active', 'system', 'system'),
  ('final_status', 'CLOSED', 'CLOSED', 'Active', 'system', 'system'),
  ('final_status', 'CANCELLED', 'CANCELLED', 'Active', 'system', 'system'),
  ('final_status', 'Others', 'Others', 'Active', 'system', 'system'),
  ('department', 'DPM', 'DPM', 'Active', 'system', 'system'),
  ('department', 'LPM', 'LPM', 'Active', 'system', 'system'),
  ('yn_status', 'Y', 'Y', 'Active', 'system', 'system'),
  ('yn_status', 'N', 'N', 'Active', 'system', 'system')
on conflict (registry_type, registry_value) do nothing;
