-- Additive Support Activities enhancements + Endorsement Tracker.
-- Backward-compatible: new columns nullable / safe defaults; no drops/renames.

-- ---------------------------------------------------------------------------
-- 1) Support Activities: status + Non-Process + CNF link columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.support_activities
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS status_date date,
  ADD COLUMN IF NOT EXISTS cnf_tracker_record_id uuid REFERENCES public.cnf_tracker_records(record_id),
  ADD COLUMN IF NOT EXISTS cnf_link_state text NOT NULL DEFAULT 'unset',
  ADD COLUMN IF NOT EXISTS cnf_number_display text,
  ADD COLUMN IF NOT EXISTS non_process_description text,
  ADD COLUMN IF NOT EXISTS type_of_validation text,
  ADD COLUMN IF NOT EXISTS protocol_number text,
  ADD COLUMN IF NOT EXISTS protocol_status text,
  ADD COLUMN IF NOT EXISTS report_number text,
  ADD COLUMN IF NOT EXISTS report_status text,
  ADD COLUMN IF NOT EXISTS endorsement_number text,
  ADD COLUMN IF NOT EXISTS endorsement_status text,
  ADD COLUMN IF NOT EXISTS endorsement_tracker_record_id uuid,
  ADD COLUMN IF NOT EXISTS sync_version integer NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'support_activities_cnf_link_state_check'
  ) THEN
    ALTER TABLE public.support_activities
      ADD CONSTRAINT support_activities_cnf_link_state_check
      CHECK (cnf_link_state = ANY (ARRAY['unset'::text, 'linked'::text, 'not_applicable'::text]));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS support_activities_cnf_tracker_idx
  ON public.support_activities (cnf_tracker_record_id)
  WHERE cnf_tracker_record_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS support_activities_status_idx
  ON public.support_activities (status)
  WHERE is_active = true AND status IS NOT NULL;

CREATE INDEX IF NOT EXISTS support_activities_endorsement_tracker_idx
  ON public.support_activities (endorsement_tracker_record_id)
  WHERE endorsement_tracker_record_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2) Reusable options (searchable/editable dropdown suggestions)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.reusable_options (
  option_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  option_value text NOT NULL,
  option_value_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by text DEFAULT '',
  updated_by text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS reusable_options_active_unique_idx
  ON public.reusable_options (category, option_value_key)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS reusable_options_category_idx
  ON public.reusable_options (category)
  WHERE is_active = true;

ALTER TABLE public.reusable_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reusable_options_select ON public.reusable_options;
CREATE POLICY reusable_options_select
  ON public.reusable_options FOR SELECT TO authenticated
  USING (public.is_active_user());

DROP POLICY IF EXISTS reusable_options_insert ON public.reusable_options;
CREATE POLICY reusable_options_insert
  ON public.reusable_options FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user()
    AND public.current_user_role() IS DISTINCT FROM 'view'::public.user_role
  );

DROP POLICY IF EXISTS reusable_options_update ON public.reusable_options;
CREATE POLICY reusable_options_update
  ON public.reusable_options FOR UPDATE TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

GRANT SELECT, INSERT, UPDATE ON public.reusable_options TO authenticated;

INSERT INTO public.reusable_options (category, option_value, option_value_key, created_by, updated_by)
SELECT category, option_value, lower(trim(option_value)), 'migration', 'migration'
FROM (VALUES
  ('type_of_validation', 'Equipment Qualification'),
  ('type_of_validation', 'Thermal Mapping'),
  ('type_of_validation', 'Facilities Qualification'),
  ('type_of_validation', 'Computer System Validation'),
  ('type_of_validation', 'Cleaning Validation'),
  ('type_of_validation', 'Analytical Method Validation'),
  ('type_of_validation', 'Utilities Qualification'),
  ('type_of_validation', 'Plant Qualification'),
  ('protocol_status', 'In Process'),
  ('protocol_status', 'Routing'),
  ('protocol_status', 'Done'),
  ('report_status', 'In Process'),
  ('report_status', 'Routing'),
  ('report_status', 'Done'),
  ('endorsement_status', 'In Process'),
  ('endorsement_status', 'Routing'),
  ('endorsement_status', 'Done'),
  ('implemented_by', 'Validation'),
  ('implemented_by', 'QA'),
  ('implemented_by', 'TSD'),
  ('implemented_by', 'Production')
) AS seed(category, option_value)
ON CONFLICT (category, option_value_key) WHERE (is_active = true) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3) Endorsement Tracker header + items
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.endorsement_tracker_records (
  record_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endorsement_tracker_id text NOT NULL UNIQUE,
  endorsement_number text NOT NULL DEFAULT 'N/A',
  endorsement_status text NOT NULL DEFAULT 'N/A',
  process_classification text NOT NULL DEFAULT 'unset',
  source_type text NOT NULL DEFAULT 'independent',
  source_record_id text,
  project_id text,
  project_record_id text,
  cnf_tracker_record_id uuid REFERENCES public.cnf_tracker_records(record_id),
  support_activity_id text,
  cnf_number_display text NOT NULL DEFAULT 'N/A',
  project_name text NOT NULL DEFAULT 'N/A',
  product_name text NOT NULL DEFAULT 'N/A',
  product_code text NOT NULL DEFAULT 'N/A',
  non_process_description text NOT NULL DEFAULT 'N/A',
  last_sync_source text,
  last_synced_at timestamptz,
  sync_version integer NOT NULL DEFAULT 1,
  created_by text DEFAULT '',
  updated_by text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT endorsement_tracker_process_classification_check
    CHECK (process_classification = ANY (ARRAY['unset'::text, 'process'::text, 'non_process'::text])),
  CONSTRAINT endorsement_tracker_source_type_check
    CHECK (source_type = ANY (ARRAY[
      'process_validation_project'::text,
      'non_process_support_activity'::text,
      'independent'::text
    ]))
);

