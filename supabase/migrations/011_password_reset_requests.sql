-- Password reset requests: users request from login, admins complete reset.

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

create table if not exists public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  request_status text not null default 'pending',
  requested_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  constraint password_reset_requests_status_check
    check (request_status in ('pending', 'completed', 'rejected'))
);

create unique index if not exists password_reset_requests_one_pending_idx
  on public.password_reset_requests(user_id)
  where request_status = 'pending';

alter table public.password_reset_requests enable row level security;

drop policy if exists "Admins can read password reset requests" on public.password_reset_requests;
create policy "Admins can read password reset requests"
  on public.password_reset_requests
  for select
  to authenticated
  using (public.is_active_admin());

drop policy if exists "Admins can update password reset requests" on public.password_reset_requests;
create policy "Admins can update password reset requests"
  on public.password_reset_requests
  for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create or replace function public.request_password_reset(request_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  select id into target_user_id
  from public.profiles
  where lower(email) = lower(trim(request_email))
  limit 1;

  if target_user_id is null then
    return;
  end if;

  if exists (
    select 1
    from public.password_reset_requests
    where user_id = target_user_id
      and request_status = 'pending'
  ) then
    return;
  end if;

  insert into public.password_reset_requests(user_id, email)
  values (target_user_id, lower(trim(request_email)));
end;
$$;

create or replace function public.admin_complete_password_reset(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  default_password text := '1L0veJ3sus';
begin
  if not public.is_active_admin() then
    raise exception 'Only active administrators can reset passwords.';
  end if;

  update auth.users
  set
    encrypted_password = extensions.crypt(default_password, extensions.gen_salt('bf')),
    updated_at = now()
  where id = target_user_id;

  if not found then
    raise exception 'User account not found.';
  end if;

  update public.profiles
  set
    must_change_password = true,
    updated_at = now()
  where id = target_user_id;

  update public.password_reset_requests
  set
    request_status = 'completed',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    review_note = 'Password reset to default by administrator.'
  where user_id = target_user_id
    and request_status = 'pending';

  insert into public.auth_activity_log (
    actor_id,
    target_user_id,
    event_type,
    new_value
  )
  values (
    auth.uid(),
    target_user_id,
    'password_reset_completed',
    jsonb_build_object('method', 'admin_default_reset')
  );
end;
$$;

revoke all on function public.request_password_reset(text) from public;
grant execute on function public.request_password_reset(text) to anon, authenticated;

revoke all on function public.admin_complete_password_reset(uuid) from public, anon;
grant execute on function public.admin_complete_password_reset(uuid) to authenticated;

grant select, update on public.password_reset_requests to authenticated;
