-- Task dependencies, updates, files, and project scheduling for the independent board.

alter table public.pm_projects
  add column if not exists schedule_mode text not null default 'flexible',
  add column if not exists working_days smallint[] not null default '{1,2,3,4,5}';

alter table public.pm_projects drop constraint if exists pm_projects_schedule_mode_check;
alter table public.pm_projects
  add constraint pm_projects_schedule_mode_check
  check (schedule_mode in ('flexible', 'strict', 'none'));

alter table public.pm_projects drop constraint if exists pm_projects_working_days_check;
alter table public.pm_projects
  add constraint pm_projects_working_days_check
  check (
    cardinality(working_days) > 0
    and working_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
  );

create table if not exists public.pm_task_dependencies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.pm_projects(id) on delete cascade,
  successor_id uuid not null references public.pm_board_tasks(id) on delete cascade,
  predecessor_id uuid not null references public.pm_board_tasks(id) on delete cascade,
  relation_type text not null default 'FS' check (relation_type in ('FS', 'SS', 'FF', 'SF')),
  lag_days integer not null default 0,
  created_at timestamptz not null default now(),
  constraint pm_task_dependencies_not_self check (successor_id <> predecessor_id),
  constraint pm_task_dependencies_unique unique (successor_id, predecessor_id)
);

create index if not exists pm_task_dependencies_project_idx
  on public.pm_task_dependencies (project_id);

create table if not exists public.pm_task_updates (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.pm_board_tasks(id) on delete cascade,
  project_id uuid not null references public.pm_projects(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  author_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists pm_task_updates_task_idx
  on public.pm_task_updates (task_id, created_at desc);

create table if not exists public.pm_task_files (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.pm_board_tasks(id) on delete cascade,
  project_id uuid not null references public.pm_projects(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists pm_task_files_task_idx
  on public.pm_task_files (task_id, created_at desc);

alter table public.pm_task_dependencies enable row level security;
alter table public.pm_task_updates enable row level security;
alter table public.pm_task_files enable row level security;

drop policy if exists pm_task_dependencies_select on public.pm_task_dependencies;
create policy pm_task_dependencies_select
  on public.pm_task_dependencies for select to authenticated
  using (public.pm_project_access(project_id) is not null);

drop policy if exists pm_task_dependencies_insert on public.pm_task_dependencies;
create policy pm_task_dependencies_insert
  on public.pm_task_dependencies for insert to authenticated
  with check (public.pm_can_edit_board(project_id));

drop policy if exists pm_task_dependencies_update on public.pm_task_dependencies;
create policy pm_task_dependencies_update
  on public.pm_task_dependencies for update to authenticated
  using (public.pm_can_edit_board(project_id))
  with check (public.pm_can_edit_board(project_id));

drop policy if exists pm_task_dependencies_delete on public.pm_task_dependencies;
create policy pm_task_dependencies_delete
  on public.pm_task_dependencies for delete to authenticated
  using (public.pm_can_edit_board(project_id));

drop policy if exists pm_task_updates_select on public.pm_task_updates;
create policy pm_task_updates_select
  on public.pm_task_updates for select to authenticated
  using (public.pm_project_access(project_id) is not null);

drop policy if exists pm_task_updates_insert on public.pm_task_updates;
create policy pm_task_updates_insert
  on public.pm_task_updates for insert to authenticated
  with check (public.pm_can_edit_board(project_id));

drop policy if exists pm_task_updates_delete on public.pm_task_updates;
create policy pm_task_updates_delete
  on public.pm_task_updates for delete to authenticated
  using (public.pm_can_edit_board(project_id));

drop policy if exists pm_task_files_select on public.pm_task_files;
create policy pm_task_files_select
  on public.pm_task_files for select to authenticated
  using (public.pm_project_access(project_id) is not null);

drop policy if exists pm_task_files_insert on public.pm_task_files;
create policy pm_task_files_insert
  on public.pm_task_files for insert to authenticated
  with check (public.pm_can_edit_board(project_id));

drop policy if exists pm_task_files_delete on public.pm_task_files;
create policy pm_task_files_delete
  on public.pm_task_files for delete to authenticated
  using (public.pm_can_edit_board(project_id));

grant select, insert, update, delete on public.pm_task_dependencies to authenticated;
grant select, insert, delete on public.pm_task_updates to authenticated;
grant select, insert, delete on public.pm_task_files to authenticated;

insert into storage.buckets (id, name, public)
values ('pm-task-files', 'pm-task-files', false)
on conflict (id) do nothing;

drop policy if exists pm_task_files_storage_read on storage.objects;
create policy pm_task_files_storage_read
  on storage.objects for select to authenticated
  using (
    bucket_id = 'pm-task-files'
    and public.pm_project_access(((storage.foldername(name))[1])::uuid) is not null
  );

drop policy if exists pm_task_files_storage_write on storage.objects;
create policy pm_task_files_storage_write
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'pm-task-files'
    and public.pm_can_edit_board(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists pm_task_files_storage_delete on storage.objects;
create policy pm_task_files_storage_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'pm-task-files'
    and public.pm_can_edit_board(((storage.foldername(name))[1])::uuid)
  );
