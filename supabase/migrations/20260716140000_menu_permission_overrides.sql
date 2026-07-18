-- Menu-level View/Create/Edit/Export overrides (role × menu).
-- Defaults live in application code; this table stores admin overrides only.

CREATE TABLE IF NOT EXISTS public.menu_permission_overrides (
  role public.user_role NOT NULL,
  menu_key text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_export boolean NOT NULL DEFAULT false,
  updated_by text DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role, menu_key),
  CONSTRAINT menu_permission_overrides_menu_key_check CHECK (
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
  )
);

CREATE INDEX IF NOT EXISTS menu_permission_overrides_role_idx
  ON public.menu_permission_overrides (role);

ALTER TABLE public.menu_permission_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS menu_permission_overrides_select ON public.menu_permission_overrides;
CREATE POLICY menu_permission_overrides_select
  ON public.menu_permission_overrides FOR SELECT TO authenticated
  USING (public.is_active_user());

DROP POLICY IF EXISTS menu_permission_overrides_insert ON public.menu_permission_overrides;
CREATE POLICY menu_permission_overrides_insert
  ON public.menu_permission_overrides FOR INSERT TO authenticated
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS menu_permission_overrides_update ON public.menu_permission_overrides;
CREATE POLICY menu_permission_overrides_update
  ON public.menu_permission_overrides FOR UPDATE TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS menu_permission_overrides_delete ON public.menu_permission_overrides;
CREATE POLICY menu_permission_overrides_delete
  ON public.menu_permission_overrides FOR DELETE TO authenticated
  USING (public.is_active_admin());

GRANT SELECT ON public.menu_permission_overrides TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.menu_permission_overrides TO authenticated;
