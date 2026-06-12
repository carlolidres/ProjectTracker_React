-- Admin User Management foundation.
-- Adds requested role/department fields and audit-ready activity events for Admin profile changes.

alter table public.profiles
  add column if not exists requested_role text,
  add column if not exists requested_department text;

alter table public.profiles
  drop constraint if exists profiles_requested_role_check,
  add constraint profiles_requested_role_check
    check (requested_role is null or requested_role in ('Admin', 'VAL', 'TSD', 'PP', 'AM', 'BM', 'NB', 'PL'));

alter table public.profiles
  drop constraint if exists profiles_requested_department_check,
  add constraint profiles_requested_department_check
    check (requested_department is null or requested_department in ('Admin', 'VAL', 'TSD', 'PP', 'AM', 'BM', 'NB', 'PL'));

update public.profiles
set requested_role = case when role = 'pending' then null else role end
where requested_role is null;

update public.profiles
set requested_department = department
where requested_department is null;

create index if not exists profiles_requested_role_idx on public.profiles(requested_role);
create index if not exists profiles_requested_department_idx on public.profiles(requested_department);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_requested_role text := public.safe_cnf_role(coalesce(new.raw_user_meta_data->>'requested_role', new.raw_user_meta_data->>'role'));
  safe_requested_department text := public.safe_cnf_department(coalesce(new.raw_user_meta_data->>'requested_department', new.raw_user_meta_data->>'department'));
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    requested_role,
    requested_department,
    role,
    department,
    status,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    nullif(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), ''),
    nullif(coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'), ''),
    nullif(safe_requested_role, 'pending'),
    safe_requested_department,
    'pending',
    safe_requested_department,
    'pending',
    now(),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
        requested_role = coalesce(public.profiles.requested_role, excluded.requested_role),
        requested_department = coalesce(public.profiles.requested_department, excluded.requested_department),
        updated_at = now();

  return new;
end;
$$;

alter table public.auth_activity_log
  drop constraint if exists auth_activity_log_event_type_check,
  add constraint auth_activity_log_event_type_check
    check (
      event_type in (
        'sign_up_created',
        'login_success',
        'failed_login',
        'status_check',
        'sign_out',
        'user_activated',
        'user_deactivated',
        'user_reactivated',
        'user_role_changed',
        'user_department_changed',
        'user_profile_updated'
      )
    );
