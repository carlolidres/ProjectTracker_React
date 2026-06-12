-- RLS for Project Tracker tables added in 003 (idempotent policy creation)
-- Uses existing public.current_user_role() from the host project (do not replace).

ALTER TABLE public.cnf_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cnf_projects'
      AND policyname = 'Authenticated users can read projects'
  ) THEN
    CREATE POLICY "Authenticated users can read projects"
      ON public.cnf_projects FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cnf_projects'
      AND policyname = 'Editors can insert projects'
  ) THEN
    CREATE POLICY "Editors can insert projects"
      ON public.cnf_projects FOR INSERT TO authenticated
      WITH CHECK (public.current_user_role()::text IN ('am_bm_pl', 'pp', 'tsd', 'val', 'qc', 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cnf_projects'
      AND policyname = 'Editors can update projects'
  ) THEN
    CREATE POLICY "Editors can update projects"
      ON public.cnf_projects FOR UPDATE TO authenticated
      USING (public.current_user_role()::text IN ('am_bm_pl', 'pp', 'tsd', 'val', 'qc', 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'support_activities'
      AND policyname = 'Authenticated users can read support'
  ) THEN
    CREATE POLICY "Authenticated users can read support"
      ON public.support_activities FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'support_activities'
      AND policyname = 'Editors can write support'
  ) THEN
    CREATE POLICY "Editors can write support"
      ON public.support_activities FOR INSERT TO authenticated
      WITH CHECK (public.current_user_role()::text IN ('tsd', 'val', 'admin', 'am_bm_pl'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'support_activities'
      AND policyname = 'Editors can update support'
  ) THEN
    CREATE POLICY "Editors can update support"
      ON public.support_activities FOR UPDATE TO authenticated
      USING (public.current_user_role()::text IN ('tsd', 'val', 'admin', 'am_bm_pl'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_logs'
      AND policyname = 'Authenticated users can insert audit logs'
  ) THEN
    CREATE POLICY "Authenticated users can insert audit logs"
      ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_logs'
      AND policyname = 'Admin and view can read audit logs'
  ) THEN
    CREATE POLICY "Admin and view can read audit logs"
      ON public.audit_logs FOR SELECT TO authenticated
      USING (public.current_user_role()::text IN ('admin', 'view'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'registry'
      AND policyname = 'Authenticated users can read registry'
  ) THEN
    CREATE POLICY "Authenticated users can read registry"
      ON public.registry FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'registry'
      AND policyname = 'Admins can manage registry'
  ) THEN
    CREATE POLICY "Admins can manage registry"
      ON public.registry FOR ALL
      USING (public.current_user_role()::text = 'admin');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_messages'
      AND policyname = 'Users can submit admin messages'
  ) THEN
    CREATE POLICY "Users can submit admin messages"
      ON public.admin_messages FOR INSERT TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_messages'
      AND policyname = 'Admins can read admin messages'
  ) THEN
    CREATE POLICY "Admins can read admin messages"
      ON public.admin_messages FOR SELECT
      USING (public.current_user_role()::text = 'admin');
  END IF;
END $$;
