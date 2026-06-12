-- Idempotent Project Tracker tables for projects where profiles/notifications already exist.
-- Safe to run on CNF Tracker Ver 2.0 (byhxwretspcxrrkvovgq) without dropping legacy tables.

DO $$
BEGIN
  CREATE TYPE public.user_role AS ENUM (
    'am_bm_pl', 'pp', 'tsd', 'val', 'qc', 'admin', 'view'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.cnf_projects (
  record_id text PRIMARY KEY,
  project_id text NOT NULL,
  project_owner text DEFAULT 'N/A',
  activity_type text DEFAULT 'N/A',
  client_name text DEFAULT 'N/A',
  so_no text DEFAULT 'N/A',
  fg_code text DEFAULT 'N/A',
  product_name text DEFAULT 'N/A',
  batch_instance_id text DEFAULT 'N/A',
  unique_batch text DEFAULT 'N/A',
  mo_instance_id text DEFAULT 'N/A',
  mo_control_no text DEFAULT 'N/A',
  po_instance_id text DEFAULT 'N/A',
  po_control_no text DEFAULT 'N/A',
  fg_month text DEFAULT 'N/A',
  business_unit text DEFAULT 'N/A',
  updateddocsver text DEFAULT 'N/A',
  cnf_reference text DEFAULT 'N/A',
  qrmr_ref_no text DEFAULT 'N/A',
  change_description text DEFAULT 'N/A',
  cnf_status text DEFAULT 'N/A',
  client_approval_target_date text DEFAULT 'N/A',
  remarks text DEFAULT 'N/A',
  cnf_entries_json text DEFAULT '[]',
  manufacturing_start_week text DEFAULT 'N/A',
  mo_bmr_po_submission_status text DEFAULT 'N/A',
  mo_bmr_po_target_date text DEFAULT 'N/A',
  mo_bmr_po_activation_status text DEFAULT 'N/A',
  mo_bmr_po_activation_date text DEFAULT 'N/A',
  protocol_no text DEFAULT 'N/A',
  protocol_status text DEFAULT 'N/A',
  protocol_target_date text DEFAULT 'N/A',
  val_activity text DEFAULT 'N/A',
  val_stability text DEFAULT 'N/A',
  val_batch_seq_no text DEFAULT 'N/A',
  val_strategy text DEFAULT 'N/A',
  val_strategy_remarks text DEFAULT 'N/A',
  val_report_no text DEFAULT 'N/A',
  report_sub_status text DEFAULT 'N/A',
  report_target_date text DEFAULT 'N/A',
  ar_availability_date text DEFAULT 'N/A',
  packaging_schedule text DEFAULT 'N/A',
  final_status text DEFAULT 'N/A',
  final_status_other text DEFAULT 'N/A',
  created_by text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by text DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS cnf_projects_project_id_idx ON public.cnf_projects (project_id);
CREATE INDEX IF NOT EXISTS cnf_projects_is_active_idx ON public.cnf_projects (is_active);

CREATE TABLE IF NOT EXISTS public.support_activities (
  activity_id text PRIMARY KEY,
  project_id text NOT NULL,
  activity_kind text DEFAULT '',
  department text DEFAULT '',
  material text DEFAULT '',
  line text DEFAULT '',
  bulk text DEFAULT '',
  machinability_protocol text DEFAULT '',
  machinability_protocol_status text DEFAULT '',
  machinability_report text DEFAULT '',
  machinability_report_status text DEFAULT '',
  product_user text DEFAULT '',
  principal text DEFAULT '',
  product text DEFAULT '',
  target_date text DEFAULT '',
  planning_schedule text DEFAULT '',
  created_by text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by text DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  audit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz NOT NULL DEFAULT now(),
  user_email text NOT NULL,
  module text NOT NULL,
  action text NOT NULL,
  record_id text NOT NULL,
  project_id text DEFAULT 'N/A',
  field_name text DEFAULT '',
  old_value text DEFAULT '',
  new_value text DEFAULT '',
  remarks text DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_type text NOT NULL,
  registry_value text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'Active',
  created_by text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by text DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (registry_type, registry_value)
);

CREATE TABLE IF NOT EXISTS public.admin_messages (
  message_id text PRIMARY KEY,
  timestamp timestamptz NOT NULL DEFAULT now(),
  user_email text NOT NULL,
  category text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'NEW'
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'full_name', ''),
    'view'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

INSERT INTO public.registry (registry_type, registry_value, description, status, created_by, updated_by)
VALUES
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
ON CONFLICT (registry_type, registry_value) DO NOTHING;
