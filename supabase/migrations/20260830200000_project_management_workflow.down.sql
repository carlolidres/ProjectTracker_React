DROP POLICY IF EXISTS "Active users can read active directory profiles" ON public.profiles;

REVOKE ALL ON public.project_management_phase_overrides FROM authenticated;
REVOKE ALL ON public.project_management_comments FROM authenticated;
REVOKE ALL ON public.project_management_task_assignees FROM authenticated;
REVOKE ALL ON public.project_management_tasks FROM authenticated;

DROP TABLE IF EXISTS public.project_management_phase_overrides;
DROP TABLE IF EXISTS public.project_management_comments;
DROP TABLE IF EXISTS public.project_management_task_assignees;
DROP TABLE IF EXISTS public.project_management_tasks;
