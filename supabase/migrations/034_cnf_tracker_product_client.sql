-- CNF Tracker Product/Client fields + registry suggestion types.

ALTER TABLE public.cnf_tracker_records
  ADD COLUMN IF NOT EXISTS product_name text NOT NULL DEFAULT 'N/A',
  ADD COLUMN IF NOT EXISTS client_name text NOT NULL DEFAULT 'N/A';

-- Preserve cnf_details for historical rows; new UI uses product_name / client_name.
UPDATE public.cnf_tracker_records
SET
  product_name = CASE
    WHEN trim(coalesce(product_name, '')) = '' OR lower(trim(product_name)) = 'n/a'
      THEN coalesce(nullif(trim(cnf_details), ''), 'N/A')
    ELSE product_name
  END
WHERE trim(coalesce(product_name, '')) = '' OR lower(trim(product_name)) = 'n/a';

CREATE INDEX IF NOT EXISTS cnf_tracker_product_norm_idx
  ON public.cnf_tracker_records (lower(trim(regexp_replace(product_name, '\s+', ' ', 'g'))))
  WHERE is_active = true
    AND trim(product_name) <> ''
    AND lower(trim(product_name)) <> 'n/a';

CREATE INDEX IF NOT EXISTS cnf_tracker_client_norm_idx
  ON public.cnf_tracker_records (lower(trim(regexp_replace(client_name, '\s+', ' ', 'g'))))
  WHERE is_active = true
    AND trim(client_name) <> ''
    AND lower(trim(client_name)) <> 'n/a';

-- Seed reusable Product / Client options from existing project values (no duplicates).
INSERT INTO public.registry (registry_type, registry_value, description, status, created_by, updated_by)
SELECT DISTINCT
  'cnf_product',
  trim(regexp_replace(p.product_name, '\s+', ' ', 'g')),
  trim(regexp_replace(p.product_name, '\s+', ' ', 'g')),
  'Active',
  'migration',
  'migration'
FROM public.cnf_projects p
WHERE p.is_active = true
  AND trim(coalesce(p.product_name, '')) <> ''
  AND lower(trim(p.product_name)) <> 'n/a'
ON CONFLICT (registry_type, registry_value) DO NOTHING;

INSERT INTO public.registry (registry_type, registry_value, description, status, created_by, updated_by)
SELECT DISTINCT
  'cnf_client',
  trim(regexp_replace(p.client_name, '\s+', ' ', 'g')),
  trim(regexp_replace(p.client_name, '\s+', ' ', 'g')),
  'Active',
  'migration',
  'migration'
FROM public.cnf_projects p
WHERE p.is_active = true
  AND trim(coalesce(p.client_name, '')) <> ''
  AND lower(trim(p.client_name)) <> 'n/a'
ON CONFLICT (registry_type, registry_value) DO NOTHING;
