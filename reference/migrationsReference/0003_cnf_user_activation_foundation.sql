-- CNF Tracker user activation foundation.
-- Profiles are created from Supabase Auth metadata and remain pending until an active Admin updates them.

alter table public.profiles
  add column if not exists role text not null default 'pending',
  add column if not exists department text,
  add column if not exists status text not null default 'pending',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists activated_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_role_check,
  add constraint profiles_role_check
    check (role in ('pending', 'Admin', 'VAL', 'TSD', 'PP', 'AM', 'BM', 'NB', 'PL'));

alter table public.profiles
  drop constraint if exists profiles_department_check,
  add constraint profiles_department_check
    check (department is null or department in ('Admin', 'VAL', 'TSD', 'PP', 'AM', 'BM', 'NB', 'PL'));

alter table public.profiles
  drop constraint if exists profiles_status_check,
  add constraint profiles_status_check
    check (status in ('pending', 'active', 'inactive'));

create index if not exists profiles_status_idx on public.profiles(status);
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_department_idx on public.profiles(department);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

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
      and role = 'Admin'
      and status = 'active'
  );
$$;

create or replace function public.safe_cnf_role(value text)
returns text
language sql
immutable
as $$
  select case
    when value in ('Admin', 'VAL', 'TSD', 'PP', 'AM', 'BM', 'NB', 'PL') then value
    else 'pending'
  end;
$$;

create or replace function public.safe_cnf_department(value text)
returns text
language sql
immutable
as $$
  select case
    when value in ('Admin', 'VAL', 'TSD', 'PP', 'AM', 'BM', 'NB', 'PL') then value
    else null
  end;
$$;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_url,
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
    public.safe_cnf_role(coalesce(new.raw_user_meta_data->>'requested_role', new.raw_user_meta_data->>'role')),
    public.safe_cnf_department(coalesce(new.raw_user_meta_data->>'requested_department', new.raw_user_meta_data->>'department')),
    'pending',
    now(),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row
  execute function public.handle_new_user_profile();

drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Active admins can read all profiles" on public.profiles;
drop policy if exists "Active admins can update profiles" on public.profiles;

create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Active admins can read all profiles"
  on public.profiles
  for select
  to authenticated
  using (public.is_active_admin());

create policy "Users can insert their own pending profile"
  on public.profiles
  for insert
  to authenticated
  with check (
    auth.uid() = id
    and status = 'pending'
    and role in ('pending', 'Admin', 'VAL', 'TSD', 'PP', 'AM', 'BM', 'NB', 'PL')
  );

create policy "Active admins can update profiles"
  on public.profiles
  for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create table if not exists public.auth_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint auth_activity_log_event_type_check
    check (event_type in ('sign_up_created', 'login_success', 'failed_login', 'status_check', 'sign_out'))
);

create index if not exists auth_activity_log_user_id_idx on public.auth_activity_log(user_id);
create index if not exists auth_activity_log_event_type_idx on public.auth_activity_log(event_type);
create index if not exists auth_activity_log_created_at_idx on public.auth_activity_log(created_at desc);

alter table public.auth_activity_log enable row level security;

drop policy if exists "Users can insert their own auth activity" on public.auth_activity_log;
drop policy if exists "Anonymous failed login activity can be recorded" on public.auth_activity_log;
drop policy if exists "Users can read their own auth activity" on public.auth_activity_log;
drop policy if exists "Active admins can read auth activity" on public.auth_activity_log;

create policy "Users can insert their own auth activity"
  on public.auth_activity_log
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Anonymous failed login activity can be recorded"
  on public.auth_activity_log
  for insert
  to anon
  with check (user_id is null and event_type = 'failed_login');

create policy "Users can read their own auth activity"
  on public.auth_activity_log
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Active admins can read auth activity"
  on public.auth_activity_log
  for select
  to authenticated
  using (public.is_active_admin());