CREATE UNIQUE INDEX IF NOT EXISTS endorsement_tracker_active_source_unique_idx
  ON public.endorsement_tracker_records (source_type, source_record_id)
  WHERE is_active = true
    AND source_record_id IS NOT NULL
    AND trim(source_record_id) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS endorsement_tracker_active_number_idx
  ON public.endorsement_tracker_records (
    lower(trim(regexp_replace(endorsement_number, '\s+', ' ', 'g')))
  )
  WHERE is_active = true
    AND trim(endorsement_number) <> ''
    AND lower(trim(endorsement_number)) <> 'n/a';

CREATE INDEX IF NOT EXISTS endorsement_tracker_project_idx
  ON public.endorsement_tracker_records (project_id)
  WHERE is_active = true AND project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS endorsement_tracker_cnf_idx
  ON public.endorsement_tracker_records (cnf_tracker_record_id)
  WHERE is_active = true AND cnf_tracker_record_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS endorsement_tracker_support_idx
  ON public.endorsement_tracker_records (support_activity_id)
  WHERE is_active = true AND support_activity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS endorsement_tracker_status_idx
  ON public.endorsement_tracker_records (endorsement_status)
  WHERE is_active = true;

ALTER TABLE public.endorsement_tracker_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS endorsement_tracker_select ON public.endorsement_tracker_records;
CREATE POLICY endorsement_tracker_select
  ON public.endorsement_tracker_records FOR SELECT TO authenticated
  USING (public.is_active_user());

DROP POLICY IF EXISTS endorsement_tracker_insert ON public.endorsement_tracker_records;
CREATE POLICY endorsement_tracker_insert
  ON public.endorsement_tracker_records FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user()
    AND public.current_user_role() = ANY (ARRAY['admin'::public.user_role, 'val'::public.user_role])
  );

