-- Find-or-link endorsement by endorsement_number before insert.
-- Prevents 23505 on endorsement_tracker_active_number_idx when Support/Project
-- saves with an existing number (e.g. "Test") under a different source record.

CREATE OR REPLACE FUNCTION public.ensure_endorsement_from_source(
  p_source_type text,
  p_source_record_id text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_user_email text DEFAULT ''::text
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.user_role;
  existing public.endorsement_tracker_records%ROWTYPE;
  created public.endorsement_tracker_records%ROWTYPE;
  was_created boolean := false;
  next_id text;
  v_number text;
  v_found boolean := false;
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
    v_found := FOUND;
  END IF;

  -- Also match active endorsements by normalized number (unique among non-N/A).
  IF NOT v_found THEN
    v_number := nullif(trim(p_payload->>'endorsement_number'), '');
    IF v_number IS NOT NULL AND lower(v_number) <> 'n/a' THEN
      SELECT * INTO existing
      FROM public.endorsement_tracker_records e
      WHERE e.is_active = true
        AND lower(trim(regexp_replace(e.endorsement_number, '\s+', ' ', 'g')))
          = lower(trim(regexp_replace(v_number, '\s+', ' ', 'g')))
      LIMIT 1;
      v_found := FOUND;
    END IF;
  END IF;

  IF v_found THEN
    UPDATE public.endorsement_tracker_records e
    SET
      endorsement_number = coalesce(nullif(trim(p_payload->>'endorsement_number'), ''), e.endorsement_number),
      endorsement_status = coalesce(nullif(trim(p_payload->>'endorsement_status'), ''), e.endorsement_status),
      process_classification = coalesce(nullif(trim(p_payload->>'process_classification'), ''), e.process_classification),
      -- Claim source only when independent or already this source; never steal another source's ownership.
      source_type = CASE
        WHEN e.source_type = 'independent'
          OR (e.source_type = p_source_type AND e.source_record_id IS NOT DISTINCT FROM nullif(trim(p_source_record_id), ''))
          THEN p_source_type
        ELSE e.source_type
      END,
      source_record_id = CASE
        WHEN e.source_type = 'independent'
          OR (e.source_type = p_source_type AND e.source_record_id IS NOT DISTINCT FROM nullif(trim(p_source_record_id), ''))
          THEN nullif(trim(p_source_record_id), '')
        ELSE e.source_record_id
      END,
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
    SELECT * INTO existing
    FROM public.endorsement_tracker_records
    WHERE is_active = true
      AND source_type = p_source_type
      AND source_record_id = p_source_record_id
    LIMIT 1;
    IF NOT FOUND THEN
      v_number := nullif(trim(p_payload->>'endorsement_number'), '');
      IF v_number IS NOT NULL AND lower(v_number) <> 'n/a' THEN
        SELECT * INTO existing
        FROM public.endorsement_tracker_records e
        WHERE e.is_active = true
          AND lower(trim(regexp_replace(e.endorsement_number, '\s+', ' ', 'g')))
            = lower(trim(regexp_replace(v_number, '\s+', ' ', 'g')))
        LIMIT 1;
      END IF;
    END IF;
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
$function$;
