-- Lessons learned entries (date adjustment reasons and future categories).

CREATE TABLE IF NOT EXISTS public.lessons_learned (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  user_role text NOT NULL DEFAULT '',
  category text NOT NULL,
  reason_category text NOT NULL,
  description text NOT NULL CHECK (char_length(trim(description)) > 0),
  source_module text NOT NULL,
  project_id text DEFAULT '',
  record_context text DEFAULT '',
  field_name text DEFAULT '',
  field_label text DEFAULT '',
  old_date text DEFAULT '',
  new_date text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lessons_learned_created_at_idx ON public.lessons_learned (created_at DESC);
CREATE INDEX IF NOT EXISTS lessons_learned_category_idx ON public.lessons_learned (category);
CREATE INDEX IF NOT EXISTS lessons_learned_project_id_idx ON public.lessons_learned (project_id);

ALTER TABLE public.lessons_learned ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lessons_learned_insert_authenticated ON public.lessons_learned;
CREATE POLICY lessons_learned_insert_authenticated
  ON public.lessons_learned
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_user()
    AND auth.uid() = user_id
  );

DROP POLICY IF EXISTS lessons_learned_select_authenticated ON public.lessons_learned;
CREATE POLICY lessons_learned_select_authenticated
  ON public.lessons_learned
  FOR SELECT
  TO authenticated
  USING (public.is_active_user());

GRANT SELECT, INSERT ON public.lessons_learned TO authenticated;

INSERT INTO public.registry (registry_type, registry_value, description, status, created_by, updated_by)
VALUES
  ('date_adjustment_reason', 'Materials', 'Materials', 'Active', 'system', 'system'),
  ('date_adjustment_reason', 'Client', 'Client', 'Active', 'system', 'system'),
  ('date_adjustment_reason', 'Operations', 'Operations', 'Active', 'system', 'system'),
  ('date_adjustment_reason', 'Failed Testing', 'Failed Testing', 'Active', 'system', 'system'),
  ('date_adjustment_reason', 'Others', 'Others', 'Active', 'system', 'system')
ON CONFLICT (registry_type, registry_value) DO NOTHING;
