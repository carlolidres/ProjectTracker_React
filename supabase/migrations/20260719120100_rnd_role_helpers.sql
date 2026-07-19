-- Step 2 of 2: Recognize RnD in role helpers.
-- Prerequisite: 20260719120000_rnd_role_enum.sql must be applied first.

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
    WHEN 'rnd' THEN 'rnd'::public.user_role
    WHEN 'view' THEN 'view'::public.user_role
    WHEN 'admin' THEN 'admin'::public.user_role
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
        WHEN 'rnd' THEN 'rnd'
        WHEN 'view' THEN 'view'
        ELSE NULL
      END
  END
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.status = 'active'
  LIMIT 1;
$$;
