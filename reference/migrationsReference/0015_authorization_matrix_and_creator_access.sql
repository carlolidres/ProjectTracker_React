-- Stabilize creator-role access and add an Admin-managed authorization matrix.

grant usage on schema public to authenticated;
grant select, insert, update on table public.cnf_records to authenticated;
revoke all on table public.cnf_records from anon;

create or replace function public.can_create_cnf_record()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = auth.uid()
      and profile.status = 'active'
      and profile.role::text in ('Admin', 'AM', 'BM', 'NB', 'PL')
  );
$$;

revoke all on function public.can_create_cnf_record() from public, anon;
grant execute on function public.can_create_cnf_record() to authenticated;

drop policy if exists "Creator roles can create CNF records" on public.cnf_records;
create policy "Creator roles can create CNF records"
  on public.cnf_records
  for insert
  to authenticated
  with check (
    public.can_create_cnf_record()
    and created_by = auth.uid()
    and updated_by = auth.uid()
    and archive_status = 'active'
    and overall_status in ('open', 'in_progress', 'completed', 'closed', 'overdue')
  );

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  permission_key text not null,
  is_allowed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  constraint role_permissions_role_permission_unique unique (role, permission_key),
  constraint role_permissions_role_check
    check (role in ('Admin', 'AM', 'BM', 'NB', 'PL', 'PP', 'TSD', 'VAL')),
  constraint role_permissions_key_check
    check (
      permission_key in (
        'dashboard.view',
        'cnf.create',
        'cnf.view',
        'cnf.edit',
        'cnf.archive',
        'cnf.restore',
        'tasks.view',
        'reports.view',
        'kpi.view',
        'notifications.view',
        'lessons.view',
        'users.manage',
        'permissions.manage',
        'audit.view',
        'archived.view',
        'settings.manage'
      )
    )
);

create index if not exists role_permissions_role_idx on public.role_permissions(role);
create index if not exists role_permissions_permission_key_idx on public.role_permissions(permission_key);

create or replace function public.set_role_permission_audit_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.role = 'Admin'
     and new.permission_key in ('users.manage', 'permissions.manage', 'audit.view')
     and not new.is_allowed then
    raise exception 'Admin management and audit permissions cannot be disabled.';
  end if;

  if new.role in ('PP', 'TSD', 'VAL')
     and new.permission_key = 'cnf.create'
     and new.is_allowed then
    raise exception 'PP, TSD, and VAL cannot be granted direct CNF creation access.';
  end if;

  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists set_role_permission_audit_fields on public.role_permissions;
create trigger set_role_permission_audit_fields
  before insert or update on public.role_permissions
  for each row
  execute function public.set_role_permission_audit_fields();

alter table public.role_permissions enable row level security;

drop policy if exists "Active admins can read role permissions" on public.role_permissions;
drop policy if exists "Active admins can create role permissions" on public.role_permissions;
drop policy if exists "Active admins can update role permissions" on public.role_permissions;

create policy "Active admins can read role permissions"
  on public.role_permissions
  for select
  to authenticated
  using (public.is_active_admin());

create policy "Active admins can create role permissions"
  on public.role_permissions
  for insert
  to authenticated
  with check (public.is_active_admin());

create policy "Active admins can update role permissions"
  on public.role_permissions
  for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

grant select, insert, update on table public.role_permissions to authenticated;
revoke all on table public.role_permissions from anon;

with roles(role) as (
  values ('Admin'), ('AM'), ('BM'), ('NB'), ('PL'), ('PP'), ('TSD'), ('VAL')
),
permissions(permission_key) as (
  values
    ('dashboard.view'),
    ('cnf.create'),
    ('cnf.view'),
    ('cnf.edit'),
    ('cnf.archive'),
    ('cnf.restore'),
    ('tasks.view'),
    ('reports.view'),
    ('kpi.view'),
    ('notifications.view'),
    ('lessons.view'),
    ('users.manage'),
    ('permissions.manage'),
    ('audit.view'),
    ('archived.view'),
    ('settings.manage')
)
insert into public.role_permissions (role, permission_key, is_allowed)
select
  roles.role,
  permissions.permission_key,
  case
    when roles.role = 'Admin' then true
    when permissions.permission_key in (
      'dashboard.view',
      'cnf.view',
      'cnf.edit',
      'tasks.view',
      'reports.view',
      'kpi.view',
      'notifications.view',
      'lessons.view'
    ) then true
    when roles.role in ('AM', 'BM', 'NB', 'PL') and permissions.permission_key = 'cnf.create' then true
    else false
  end
from roles
cross join permissions
on conflict (role, permission_key) do nothing;

create or replace function public.can_create_cnf_record()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles as profile
    join public.role_permissions as permission
      on permission.role = profile.role::text
     and permission.permission_key = 'cnf.create'
     and permission.is_allowed
    where profile.id = auth.uid()
      and profile.status = 'active'
      and profile.role::text in ('Admin', 'AM', 'BM', 'NB', 'PL')
  );
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
        'user_profile_updated',
        'permission_changed',
        'cnf_created',
        'cnf_updated',
        'cnf_archived',
        'cnf_restored',
        'notification_created',
        'notification_read',
        'notification_unread',
        'notification_all_read',
        'report_exported',
        'target_date_missed',
        'target_date_revised',
        'missed_target_reason_encoded',
        'lesson_learned_added',
        'kpi_recalculated'
      )
    );
