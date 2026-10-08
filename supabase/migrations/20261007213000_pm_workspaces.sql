-- Independent Project Management boards.
-- Workspace → Project → Groups → Tasks.
-- Does not alter cnf_projects, support_activities, or project_management_tasks.

create table if not exists public.pm_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  description text not null default '',
  icon text not null default '📋',
  color text not null default '#579bfc',
  archived_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pm_workspace_members (
  workspace_id uuid not null references public.pm_workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('Owner', 'Admin', 'Member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists pm_workspace_members_user_idx
  on public.pm_workspace_members (user_id);

create table if not exists public.pm_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.pm_workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  description text not null default '',
  visibility text not null default 'workspace' check (visibility in ('workspace', 'invited')),
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pm_projects_workspace_idx
  on public.pm_projects (workspace_id, sort_order);

create table if not exists public.pm_project_members (
  project_id uuid not null references public.pm_projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('Owner', 'Editor', 'Viewer')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists pm_project_members_user_idx
  on public.pm_project_members (user_id);

create table if not exists public.pm_groups (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.pm_projects(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  color text not null default '#579bfc',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pm_groups_project_idx
  on public.pm_groups (project_id, sort_order);

create table if not exists public.pm_board_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.pm_projects(id) on delete cascade,
  group_id uuid not null references public.pm_groups(id) on delete restrict,
  parent_task_id uuid references public.pm_board_tasks(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text not null default '',
  status text not null default 'Not Started' check (
    status in ('Not Started', 'Working on it', 'Done', 'Stuck')
  ),
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  start_date date,
  due_date date,
  owner_id uuid references public.profiles(id) on delete set null,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pm_board_tasks_date_order check (
    start_date is null or due_date is null or due_date >= start_date
  ),
  constraint pm_board_tasks_not_self_parent check (parent_task_id is distinct from id)
);

create index if not exists pm_board_tasks_project_idx
  on public.pm_board_tasks (project_id, group_id, sort_order);
create index if not exists pm_board_tasks_parent_idx
  on public.pm_board_tasks (parent_task_id);

create or replace function public.pm_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pm_workspaces_touch on public.pm_workspaces;
create trigger pm_workspaces_touch before update on public.pm_workspaces
for each row execute procedure public.pm_touch_updated_at();

drop trigger if exists pm_projects_touch on public.pm_projects;
create trigger pm_projects_touch before update on public.pm_projects
for each row execute procedure public.pm_touch_updated_at();

drop trigger if exists pm_groups_touch on public.pm_groups;
create trigger pm_groups_touch before update on public.pm_groups
for each row execute procedure public.pm_touch_updated_at();

drop trigger if exists pm_board_tasks_touch on public.pm_board_tasks;
create trigger pm_board_tasks_touch before update on public.pm_board_tasks
for each row execute procedure public.pm_touch_updated_at();

create or replace function public.pm_workspace_role(p_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.pm_workspace_members m
  where m.workspace_id = p_workspace_id
    and m.user_id = auth.uid();
$$;

create or replace function public.pm_project_access(p_project_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_visibility text;
  v_workspace_id uuid;
  v_workspace_role text;
  v_project_role text;
begin
  select p.visibility, p.workspace_id
    into v_visibility, v_workspace_id
  from public.pm_projects p
  where p.id = p_project_id;

  if v_workspace_id is null then
    return null;
  end if;

  select m.role into v_project_role
  from public.pm_project_members m
  where m.project_id = p_project_id
    and m.user_id = auth.uid();

  if v_visibility = 'invited' then
    return v_project_role;
  end if;

  if v_project_role is not null then
    return v_project_role;
  end if;

  v_workspace_role := public.pm_workspace_role(v_workspace_id);
  if v_workspace_role in ('Owner', 'Admin') then
    return 'Owner';
  end if;
  if v_workspace_role = 'Member' then
    return 'Editor';
  end if;
  return null;
end;
$$;

create or replace function public.pm_can_edit_board(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.pm_project_access(p_project_id) in ('Owner', 'Editor');
$$;

create or replace function public.pm_can_manage_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.pm_project_access(p_project_id) = 'Owner';
$$;

create or replace function public.pm_guard_workspace_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owners integer;
begin
  if tg_op = 'DELETE' and old.role = 'Owner' then
    select count(*) into owners
    from public.pm_workspace_members
    where workspace_id = old.workspace_id
      and role = 'Owner'
      and user_id <> old.user_id;
    if owners < 1 then
      raise exception 'A workspace needs an owner';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.role = 'Owner' and new.role <> 'Owner' then
    select count(*) into owners
    from public.pm_workspace_members
    where workspace_id = old.workspace_id
      and role = 'Owner'
      and user_id <> old.user_id;
    if owners < 1 then
      raise exception 'A workspace needs an owner';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists pm_workspace_members_owner on public.pm_workspace_members;
create trigger pm_workspace_members_owner
before update or delete on public.pm_workspace_members
for each row execute procedure public.pm_guard_workspace_owner();

create or replace function public.pm_guard_project_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owners integer;
begin
  if tg_op = 'DELETE' and old.role = 'Owner' then
    select count(*) into owners
    from public.pm_project_members
    where project_id = old.project_id
      and role = 'Owner'
      and user_id <> old.user_id;
    if owners < 1 then
      raise exception 'A project needs an owner';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.role = 'Owner' and new.role <> 'Owner' then
    select count(*) into owners
    from public.pm_project_members
    where project_id = old.project_id
      and role = 'Owner'
      and user_id <> old.user_id;
    if owners < 1 then
      raise exception 'A project needs an owner';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists pm_project_members_owner on public.pm_project_members;
create trigger pm_project_members_owner
before update or delete on public.pm_project_members
for each row execute procedure public.pm_guard_project_owner();

create or replace function public.pm_guard_workspace_archive()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.archived_at is distinct from old.archived_at
     and public.pm_workspace_role(old.id) is distinct from 'Owner' then
    raise exception 'Only the workspace owner can archive or restore';
  end if;
  return new;
end;
$$;

drop trigger if exists pm_workspaces_archive on public.pm_workspaces;
create trigger pm_workspaces_archive
before update on public.pm_workspaces
for each row execute procedure public.pm_guard_workspace_archive();

create or replace function public.pm_guard_group_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.pm_board_tasks t where t.group_id = old.id) then
    raise exception 'Move or delete the tasks in this group first';
  end if;
  return old;
end;
$$;

drop trigger if exists pm_groups_delete_empty on public.pm_groups;
create trigger pm_groups_delete_empty
before delete on public.pm_groups
for each row execute procedure public.pm_guard_group_delete();

create or replace function public.pm_guard_task_shape()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_project uuid;
  parent_parent uuid;
  group_project uuid;
begin
  select g.project_id into group_project
  from public.pm_groups g
  where g.id = new.group_id;

  if group_project is null or group_project <> new.project_id then
    raise exception 'Task group must belong to the same project';
  end if;

  if new.parent_task_id is not null then
    select t.project_id, t.parent_task_id
      into parent_project, parent_parent
    from public.pm_board_tasks t
    where t.id = new.parent_task_id;

    if parent_project is null or parent_project <> new.project_id then
      raise exception 'Subtask must stay on the parent project';
    end if;
    if parent_parent is not null then
      raise exception 'Subtasks cannot contain subtasks';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists pm_board_tasks_shape on public.pm_board_tasks;
create trigger pm_board_tasks_shape
before insert or update on public.pm_board_tasks
for each row execute procedure public.pm_guard_task_shape();

create or replace function public.pm_sync_subtask_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.group_id is distinct from old.group_id and new.parent_task_id is null then
    update public.pm_board_tasks
    set group_id = new.group_id
    where parent_task_id = new.id
      and group_id is distinct from new.group_id;
  end if;
  return new;
end;
$$;

drop trigger if exists pm_board_tasks_sync_group on public.pm_board_tasks;
create trigger pm_board_tasks_sync_group
after update of group_id on public.pm_board_tasks
for each row execute procedure public.pm_sync_subtask_group();

create or replace function public.create_pm_workspace(
  p_name text,
  p_description text default '',
  p_icon text default '📋',
  p_color text default '#579bfc'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Active user required';
  end if;
  if char_length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'Name is required';
  end if;

  insert into public.pm_workspaces (name, description, icon, color, created_by)
  values (trim(p_name), coalesce(p_description, ''), coalesce(nullif(p_icon, ''), '📋'), coalesce(nullif(p_color, ''), '#579bfc'), auth.uid())
  returning id into new_id;

  insert into public.pm_workspace_members (workspace_id, user_id, role)
  values (new_id, auth.uid(), 'Owner');

  return new_id;
end;
$$;

create or replace function public.create_pm_project(
  p_workspace_id uuid,
  p_name text,
  p_description text default '',
  p_visibility text default 'workspace'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  next_order integer;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Active user required';
  end if;
  if public.pm_workspace_role(p_workspace_id) is null then
    raise exception 'Workspace membership required';
  end if;
  if char_length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'Name is required';
  end if;
  if p_visibility not in ('workspace', 'invited') then
    raise exception 'Unknown project access';
  end if;

  select coalesce(max(sort_order), 0) + 1 into next_order
  from public.pm_projects
  where workspace_id = p_workspace_id;

  insert into public.pm_projects (workspace_id, name, description, visibility, sort_order, created_by)
  values (p_workspace_id, trim(p_name), coalesce(p_description, ''), p_visibility, next_order, auth.uid())
  returning id into new_id;

  insert into public.pm_project_members (project_id, user_id, role)
  values (new_id, auth.uid(), 'Owner');

  return new_id;
end;
$$;

alter table public.pm_workspaces enable row level security;
alter table public.pm_workspace_members enable row level security;
alter table public.pm_projects enable row level security;
alter table public.pm_project_members enable row level security;
alter table public.pm_groups enable row level security;
alter table public.pm_board_tasks enable row level security;

drop policy if exists pm_workspaces_select on public.pm_workspaces;
create policy pm_workspaces_select
  on public.pm_workspaces for select to authenticated
  using (public.pm_workspace_role(id) is not null);

drop policy if exists pm_workspaces_update on public.pm_workspaces;
create policy pm_workspaces_update
  on public.pm_workspaces for update to authenticated
  using (public.pm_workspace_role(id) in ('Owner', 'Admin'))
  with check (public.pm_workspace_role(id) in ('Owner', 'Admin'));

drop policy if exists pm_workspace_members_select on public.pm_workspace_members;
create policy pm_workspace_members_select
  on public.pm_workspace_members for select to authenticated
  using (public.pm_workspace_role(workspace_id) is not null);

drop policy if exists pm_workspace_members_insert on public.pm_workspace_members;
create policy pm_workspace_members_insert
  on public.pm_workspace_members for insert to authenticated
  with check (public.pm_workspace_role(workspace_id) in ('Owner', 'Admin'));

drop policy if exists pm_workspace_members_update on public.pm_workspace_members;
create policy pm_workspace_members_update
  on public.pm_workspace_members for update to authenticated
  using (public.pm_workspace_role(workspace_id) in ('Owner', 'Admin'))
  with check (public.pm_workspace_role(workspace_id) in ('Owner', 'Admin'));

drop policy if exists pm_workspace_members_delete on public.pm_workspace_members;
create policy pm_workspace_members_delete
  on public.pm_workspace_members for delete to authenticated
  using (public.pm_workspace_role(workspace_id) in ('Owner', 'Admin'));

drop policy if exists pm_projects_select on public.pm_projects;
create policy pm_projects_select
  on public.pm_projects for select to authenticated
  using (public.pm_project_access(id) is not null);

drop policy if exists pm_projects_update on public.pm_projects;
create policy pm_projects_update
  on public.pm_projects for update to authenticated
  using (public.pm_can_manage_project(id))
  with check (public.pm_can_manage_project(id));

drop policy if exists pm_project_members_select on public.pm_project_members;
create policy pm_project_members_select
  on public.pm_project_members for select to authenticated
  using (public.pm_project_access(project_id) is not null);

drop policy if exists pm_project_members_insert on public.pm_project_members;
create policy pm_project_members_insert
  on public.pm_project_members for insert to authenticated
  with check (public.pm_can_manage_project(project_id));

drop policy if exists pm_project_members_update on public.pm_project_members;
create policy pm_project_members_update
  on public.pm_project_members for update to authenticated
  using (public.pm_can_manage_project(project_id))
  with check (public.pm_can_manage_project(project_id));

drop policy if exists pm_project_members_delete on public.pm_project_members;
create policy pm_project_members_delete
  on public.pm_project_members for delete to authenticated
  using (public.pm_can_manage_project(project_id));

drop policy if exists pm_groups_select on public.pm_groups;
create policy pm_groups_select
  on public.pm_groups for select to authenticated
  using (public.pm_project_access(project_id) is not null);

drop policy if exists pm_groups_insert on public.pm_groups;
create policy pm_groups_insert
  on public.pm_groups for insert to authenticated
  with check (public.pm_can_edit_board(project_id));

drop policy if exists pm_groups_update on public.pm_groups;
create policy pm_groups_update
  on public.pm_groups for update to authenticated
  using (public.pm_can_edit_board(project_id))
  with check (public.pm_can_edit_board(project_id));

drop policy if exists pm_groups_delete on public.pm_groups;
create policy pm_groups_delete
  on public.pm_groups for delete to authenticated
  using (public.pm_can_edit_board(project_id));

drop policy if exists pm_board_tasks_select on public.pm_board_tasks;
create policy pm_board_tasks_select
  on public.pm_board_tasks for select to authenticated
  using (public.pm_project_access(project_id) is not null);

drop policy if exists pm_board_tasks_insert on public.pm_board_tasks;
create policy pm_board_tasks_insert
  on public.pm_board_tasks for insert to authenticated
  with check (public.pm_can_edit_board(project_id));

drop policy if exists pm_board_tasks_update on public.pm_board_tasks;
create policy pm_board_tasks_update
  on public.pm_board_tasks for update to authenticated
  using (public.pm_can_edit_board(project_id))
  with check (public.pm_can_edit_board(project_id));

drop policy if exists pm_board_tasks_delete on public.pm_board_tasks;
create policy pm_board_tasks_delete
  on public.pm_board_tasks for delete to authenticated
  using (public.pm_can_edit_board(project_id));

grant select, update on public.pm_workspaces to authenticated;
grant select, insert, update, delete on public.pm_workspace_members to authenticated;
grant select, update on public.pm_projects to authenticated;
grant select, insert, update, delete on public.pm_project_members to authenticated;
grant select, insert, update, delete on public.pm_groups to authenticated;
grant select, insert, update, delete on public.pm_board_tasks to authenticated;

revoke all on function public.pm_workspace_role(uuid) from public;
revoke all on function public.pm_project_access(uuid) from public;
revoke all on function public.pm_can_edit_board(uuid) from public;
revoke all on function public.pm_can_manage_project(uuid) from public;
revoke all on function public.create_pm_workspace(text, text, text, text) from public;
revoke all on function public.create_pm_project(uuid, text, text, text) from public;

grant execute on function public.pm_workspace_role(uuid) to authenticated;
grant execute on function public.pm_project_access(uuid) to authenticated;
grant execute on function public.pm_can_edit_board(uuid) to authenticated;
grant execute on function public.pm_can_manage_project(uuid) to authenticated;
grant execute on function public.create_pm_workspace(text, text, text, text) to authenticated;
grant execute on function public.create_pm_project(uuid, text, text, text) to authenticated;
