-- Registry writes are admin-only; all active users may read for form dropdowns.

drop policy if exists "Active users can manage registry" on public.registry;
drop policy if exists "Authenticated users can manage registry" on public.registry;
drop policy if exists "Admins can manage registry" on public.registry;

drop policy if exists "Active users can read registry" on public.registry;
drop policy if exists "Authenticated users can read registry" on public.registry;

create policy "Active users can read registry"
  on public.registry for select to authenticated
  using (public.is_active_user());

create policy "Active admins can manage registry"
  on public.registry for all to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());
