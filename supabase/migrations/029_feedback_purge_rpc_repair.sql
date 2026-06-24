-- Ensure purge_expired_addressed_feedback RPC exists after 024/028 and grants are present.
-- Safe to re-run on environments where earlier migrations were partially applied.

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

create or replace function public.purge_expired_addressed_feedback()
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  return public.purge_expired_addressed_feedback_system();
end;
$$;

grant execute on function public.purge_expired_addressed_feedback() to authenticated;
