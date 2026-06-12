-- Production hardening for archive/restore controls.
-- Archive transitions are Admin-only and require traceability reasons.

create or replace function public.enforce_cnf_archive_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.archive_status is distinct from old.archive_status then
    if not public.is_active_admin() then
      raise exception 'Only an active Admin can archive or restore CNF records.';
    end if;

    if new.archive_status = 'archived' then
      if nullif(trim(new.archive_reason), '') is null then
        raise exception 'An archive reason is required.';
      end if;

      new.archived_at = coalesce(new.archived_at, now());
      new.archived_by = auth.uid();
    elsif new.archive_status = 'active' then
      if nullif(trim(new.restore_reason), '') is null then
        raise exception 'A restore reason is required.';
      end if;

      new.restored_at = coalesce(new.restored_at, now());
      new.restored_by = auth.uid();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_cnf_archive_transition on public.cnf_records;
create trigger enforce_cnf_archive_transition
  before update on public.cnf_records
  for each row
  execute function public.enforce_cnf_archive_transition();

create or replace function public.enforce_profile_activation_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' and (new.role = 'pending' or new.department is null) then
    raise exception 'Active users require an assigned role and department.';
  end if;

  if old.role = 'Admin'
     and old.status = 'active'
     and (new.role <> 'Admin' or new.status <> 'active')
     and not exists (
       select 1
       from public.profiles
       where id <> old.id
         and role = 'Admin'
         and status = 'active'
     ) then
    raise exception 'The last active Admin cannot be demoted or deactivated.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_profile_activation_integrity on public.profiles;
create trigger enforce_profile_activation_integrity
  before update on public.profiles
  for each row
  execute function public.enforce_profile_activation_integrity();
