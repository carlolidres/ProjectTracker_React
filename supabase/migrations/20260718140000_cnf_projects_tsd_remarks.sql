-- TSD long-text remarks on each PO line (separate from AM CNF remarks).
ALTER TABLE public.cnf_projects
  ADD COLUMN IF NOT EXISTS tsd_remarks text DEFAULT 'N/A';

COMMENT ON COLUMN public.cnf_projects.tsd_remarks IS
  'TSD remarks for MO/BMR/PO workflow; freeform long text.';
