-- Per-user Project Management task assignment privilege, granted by Admin on User Management.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pm_task_eligible boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.pm_task_eligible IS
  'When true, an active non-view user may be assigned Project Management tasks and may assign tasks if their menu allows create/edit.';

UPDATE public.profiles
SET pm_task_eligible = true
WHERE role = 'admin'
  AND status = 'active';

DROP FUNCTION IF EXISTS public.admin_update_user_access(uuid, public.user_role, text);

CREATE OR REPLACE FUNCTION public.admin_update_user_access(
  target_user_id uuid,
  next_role public.user_role,
  next_status text,
  next_pm_task_eligible boolean DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous_profile public.profiles;
  updated_profile public.profiles;
  resolved_eligible boolean;
BEGIN
  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION 'Only active administrators can manage users.';
  END IF;

  IF next_status NOT IN ('pending', 'active', 'inactive') THEN
    RAISE EXCEPTION 'Invalid account status.';
  END IF;

  SELECT * INTO previous_profile
  FROM public.profiles
  WHERE id = target_user_id;

  IF previous_profile.id IS NULL THEN
    RAISE EXCEPTION 'User profile not found.';
  END IF;

  IF target_user_id = auth.uid()
     AND (next_role <> 'admin' OR next_status <> 'active') THEN
    RAISE EXCEPTION 'Administrators cannot remove their own active Admin access.';
  END IF;

  resolved_eligible := CASE
    WHEN next_role = 'view' THEN false
    WHEN next_pm_task_eligible IS NULL THEN previous_profile.pm_task_eligible
    ELSE next_pm_task_eligible
  END;

  UPDATE public.profiles
  SET role = next_role,
      status = next_status,
      pm_task_eligible = resolved_eligible,
      approved_by = CASE WHEN next_status = 'active' THEN auth.uid() ELSE approved_by END,
      approved_at = CASE WHEN next_status = 'active' THEN now() ELSE approved_at END,
      updated_at = now()
  WHERE id = target_user_id
  RETURNING * INTO updated_profile;

  INSERT INTO public.auth_activity_log (
    actor_id,
    target_user_id,
    event_type,
    old_value,
    new_value
  )
  VALUES (
    auth.uid(),
    target_user_id,
    'user_access_updated',
    jsonb_build_object(
      'role', previous_profile.role,
      'status', previous_profile.status,
      'pm_task_eligible', previous_profile.pm_task_eligible
    ),
    jsonb_build_object(
      'role', updated_profile.role,
      'status', updated_profile.status,
      'pm_task_eligible', updated_profile.pm_task_eligible
    )
  );

  RETURN updated_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_access(uuid, public.user_role, text, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_access(uuid, public.user_role, text, boolean) TO authenticated;
