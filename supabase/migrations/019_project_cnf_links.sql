-- Mother/child CNF entry linking between projects
create table if not exists public.project_cnf_links (
  child_project_id text primary key,
  mother_project_id text not null,
  link_status text not null default 'linked' check (link_status in ('linked', 'unlinked')),
  mother_cnf_references jsonb not null default '[]'::jsonb,
  copied_entry_count integer not null default 0,
  linked_at timestamptz not null default now(),
  linked_by text,
  unlinked_at timestamptz,
  unlinked_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_cnf_links_mother
  on public.project_cnf_links (mother_project_id);

create index if not exists idx_project_cnf_links_status
  on public.project_cnf_links (link_status);

alter table public.project_cnf_links enable row level security;

drop policy if exists project_cnf_links_select on public.project_cnf_links;
drop policy if exists project_cnf_links_insert on public.project_cnf_links;
drop policy if exists project_cnf_links_update on public.project_cnf_links;
drop policy if exists project_cnf_links_delete on public.project_cnf_links;

create policy project_cnf_links_select on public.project_cnf_links
  for select to authenticated using (public.is_active_user());

create policy project_cnf_links_insert on public.project_cnf_links
  for insert to authenticated with check (public.is_active_user());

create policy project_cnf_links_update on public.project_cnf_links
  for update to authenticated using (public.is_active_user()) with check (public.is_active_user());

create policy project_cnf_links_delete on public.project_cnf_links
  for delete to authenticated using (public.is_active_user());

grant select, insert, update, delete on public.project_cnf_links to authenticated;
