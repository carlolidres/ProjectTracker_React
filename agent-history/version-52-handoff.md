# Version 52 Handoff - Validation, BMR, SO Integrity, Feedback, Data Map, Tooltips

Project Location: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React`

Date: 2026-06-12

Previous Version: `agent-history/version-51-handoff.md`

Project Status: **v52 feature set implemented locally — migrations 021–023 must be applied on Supabase before live testing**

---

## What Was Requested

Single v52 release covering:

1. Validation field overhaul (remove legacy three VAL fields; add nine interim/validation/endorsement fields)
2. TSD BMR lock/unlock when VAL/VER/CHAR study exists until endorsement Approved or Not Applicable
3. Endorsement acceptance target date auto-fill (+1 month from Validation Report Target Date)
4. Duplicate SO number prevention (DB index + frontend check)
5. Admin feedback Addressed / Not Addressed status
6–7. Admin Data Map full canvas with integrity review panel
8. Global tooltip repositioning on form labels

---

## What Was Implemented

| Area | Change |
|------|--------|
| `021_val_endorsement_fields.sql` | New VAL/endorsement columns + backfill from legacy columns |
| `022_unique_so_no.sql` | Partial unique index on active `so_no` |
| `023_app_feedback_status.sql` | `app_feedback.status` + admin UPDATE policy |
| `projectFormFields.ts`, `constants.ts`, `types/project.ts` | Nine new VAL fields; project-level validation report fields (Batch 1 only) |
| `ProjectHierarchyForm.tsx` | Hide project-level VAL on Batch 2+; BMR lock banner + read-only BMR fields; endorsement date auto-fill |
| `bmrLock.ts`, `valReportDates.ts`, `soNoValidation.ts` | BMR lock logic, +1 month helper, duplicate SO query |
| `projectService.ts` | Duplicate SO check on save/update; validation field sync; legacy column write-through |
| `mappers.ts`, `duplicateReview.ts`, `projectPriority.ts`, `dateAdjustmentReview.ts`, `dashboardService.ts` | Updated to new validation field keys |
| `ProjectFieldControl.tsx`, `project-form.css` | `?` tooltips moved to label row; overlay rules removed |
| `feedbackService.ts`, `feedback-chat.tsx` | Feedback status list/update in admin inbox |
| `DataMapPage.tsx`, `parseMigrations.ts`, `buildIntegrityReport.ts` | Admin schema canvas + integrity findings |
| `router.tsx`, `sidebar.tsx`, `roleAccess.ts` | `/admin/data-map` route and nav |
| `@xyflow/react` | Canvas dependency for Data Map |
| `migration-utils.ts`, `migration-map.md` | Sheet → Supabase mapping for new VAL columns |

---

## Verification

- `npm run build` — pass (2026-06-12)

---

## Assumptions

- “Recent study” = any PO with `Val_Activity` in `VAL`, `VER`, or `CHAR` (not time-window based).
- Project-level validation report fields follow the v49 `so_no` pattern (canonical PO + project head sync).
- Legacy `val_report_no`, `report_sub_status`, `report_target_date` columns remain for export compatibility; writes mirror new fields.
- Legacy `Report_Sub_Status` value “Client Approval” maps to “Routing” during migration/import.

---

## Risks

- Migrations **021–023** must be applied on Supabase before VAL saves, SO uniqueness, and feedback status work in production.
- Migration **022** deduplicates legacy repeated `so_no` values (keeps one row per SO globally; clears duplicates to `N/A`) before creating the unique index. Review affected rows if you rely on historical SO values on non-canonical PO lines.
- Data Map parser is regex-based over migration SQL — sufficient for current migrations, not a full SQL parser.
- Data Map bundle adds ~2.4 MB JS (React Flow); acceptable for admin-only page.
- BMR lock is frontend-enforced only (documented in integrity panel).

---

## Git Traceability

- Commit message: *(pending — not committed in this session)*
- Commit hash: *(pending)*

---

## Manual Test Plan

1. VAL tab: old three fields gone; nine new fields with label tooltips.
2. Batch 2+: project-level Validation Report fields hidden; Batch 1 saves/loads correctly.
3. TSD: BMR lock banner + disabled BMR fields when study exists and endorsement not Approved/NA.
4. Change Validation Report Target Date → endorsement acceptance date auto-fills +1 month (canonical PO).
5. Save duplicate active SO No. → blocked in UI; DB index blocks after migration 022.
6. Admin feedback inbox → Addressed / Not Addressed persists (after migration 023).
7. Admin Data Map → canvas loads tables; integrity panel lists findings; node click shows columns.
8. Date/month pickers: `?` beside label, not overlapping calendar icon.

---

## Next Steps

1. Apply migrations `021`, `022`, `023` on Supabase.
2. Commit as `v52: validation overhaul, BMR lock, SO integrity, feedback status, data map, tooltips`.
3. Live smoke test on GitHub Pages after deploy.
4. Optional: code-split Data Map route to reduce main bundle size.
