-- User feedback and bug reports from the in-app feedback chat.
-- Uses standalone auth helpers from migration 009 (is_active_user / is_active_admin).
-- Does not depend on co-hosted pt_is_admin() from migration 005.

CREATE TABLE IF NOT EXISTS public.app_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  feedback_type text NOT NULL CHECK (feedback_type IN ('improvement', 'bug')),
  message text NOT NULL CHECK (char_length(trim(message)) > 0),
  page_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_feedback_created_at_idx ON public.app_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS app_feedback_type_idx ON public.app_feedback (feedback_type);
CREATE INDEX IF NOT EXISTS app_feedback_user_id_idx ON public.app_feedback (user_id);

ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_feedback_insert_authenticated ON public.app_feedback;
CREATE POLICY app_feedback_insert_authenticated
  ON public.app_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_user()
    AND auth.uid() = user_id
    AND NOT public.is_active_admin()
  );

DROP POLICY IF EXISTS app_feedback_select_admin ON public.app_feedback;
CREATE POLICY app_feedback_select_admin
  ON public.app_feedback
  FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

GRANT SELECT, INSERT ON public.app_feedback TO authenticated;
