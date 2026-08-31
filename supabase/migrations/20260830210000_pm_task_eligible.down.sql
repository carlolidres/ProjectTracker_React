DROP FUNCTION IF EXISTS public.admin_update_user_access(uuid, public.user_role, text, boolean);

CREATE OR REPLACE FUNCTION public.admin_update_user_access(
  target_user_id uuid,
  next_role public.user_role,
  next_status text
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous_profile public.profiles;
  updated_profile public.profiles;
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

  UPDATE public.profiles
  SET role = next_role,
      status = next_status,
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
    jsonb_build_object('role', previous_profile.role, 'status', previous_profile.status),
    jsonb_build_object('role', updated_profile.role, 'status', updated_profile.status)
  );

  RETURN updated_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_access(uuid, public.user_role, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_access(uuid, public.user_role, text) TO authenticated;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS pm_task_eligible;
