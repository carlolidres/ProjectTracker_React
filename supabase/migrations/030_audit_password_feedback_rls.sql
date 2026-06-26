-- BUG-001: one-time random admin reset password (no committed default)
-- BUG-002 (partial): audit read limited to admin/view; view role cannot mutate project/support rows
-- BUG-004: allow active admins to insert own feedback rows for testing/documentation

drop function if exists public.admin_complete_password_reset(uuid);

create or replace function public.admin_complete_password_reset(target_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  temp_password text;
begin
  if not public.is_active_admin() then
    raise exception 'Only active administrators can reset passwords.';
  end if;

  temp_password := replace(
    replace(encode(extensions.gen_random_bytes(12), 'base64'), '/', 'A'),
    '+',
    'B'
  );

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
    review_note = 'Password reset with one-time temporary credential by administrator.'
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
    jsonb_build_object('method', 'admin_one_time_reset')
  );

  return temp_password;
end;
$$;

revoke all on function public.admin_complete_password_reset(uuid) from public, anon;
grant execute on function public.admin_complete_password_reset(uuid) to authenticated;

create or replace function public.clear_must_change_password()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  update public.profiles
  set
    must_change_password = false,
    updated_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function public.clear_must_change_password() from public, anon;
grant execute on function public.clear_must_change_password() to authenticated;

-- Audit trail: active admin or view role only
drop policy if exists "Active users can read audit logs" on public.audit_logs;
create policy "Admin and view can read audit logs"
  on public.audit_logs for select to authenticated
  using (
    public.is_active_user()
    and (
      public.is_active_admin()
      or public.current_user_role() = 'view'::public.user_role
    )
  );

-- View role: read-only for core workflow tables
drop policy if exists "Active users can insert projects" on public.cnf_projects;
drop policy if exists "Active users can update projects" on public.cnf_projects;

create policy "Active non-view users can insert projects"
  on public.cnf_projects for insert to authenticated
  with check (
    public.is_active_user()
    and public.current_user_role() is distinct from 'view'::public.user_role
  );

create policy "Active non-view users can update projects"
  on public.cnf_projects for update to authenticated
  using (
    public.is_active_user()
    and public.current_user_role() is distinct from 'view'::public.user_role
  )
  with check (
    public.is_active_user()
    and public.current_user_role() is distinct from 'view'::public.user_role
  );

drop policy if exists "Active users can insert support" on public.support_activities;
drop policy if exists "Active users can update support" on public.support_activities;

create policy "Active non-view users can insert support"
  on public.support_activities for insert to authenticated
  with check (
    public.is_active_user()
    and public.current_user_role() is distinct from 'view'::public.user_role
  );

create policy "Active non-view users can update support"
  on public.support_activities for update to authenticated
  using (
    public.is_active_user()
    and public.current_user_role() is distinct from 'view'::public.user_role
  )
  with check (
    public.is_active_user()
    and public.current_user_role() is distinct from 'view'::public.user_role
  );

-- Admin self-test feedback inserts (BUG-004)
drop policy if exists app_feedback_insert_authenticated on public.app_feedback;

create policy app_feedback_insert_authenticated
  on public.app_feedback
  for insert
  to authenticated
  with check (
    public.is_active_user()
    and auth.uid() = user_id
  );
