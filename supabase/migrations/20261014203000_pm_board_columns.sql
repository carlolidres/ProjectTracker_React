-- Extra board columns and their cell values. Existing task fields stay on pm_board_tasks.

create table if not exists public.pm_board_columns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.pm_projects(id) on delete cascade,
  column_type text not null,
  title text not null check (char_length(trim(title)) > 0),
  settings jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists pm_board_columns_project_idx
  on public.pm_board_columns (project_id, position);

create table if not exists public.pm_board_cell_values (
  task_id uuid not null references public.pm_board_tasks(id) on delete cascade,
  column_id uuid not null references public.pm_board_columns(id) on delete cascade,
  value jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  primary key (task_id, column_id)
);

alter table public.pm_board_columns enable row level security;
alter table public.pm_board_cell_values enable row level security;

drop policy if exists pm_board_columns_select on public.pm_board_columns;
create policy pm_board_columns_select
  on public.pm_board_columns for select to authenticated
  using (public.pm_project_access(project_id) is not null);

drop policy if exists pm_board_columns_insert on public.pm_board_columns;
create policy pm_board_columns_insert
  on public.pm_board_columns for insert to authenticated
  with check (public.pm_can_edit_board(project_id));

drop policy if exists pm_board_columns_update on public.pm_board_columns;
create policy pm_board_columns_update
  on public.pm_board_columns for update to authenticated
  using (public.pm_can_edit_board(project_id))
  with check (public.pm_can_edit_board(project_id));

drop policy if exists pm_board_columns_delete on public.pm_board_columns;
create policy pm_board_columns_delete
  on public.pm_board_columns for delete to authenticated
  using (public.pm_can_edit_board(project_id));

drop policy if exists pm_board_cell_values_select on public.pm_board_cell_values;
create policy pm_board_cell_values_select
  on public.pm_board_cell_values for select to authenticated
  using (exists (
    select 1 from public.pm_board_columns c
    where c.id = column_id and public.pm_project_access(c.project_id) is not null
  ));

drop policy if exists pm_board_cell_values_insert on public.pm_board_cell_values;
create policy pm_board_cell_values_insert
  on public.pm_board_cell_values for insert to authenticated
  with check (exists (
    select 1 from public.pm_board_columns c
    where c.id = column_id and public.pm_can_edit_board(c.project_id)
  ));

drop policy if exists pm_board_cell_values_update on public.pm_board_cell_values;
create policy pm_board_cell_values_update
  on public.pm_board_cell_values for update to authenticated
  using (exists (
    select 1 from public.pm_board_columns c
    where c.id = column_id and public.pm_can_edit_board(c.project_id)
  ))
  with check (exists (
    select 1 from public.pm_board_columns c
    where c.id = column_id and public.pm_can_edit_board(c.project_id)
  ));

drop policy if exists pm_board_cell_values_delete on public.pm_board_cell_values;
create policy pm_board_cell_values_delete
  on public.pm_board_cell_values for delete to authenticated
  using (exists (
    select 1 from public.pm_board_columns c
    where c.id = column_id and public.pm_can_edit_board(c.project_id)
  ));

grant select, insert, update, delete on public.pm_board_columns to authenticated;
grant select, insert, update, delete on public.pm_board_cell_values to authenticated;
