-- Notification retention: expire standard notifications after 24 hours;
-- retain High/Critical until dismissed or resolved; scheduled purge RPC.

alter table public.notifications
  add column if not exists dismissed_at timestamptz,
  add column if not exists resolved_at timestamptz,
  add column if not exists dismissed_by text,
  add column if not exists resolved_by text;

create index if not exists notifications_status_created_at_idx
  on public.notifications (status, created_at desc);

create or replace function public.purge_expired_standard_notifications_system()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.notifications
  set status = 'EXPIRED'
  where status = 'OPEN'
    and lower(severity) not in ('logic', 'critical', 'high')
    and created_at < now() - interval '24 hours';
  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

create or replace function public.purge_expired_standard_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_user() then
    raise exception 'Active user required';
  end if;
  return public.purge_expired_standard_notifications_system();
end;
$$;

grant execute on function public.purge_expired_standard_notifications() to authenticated;

-- pg_cron (optional):
-- select cron.schedule(
--   'purge-standard-notifications',
--   '0 * * * *',
--   $$select public.purge_expired_standard_notifications_system();$$
-- );
