-- Profile department field and self-service profile update extension.

alter table public.profiles
  add column if not exists department text;

drop function if exists public.update_own_profile(text, text, text, text);

create or replace function public.update_own_profile(
  p_first_name text,
  p_middle_initial text,
  p_last_name text,
  p_avatar_url text default null,
  p_department text default null
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
    department = nullif(trim(coalesce(p_department, '')), ''),
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

revoke all on function public.update_own_profile(text, text, text, text, text) from public, anon;
grant execute on function public.update_own_profile(text, text, text, text, text) to authenticated;
