-- Standalone Project Tracker authentication and Admin approval foundation.
-- Apply after 001, 002, 007, and 008.

alter table public.profiles
  add column if not exists requested_role public.user_role,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_status_check;

alter table public.profiles
  add constraint profiles_status_check
    check (status in ('pending', 'active', 'inactive'));

create index if not exists profiles_status_idx on public.profiles(status);
create index if not exists profiles_requested_role_idx on public.profiles(requested_role);

create or replace function public.safe_project_tracker_role(value text)
returns public.user_role
language sql
immutable
set search_path = public
as $$
  select case lower(coalesce(value, ''))
    when 'am_bm_pl' then 'am_bm_pl'::public.user_role
    when 'pp' then 'pp'::public.user_role
    when 'tsd' then 'tsd'::public.user_role
    when 'val' then 'val'::public.user_role
    when 'qc' then 'qc'::public.user_role
    when 'view' then 'view'::public.user_role
    else 'view'::public.user_role
  end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested public.user_role :=
    public.safe_project_tracker_role(new.raw_user_meta_data->>'requested_role');
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    requested_role,
    status,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    'view',
    requested,
    'pending',
    now(),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        requested_role = coalesce(public.profiles.requested_role, excluded.requested_role),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and status = 'active';
$$;

create table if not exists public.auth_activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  old_value jsonb not null default '{}'::jsonb,
  new_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.auth_activity_log enable row level security;

drop policy if exists "Active admins can read auth activity" on public.auth_activity_log;
create policy "Active admins can read auth activity"
  on public.auth_activity_log for select to authenticated
  using (public.is_active_admin());

grant select on public.auth_activity_log to authenticated;

create or replace function public.admin_update_user_access(
  target_user_id uuid,
  next_role public.user_role,
  next_status text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_profile public.profiles;
  updated_profile public.profiles;
begin
  if not public.is_active_admin() then
    raise exception 'Only active administrators can manage users.';
  end if;

  if next_status not in ('pending', 'active', 'inactive') then
    raise exception 'Invalid account status.';
  end if;

  select * into previous_profile
  from public.profiles
  where id = target_user_id;

  if previous_profile.id is null then
    raise exception 'User profile not found.';
  end if;

  if target_user_id = auth.uid()
     and (next_role <> 'admin' or next_status <> 'active') then
    raise exception 'Administrators cannot remove their own active Admin access.';
  end if;

  update public.profiles
  set role = next_role,
      status = next_status,
      approved_by = case when next_status = 'active' then auth.uid() else approved_by end,
      approved_at = case when next_status = 'active' then now() else approved_at end,
      updated_at = now()
  where id = target_user_id
  returning * into updated_profile;

  insert into public.auth_activity_log (
    actor_id,
    target_user_id,
    event_type,
    old_value,
    new_value
  )
  values (
    auth.uid(),
    target_user_id,
    'user_access_updated',
    jsonb_build_object('role', previous_profile.role, 'status', previous_profile.status),
    jsonb_build_object('role', updated_profile.role, 'status', updated_profile.status)
  );

  return updated_profile;
end;
$$;

revoke all on function public.admin_update_user_access(uuid, public.user_role, text) from public, anon;
grant execute on function public.admin_update_user_access(uuid, public.user_role, text) to authenticated;

drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Active admins can read all profiles"
  on public.profiles for select to authenticated
  using (public.is_active_admin());

drop policy if exists "Authenticated users can read projects" on public.cnf_projects;
drop policy if exists "Authenticated users can insert projects" on public.cnf_projects;
drop policy if exists "Authenticated users can update projects" on public.cnf_projects;
create policy "Active users can read projects"
  on public.cnf_projects for select to authenticated using (public.is_active_user());
create policy "Active users can insert projects"
  on public.cnf_projects for insert to authenticated with check (public.is_active_user());
create policy "Active users can update projects"
  on public.cnf_projects for update to authenticated
  using (public.is_active_user()) with check (public.is_active_user());

drop policy if exists "Authenticated users can read support" on public.support_activities;
drop policy if exists "Authenticated users can insert support" on public.support_activities;
drop policy if exists "Authenticated users can update support" on public.support_activities;
create policy "Active users can read support"
  on public.support_activities for select to authenticated using (public.is_active_user());
create policy "Active users can insert support"
  on public.support_activities for insert to authenticated with check (public.is_active_user());
create policy "Active users can update support"
  on public.support_activities for update to authenticated
  using (public.is_active_user()) with check (public.is_active_user());

drop policy if exists "Authenticated users can read notifications" on public.notifications;
drop policy if exists "Authenticated users can manage notifications" on public.notifications;
create policy "Active users can read notifications"
  on public.notifications for select to authenticated using (public.is_active_user());
create policy "Active users can manage notifications"
  on public.notifications for all to authenticated
  using (public.is_active_user()) with check (public.is_active_user());

drop policy if exists "Authenticated users can insert audit logs" on public.audit_logs;
drop policy if exists "Authenticated users can read audit logs" on public.audit_logs;
create policy "Active users can insert audit logs"
  on public.audit_logs for insert to authenticated with check (public.is_active_user());
create policy "Active users can read audit logs"
  on public.audit_logs for select to authenticated using (public.is_active_user());

drop policy if exists "Authenticated users can read registry" on public.registry;
drop policy if exists "Authenticated users can manage registry" on public.registry;
create policy "Active users can read registry"
  on public.registry for select to authenticated using (public.is_active_user());
create policy "Active users can manage registry"
  on public.registry for all to authenticated
  using (public.is_active_user()) with check (public.is_active_user());

drop policy if exists "Users can submit admin messages" on public.admin_messages;
drop policy if exists "Authenticated users can read admin messages" on public.admin_messages;
create policy "Active users can submit admin messages"
  on public.admin_messages for insert to authenticated with check (public.is_active_user());
create policy "Active admins can read admin messages"
  on public.admin_messages for select to authenticated using (public.is_active_admin());
