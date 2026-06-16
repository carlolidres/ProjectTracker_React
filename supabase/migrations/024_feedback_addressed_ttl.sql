-- Auto-delete feedback marked "addressed" after 72 hours.
-- Frontend calls purge_expired_addressed_feedback() on admin inbox load as fallback.
-- Optional: enable pg_cron and schedule purge_expired_addressed_feedback_system() hourly.

alter table public.app_feedback
  add column if not exists addressed_at timestamptz;

-- Backfill existing addressed rows (use created_at as best-effort timestamp).
update public.app_feedback
set addressed_at = created_at
where status = 'addressed'
  and addressed_at is null;

create or replace function public.app_feedback_maintain_addressed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'addressed' and (tg_op = 'INSERT' or old.status is distinct from 'addressed') then
    new.addressed_at := coalesce(new.addressed_at, now());
  elsif new.status = 'not_addressed' then
    new.addressed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists app_feedback_addressed_at_trg on public.app_feedback;
create trigger app_feedback_addressed_at_trg
  before insert or update of status on public.app_feedback
  for each row
  execute function public.app_feedback_maintain_addressed_at();

create or replace function public.purge_expired_addressed_feedback_system()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.app_feedback
  where status = 'addressed'
    and addressed_at is not null
    and addressed_at < now() - interval '72 hours';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

create or replace function public.purge_expired_addressed_feedback()
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_admin() then
    raise exception 'Admin access required';
  end if;
  return public.purge_expired_addressed_feedback_system();
end;
$$;

grant execute on function public.purge_expired_addressed_feedback() to authenticated;

create index if not exists app_feedback_addressed_ttl_idx
  on public.app_feedback (addressed_at)
  where status = 'addressed';

-- pg_cron (Supabase Pro / when extension enabled):
-- select cron.schedule(
--   'purge-addressed-feedback',
--   '0 * * * *',
--   $$select public.purge_expired_addressed_feedback_system();$$
-- );
