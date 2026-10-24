-- Launch baseline, forecast, and quality gate. Existing task due dates become the first task baseline.
-- Project launch baseline stays empty until someone sets it.

alter table public.pm_projects
  add column if not exists baseline_launch_date date,
  add column if not exists forecast_launch_date date,
  add column if not exists risk_buffer_workdays integer not null default 2,
  add column if not exists quality_release_status text not null default 'PENDING_ASSESSMENT',
  add column if not exists launch_impact text not null default 'NOT_ASSESSED',
  add column if not exists launch_impact_reasons text not null default '',
  add column if not exists schedule_version integer not null default 0;

alter table public.pm_projects drop constraint if exists pm_projects_quality_release_check;
alter table public.pm_projects
  add constraint pm_projects_quality_release_check
  check (quality_release_status in ('CLEAR', 'BLOCKED', 'PENDING_ASSESSMENT'));

alter table public.pm_projects drop constraint if exists pm_projects_launch_impact_check;
alter table public.pm_projects
  add constraint pm_projects_launch_impact_check
  check (launch_impact in ('NO_IMPACT', 'AT_RISK', 'DELAYED', 'NOT_ASSESSED'));

alter table public.pm_projects drop constraint if exists pm_projects_risk_buffer_check;
alter table public.pm_projects
  add constraint pm_projects_risk_buffer_check
  check (risk_buffer_workdays >= 0);

alter table public.pm_board_tasks
  add column if not exists baseline_finish date,
  add column if not exists actual_finish date,
  add column if not exists quality_blocker boolean not null default false,
  add column if not exists is_launch boolean not null default false;

update public.pm_board_tasks
set baseline_finish = due_date
where baseline_finish is null
  and due_date is not null;
