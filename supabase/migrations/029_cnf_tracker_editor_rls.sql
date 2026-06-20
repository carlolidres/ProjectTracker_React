-- Restrict CNF Tracker writes to the same editor roles allowed by the UI.

DROP POLICY IF EXISTS cnf_tracker_insert_authenticated ON public.cnf_tracker_records;
DROP POLICY IF EXISTS cnf_tracker_update_authenticated ON public.cnf_tracker_records;
DROP POLICY IF EXISTS cnf_tracker_insert_editors ON public.cnf_tracker_records;
DROP POLICY IF EXISTS cnf_tracker_update_editors ON public.cnf_tracker_records;

CREATE POLICY cnf_tracker_insert_editors
  ON public.cnf_tracker_records FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user()
    AND public.pt_current_user_role() IN ('admin', 'qa', 'val')
  );

CREATE POLICY cnf_tracker_update_editors
  ON public.cnf_tracker_records FOR UPDATE TO authenticated
  USING (
    public.is_active_user()
    AND public.pt_current_user_role() IN ('admin', 'qa', 'val')
  )
  WITH CHECK (
    public.is_active_user()
    AND public.pt_current_user_role() IN ('admin', 'qa', 'val')
  );
