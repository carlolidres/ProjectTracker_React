-- Links a board project to the spreadsheet project or support activity it was created from.

alter table public.pm_projects
  add column if not exists source_kind text,
  add column if not exists source_id text,
  add column if not exists source_record_id text;

alter table public.pm_projects drop constraint if exists pm_projects_source_kind_check;
alter table public.pm_projects
  add constraint pm_projects_source_kind_check
  check (source_kind is null or source_kind in ('spreadsheet', 'support'));
