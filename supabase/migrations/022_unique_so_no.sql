-- Prevent duplicate active SO numbers across projects.
--
-- Legacy flat-sheet rows often repeat the same so_no on every PO line within a
-- project. The app enforces uniqueness across projects (not per row), so we
-- deduplicate before creating a global partial unique index.

-- 1) Within each project: keep one row per normalized so_no (canonical-ish order).
with intra_project_ranked as (
  select
    record_id,
    row_number() over (
      partition by project_id, lower(trim(so_no))
      order by batch_instance_id, mo_instance_id, po_instance_id, record_id
    ) as rn
  from public.cnf_projects
  where is_active = true
    and trim(so_no) not in ('', 'N/A', 'n/a')
)
update public.cnf_projects cp
set so_no = 'N/A',
    updated_at = now()
from intra_project_ranked r
where cp.record_id = r.record_id
  and r.rn > 1;

-- 2) Across projects: keep the earliest active row per normalized so_no.
with cross_project_ranked as (
  select
    record_id,
    row_number() over (
      partition by lower(trim(so_no))
      order by created_at asc, project_id asc, record_id asc
    ) as rn
  from public.cnf_projects
  where is_active = true
    and trim(so_no) not in ('', 'N/A', 'n/a')
)
update public.cnf_projects cp
set so_no = 'N/A',
    updated_at = now()
from cross_project_ranked r
where cp.record_id = r.record_id
  and r.rn > 1;

-- Pre-flight: fail with duplicate keys if dedup did not clear all rows.
do $$
declare
  dup_list text;
begin
  select string_agg(so_key || ' (' || cnt || ' rows)', ', ' order by so_key)
  into dup_list
  from (
    select lower(trim(so_no)) as so_key, count(*) as cnt
    from public.cnf_projects
    where is_active = true
      and trim(so_no) not in ('', 'N/A', 'n/a')
    group by lower(trim(so_no))
    having count(*) > 1
    limit 20
  ) d;

  if dup_list is not null then
    raise exception 'Duplicate active so_no remain after dedup: %', dup_list;
  end if;
end $$;

-- 3) Enforce uniqueness at the database layer (matches frontend save check).
create unique index if not exists cnf_projects_active_so_no_unique_idx
  on public.cnf_projects (lower(trim(so_no)))
  where is_active = true
    and trim(so_no) not in ('', 'N/A', 'n/a');
