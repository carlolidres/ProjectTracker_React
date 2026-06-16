-- Admin feedback triage status.

alter table public.app_feedback
  add column if not exists status text not null default 'not_addressed'
    check (status in ('addressed', 'not_addressed'));

create index if not exists app_feedback_status_idx on public.app_feedback (status);

drop policy if exists app_feedback_update_admin on public.app_feedback;
create policy app_feedback_update_admin
  on public.app_feedback
  for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

grant update on public.app_feedback to authenticated;
