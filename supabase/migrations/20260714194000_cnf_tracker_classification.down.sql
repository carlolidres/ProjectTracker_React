-- Rollback: remove CNF Tracker classification column.

DROP INDEX IF EXISTS public.cnf_tracker_records_classification_idx;

ALTER TABLE public.cnf_tracker_records
  DROP CONSTRAINT IF EXISTS cnf_tracker_records_cnf_classification_check;

ALTER TABLE public.cnf_tracker_records
  DROP COLUMN IF EXISTS cnf_classification;
