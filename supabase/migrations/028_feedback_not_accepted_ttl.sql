-- Not Accepted feedback auto-delete after 72 hours (same TTL as Addressed).
-- not_accepted_at is set when an admin marks feedback as not accepted (status stays not_addressed).

alter table public.app_feedback
  add column if not exists not_accepted_at timestamptz;

create or replace function public.app_feedback_maintain_status_timestamps()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'addressed' then
    if tg_op = 'INSERT' or old.status is distinct from 'addressed' then
      new.addressed_at := coalesce(new.addressed_at, now());
    end if;
    new.not_accepted_at := null;
  elsif new.status = 'not_addressed' then
    new.addressed_at := null;
    if tg_op = 'UPDATE' and old.status is distinct from 'not_addressed' then
      new.not_accepted_at := coalesce(new.not_accepted_at, now());
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists app_feedback_addressed_at_trg on public.app_feedback;
create trigger app_feedback_addressed_at_trg
  before insert or update of status, not_accepted_at on public.app_feedback
  for each row
  execute function public.app_feedback_maintain_status_timestamps();

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
  where (
      status = 'addressed'
      and addressed_at is not null
      and addressed_at < now() - interval '72 hours'
    )
    or (
      status = 'not_addressed'
      and not_accepted_at is not null
      and not_accepted_at < now() - interval '72 hours'
    );
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

create index if not exists app_feedback_not_accepted_ttl_idx
  on public.app_feedback (not_accepted_at)
  where status = 'not_addressed' and not_accepted_at is not null;
