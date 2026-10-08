-- Commenter can discuss a project without editing its schedule. Holidays are skipped by scheduling.

alter table public.pm_projects
  add column if not exists holidays date[] not null default '{}';

alter table public.pm_project_members drop constraint if exists pm_project_members_role_check;
alter table public.pm_project_members
  add constraint pm_project_members_role_check
  check (role in ('Owner', 'Editor', 'Commenter', 'Viewer'));

create or replace function public.pm_can_comment(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.pm_project_access(p_project_id) in ('Owner', 'Editor', 'Commenter');
$$;

drop policy if exists pm_task_updates_insert on public.pm_task_updates;
create policy pm_task_updates_insert
  on public.pm_task_updates for insert to authenticated
  with check (public.pm_can_comment(project_id));

drop policy if exists pm_task_files_insert on public.pm_task_files;
create policy pm_task_files_insert
  on public.pm_task_files for insert to authenticated
  with check (public.pm_can_comment(project_id));

revoke all on function public.pm_can_comment(uuid) from public;
grant execute on function public.pm_can_comment(uuid) to authenticated;
