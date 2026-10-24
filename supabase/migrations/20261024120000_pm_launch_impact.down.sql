alter table public.pm_board_tasks
  drop column if exists is_launch,
  drop column if exists quality_blocker,
  drop column if exists actual_finish,
  drop column if exists baseline_finish;

alter table public.pm_projects drop constraint if exists pm_projects_risk_buffer_check;
alter table public.pm_projects drop constraint if exists pm_projects_launch_impact_check;
alter table public.pm_projects drop constraint if exists pm_projects_quality_release_check;

alter table public.pm_projects
  drop column if exists schedule_version,
  drop column if exists launch_impact_reasons,
  drop column if exists launch_impact,
  drop column if exists quality_release_status,
  drop column if exists risk_buffer_workdays,
  drop column if exists forecast_launch_date,
  drop column if exists baseline_launch_date;
