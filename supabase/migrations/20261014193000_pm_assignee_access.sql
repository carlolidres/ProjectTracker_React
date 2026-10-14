-- A task owner can open the workspace and its shared projects.
-- An invited project still opens only when that person is a project member.

create or replace function public.grant_pm_assignee(p_project_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_visibility text;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if p_user_id is null then
    return;
  end if;
  if not public.pm_can_edit_board(p_project_id) then
    raise exception 'You cannot share this project';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    return;
  end if;

  select workspace_id, visibility
    into v_workspace_id, v_visibility
  from public.pm_projects
  where id = p_project_id;

  if v_workspace_id is null then
    return;
  end if;

  insert into public.pm_workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, p_user_id, 'Member')
  on conflict (workspace_id, user_id) do nothing;

  if v_visibility = 'invited' then
    insert into public.pm_project_members (project_id, user_id, role)
    values (p_project_id, p_user_id, 'Editor')
    on conflict (project_id, user_id) do nothing;
  end if;
end;
$$;

revoke all on function public.grant_pm_assignee(uuid, uuid) from public;
grant execute on function public.grant_pm_assignee(uuid, uuid) to authenticated;
