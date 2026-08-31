-- Project Management workflow: tasks, comments, assignees, documented phase overrides.
-- Live source records remain in cnf_projects / support_activities.

CREATE TABLE IF NOT EXISTS public.project_management_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('process', 'support')),
  source_id text NOT NULL,
  parent_task_id uuid REFERENCES public.project_management_tasks(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(trim(title)) > 0),
  instructions text NOT NULL DEFAULT '',
  phase text NOT NULL DEFAULT 'execution' CHECK (
    phase = ANY (ARRAY['protocol', 'execution', 'report', 'endorsement', 'other']::text[])
  ),
  status text NOT NULL DEFAULT 'Planned' CHECK (
    status = ANY (ARRAY['Planned', 'In-process', 'Done', 'Delayed', 'Blocked']::text[])
  ),
  priority text NOT NULL DEFAULT 'Medium' CHECK (
    priority = ANY (ARRAY['Low', 'Medium', 'High']::text[])
  ),
  percent_complete integer NOT NULL DEFAULT 0 CHECK (percent_complete BETWEEN 0 AND 100),
  start_date date,
  target_date date,
  actual_date date,
  category text NOT NULL DEFAULT 'Other' CHECK (
    category = ANY (ARRAY['Validation', 'Characterization', 'Verification', 'Other']::text[])
  ),
  depends_on_task_id uuid REFERENCES public.project_management_tasks(id) ON DELETE SET NULL,
  attachment_url text NOT NULL DEFAULT '',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_management_tasks_source_idx
  ON public.project_management_tasks (source_type, source_id);
CREATE INDEX IF NOT EXISTS project_management_tasks_status_idx
  ON public.project_management_tasks (status);
CREATE INDEX IF NOT EXISTS project_management_tasks_target_date_idx
  ON public.project_management_tasks (target_date);

CREATE TABLE IF NOT EXISTS public.project_management_task_assignees (
  task_id uuid NOT NULL REFERENCES public.project_management_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS project_management_task_assignees_user_idx
  ON public.project_management_task_assignees (user_id);

CREATE TABLE IF NOT EXISTS public.project_management_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.project_management_tasks(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) > 0),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_management_comments_task_idx
  ON public.project_management_comments (task_id, created_at);

CREATE TABLE IF NOT EXISTS public.project_management_phase_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('process', 'support')),
  source_id text NOT NULL,
  gate text NOT NULL CHECK (gate IN ('execution', 'report')),
  justification text NOT NULL CHECK (char_length(trim(justification)) > 0),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id, gate)
);

CREATE INDEX IF NOT EXISTS project_management_phase_overrides_source_idx
  ON public.project_management_phase_overrides (source_type, source_id);

ALTER TABLE public.project_management_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_management_task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_management_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_management_phase_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_management_tasks_select ON public.project_management_tasks;
CREATE POLICY project_management_tasks_select
  ON public.project_management_tasks FOR SELECT TO authenticated
  USING (public.is_active_user());

DROP POLICY IF EXISTS project_management_tasks_insert ON public.project_management_tasks;
CREATE POLICY project_management_tasks_insert
  ON public.project_management_tasks FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user()
    AND public.current_user_role() <> 'view'
  );

DROP POLICY IF EXISTS project_management_tasks_update ON public.project_management_tasks;
CREATE POLICY project_management_tasks_update
  ON public.project_management_tasks FOR UPDATE TO authenticated
  USING (
    public.is_active_user()
    AND public.current_user_role() <> 'view'
    AND (
      public.current_user_role() IN ('admin', 'am_bm_pl', 'val', 'qa', 'pp', 'tsd', 'qc', 'rnd')
      OR EXISTS (
        SELECT 1
        FROM public.project_management_task_assignees a
        WHERE a.task_id = project_management_tasks.id
          AND a.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    public.is_active_user()
    AND public.current_user_role() <> 'view'
  );

DROP POLICY IF EXISTS project_management_tasks_delete ON public.project_management_tasks;
CREATE POLICY project_management_tasks_delete
  ON public.project_management_tasks FOR DELETE TO authenticated
  USING (
    public.is_active_user()
    AND public.current_user_role() IN ('admin', 'am_bm_pl', 'val')
  );

DROP POLICY IF EXISTS project_management_task_assignees_select ON public.project_management_task_assignees;
CREATE POLICY project_management_task_assignees_select
  ON public.project_management_task_assignees FOR SELECT TO authenticated
  USING (public.is_active_user());

DROP POLICY IF EXISTS project_management_task_assignees_write ON public.project_management_task_assignees;
CREATE POLICY project_management_task_assignees_write
  ON public.project_management_task_assignees FOR ALL TO authenticated
  USING (
    public.is_active_user()
    AND public.current_user_role() <> 'view'
  )
  WITH CHECK (
    public.is_active_user()
    AND public.current_user_role() <> 'view'
  );

DROP POLICY IF EXISTS project_management_comments_select ON public.project_management_comments;
CREATE POLICY project_management_comments_select
  ON public.project_management_comments FOR SELECT TO authenticated
  USING (public.is_active_user());

DROP POLICY IF EXISTS project_management_comments_insert ON public.project_management_comments;
CREATE POLICY project_management_comments_insert
  ON public.project_management_comments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user()
    AND public.current_user_role() <> 'view'
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS project_management_phase_overrides_select ON public.project_management_phase_overrides;
CREATE POLICY project_management_phase_overrides_select
  ON public.project_management_phase_overrides FOR SELECT TO authenticated
  USING (public.is_active_user());

DROP POLICY IF EXISTS project_management_phase_overrides_insert ON public.project_management_phase_overrides;
CREATE POLICY project_management_phase_overrides_insert
  ON public.project_management_phase_overrides FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user()
    AND public.current_user_role() IN ('admin', 'am_bm_pl', 'val')
  );

DROP POLICY IF EXISTS "Active users can read active directory profiles" ON public.profiles;
CREATE POLICY "Active users can read active directory profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.is_active_user()
    AND status = 'active'
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_management_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_management_task_assignees TO authenticated;
GRANT SELECT, INSERT ON public.project_management_comments TO authenticated;
GRANT SELECT, INSERT ON public.project_management_phase_overrides TO authenticated;
