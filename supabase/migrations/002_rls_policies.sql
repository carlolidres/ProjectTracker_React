-- Row Level Security policies

alter table public.profiles enable row level security;
alter table public.cnf_projects enable row level security;
alter table public.support_activities enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.registry enable row level security;
alter table public.admin_messages enable row level security;

-- Helper: get current user role
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Profiles
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.current_user_role() = 'admin');

create policy "Admins can update profiles"
  on public.profiles for update
  using (public.current_user_role() = 'admin');

-- Registry: all authenticated can read
create policy "Authenticated users can read registry"
  on public.registry for select
  to authenticated
  using (true);

create policy "Admins can manage registry"
  on public.registry for all
  using (public.current_user_role() = 'admin');

-- CNF Projects: read for all authenticated
create policy "Authenticated users can read projects"
  on public.cnf_projects for select
  to authenticated
  using (true);

create policy "Editors can insert projects"
  on public.cnf_projects for insert
  to authenticated
  with check (public.current_user_role() in ('am_bm_pl', 'pp', 'tsd', 'val', 'qc', 'admin'));

create policy "Editors can update projects"
  on public.cnf_projects for update
  to authenticated
  using (public.current_user_role() in ('am_bm_pl', 'pp', 'tsd', 'val', 'qc', 'admin'));

-- Support activities
create policy "Authenticated users can read support"
  on public.support_activities for select
  to authenticated
  using (true);

create policy "Editors can write support"
  on public.support_activities for insert
  to authenticated
  with check (public.current_user_role() in ('tsd', 'val', 'admin', 'am_bm_pl'));

create policy "Editors can update support"
  on public.support_activities for update
  to authenticated
  using (public.current_user_role() in ('tsd', 'val', 'admin', 'am_bm_pl'));

-- Notifications
create policy "Authenticated users can read notifications"
  on public.notifications for select
  to authenticated
  using (true);

create policy "Authenticated users can manage notifications"
  on public.notifications for all
  to authenticated
  using (public.current_user_role() in ('admin', 'am_bm_pl', 'pp', 'tsd', 'val', 'qc', 'view'));

-- Audit logs: insert for authenticated, read for admin/view
create policy "Authenticated users can insert audit logs"
  on public.audit_logs for insert
  to authenticated
  with check (true);

create policy "Admin and view can read audit logs"
  on public.audit_logs for select
  to authenticated
  using (public.current_user_role() in ('admin', 'view'));

-- Admin messages
create policy "Users can submit admin messages"
  on public.admin_messages for insert
  to authenticated
  with check (auth.uid() is not null);

create policy "Admins can read admin messages"
  on public.admin_messages for select
  using (public.current_user_role() = 'admin');
