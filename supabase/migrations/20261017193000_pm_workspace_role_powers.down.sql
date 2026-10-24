create or replace function public.pm_project_access(p_project_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_visibility text;
  v_workspace_id uuid;
  v_workspace_role text;
  v_project_role text;
begin
  select p.visibility, p.workspace_id
    into v_visibility, v_workspace_id
  from public.pm_projects p
  where p.id = p_project_id;

  if v_workspace_id is null then
    return null;
  end if;

  select m.role into v_project_role
  from public.pm_project_members m
  where m.project_id = p_project_id
    and m.user_id = auth.uid();

  if v_visibility = 'invited' then
    return v_project_role;
  end if;

  if v_project_role is not null then
    return v_project_role;
  end if;

  v_workspace_role := public.pm_workspace_role(v_workspace_id);
  if v_workspace_role in ('Owner', 'Admin') then
    return 'Owner';
  end if;
  if v_workspace_role = 'Member' then
    return 'Editor';
  end if;
  return null;
end;
$$;

drop policy if exists pm_workspace_members_insert on public.pm_workspace_members;
create policy pm_workspace_members_insert
  on public.pm_workspace_members for insert to authenticated
  with check (public.pm_workspace_role(workspace_id) in ('Owner', 'Admin'));

drop policy if exists pm_workspace_members_update on public.pm_workspace_members;
create policy pm_workspace_members_update
  on public.pm_workspace_members for update to authenticated
  using (public.pm_workspace_role(workspace_id) in ('Owner', 'Admin'))
  with check (public.pm_workspace_role(workspace_id) in ('Owner', 'Admin'));

drop policy if exists pm_workspace_members_delete on public.pm_workspace_members;
create policy pm_workspace_members_delete
  on public.pm_workspace_members for delete to authenticated
  using (public.pm_workspace_role(workspace_id) in ('Owner', 'Admin'));

drop function if exists public.pm_app_admin();
