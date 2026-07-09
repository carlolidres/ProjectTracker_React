-- Password reset: notify admins on request; issue exactly 16-char temporary passwords.

create or replace function public.request_password_reset(request_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  normalized_email text := lower(trim(request_email));
begin
  if normalized_email is null or normalized_email = '' then
    return;
  end if;

  select id into target_user_id
  from public.profiles
  where lower(email) = normalized_email
  limit 1;

  -- Always return quietly to avoid email enumeration.
  if target_user_id is null then
    return;
  end if;

  if exists (
    select 1
    from public.password_reset_requests
    where user_id = target_user_id
      and request_status = 'pending'
  ) then
    return;
  end if;

  insert into public.password_reset_requests(user_id, email)
  values (target_user_id, normalized_email);

  insert into public.admin_messages (
    message_id,
    user_email,
    category,
    subject,
    message,
    status
  )
  values (
    'pwd-reset-' || target_user_id::text || '-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS'),
    normalized_email,
    'PASSWORD_RESET',
    'Password reset requested',
    'User ' || normalized_email || ' requested a password reset. Open User Management and use Reset Password beside that user to approve.',
    'NEW'
  );
end;
$$;

revoke all on function public.request_password_reset(text) from public;
grant execute on function public.request_password_reset(text) to anon, authenticated;

create or replace function public.admin_complete_password_reset(target_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  temp_password text := '';
  charset text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  i integer;
  rand_byte integer;
begin
  if not public.is_active_admin() then
    raise exception 'Only active administrators can reset passwords.';
  end if;

  if target_user_id is null then
    raise exception 'User account not found.';
  end if;

  if not exists (
    select 1
    from public.password_reset_requests
    where user_id = target_user_id
      and request_status = 'pending'
  ) then
    raise exception 'No pending password reset request for this user.';
  end if;

  for i in 1..16 loop
    rand_byte := get_byte(extensions.gen_random_bytes(1), 0);
    temp_password := temp_password || substr(charset, (rand_byte % length(charset)) + 1, 1);
  end loop;

  update auth.users
  set
    encrypted_password = extensions.crypt(temp_password, extensions.gen_salt('bf')),
    updated_at = now()
  where id = target_user_id;

  if not found then
    raise exception 'User account not found.';
  end if;

  update public.profiles
  set
    must_change_password = true,
    updated_at = now()
  where id = target_user_id;

  update public.password_reset_requests
  set
    request_status = 'completed',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    review_note = 'Password reset with emailed one-time temporary credential by administrator.'
  where user_id = target_user_id
    and request_status = 'pending';

  insert into public.auth_activity_log (
    actor_id,
    target_user_id,
    event_type,
    new_value
  )
  values (
    auth.uid(),
    target_user_id,
    'password_reset_completed',
    jsonb_build_object(
      'method', 'admin_emailed_one_time_reset',
      'temporary_password_length', 16
    )
  );

  return temp_password;
end;
$$;

revoke all on function public.admin_complete_password_reset(uuid) from public, anon;
grant execute on function public.admin_complete_password_reset(uuid) to authenticated;
