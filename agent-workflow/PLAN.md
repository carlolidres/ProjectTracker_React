# Active Plan

Last Updated: `2026-07-14`
Plan Owner: `Cursor Agent`
Status: `COMPLETED` (code + local verification; remote migration not applied)

## Objective

Enhance Support Activities (status, Non-Process, CNF linking, editable suggestions, NA behavior) and add Endorsement Tracker with ID-based linking, item rows, and bidirectional mapped-field synchronization.

## Acceptance Criteria

- [x] Additive migration + guarded down script
- [x] Support Activity Status / Status Date / Non-Process fields
- [x] Reusable searchable editable dropdown + NA helpers
- [x] CNF link by record ID + Not Applicable + atomic RPC path
- [x] Endorsement Tracker route/sidebar below CNF Tracker
- [x] Auto-create on In Process saves (Non-Process + Project) without duplicates; redirect after success
- [x] Independent endorsement create + Project/CNF/Support links
- [x] Item rows with stable IDs, confirm remove, soft-delete
- [x] Two-way sync mapped fields with echo/stale protection
- [x] Role matrix: view all; admin/val manage; qa QA-fields; admin removes options
- [x] `npm run typecheck` / `npm run build` / `npm run test:fixes` / `npm run lint`
- [ ] Remote Supabase migration apply (owner approval required)
- [ ] Browser manual smoke on staging/production after migration

## Completion Notes

Migration file: `supabase/migrations/20260714110110_endorsement_tracker_and_support_enhancements.sql`  
Rollback docs: `agent-workflow/ENDORSEMENT_ROLLBACK.md`  
Manual checklist: `agent-workflow/ENDORSEMENT_MANUAL_CHECKLIST.md`
