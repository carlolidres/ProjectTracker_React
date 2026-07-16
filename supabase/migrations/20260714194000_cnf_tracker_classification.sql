-- CNF Tracker Process / Non-Process classification.
-- Existing rows default to Process.

ALTER TABLE public.cnf_tracker_records
  ADD COLUMN IF NOT EXISTS cnf_classification text NOT NULL DEFAULT 'process';

UPDATE public.cnf_tracker_records
SET cnf_classification = 'process'
WHERE nullif(trim(cnf_classification), '') IS NULL
   OR lower(trim(cnf_classification)) NOT IN ('process', 'non_process');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cnf_tracker_records_cnf_classification_check'
  ) THEN
    ALTER TABLE public.cnf_tracker_records
      ADD CONSTRAINT cnf_tracker_records_cnf_classification_check
      CHECK (cnf_classification = ANY (ARRAY['process'::text, 'non_process'::text]));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS cnf_tracker_records_classification_idx
  ON public.cnf_tracker_records (cnf_classification)
  WHERE is_active = true;
