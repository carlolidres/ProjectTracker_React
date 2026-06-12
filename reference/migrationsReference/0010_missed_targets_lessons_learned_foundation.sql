-- Missed Target History and Lessons Learned foundation.
-- History records are append-only from the browser; no update or delete policies are created.

create table if not exists public.missed_target_history (
  id uuid primary key default gen_random_uuid(),
  cnf_record_id uuid not null references public.cnf_records(id) on delete cascade,
  cnf_reference text not null,
  product text not null,
  missed_target_field text not null,
  original_target_date date not null,
  actual_completion_date date,
  revised_target_date date,
  responsible_user_id uuid references public.profiles(id) on delete set null,
  responsible_user_email text,
  responsible_department public.cnf_owner_role_enum,
  reason_category text not null,
  other_reason_description text,
  detailed_reason text not null,
  corrective_preventive_action text,
  lesson_learned text,
  logged_by uuid not null references public.profiles(id) on delete restrict,
  logged_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint missed_target_reason_category_check
    check (
      reason_category in (
        'Awaiting client approval',
        'Awaiting TSD document',
        'Awaiting VAL document',
        'Awaiting PP schedule',
        'Awaiting batch document',
        'Awaiting protocol approval',
        'Awaiting test result',
        'Awaiting stability result',
        'Manufacturing schedule movement',
        'Material availability issue',
        'Document correction',
        'Resource constraint',
        'Other'
      )
    ),
  constraint missed_target_other_reason_check
    check (reason_category <> 'Other' or nullif(trim(other_reason_description), '') is not null)
);

create table if not exists public.lessons_learned (
  id uuid primary key default gen_random_uuid(),
  cnf_record_id uuid not null references public.cnf_records(id) on delete cascade,
  missed_target_history_id uuid references public.missed_target_history(id) on delete set null,
  lesson_title text not null,
  lesson_description text not null,
  category text not null,
  corrective_preventive_action text,
  owner_department public.cnf_owner_role_enum,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists missed_target_history_cnf_record_idx on public.missed_target_history(cnf_record_id);
create index if not exists missed_target_history_reference_idx on public.missed_target_history(cnf_reference);
create index if not exists missed_target_history_logged_at_idx on public.missed_target_history(logged_at desc);
create index if not exists missed_target_history_reason_idx on public.missed_target_history(reason_category);
create index if not exists missed_target_history_department_idx on public.missed_target_history(responsible_department);
create index if not exists lessons_learned_cnf_record_idx on public.lessons_learned(cnf_record_id);
create index if not exists lessons_learned_missed_target_idx on public.lessons_learned(missed_target_history_id);
create index if not exists lessons_learned_category_idx on public.lessons_learned(category);
create index if not exists lessons_learned_department_idx on public.lessons_learned(owner_department);
create index if not exists lessons_learned_created_at_idx on public.lessons_learned(created_at desc);

drop trigger if exists set_lessons_learned_updated_at on public.lessons_learned;
create trigger set_lessons_learned_updated_at
  before update on public.lessons_learned
  for each row
  execute function public.set_updated_at();

alter table public.missed_target_history enable row level security;
alter table public.lessons_learned enable row level security;

create policy "Active users can read permitted missed target history"
  on public.missed_target_history
  for select
  to authenticated
  using (public.can_read_cnf_record(cnf_record_id));

create policy "Responsible users can create missed target history"
  on public.missed_target_history
  for insert
  to authenticated
  with check (
    public.current_user_is_active()
    and logged_by = auth.uid()
    and public.can_update_cnf_record(cnf_record_id)
  );

create policy "Active users can read permitted lessons learned"
  on public.lessons_learned
  for select
  to authenticated
  using (public.can_read_cnf_record(cnf_record_id));

create policy "Responsible users can create lessons learned"
  on public.lessons_learned
  for insert
  to authenticated
  with check (
    public.current_user_is_active()
    and created_by = auth.uid()
    and public.can_update_cnf_record(cnf_record_id)
  );

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
        'notification_all_read',
        'report_exported',
        'target_date_missed',
        'target_date_revised',
        'missed_target_reason_encoded',
        'lesson_learned_added'
      )
    );
