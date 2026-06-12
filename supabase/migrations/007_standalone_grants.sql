-- Standalone Project Tracker: table GRANTs for authenticated role.
-- Apply on fresh projects after 001 + 002.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cnf_projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registry TO authenticated;
GRANT SELECT, INSERT ON public.admin_messages TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
