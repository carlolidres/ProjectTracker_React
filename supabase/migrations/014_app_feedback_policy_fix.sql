-- Repair app_feedback policies if migration 013 was applied with pt_is_admin().
-- Safe to run on fresh installs (no-op when 013 already uses is_active_user/is_active_admin).

ALTER TABLE public.app_feedback
  DROP CONSTRAINT IF EXISTS app_feedback_user_id_fkey;

ALTER TABLE public.app_feedback
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.app_feedback
  ADD CONSTRAINT app_feedback_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

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
