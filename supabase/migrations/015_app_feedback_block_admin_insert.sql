-- Only non-admin users may submit feedback to administrators.

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
