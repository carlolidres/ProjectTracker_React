-- Standalone Project Tracker: open authenticated access (matches Google Apps Script behavior).
-- All logged-in users can use all features; roles are UI form tabs only.

-- cnf_projects
DROP POLICY IF EXISTS "Editors can insert projects" ON public.cnf_projects;
DROP POLICY IF EXISTS "Editors can update projects" ON public.cnf_projects;
CREATE POLICY "Authenticated users can insert projects"
  ON public.cnf_projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update projects"
  ON public.cnf_projects FOR UPDATE TO authenticated USING (true);

-- support_activities
DROP POLICY IF EXISTS "Editors can write support" ON public.support_activities;
DROP POLICY IF EXISTS "Editors can update support" ON public.support_activities;
CREATE POLICY "Authenticated users can insert support"
  ON public.support_activities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update support"
  ON public.support_activities FOR UPDATE TO authenticated USING (true);

-- notifications
DROP POLICY IF EXISTS "Authenticated users can manage notifications" ON public.notifications;
CREATE POLICY "Authenticated users can manage notifications"
  ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- audit_logs — all authenticated can read (legacy Audit Trail page is open to everyone)
DROP POLICY IF EXISTS "Admin and view can read audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can read audit logs"
  ON public.audit_logs FOR SELECT TO authenticated USING (true);

-- registry — all authenticated can manage (legacy Registry page is open to everyone)
DROP POLICY IF EXISTS "Admins can manage registry" ON public.registry;
CREATE POLICY "Authenticated users can manage registry"
  ON public.registry FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- admin_messages — all authenticated can read their submissions; admins see all via same policy for now
DROP POLICY IF EXISTS "Admins can read admin messages" ON public.admin_messages;
CREATE POLICY "Authenticated users can read admin messages"
  ON public.admin_messages FOR SELECT TO authenticated USING (true);
