-- CNF Tracker registry records (header keyed by cnf_reference, system id cnf_tracker_id).

CREATE TABLE IF NOT EXISTS public.cnf_tracker_records (
  record_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnf_tracker_id text NOT NULL UNIQUE,
  cnf_reference text NOT NULL DEFAULT 'N/A',
  cnf_initiator text NOT NULL DEFAULT 'N/A',
  tracker_status text NOT NULL DEFAULT 'Open',
  closed_date date,
  created_by text DEFAULT '',
  updated_by text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX IF NOT EXISTS cnf_tracker_active_reference_idx
  ON public.cnf_tracker_records (lower(trim(cnf_reference)))
  WHERE is_active = true AND trim(cnf_reference) <> '' AND lower(trim(cnf_reference)) <> 'n/a';

CREATE INDEX IF NOT EXISTS cnf_tracker_records_status_idx
  ON public.cnf_tracker_records (tracker_status)
  WHERE is_active = true;

ALTER TABLE public.cnf_tracker_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cnf_tracker_select_authenticated ON public.cnf_tracker_records;
CREATE POLICY cnf_tracker_select_authenticated
  ON public.cnf_tracker_records FOR SELECT TO authenticated
  USING (public.is_active_user());

DROP POLICY IF EXISTS cnf_tracker_insert_authenticated ON public.cnf_tracker_records;
CREATE POLICY cnf_tracker_insert_authenticated
  ON public.cnf_tracker_records FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS cnf_tracker_update_authenticated ON public.cnf_tracker_records;
CREATE POLICY cnf_tracker_update_authenticated
  ON public.cnf_tracker_records FOR UPDATE TO authenticated
  USING (public.is_active_user());

GRANT SELECT, INSERT, UPDATE ON public.cnf_tracker_records TO authenticated;
