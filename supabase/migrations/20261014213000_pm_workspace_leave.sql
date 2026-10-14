-- A member can delete their own workspace membership. Owner and Admin can still remove others.
-- The existing owner trigger still refuses to delete the last owner.

drop policy if exists pm_workspace_members_leave on public.pm_workspace_members;
create policy pm_workspace_members_leave
  on public.pm_workspace_members for delete to authenticated
  using (user_id = auth.uid());
