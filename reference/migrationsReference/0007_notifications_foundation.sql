-- Notifications foundation for CNF due dates, target dates, and read/unread history.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  cnf_record_id uuid references public.cnf_records(id) on delete cascade,
  cnf_reference text,
  product text,
  responsible_user_id uuid references public.profiles(id) on delete cascade,
  responsible_role public.cnf_owner_role_enum,
  responsible_department public.cnf_owner_role_enum,
  target_field text,
  due_date date,
  criticality text not null,
  days_remaining integer,
  days_overdue integer,
  notification_status text not null default 'unread',
  notification_type text not null,
  title text not null,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  created_by_system boolean not null default true,
  source text not null default 'frontend_foundation',
  metadata jsonb not null default '{}'::jsonb,
  constraint notifications_criticality_check
    check (criticality in ('low', 'medium', 'high', 'critical', 'overdue')),
  constraint notifications_status_check
    check (notification_status in ('unread', 'read')),
  constraint notifications_type_check
    check (
      notification_type in (
        'fg_due_date',
        'target_manufacturing_date',
        'mo_bmr_po_submission_target',
        'mo_bmr_po_activation_target',
        'protocol_availability_target',
        'report_submission_target',
        'cnf_record_updated',
        'cnf_record_archived',
        'cnf_record_restored'
      )
    )
);

create unique index if not exists notifications_unique_target_idx
  on public.notifications (
    coalesce(responsible_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(cnf_record_id, '00000000-0000-0000-0000-000000000000'::uuid),
    notification_type,
    target_field,
    coalesce(due_date, '1900-01-01'::date)
  );

create index if not exists notifications_responsible_user_idx on public.notifications(responsible_user_id);
create index if not exists notifications_responsible_role_idx on public.notifications(responsible_role);
create index if not exists notifications_status_idx on public.notifications(notification_status);
create index if not exists notifications_criticality_idx on public.notifications(criticality);
create index if not exists notifications_due_date_idx on public.notifications(due_date);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);
create index if not exists notifications_cnf_record_idx on public.notifications(cnf_record_id);

alter table public.notifications enable row level security;

drop policy if exists "Active admins can read all notifications" on public.notifications;
drop policy if exists "Users can read their notifications" on public.notifications;
drop policy if exists "Active users can create their own notifications" on public.notifications;
drop policy if exists "Users can update their notifications" on public.notifications;
drop policy if exists "Active admins can update all notifications" on public.notifications;

create policy "Active admins can read all notifications"
  on public.notifications
  for select
  to authenticated
  using (public.is_active_admin());

create policy "Users can read their notifications"
  on public.notifications
  for select
  to authenticated
  using (
    public.current_user_is_active()
    and (
      responsible_user_id = auth.uid()
      or (
        responsible_user_id is null
        and responsible_role::text = public.current_active_role()
      )
    )
  );

create policy "Active users can create their own notifications"
  on public.notifications
  for insert
  to authenticated
  with check (
    public.current_user_is_active()
    and (
      responsible_user_id = auth.uid()
      or public.is_active_admin()
    )
  );

create policy "Users can update their notifications"
  on public.notifications
  for update
  to authenticated
  using (
    public.current_user_is_active()
    and responsible_user_id = auth.uid()
  )
  with check (
    public.current_user_is_active()
    and responsible_user_id = auth.uid()
  );

create policy "Active admins can update all notifications"
  on public.notifications
  for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

alter table public.auth_activity_log
  drop constraint if exists auth_activity_log_event_type_check,
  add constraint auth_activity_log_event_type_check
    check (
      event_type in (
        'sign_up_created',
        'login_success',
        'failed_login',
        'status_check',
        'sign_out',
        'user_activated',
        'user_deactivated',
        'user_reactivated',
        'user_role_changed',
        'user_department_changed',
        'user_profile_updated',
        'cnf_created',
        'cnf_updated',
        'cnf_archived',
        'cnf_restored',
        'notification_created',
        'notification_read',
        'notification_unread',
        'notification_all_read'
      )
    );
