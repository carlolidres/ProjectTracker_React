-- Status and priority labels belong to the project. Tasks keep the label id in status/priority.

do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'pm_board_tasks'
      and con.contype = 'c'
      and (
        pg_get_constraintdef(con.oid) ilike '%status in (%'
        or pg_get_constraintdef(con.oid) ilike '%priority in (%'
      )
  loop
    execute format('alter table public.pm_board_tasks drop constraint %I', constraint_row.conname);
  end loop;
end $$;

create table if not exists public.pm_board_labels (
  project_id uuid not null references public.pm_projects(id) on delete cascade,
  kind text not null check (kind in ('status', 'priority')),
  label_id text not null check (char_length(trim(label_id)) > 0),
  name text not null check (char_length(trim(name)) > 0),
  color text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  retired boolean not null default false,
  description text not null default '',
  semantic text not null default '',
  primary key (project_id, kind, label_id)
);

alter table public.pm_board_labels enable row level security;

drop policy if exists pm_board_labels_select on public.pm_board_labels;
create policy pm_board_labels_select
  on public.pm_board_labels for select to authenticated
  using (public.pm_project_access(project_id) is not null);

drop policy if exists pm_board_labels_insert on public.pm_board_labels;
create policy pm_board_labels_insert
  on public.pm_board_labels for insert to authenticated
  with check (public.pm_can_edit_board(project_id));

drop policy if exists pm_board_labels_update on public.pm_board_labels;
create policy pm_board_labels_update
  on public.pm_board_labels for update to authenticated
  using (public.pm_can_edit_board(project_id))
  with check (public.pm_can_edit_board(project_id));

drop policy if exists pm_board_labels_delete on public.pm_board_labels;
create policy pm_board_labels_delete
  on public.pm_board_labels for delete to authenticated
  using (public.pm_can_edit_board(project_id));

insert into public.pm_board_labels (project_id, kind, label_id, name, color, sort_order, semantic)
select project.id, seed.kind, seed.label_id, seed.name, seed.color, seed.sort_order, seed.semantic
from public.pm_projects project
cross join (
  values
    ('status'::text, 'Done'::text, 'Done'::text, '#00C875'::text, 0, 'Done'::text),
    ('status', 'Working on it', 'Working on it', '#FDAB3D', 1, 'Working on it'),
    ('status', 'Stuck', 'Stuck', '#E2445C', 2, 'Stuck'),
    ('status', 'Not Started', 'Not Started', '#C4C4C4', 3, 'Not Started'),
    ('priority', 'Low', 'Low', '#579BFC', 0, 'Low'),
    ('priority', 'Medium', 'Medium', '#5559DF', 1, 'Medium'),
    ('priority', 'High', 'High', '#401694', 2, 'High')
) as seed(kind, label_id, name, color, sort_order, semantic)
on conflict (project_id, kind, label_id) do nothing;
