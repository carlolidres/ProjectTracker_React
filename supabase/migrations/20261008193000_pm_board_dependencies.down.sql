drop policy if exists pm_task_files_storage_delete on storage.objects;
drop policy if exists pm_task_files_storage_write on storage.objects;
drop policy if exists pm_task_files_storage_read on storage.objects;
delete from storage.buckets where id = 'pm-task-files';

drop table if exists public.pm_task_files;
drop table if exists public.pm_task_updates;
drop table if exists public.pm_task_dependencies;

alter table public.pm_projects drop constraint if exists pm_projects_working_days_check;
alter table public.pm_projects drop constraint if exists pm_projects_schedule_mode_check;
alter table public.pm_projects drop column if exists working_days;
alter table public.pm_projects drop column if exists schedule_mode;
