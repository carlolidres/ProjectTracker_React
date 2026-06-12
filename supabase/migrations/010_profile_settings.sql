-- Profile settings: name parts, avatar, self-service update, and avatar storage.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists middle_initial text,
  add column if not exists last_name text,
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create or replace function public.update_own_profile(
  p_first_name text,
  p_middle_initial text,
  p_last_name text,
  p_avatar_url text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
  built_full_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  built_full_name := trim(concat_ws(' ',
    nullif(trim(coalesce(p_first_name, '')), ''),
    nullif(trim(coalesce(p_middle_initial, '')), ''),
    nullif(trim(coalesce(p_last_name, '')), '')
  ));

  update public.profiles
  set
    first_name = nullif(trim(coalesce(p_first_name, '')), ''),
    middle_initial = nullif(trim(coalesce(p_middle_initial, '')), ''),
    last_name = nullif(trim(coalesce(p_last_name, '')), ''),
    full_name = nullif(built_full_name, ''),
    avatar_url = case
      when p_avatar_url is null then avatar_url
      else nullif(trim(p_avatar_url), '')
    end,
    updated_at = now()
  where id = auth.uid()
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return updated_profile;
end;
$$;

revoke all on function public.update_own_profile(text, text, text, text) from public, anon;
grant execute on function public.update_own_profile(text, text, text, text) to authenticated;
