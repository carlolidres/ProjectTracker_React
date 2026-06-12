-- PO-level AM fields: order quantity, unit of measure, product version
alter table public.cnf_projects
  add column if not exists order_quantity text default 'N/A',
  add column if not exists uom text default 'N/A',
  add column if not exists prod_ver text default 'N/A';
