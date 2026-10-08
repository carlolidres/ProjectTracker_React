alter table public.pm_projects drop constraint if exists pm_projects_source_kind_check;
alter table public.pm_projects
  drop column if exists source_record_id,
  drop column if exists source_id,
  drop column if exists source_kind;
