-- QC long-text remarks on each PO line (separate from AM CNF / TSD remarks).
ALTER TABLE public.cnf_projects
  ADD COLUMN IF NOT EXISTS qc_remarks text DEFAULT 'N/A';

COMMENT ON COLUMN public.cnf_projects.qc_remarks IS
  'QC remarks for AR / quality workflow; freeform long text.';
