drop policy if exists pm_task_files_insert on public.pm_task_files;
create policy pm_task_files_insert
  on public.pm_task_files for insert to authenticated
  with check (public.pm_can_edit_board(project_id));

drop policy if exists pm_task_updates_insert on public.pm_task_updates;
create policy pm_task_updates_insert
  on public.pm_task_updates for insert to authenticated
  with check (public.pm_can_edit_board(project_id));

drop function if exists public.pm_can_comment(uuid);

alter table public.pm_project_members drop constraint if exists pm_project_members_role_check;
alter table public.pm_project_members
  add constraint pm_project_members_role_check
  check (role in ('Owner', 'Editor', 'Viewer'));

alter table public.pm_projects drop column if exists holidays;
