create extension if not exists pgcrypto;

alter table public.cnf_final_child_records
  alter column id type uuid using id::uuid,
  alter column id set default gen_random_uuid(),
  alter column id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.cnf_final_child_records'::regclass
      and contype = 'p'
  ) then
    alter table public.cnf_final_child_records
      add constraint cnf_final_child_records_pkey primary key (id);
  end if;
end;
$$;
