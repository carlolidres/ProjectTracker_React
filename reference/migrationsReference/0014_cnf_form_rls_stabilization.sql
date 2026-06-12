-- Stabilize the CNF create contract and add the requested form values.

alter type public.cnf_status_enum add value if not exists 'CNF Approved.';

alter table public.cnf_records
  add column if not exists unique_batch_no text;

grant usage on schema public to authenticated;
grant select, insert, update on table public.cnf_records to authenticated;
revoke all on table public.cnf_records from anon;

create or replace function public.can_create_cnf_record()
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
      and profile.role in ('Admin', 'AM', 'BM', 'NB', 'PL')
  );
$$;

revoke all on function public.can_create_cnf_record() from public, anon;
grant execute on function public.can_create_cnf_record() to authenticated;

create or replace function public.set_cnf_record_audit_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by = coalesce(new.created_by, auth.uid());
    new.updated_by = coalesce(new.updated_by, auth.uid());
    new.created_at = coalesce(new.created_at, now());
    new.updated_at = coalesce(new.updated_at, now());
  elsif tg_op = 'UPDATE' then
    new.updated_by = auth.uid();
    new.updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists set_cnf_records_audit_fields on public.cnf_records;
create trigger set_cnf_records_audit_fields
  before insert or update on public.cnf_records
  for each row
  execute function public.set_cnf_record_audit_fields();

alter table public.cnf_records enable row level security;

drop policy if exists "Creator roles can create CNF records" on public.cnf_records;
create policy "Creator roles can create CNF records"
  on public.cnf_records
  for insert
  to authenticated
  with check (
    public.can_create_cnf_record()
    and created_by = auth.uid()
    and updated_by = auth.uid()
    and archive_status = 'active'
  );
