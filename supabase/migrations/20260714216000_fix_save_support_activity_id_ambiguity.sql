-- Fix ambiguous column reference "activity_id" in save_support_activity_with_links.
-- PL/pgSQL variable named activity_id clashed with support_activities.activity_id (SQLSTATE 42702).

CREATE OR REPLACE FUNCTION public.save_support_activity_with_links(
  p_activity jsonb,
  p_user_email text DEFAULT ''::text,
  p_create_endorsement boolean DEFAULT false,
  p_cnf_create jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.user_role;
  v_activity_id text;
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

  v_activity_id := nullif(trim(p_activity->>'activity_id'), '');
  IF v_activity_id IS NULL OR lower(v_activity_id) = 'n/a' THEN
    v_activity_id := 'SUP-' || to_char(now_ts, 'YYYYMMDD-HH24MISS-MS');
    is_insert := true;
  END IF;

  SELECT * INTO existing
  FROM public.support_activities s
  WHERE s.activity_id = v_activity_id;

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
      v_activity_id,
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
    WHERE s.activity_id = v_activity_id;
  END IF;

  IF p_create_endorsement THEN
    endorsement_result := public.ensure_endorsement_from_source(
      'non_process_support_activity',
      v_activity_id,
      jsonb_build_object(
        'endorsement_number', coalesce(p_activity->>'endorsement_number', 'N/A'),
        'endorsement_status', coalesce(p_activity->>'endorsement_status', 'N/A'),
        'process_classification', 'non_process',
        'support_activity_id', v_activity_id,
        'cnf_tracker_record_id', cnf_rec.record_id::text,
        'cnf_number_display', coalesce(nullif(trim(p_activity->>'cnf_number_display'), ''), cnf_rec.cnf_reference, 'N/A'),
        'non_process_description', coalesce(p_activity->>'non_process_description', 'N/A'),
        'last_sync_source', 'source'
      ),
      p_user_email
    );

    UPDATE public.support_activities s
    SET endorsement_tracker_record_id = (endorsement_result->>'record_id')::uuid
    WHERE s.activity_id = v_activity_id;
  END IF;

  INSERT INTO public.audit_logs (user_email, module, action, record_id, project_id, field_name, old_value, new_value, remarks)
  VALUES (
    coalesce(nullif(trim(p_user_email), ''), 'system'),
    'Support Activities',
    CASE WHEN is_insert THEN 'CREATE' ELSE 'UPDATE' END,
    v_activity_id,
    support_project_id,
    'ALL',
    '',
    '',
    'Support activity saved with links'
  );

  RETURN jsonb_build_object(
    'activity_id', v_activity_id,
    'project_id', support_project_id,
    'cnf_tracker_record_id', cnf_rec.record_id,
    'endorsement', endorsement_result
  );
END;
$function$;
