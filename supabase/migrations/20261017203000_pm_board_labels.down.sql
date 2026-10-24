drop table if exists public.pm_board_labels;

alter table public.pm_board_tasks drop constraint if exists pm_board_tasks_status_check;
alter table public.pm_board_tasks
  add constraint pm_board_tasks_status_check
  check (status in ('Not Started', 'Working on it', 'Done', 'Stuck'));

alter table public.pm_board_tasks drop constraint if exists pm_board_tasks_priority_check;
alter table public.pm_board_tasks
  add constraint pm_board_tasks_priority_check
  check (priority in ('Low', 'Medium', 'High'));