DROP POLICY IF EXISTS endorsement_tracker_update ON public.endorsement_tracker_records;
CREATE POLICY endorsement_tracker_update
  ON public.endorsement_tracker_records FOR UPDATE TO authenticated
  USING (
    public.is_active_user()
    AND (
      public.current_user_role() = ANY (ARRAY['admin'::public.user_role, 'val'::public.user_role])
      OR public.current_user_role() = 'qa'::public.user_role
    )
  )
  WITH CHECK (
    public.is_active_user()
    AND (
      public.current_user_role() = ANY (ARRAY['admin'::public.user_role, 'val'::public.user_role])
      OR public.current_user_role() = 'qa'::public.user_role
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.endorsement_tracker_records TO authenticated;

CREATE TABLE IF NOT EXISTS public.endorsement_tracker_items (
  item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endorsement_tracker_record_id uuid NOT NULL
    REFERENCES public.endorsement_tracker_records(record_id),
  item_number integer NOT NULL DEFAULT 1,
  endorsement_entry text NOT NULL DEFAULT '',
  target_implementation_date date,
  implemented_by text NOT NULL DEFAULT 'N/A',
  implementation_date date,
  verified_by_validation text NOT NULL DEFAULT 'N/A',
  validation_verification_date date,
  verified_by_qa text NOT NULL DEFAULT 'N/A',
  qa_verification_date date,
  sort_order integer NOT NULL DEFAULT 0,
  created_by text DEFAULT '',
  updated_by text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS endorsement_tracker_items_header_idx
  ON public.endorsement_tracker_items (endorsement_tracker_record_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS endorsement_tracker_items_sort_idx
  ON public.endorsement_tracker_items (endorsement_tracker_record_id, sort_order, item_number);

ALTER TABLE public.endorsement_tracker_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS endorsement_tracker_items_select ON public.endorsement_tracker_items;
CREATE POLICY endorsement_tracker_items_select
  ON public.endorsement_tracker_items FOR SELECT TO authenticated
  USING (public.is_active_user());

DROP POLICY IF EXISTS endorsement_tracker_items_insert ON public.endorsement_tracker_items;
CREATE POLICY endorsement_tracker_items_insert
  ON public.endorsement_tracker_items FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user()
    AND public.current_user_role() = ANY (ARRAY['admin'::public.user_role, 'val'::public.user_role])
  );

DROP POLICY IF EXISTS endorsement_tracker_items_update ON public.endorsement_tracker_items;
CREATE POLICY endorsement_tracker_items_update
  ON public.endorsement_tracker_items FOR UPDATE TO authenticated
  USING (
    public.is_active_user()
    AND (
      public.current_user_role() = ANY (ARRAY['admin'::public.user_role, 'val'::public.user_role])
      OR public.current_user_role() = 'qa'::public.user_role
    )
  )
  WITH CHECK (
    public.is_active_user()
    AND (
      public.current_user_role() = ANY (ARRAY['admin'::public.user_role, 'val'::public.user_role])
      OR public.current_user_role() = 'qa'::public.user_role
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.endorsement_tracker_items TO authenticated;

-- FK from support_activities after endorsement table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'support_activities_endorsement_tracker_fk'
  ) THEN
    ALTER TABLE public.support_activities
      ADD CONSTRAINT support_activities_endorsement_tracker_fk
      FOREIGN KEY (endorsement_tracker_record_id)
      REFERENCES public.endorsement_tracker_records(record_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4) Helpers for option keys + endorsement ID generation
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.normalize_option_key(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(trim(regexp_replace(coalesce(raw, ''), '\s+', ' ', 'g')));
$$;

REVOKE ALL ON FUNCTION public.normalize_option_key(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_option_key(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.next_endorsement_tracker_id()
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  yr text := to_char(now(), 'YYYY');
  prefix text := 'END-' || yr || '-';
  max_n integer := 0;
  candidate text;
BEGIN
  SELECT coalesce(max(
    CASE
      WHEN endorsement_tracker_id ~ ('^END-' || yr || '-[0-9]+$')
        THEN substring(endorsement_tracker_id from length(prefix) + 1)::integer
      ELSE 0
    END
  ), 0)
  INTO max_n
  FROM public.endorsement_tracker_records;

  LOOP
    max_n := max_n + 1;
    candidate := prefix || lpad(max_n::text, 3, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.endorsement_tracker_records WHERE endorsement_tracker_id = candidate
    );
  END LOOP;
  RETURN candidate;
END;
$$;

REVOKE ALL ON FUNCTION public.next_endorsement_tracker_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_endorsement_tracker_id() TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) Atomic RPCs: ensure endorsement from source + sync mapped fields
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ensure_endorsement_from_source(
  p_source_type text,
  p_source_record_id text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_user_email text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
  existing public.endorsement_tracker_records%ROWTYPE;
  created public.endorsement_tracker_records%ROWTYPE;
  was_created boolean := false;
  next_id text;
BEGIN
  IF NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Not authenticated or inactive';
  END IF;

  v_role := public.current_user_role();
  IF v_role IS DISTINCT FROM 'admin'::public.user_role
     AND v_role IS DISTINCT FROM 'val'::public.user_role THEN
    RAISE EXCEPTION 'Not authorized to manage endorsement tracker';
  END IF;

  IF p_source_type NOT IN (
    'process_validation_project',
    'non_process_support_activity',
    'independent'
  ) THEN
    RAISE EXCEPTION 'Invalid source type';
  END IF;

  IF p_source_type <> 'independent' AND (p_source_record_id IS NULL OR trim(p_source_record_id) = '') THEN
    RAISE EXCEPTION 'Source record id required';
  END IF;

  IF p_source_type <> 'independent' THEN
    SELECT * INTO existing
    FROM public.endorsement_tracker_records
    WHERE is_active = true
      AND source_type = p_source_type
      AND source_record_id = p_source_record_id
    LIMIT 1;
  END IF;

  IF FOUND THEN
    UPDATE public.endorsement_tracker_records e
    SET
      endorsement_number = coalesce(nullif(trim(p_payload->>'endorsement_number'), ''), e.endorsement_number),
      endorsement_status = coalesce(nullif(trim(p_payload->>'endorsement_status'), ''), e.endorsement_status),
      process_classification = coalesce(nullif(trim(p_payload->>'process_classification'), ''), e.process_classification),
      project_id = coalesce(nullif(trim(p_payload->>'project_id'), ''), e.project_id),
      project_record_id = coalesce(nullif(trim(p_payload->>'project_record_id'), ''), e.project_record_id),
      cnf_tracker_record_id = CASE
        WHEN p_payload ? 'cnf_tracker_record_id' AND nullif(trim(p_payload->>'cnf_tracker_record_id'), '') IS NOT NULL
          THEN (p_payload->>'cnf_tracker_record_id')::uuid
        ELSE e.cnf_tracker_record_id
      END,
      support_activity_id = coalesce(nullif(trim(p_payload->>'support_activity_id'), ''), e.support_activity_id),
      cnf_number_display = coalesce(nullif(trim(p_payload->>'cnf_number_display'), ''), e.cnf_number_display),
      project_name = coalesce(nullif(trim(p_payload->>'project_name'), ''), e.project_name),
      product_name = coalesce(nullif(trim(p_payload->>'product_name'), ''), e.product_name),
      product_code = coalesce(nullif(trim(p_payload->>'product_code'), ''), e.product_code),
      non_process_description = coalesce(nullif(trim(p_payload->>'non_process_description'), ''), e.non_process_description),
      last_sync_source = coalesce(nullif(trim(p_payload->>'last_sync_source'), ''), 'source'),
      last_synced_at = now(),
      sync_version = e.sync_version + 1,
      updated_by = coalesce(nullif(trim(p_user_email), ''), e.updated_by),
      updated_at = now()
    WHERE e.record_id = existing.record_id
    RETURNING * INTO created;

    INSERT INTO public.audit_logs (user_email, module, action, record_id, project_id, field_name, old_value, new_value, remarks)
    VALUES (
      coalesce(nullif(trim(p_user_email), ''), 'system'),
      'Endorsement Tracker',
      'SYNC_FROM_SOURCE',
      created.endorsement_tracker_id,
      coalesce(created.project_id, 'N/A'),
      'ALL',
      '',
      '',
      'Linked endorsement updated from source'
    );

    RETURN jsonb_build_object(
      'created', false,
      'record_id', created.record_id,
      'endorsement_tracker_id', created.endorsement_tracker_id,
      'sync_version', created.sync_version
    );
  END IF;

  next_id := public.next_endorsement_tracker_id();

  INSERT INTO public.endorsement_tracker_records (
    endorsement_tracker_id,
    endorsement_number,
    endorsement_status,
    process_classification,
    source_type,
    source_record_id,
    project_id,
    project_record_id,
    cnf_tracker_record_id,
    support_activity_id,
    cnf_number_display,
    project_name,
    product_name,
    product_code,
    non_process_description,
    last_sync_source,
    last_synced_at,
    created_by,
    updated_by
  ) VALUES (
    next_id,
    coalesce(nullif(trim(p_payload->>'endorsement_number'), ''), 'N/A'),
    coalesce(nullif(trim(p_payload->>'endorsement_status'), ''), 'N/A'),
    coalesce(nullif(trim(p_payload->>'process_classification'), ''), 'unset'),
    p_source_type,
    nullif(trim(p_source_record_id), ''),
    nullif(trim(p_payload->>'project_id'), ''),
    nullif(trim(p_payload->>'project_record_id'), ''),
    CASE
      WHEN nullif(trim(p_payload->>'cnf_tracker_record_id'), '') IS NOT NULL
        THEN (p_payload->>'cnf_tracker_record_id')::uuid
      ELSE NULL
    END,
    nullif(trim(p_payload->>'support_activity_id'), ''),
    coalesce(nullif(trim(p_payload->>'cnf_number_display'), ''), 'N/A'),
    coalesce(nullif(trim(p_payload->>'project_name'), ''), 'N/A'),
    coalesce(nullif(trim(p_payload->>'product_name'), ''), 'N/A'),
    coalesce(nullif(trim(p_payload->>'product_code'), ''), 'N/A'),
    coalesce(nullif(trim(p_payload->>'non_process_description'), ''), 'N/A'),
    coalesce(nullif(trim(p_payload->>'last_sync_source'), ''), 'source'),
    now(),
    coalesce(nullif(trim(p_user_email), ''), ''),
    coalesce(nullif(trim(p_user_email), ''), '')
  )
  RETURNING * INTO created;

  was_created := true;

  INSERT INTO public.audit_logs (user_email, module, action, record_id, project_id, field_name, old_value, new_value, remarks)
  VALUES (
    coalesce(nullif(trim(p_user_email), ''), 'system'),
    'Endorsement Tracker',
    'CREATE',
    created.endorsement_tracker_id,
    coalesce(created.project_id, 'N/A'),
    'ALL',
    '',
    '',
    'Endorsement tracker created from source'
  );

  RETURN jsonb_build_object(
    'created', was_created,
    'record_id', created.record_id,
    'endorsement_tracker_id', created.endorsement_tracker_id,
    'sync_version', created.sync_version
  );
EXCEPTION
  WHEN unique_violation THEN
    -- Concurrent create: return existing linked row
    SELECT * INTO existing
    FROM public.endorsement_tracker_records
    WHERE is_active = true
      AND source_type = p_source_type
      AND source_record_id = p_source_record_id
    LIMIT 1;
    IF NOT FOUND THEN
      RAISE;
    END IF;
    RETURN jsonb_build_object(
      'created', false,
      'record_id', existing.record_id,
      'endorsement_tracker_id', existing.endorsement_tracker_id,
      'sync_version', existing.sync_version
    );
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_endorsement_from_source(text, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_endorsement_from_source(text, text, jsonb, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_endorsement_mapped_fields(
  p_endorsement_record_id uuid,
  p_expected_sync_version integer,
  p_direction text,
  p_fields jsonb DEFAULT '{}'::jsonb,
  p_user_email text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
  header public.endorsement_tracker_records%ROWTYPE;
  updated_count integer := 0;
BEGIN
  IF NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Not authenticated or inactive';
  END IF;

  v_role := public.current_user_role();
  IF v_role IS DISTINCT FROM 'admin'::public.user_role
     AND v_role IS DISTINCT FROM 'val'::public.user_role THEN
    RAISE EXCEPTION 'Not authorized to sync endorsement fields';
  END IF;

  IF p_direction NOT IN ('to_source', 'to_tracker') THEN
    RAISE EXCEPTION 'Invalid sync direction';
  END IF;

  SELECT * INTO header
  FROM public.endorsement_tracker_records
  WHERE record_id = p_endorsement_record_id
    AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Endorsement tracker record not found';
  END IF;

  IF header.sync_version IS DISTINCT FROM p_expected_sync_version THEN
    RAISE EXCEPTION 'STALE_VERSION: expected %, found %', p_expected_sync_version, header.sync_version
      USING ERRCODE = 'P0001';
  END IF;

  IF p_direction = 'to_tracker' THEN
    UPDATE public.endorsement_tracker_records e
    SET
      endorsement_number = coalesce(nullif(trim(p_fields->>'endorsement_number'), ''), e.endorsement_number),
      endorsement_status = coalesce(nullif(trim(p_fields->>'endorsement_status'), ''), e.endorsement_status),
      cnf_number_display = coalesce(nullif(trim(p_fields->>'cnf_number_display'), ''), e.cnf_number_display),
      project_name = coalesce(nullif(trim(p_fields->>'project_name'), ''), e.project_name),
      product_name = coalesce(nullif(trim(p_fields->>'product_name'), ''), e.product_name),
      product_code = coalesce(nullif(trim(p_fields->>'product_code'), ''), e.product_code),
      non_process_description = coalesce(nullif(trim(p_fields->>'non_process_description'), ''), e.non_process_description),
      project_id = coalesce(nullif(trim(p_fields->>'project_id'), ''), e.project_id),
      project_record_id = coalesce(nullif(trim(p_fields->>'project_record_id'), ''), e.project_record_id),
      cnf_tracker_record_id = CASE
        WHEN p_fields ? 'cnf_tracker_record_id' AND nullif(trim(p_fields->>'cnf_tracker_record_id'), '') IS NOT NULL
          THEN (p_fields->>'cnf_tracker_record_id')::uuid
        WHEN p_fields ? 'cnf_tracker_record_id' AND nullif(trim(p_fields->>'cnf_tracker_record_id'), '') IS NULL
          THEN NULL
        ELSE e.cnf_tracker_record_id
      END,
      last_sync_source = 'source',
      last_synced_at = now(),
      sync_version = e.sync_version + 1,
      updated_by = coalesce(nullif(trim(p_user_email), ''), e.updated_by),
      updated_at = now()
    WHERE e.record_id = header.record_id
    RETURNING * INTO header;
    updated_count := 1;
  ELSE
    -- to_source: push mapped fields to linked project or support activity
    IF header.source_type = 'process_validation_project' AND header.project_id IS NOT NULL THEN
      UPDATE public.cnf_projects p
      SET
        endorsement_report_no = coalesce(nullif(trim(p_fields->>'endorsement_number'), ''), p.endorsement_report_no),
        endorsement_report_status = coalesce(nullif(trim(p_fields->>'endorsement_status'), ''), p.endorsement_report_status),
        product_name = CASE
          WHEN nullif(trim(p_fields->>'product_name'), '') IS NOT NULL
            THEN trim(p_fields->>'product_name')
          ELSE p.product_name
        END,
        fg_code = CASE
          WHEN nullif(trim(p_fields->>'product_code'), '') IS NOT NULL
            THEN trim(p_fields->>'product_code')
          ELSE p.fg_code
        END,
        updated_by = coalesce(nullif(trim(p_user_email), ''), p.updated_by),
        updated_at = now()
      WHERE p.is_active = true
        AND p.project_id = header.project_id;
      GET DIAGNOSTICS updated_count = ROW_COUNT;
    ELSIF header.source_type = 'non_process_support_activity' AND header.support_activity_id IS NOT NULL THEN
      UPDATE public.support_activities s
      SET
        endorsement_number = coalesce(nullif(trim(p_fields->>'endorsement_number'), ''), s.endorsement_number),
        endorsement_status = coalesce(nullif(trim(p_fields->>'endorsement_status'), ''), s.endorsement_status),
        non_process_description = coalesce(nullif(trim(p_fields->>'non_process_description'), ''), s.non_process_description),
        cnf_number_display = coalesce(nullif(trim(p_fields->>'cnf_number_display'), ''), s.cnf_number_display),
        cnf_tracker_record_id = CASE
          WHEN p_fields ? 'cnf_tracker_record_id' AND nullif(trim(p_fields->>'cnf_tracker_record_id'), '') IS NOT NULL
            THEN (p_fields->>'cnf_tracker_record_id')::uuid
          WHEN p_fields ? 'cnf_tracker_record_id' AND nullif(trim(p_fields->>'cnf_tracker_record_id'), '') IS NULL
            THEN NULL
          ELSE s.cnf_tracker_record_id
        END,
        sync_version = coalesce(s.sync_version, 1) + 1,
        updated_by = coalesce(nullif(trim(p_user_email), ''), s.updated_by),
        updated_at = now()
      WHERE s.activity_id = header.support_activity_id
        AND s.is_active = true;
      GET DIAGNOSTICS updated_count = ROW_COUNT;
    END IF;

    UPDATE public.endorsement_tracker_records e
    SET
      endorsement_number = coalesce(nullif(trim(p_fields->>'endorsement_number'), ''), e.endorsement_number),
      endorsement_status = coalesce(nullif(trim(p_fields->>'endorsement_status'), ''), e.endorsement_status),
      cnf_number_display = coalesce(nullif(trim(p_fields->>'cnf_number_display'), ''), e.cnf_number_display),
      product_name = coalesce(nullif(trim(p_fields->>'product_name'), ''), e.product_name),
      product_code = coalesce(nullif(trim(p_fields->>'product_code'), ''), e.product_code),
      non_process_description = coalesce(nullif(trim(p_fields->>'non_process_description'), ''), e.non_process_description),
      last_sync_source = 'tracker',
      last_synced_at = now(),
      sync_version = e.sync_version + 1,
      updated_by = coalesce(nullif(trim(p_user_email), ''), e.updated_by),
      updated_at = now()
    WHERE e.record_id = header.record_id
    RETURNING * INTO header;
  END IF;

  INSERT INTO public.audit_logs (user_email, module, action, record_id, project_id, field_name, old_value, new_value, remarks)
  VALUES (
    coalesce(nullif(trim(p_user_email), ''), 'system'),
    'Endorsement Tracker',
    CASE WHEN p_direction = 'to_source' THEN 'SYNC_TO_SOURCE' ELSE 'SYNC_TO_TRACKER' END,
    header.endorsement_tracker_id,
    coalesce(header.project_id, 'N/A'),
    'ALL',
    '',
    '',
    'Bidirectional mapped field sync'
  );

  RETURN jsonb_build_object(
    'record_id', header.record_id,
    'endorsement_tracker_id', header.endorsement_tracker_id,
    'sync_version', header.sync_version,
    'source_rows_updated', updated_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_endorsement_mapped_fields(uuid, integer, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_endorsement_mapped_fields(uuid, integer, text, jsonb, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_support_activity_with_links(
  p_activity jsonb,
  p_user_email text DEFAULT '',
  p_create_endorsement boolean DEFAULT false,
  p_cnf_create jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
  activity_id text;
  support_project_id text;
  existing public.support_activities%ROWTYPE;
  cnf_rec public.cnf_tracker_records%ROWTYPE;
  endorsement_result jsonb := NULL;
  now_ts timestamptz := now();
  is_insert boolean := false;
BEGIN
  IF NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Not authenticated or inactive';
  END IF;

  v_role := public.current_user_role();
  IF v_role = 'view'::public.user_role THEN
    RAISE EXCEPTION 'View role cannot save support activities';
  END IF;

  activity_id := nullif(trim(p_activity->>'activity_id'), '');
  IF activity_id IS NULL OR lower(activity_id) = 'n/a' THEN
    activity_id := 'SUP-' || to_char(now_ts, 'YYYYMMDD-HH24MISS-MS');
    is_insert := true;
  END IF;

  SELECT * INTO existing
  FROM public.support_activities
  WHERE support_activities.activity_id = activity_id;

  IF FOUND THEN
    is_insert := false;
    support_project_id := existing.project_id;
  ELSE
    is_insert := true;
    support_project_id := coalesce(nullif(trim(p_activity->>'project_id'), ''), 'SPROJ-' || to_char(now_ts, 'YYYY') || '-000');
  END IF;

  -- Optional CNF create (minimum fields) inside same transaction
  IF p_cnf_create IS NOT NULL AND nullif(trim(p_cnf_create->>'cnf_reference'), '') IS NOT NULL THEN
    SELECT * INTO cnf_rec
    FROM public.cnf_tracker_records
    WHERE is_active = true
      AND lower(trim(regexp_replace(cnf_reference, '\s+', ' ', 'g')))
        = lower(trim(regexp_replace(p_cnf_create->>'cnf_reference', '\s+', ' ', 'g')))
    LIMIT 1;

    IF NOT FOUND THEN
      INSERT INTO public.cnf_tracker_records (
        cnf_tracker_id,
        cnf_reference,
        cnf_initiator,
        cnf_details,
        product_name,
        client_name,
        change_description,
        created_by,
        updated_by
      ) VALUES (
        coalesce(nullif(trim(p_cnf_create->>'cnf_tracker_id'), ''), 'CNF-' || to_char(now_ts, 'YYYY') || '-TMP'),
        trim(p_cnf_create->>'cnf_reference'),
        coalesce(nullif(trim(p_cnf_create->>'cnf_initiator'), ''), 'N/A'),
        coalesce(nullif(trim(p_cnf_create->>'cnf_details'), ''), 'N/A'),
        coalesce(nullif(trim(p_cnf_create->>'product_name'), ''), 'N/A'),
        coalesce(nullif(trim(p_cnf_create->>'client_name'), ''), 'N/A'),
        coalesce(nullif(trim(p_cnf_create->>'change_description'), ''), 'N/A'),
        coalesce(nullif(trim(p_user_email), ''), ''),
        coalesce(nullif(trim(p_user_email), ''), '')
      )
      RETURNING * INTO cnf_rec;
    END IF;
  ELSIF nullif(trim(p_activity->>'cnf_tracker_record_id'), '') IS NOT NULL THEN
    SELECT * INTO cnf_rec
    FROM public.cnf_tracker_records
    WHERE record_id = (p_activity->>'cnf_tracker_record_id')::uuid;
  END IF;

  IF is_insert THEN
    INSERT INTO public.support_activities (
      activity_id, project_id, activity_kind, department, material, line, bulk,
      machinability_protocol, machinability_protocol_status, machinability_report, machinability_report_status,
      product_user, principal, product, target_date, planning_schedule,
      status, status_date, cnf_tracker_record_id, cnf_link_state, cnf_number_display,
      non_process_description, type_of_validation, protocol_number, protocol_status,
      report_number, report_status, endorsement_number, endorsement_status,
      created_by, created_at, updated_by, updated_at, is_active, sync_version
    ) VALUES (
      activity_id,
      support_project_id,
      coalesce(p_activity->>'activity_kind', ''),
      coalesce(p_activity->>'department', ''),
      coalesce(p_activity->>'material', ''),
      coalesce(p_activity->>'line', ''),
      coalesce(p_activity->>'bulk', ''),
      coalesce(p_activity->>'machinability_protocol', ''),
      coalesce(p_activity->>'machinability_protocol_status', ''),
      coalesce(p_activity->>'machinability_report', ''),
      coalesce(p_activity->>'machinability_report_status', ''),
      coalesce(p_activity->>'product_user', ''),
      coalesce(p_activity->>'principal', ''),
      coalesce(p_activity->>'product', ''),
      coalesce(p_activity->>'target_date', ''),
      coalesce(p_activity->>'planning_schedule', ''),
      nullif(trim(p_activity->>'status'), ''),
      CASE WHEN nullif(trim(p_activity->>'status_date'), '') IS NOT NULL THEN (p_activity->>'status_date')::date ELSE NULL END,
      cnf_rec.record_id,
      coalesce(nullif(trim(p_activity->>'cnf_link_state'), ''), CASE WHEN cnf_rec.record_id IS NOT NULL THEN 'linked' ELSE 'unset' END),
      coalesce(nullif(trim(p_activity->>'cnf_number_display'), ''), cnf_rec.cnf_reference, ''),
      coalesce(p_activity->>'non_process_description', ''),
      coalesce(p_activity->>'type_of_validation', ''),
      coalesce(p_activity->>'protocol_number', ''),
      coalesce(p_activity->>'protocol_status', ''),
      coalesce(p_activity->>'report_number', ''),
      coalesce(p_activity->>'report_status', ''),
      coalesce(p_activity->>'endorsement_number', ''),
      coalesce(p_activity->>'endorsement_status', ''),
      coalesce(nullif(trim(p_user_email), ''), ''),
      now_ts,
      coalesce(nullif(trim(p_user_email), ''), ''),
      now_ts,
      true,
      1
    );
  ELSE
    UPDATE public.support_activities s
    SET
      activity_kind = coalesce(p_activity->>'activity_kind', s.activity_kind),
      department = coalesce(p_activity->>'department', s.department),
      material = coalesce(p_activity->>'material', s.material),
      line = coalesce(p_activity->>'line', s.line),
      bulk = coalesce(p_activity->>'bulk', s.bulk),
      machinability_protocol = coalesce(p_activity->>'machinability_protocol', s.machinability_protocol),
      machinability_protocol_status = coalesce(p_activity->>'machinability_protocol_status', s.machinability_protocol_status),
      machinability_report = coalesce(p_activity->>'machinability_report', s.machinability_report),
      machinability_report_status = coalesce(p_activity->>'machinability_report_status', s.machinability_report_status),
      product_user = coalesce(p_activity->>'product_user', s.product_user),
      principal = coalesce(p_activity->>'principal', s.principal),
      product = coalesce(p_activity->>'product', s.product),
      target_date = coalesce(p_activity->>'target_date', s.target_date),
      planning_schedule = coalesce(p_activity->>'planning_schedule', s.planning_schedule),
      status = CASE WHEN p_activity ? 'status' THEN nullif(trim(p_activity->>'status'), '') ELSE s.status END,
      status_date = CASE
        WHEN p_activity ? 'status_date' AND nullif(trim(p_activity->>'status_date'), '') IS NOT NULL
          THEN (p_activity->>'status_date')::date
        WHEN p_activity ? 'status_date' THEN NULL
        ELSE s.status_date
      END,
      cnf_tracker_record_id = CASE
        WHEN coalesce(p_activity->>'cnf_link_state', '') = 'not_applicable' THEN NULL
        WHEN cnf_rec.record_id IS NOT NULL THEN cnf_rec.record_id
        WHEN p_activity ? 'cnf_tracker_record_id' AND nullif(trim(p_activity->>'cnf_tracker_record_id'), '') IS NULL THEN NULL
        ELSE s.cnf_tracker_record_id
      END,
      cnf_link_state = coalesce(nullif(trim(p_activity->>'cnf_link_state'), ''), s.cnf_link_state),
      cnf_number_display = coalesce(nullif(trim(p_activity->>'cnf_number_display'), ''), cnf_rec.cnf_reference, s.cnf_number_display),
      non_process_description = coalesce(p_activity->>'non_process_description', s.non_process_description),
      type_of_validation = coalesce(p_activity->>'type_of_validation', s.type_of_validation),
      protocol_number = coalesce(p_activity->>'protocol_number', s.protocol_number),
      protocol_status = coalesce(p_activity->>'protocol_status', s.protocol_status),
      report_number = coalesce(p_activity->>'report_number', s.report_number),
      report_status = coalesce(p_activity->>'report_status', s.report_status),
      endorsement_number = coalesce(p_activity->>'endorsement_number', s.endorsement_number),
      endorsement_status = coalesce(p_activity->>'endorsement_status', s.endorsement_status),
      sync_version = coalesce(s.sync_version, 1) + 1,
      updated_by = coalesce(nullif(trim(p_user_email), ''), s.updated_by),
      updated_at = now_ts
    WHERE s.activity_id = activity_id;
  END IF;

  IF p_create_endorsement THEN
    endorsement_result := public.ensure_endorsement_from_source(
      'non_process_support_activity',
      activity_id,
      jsonb_build_object(
        'endorsement_number', coalesce(p_activity->>'endorsement_number', 'N/A'),
        'endorsement_status', coalesce(p_activity->>'endorsement_status', 'N/A'),
        'process_classification', 'non_process',
        'support_activity_id', activity_id,
        'cnf_tracker_record_id', cnf_rec.record_id::text,
        'cnf_number_display', coalesce(nullif(trim(p_activity->>'cnf_number_display'), ''), cnf_rec.cnf_reference, 'N/A'),
        'non_process_description', coalesce(p_activity->>'non_process_description', 'N/A'),
        'last_sync_source', 'source'
      ),
      p_user_email
    );

    UPDATE public.support_activities
    SET endorsement_tracker_record_id = (endorsement_result->>'record_id')::uuid
    WHERE support_activities.activity_id = activity_id;
  END IF;

  INSERT INTO public.audit_logs (user_email, module, action, record_id, project_id, field_name, old_value, new_value, remarks)
  VALUES (
    coalesce(nullif(trim(p_user_email), ''), 'system'),
    'Support Activities',
    CASE WHEN is_insert THEN 'CREATE' ELSE 'UPDATE' END,
    activity_id,
    support_project_id,
    'ALL',
    '',
    '',
    'Support activity saved with links'
  );

  RETURN jsonb_build_object(
    'activity_id', activity_id,
    'project_id', support_project_id,
    'cnf_tracker_record_id', cnf_rec.record_id,
    'endorsement', endorsement_result
  );
END;
$$;

REVOKE ALL ON FUNCTION public.save_support_activity_with_links(jsonb, text, boolean, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_support_activity_with_links(jsonb, text, boolean, jsonb) TO authenticated;
