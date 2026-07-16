# Endorsement Tracker — Rollback Procedure

## Scope
Covers Support Activity enhancements and Endorsement Tracker introduced by migration:

- `supabase/migrations/20260714110110_endorsement_tracker_and_support_enhancements.sql`
- Down script: `supabase/migrations/20260714110110_endorsement_tracker_and_support_enhancements.down.sql`

## Preferred recovery (application rollback)
1. Keep additive tables/columns in place.
2. Restore the previous stable GitHub Pages build / prior release tag.
3. Confirm Support Activities (TSD/RnD), CNF Tracker, and Project Validation still load/save.
4. Preserve all endorsement/support enhanced data for later recovery.
5. Do **not** delete new records merely to restore the previous UI.

## Before production deployment (owner)
1. Create a Git tag/checkpoint for the last known stable version.
2. Back up the production database.
3. Record current schema/migration version.
4. Export/snapshot: `support_activities`, `cnf_tracker_records`, `cnf_projects`, plus new tables after apply.
5. Apply migration on staging first; run security/performance advisors.
6. Confirm guarded down script refuses destructive drops while feature data exists.
7. Complete manual smoke checklist.

## Database rollback (only when required)
1. Export all rows from:
   - `endorsement_tracker_records`
   - `endorsement_tracker_items`
   - `reusable_options` (non-migration rows)
   - any `support_activities` rows using new Non-Process/status/CNF fields
2. Run the down script only after export confirmation.
3. The down script **raises an exception** if feature data still exists.
4. Restore from backup only if reverse migration cannot safely recover.
5. Verify record counts and critical historical relationships.

## Post-rollback validation
- Users can log in
- Support Activities load/save
- CNF Tracker load/save
- Validation projects load/save
- Sidebar navigation works
- No orphaned/duplicate endorsement source links remain from partial ops
- Logs show no continuing sync/migration errors

## Documentation to record after an incident
- Cause of regression
- Affected records
- Rollback actions taken
- Data reconciliation performed
- Corrective action before redeploy
