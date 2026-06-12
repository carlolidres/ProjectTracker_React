-- Grant table privileges to authenticated role for Project Tracker tables.
-- RLS policies still enforce row-level access; without these grants PostgREST returns 42501.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cnf_projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pt_notifications TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registry TO authenticated;
GRANT SELECT, INSERT ON public.admin_messages TO authenticated;
