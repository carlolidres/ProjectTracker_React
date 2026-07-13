-- Extend CNF tracker header fields and add stable project↔_tracker_links.

ALTER TABLE public.cnf_tracker_records
  ADD COLUMN IF NOT EXISTS cnf_details text NOT NULL DEFAULT 'N/A',
  ADD COLUMN IF NOT EXISTS qrmr_no text NOT NULL DEFAULT 'N/A',
  ADD COLUMN IF NOT EXISTS unique_batch_no text NOT NULL DEFAULT 'N/A',
  ADD COLUMN IF NOT EXISTS change_description text NOT NULL DEFAULT 'N/A';

DROP INDEX IF EXISTS public.cnf_tracker_active_reference_idx;

CREATE UNIQUE INDEX IF NOT EXISTS cnf_tracker_active_reference_idx
  ON public.cnf_tracker_records (
    lower(trim(regexp_replace(cnf_reference, '\s+', ' ', 'g')))
  )
  WHERE is_active = true
    AND trim(cnf_reference) <> ''
    AND lower(trim(cnf_reference)) <> 'n/a';

CREATE INDEX IF NOT EXISTS cnf_tracker_qrmr_norm_idx
  ON public.cnf_tracker_records (lower(trim(regexp_replace(qrmr_no, '\s+', ' ', 'g'))))
  WHERE is_active = true
    AND trim(qrmr_no) <> ''
    AND lower(trim(qrmr_no)) <> 'n/a';

CREATE INDEX IF NOT EXISTS cnf_tracker_unique_batch_norm_idx
  ON public.cnf_tracker_records (lower(trim(regexp_replace(unique_batch_no, '\s+', ' ', 'g'))))
  WHERE is_active = true
    AND trim(unique_batch_no) <> ''
    AND lower(trim(unique_batch_no)) <> 'n/a';

CREATE TABLE IF NOT EXISTS public.project_cnf_tracker_links (
  link_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnf_tracker_record_id uuid NOT NULL REFERENCES public.cnf_tracker_records(record_id),
  project_id text NOT NULL,
  created_by text DEFAULT '',
  updated_by text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_cnf_tracker_links_unique UNIQUE (cnf_tracker_record_id, project_id)
);

CREATE INDEX IF NOT EXISTS project_cnf_tracker_links_project_idx
  ON public.project_cnf_tracker_links (project_id);

CREATE INDEX IF NOT EXISTS project_cnf_tracker_links_tracker_idx
  ON public.project_cnf_tracker_links (cnf_tracker_record_id);

ALTER TABLE public.project_cnf_tracker_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_cnf_tracker_links_select ON public.project_cnf_tracker_links;
CREATE POLICY project_cnf_tracker_links_select
  ON public.project_cnf_tracker_links FOR SELECT TO authenticated
  USING (public.is_active_user());

DROP POLICY IF EXISTS project_cnf_tracker_links_insert ON public.project_cnf_tracker_links;
CREATE POLICY project_cnf_tracker_links_insert
  ON public.project_cnf_tracker_links FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS project_cnf_tracker_links_update ON public.project_cnf_tracker_links;
CREATE POLICY project_cnf_tracker_links_update
  ON public.project_cnf_tracker_links FOR UPDATE TO authenticated
  USING (public.is_active_user());

DROP POLICY IF EXISTS project_cnf_tracker_links_delete ON public.project_cnf_tracker_links;
CREATE POLICY project_cnf_tracker_links_delete
  ON public.project_cnf_tracker_links FOR DELETE TO authenticated
  USING (public.is_active_user());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_cnf_tracker_links TO authenticated;

-- Backfill links from matching active project CNF references (inline + entries JSON).
-- Does not rewrite historical project CNF text.
INSERT INTO public.project_cnf_tracker_links (
  cnf_tracker_record_id,
  project_id,
  created_by,
  updated_by
)
SELECT DISTINCT ON (t.record_id, p.project_id)
  t.record_id,
  p.project_id,
  coalesce(nullif(trim(t.created_by), ''), 'migration'),
  coalesce(nullif(trim(t.updated_by), ''), 'migration')
FROM public.cnf_tracker_records t
JOIN public.cnf_projects p
  ON p.is_active = true
 AND p.project_id IS NOT NULL
 AND trim(p.project_id) <> ''
 AND lower(trim(p.project_id)) <> 'n/a'
 AND (
   lower(trim(regexp_replace(coalesce(p.cnf_reference, ''), '\s+', ' ', 'g')))
     = lower(trim(regexp_replace(t.cnf_reference, '\s+', ' ', 'g')))
   OR (
     p.cnf_entries_json IS NOT NULL
     AND trim(p.cnf_entries_json) <> ''
     AND lower(trim(p.cnf_entries_json)) <> 'n/a'
     AND EXISTS (
       SELECT 1
       FROM jsonb_array_elements(
         CASE
           WHEN jsonb_typeof(p.cnf_entries_json::jsonb) = 'array' THEN p.cnf_entries_json::jsonb
           ELSE '[]'::jsonb
         END
       ) AS entry
       WHERE lower(trim(regexp_replace(coalesce(entry->>'cnf_reference', ''), '\s+', ' ', 'g')))
         = lower(trim(regexp_replace(t.cnf_reference, '\s+', ' ', 'g')))
     )
   )
 )
WHERE t.is_active = true
  AND trim(t.cnf_reference) <> ''
  AND lower(trim(t.cnf_reference)) <> 'n/a'
ON CONFLICT (cnf_tracker_record_id, project_id) DO NOTHING;
