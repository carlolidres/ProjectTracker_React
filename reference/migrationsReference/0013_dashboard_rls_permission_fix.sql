-- Restore explicit frontend privileges and reassert CNF record RLS behavior.
-- RLS policies filter rows only after the authenticated role has table privileges.

grant usage on schema public to authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert on table public.auth_activity_log to authenticated;
grant select, insert, update on table public.cnf_records to authenticated;
grant select, insert, update on table public.cnf_batches to authenticated;
grant select, insert, update on table public.notifications to authenticated;
grant select, insert on table public.missed_target_history to authenticated;
grant select, insert on table public.lessons_learned to authenticated;

revoke all on table public.cnf_records from anon;
revoke all on table public.cnf_batches from anon;
revoke all on table public.notifications from anon;
revoke all on table public.missed_target_history from anon;
revoke all on table public.lessons_learned from anon;

create or replace function public.current_active_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select profile.role
  from public.profiles as profile
  where profile.id = auth.uid()
    and profile.status = 'active'
    and profile.role in ('Admin', 'VAL', 'TSD', 'PP', 'AM', 'BM', 'NB', 'PL')
  limit 1;
$$;

create or replace function public.current_user_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = auth.uid()
      and profile.status = 'active'
      and profile.role in ('Admin', 'VAL', 'TSD', 'PP', 'AM', 'BM', 'NB', 'PL')
  );
$$;

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = auth.uid()
      and profile.status = 'active'
      and profile.role = 'Admin'
  );
$$;

create or replace function public.can_read_cnf_record(record_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cnf_records as record
    where record.id = record_id
      and (
        public.is_active_admin()
        or (
          public.current_user_is_active()
          and record.archive_status = 'active'
          and (
            record.created_by = auth.uid()
            or record.current_owner_user_id = auth.uid()
            or record.current_owner_role::text = public.current_active_role()
          )
        )
      )
  );
$$;

create or replace function public.can_update_cnf_record(record_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cnf_records as record
    where record.id = record_id
      and (
        public.is_active_admin()
        or (
          public.current_user_is_active()
          and record.archive_status = 'active'
          and public.current_active_role() in ('AM', 'BM', 'NB', 'PL', 'PP', 'TSD', 'VAL')
          and (
            record.created_by = auth.uid()
            or record.current_owner_user_id = auth.uid()
            or record.current_owner_role::text = public.current_active_role()
          )
        )
      )
  );
$$;

revoke all on function public.current_active_role() from public, anon;
revoke all on function public.current_user_is_active() from public, anon;
revoke all on function public.is_active_admin() from public, anon;
revoke all on function public.can_read_cnf_record(uuid) from public, anon;
revoke all on function public.can_update_cnf_record(uuid) from public, anon;

grant execute on function public.current_active_role() to authenticated;
grant execute on function public.current_user_is_active() to authenticated;
grant execute on function public.is_active_admin() to authenticated;
grant execute on function public.can_read_cnf_record(uuid) to authenticated;
grant execute on function public.can_update_cnf_record(uuid) to authenticated;

alter table public.cnf_records enable row level security;
alter table public.cnf_batches enable row level security;

drop policy if exists "Active admins can read all CNF records" on public.cnf_records;
drop policy if exists "Active users can read relevant CNF records" on public.cnf_records;
drop policy if exists "Creator roles can create CNF records" on public.cnf_records;
drop policy if exists "Role owners can update CNF records" on public.cnf_records;

create policy "Active admins can read all CNF records"
  on public.cnf_records
  for select
  to authenticated
  using (public.is_active_admin());

create policy "Active users can read relevant CNF records"
  on public.cnf_records
  for select
  to authenticated
  using (public.can_read_cnf_record(id));

create policy "Creator roles can create CNF records"
  on public.cnf_records
  for insert
  to authenticated
  with check (
    public.current_active_role() in ('Admin', 'AM', 'BM', 'NB', 'PL')
    and created_by = auth.uid()
    and archive_status = 'active'
  );

create policy "Role owners can update CNF records"
  on public.cnf_records
  for update
  to authenticated
  using (public.can_update_cnf_record(id))
  with check (public.can_update_cnf_record(id));

drop policy if exists "Active admins can read all CNF batches" on public.cnf_batches;
drop policy if exists "Active users can read relevant CNF batches" on public.cnf_batches;
drop policy if exists "Role owners can create CNF batches" on public.cnf_batches;
drop policy if exists "Role owners can update CNF batches" on public.cnf_batches;

create policy "Active admins can read all CNF batches"
  on public.cnf_batches
  for select
  to authenticated
  using (public.is_active_admin());

create policy "Active users can read relevant CNF batches"
  on public.cnf_batches
  for select
  to authenticated
  using (public.can_read_cnf_record(cnf_record_id));

create policy "Role owners can create CNF batches"
  on public.cnf_batches
  for insert
  to authenticated
  with check (public.can_update_cnf_record(cnf_record_id));

create policy "Role owners can update CNF batches"
  on public.cnf_batches
  for update
  to authenticated
  using (public.can_update_cnf_record(cnf_record_id))
  with check (public.can_update_cnf_record(cnf_record_id));

