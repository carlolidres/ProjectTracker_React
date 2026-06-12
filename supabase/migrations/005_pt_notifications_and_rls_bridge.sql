-- Project Tracker notifications table (separate from legacy CNF notifications)
-- and role-bridge helpers for co-hosted CNF Tracker Ver 2.0 database.

CREATE TABLE IF NOT EXISTS public.pt_notifications (
  notification_id text PRIMARY KEY,
  project_id text NOT NULL,
  record_id text NOT NULL,
  fg_month text DEFAULT 'N/A',
  severity text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pt_notifications_status_idx ON public.pt_notifications (status);
CREATE INDEX IF NOT EXISTS pt_notifications_created_at_idx ON public.pt_notifications (created_at DESC);

ALTER TABLE public.pt_notifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.pt_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE lower(coalesce(p.role, ''))
    WHEN 'admin' THEN 'admin'
    WHEN 'am' THEN 'am_bm_pl'
    WHEN 'bm' THEN 'am_bm_pl'
    WHEN 'nb' THEN 'am_bm_pl'
    WHEN 'pl' THEN 'am_bm_pl'
    WHEN 'am_bm_pl' THEN 'am_bm_pl'
    WHEN 'pp' THEN 'pp'
    WHEN 'tsd' THEN 'tsd'
    WHEN 'val' THEN 'val'
    WHEN 'qc' THEN 'qc'
    WHEN 'view' THEN 'view'
    ELSE NULL
  END
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.pt_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.pt_current_user_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.pt_can_edit_projects()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.pt_current_user_role() IN ('am_bm_pl', 'pp', 'tsd', 'val', 'qc', 'admin');
$$;

CREATE OR REPLACE FUNCTION public.pt_can_edit_support()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.pt_current_user_role() IN ('tsd', 'val', 'admin', 'am_bm_pl');
$$;

CREATE OR REPLACE FUNCTION public.pt_can_read_audit()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.pt_current_user_role() IN ('admin', 'view');
$$;

GRANT EXECUTE ON FUNCTION public.pt_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pt_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pt_can_edit_projects() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pt_can_edit_support() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pt_can_read_audit() TO authenticated;

-- pt_notifications policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pt_notifications'
      AND policyname = 'Authenticated users can read pt notifications'
  ) THEN
    CREATE POLICY "Authenticated users can read pt notifications"
      ON public.pt_notifications FOR SELECT TO authenticated
      USING (public.pt_current_user_role() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pt_notifications'
      AND policyname = 'Editors can manage pt notifications'
  ) THEN
    CREATE POLICY "Editors can manage pt notifications"
      ON public.pt_notifications FOR ALL TO authenticated
      USING (public.pt_can_edit_projects() OR public.pt_is_admin())
      WITH CHECK (public.pt_can_edit_projects() OR public.pt_is_admin());
  END IF;
END $$;

-- Replace Project Tracker policies to use role bridge (legacy CNF role values)
DROP POLICY IF EXISTS "Editors can insert projects" ON public.cnf_projects;
DROP POLICY IF EXISTS "Editors can update projects" ON public.cnf_projects;
DROP POLICY IF EXISTS "Editors can write support" ON public.support_activities;
DROP POLICY IF EXISTS "Editors can update support" ON public.support_activities;
DROP POLICY IF EXISTS "Admin and view can read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can manage registry" ON public.registry;
DROP POLICY IF EXISTS "Admins can read admin messages" ON public.admin_messages;

CREATE POLICY "Editors can insert projects"
  ON public.cnf_projects FOR INSERT TO authenticated
  WITH CHECK (public.pt_can_edit_projects());

CREATE POLICY "Editors can update projects"
  ON public.cnf_projects FOR UPDATE TO authenticated
  USING (public.pt_can_edit_projects());

CREATE POLICY "Editors can write support"
  ON public.support_activities FOR INSERT TO authenticated
  WITH CHECK (public.pt_can_edit_support());

CREATE POLICY "Editors can update support"
  ON public.support_activities FOR UPDATE TO authenticated
  USING (public.pt_can_edit_support());

CREATE POLICY "Admin and view can read audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.pt_can_read_audit());

CREATE POLICY "Admins can manage registry"
  ON public.registry FOR ALL TO authenticated
  USING (public.pt_is_admin())
  WITH CHECK (public.pt_is_admin());

CREATE POLICY "Admins can read admin messages"
  ON public.admin_messages FOR SELECT TO authenticated
  USING (public.pt_is_admin());
