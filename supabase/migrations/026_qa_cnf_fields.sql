-- Step 2 of 2: QRMR columns, role helpers, and RLS updates for QA.
-- Prerequisite: 025_qa_role_enum.sql must have been applied and committed first.
-- QRMR per-entry data is stored in cnf_entries_json; flat columns mirror the first CNF entry.

ALTER TABLE public.cnf_projects
  ADD COLUMN IF NOT EXISTS qrmr_status text DEFAULT 'N/A',
  ADD COLUMN IF NOT EXISTS qrmr_target_date text DEFAULT 'N/A';

CREATE OR REPLACE FUNCTION public.safe_project_tracker_role(value text)
RETURNS public.user_role
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE lower(nullif(trim(value), ''))
    WHEN 'am_bm_pl' THEN 'am_bm_pl'::public.user_role
    WHEN 'qa' THEN 'qa'::public.user_role
    WHEN 'pp' THEN 'pp'::public.user_role
    WHEN 'tsd' THEN 'tsd'::public.user_role
    WHEN 'val' THEN 'val'::public.user_role
    WHEN 'qc' THEN 'qc'::public.user_role
    WHEN 'view' THEN 'view'::public.user_role
    ELSE 'view'::public.user_role
  END;
$$;

CREATE OR REPLACE FUNCTION public.pt_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p.role IS NULL THEN NULL
    ELSE
      CASE lower(p.role::text)
        WHEN 'admin' THEN 'admin'
        WHEN 'am' THEN 'am_bm_pl'
        WHEN 'bm' THEN 'am_bm_pl'
        WHEN 'nb' THEN 'am_bm_pl'
        WHEN 'pl' THEN 'am_bm_pl'
        WHEN 'am_bm_pl' THEN 'am_bm_pl'
        WHEN 'qa' THEN 'qa'
        WHEN 'pp' THEN 'pp'
        WHEN 'tsd' THEN 'tsd'
        WHEN 'val' THEN 'val'
        WHEN 'qc' THEN 'qc'
        WHEN 'view' THEN 'view'
        ELSE NULL
      END
  END
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.pt_can_edit_projects()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.pt_current_user_role() IN ('am_bm_pl', 'qa', 'pp', 'tsd', 'val', 'qc', 'admin');
$$;

-- Standalone host policies (002 / 004) — include qa on project write access
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'cnf_projects'
      AND policyname = 'Editors can insert projects'
  ) THEN
    DROP POLICY IF EXISTS "Editors can insert projects" ON public.cnf_projects;
    CREATE POLICY "Editors can insert projects"
      ON public.cnf_projects FOR INSERT TO authenticated
      WITH CHECK (public.current_user_role()::text IN ('am_bm_pl', 'qa', 'pp', 'tsd', 'val', 'qc', 'admin'));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'cnf_projects'
      AND policyname = 'Editors can update projects'
  ) THEN
    DROP POLICY IF EXISTS "Editors can update projects" ON public.cnf_projects;
    CREATE POLICY "Editors can update projects"
      ON public.cnf_projects FOR UPDATE TO authenticated
      USING (public.current_user_role()::text IN ('am_bm_pl', 'qa', 'pp', 'tsd', 'val', 'qc', 'admin'));
  END IF;
END $$;
