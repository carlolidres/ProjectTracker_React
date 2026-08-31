ALTER TABLE public.menu_permission_overrides
  DROP CONSTRAINT IF EXISTS menu_permission_overrides_menu_key_check;

ALTER TABLE public.menu_permission_overrides
  ADD CONSTRAINT menu_permission_overrides_menu_key_check CHECK (
    menu_key = ANY (ARRAY[
      'dashboard',
      'projects_entry',
      'projects_database',
      'support_activities',
      'cnf_tracker',
      'endorsement_tracker',
      'lessons_learned',
      'audit_trail',
      'archived',
      'registry',
      'admin_users',
      'admin_access',
      'admin_data_map'
    ]::text[])
  );

DELETE FROM public.menu_permission_overrides
WHERE menu_key = 'project_management';
