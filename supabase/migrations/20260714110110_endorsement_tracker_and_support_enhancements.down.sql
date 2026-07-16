-- Guarded down migration for endorsement tracker + support enhancements.
-- Refuses destructive drops while new-feature data exists.
-- Preferred app rollback: restore prior build and leave additive schema intact.

DO $$
DECLARE
  endorsement_count integer := 0;
  item_count integer := 0;
  option_count integer := 0;
  support_new_data integer := 0;
BEGIN
  IF to_regclass('public.endorsement_tracker_records') IS NOT NULL THEN
    SELECT count(*) INTO endorsement_count FROM public.endorsement_tracker_records;
  END IF;
  IF to_regclass('public.endorsement_tracker_items') IS NOT NULL THEN
    SELECT count(*) INTO item_count FROM public.endorsement_tracker_items;
  END IF;
  IF to_regclass('public.reusable_options') IS NOT NULL THEN
    SELECT count(*) INTO option_count
    FROM public.reusable_options
    WHERE created_by IS DISTINCT FROM 'migration';
  END IF;
  IF to_regclass('public.support_activities') IS NOT NULL THEN
    SELECT count(*) INTO support_new_data
    FROM public.support_activities
    WHERE status IS NOT NULL
       OR cnf_tracker_record_id IS NOT NULL
       OR nullif(trim(coalesce(non_process_description, '')), '') IS NOT NULL
       OR nullif(trim(coalesce(endorsement_number, '')), '') IS NOT NULL
       OR endorsement_tracker_record_id IS NOT NULL;
  END IF;

  IF endorsement_count > 0 OR item_count > 0 OR option_count > 0 OR support_new_data > 0 THEN
    RAISE EXCEPTION
      'Rollback refused: export/backup required first (endorsements=%, items=%, custom_options=%, support_enhanced=%)',
      endorsement_count, item_count, option_count, support_new_data;
  END IF;

  DROP FUNCTION IF EXISTS public.save_support_activity_with_links(jsonb, text, boolean, jsonb);
  DROP FUNCTION IF EXISTS public.sync_endorsement_mapped_fields(uuid, integer, text, jsonb, text);
  DROP FUNCTION IF EXISTS public.ensure_endorsement_from_source(text, text, jsonb, text);
  DROP FUNCTION IF EXISTS public.next_endorsement_tracker_id();
  DROP FUNCTION IF EXISTS public.normalize_option_key(text);

  ALTER TABLE public.support_activities
    DROP CONSTRAINT IF EXISTS support_activities_endorsement_tracker_fk;

  DROP TABLE IF EXISTS public.endorsement_tracker_items;
  DROP TABLE IF EXISTS public.endorsement_tracker_records;
  DROP TABLE IF EXISTS public.reusable_options;

  ALTER TABLE public.support_activities
    DROP CONSTRAINT IF EXISTS support_activities_cnf_link_state_check;

  ALTER TABLE public.support_activities
    DROP COLUMN IF EXISTS status,
    DROP COLUMN IF EXISTS status_date,
    DROP COLUMN IF EXISTS cnf_tracker_record_id,
    DROP COLUMN IF EXISTS cnf_link_state,
    DROP COLUMN IF EXISTS cnf_number_display,
    DROP COLUMN IF EXISTS non_process_description,
    DROP COLUMN IF EXISTS type_of_validation,
    DROP COLUMN IF EXISTS protocol_number,
    DROP COLUMN IF EXISTS protocol_status,
    DROP COLUMN IF EXISTS report_number,
    DROP COLUMN IF EXISTS report_status,
    DROP COLUMN IF EXISTS endorsement_number,
    DROP COLUMN IF EXISTS endorsement_status,
    DROP COLUMN IF EXISTS endorsement_tracker_record_id,
    DROP COLUMN IF EXISTS sync_version;
END $$;
