# Version 60 Handoff - CNF Tracker, Feedback TTL, Close Validation, Data Map

Project Location: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React`

Date: 2026-06-17

Previous Version: `agent-history/version-59-handoff.md`

Project Status: **v60 — CNF Tracker migration slice, feedback Not Accepted TTL, project/CNF close validation, Data Map integrity UX**

---

## What Was Requested

1. Migrate legacy CNF Tracker workflow into React + Supabase (registry records, aggregation from project PO lines, closure rules).
2. CNF Tracker UI aligned with PRD: hidden system tracker ID in normal UX, reference picker modal, trimmed sections, PO linkage table with frozen columns plus protocol/validation columns.
3. Role-based access: edit for admin/qa/val; view-only for other roles; copy-from-project for admin/am_bm_pl.
4. QA **Risk Control** field persisted on CNF entries (`cnf_entries_json` / entry model).
5. **Project close** validation: CLOSED only when canonical PO has Approved Interim or Validation report (Not Applicable does not qualify for interim).
6. **CNF Tracker close** validation via `cnfClosureValidation.ts` (approved CNF status shortcut or gate fields Approved/NA).
7. Admin **Data Map**: expanded integrity findings and click-to-highlight related table subgraph.
8. User feedback: rename admin disposition to **Not Accepted**, 3-day TTL for **Addressed** and **Not Accepted** (migration 028).
9. Handoff, git commit (v60), and GitHub Pages deploy.

---

## What Was Implemented

| Area | Change |
|------|--------|
| **Nav / routing** | `router.tsx`, `sidebar.tsx`, `main.tsx` — `/cnf-tracker` route and nav item |
| **Migration 027** | `cnf_tracker_records` table, unique active CNF reference index, RLS for authenticated users |
| **CNF Tracker feature** | `CnfTrackerPage.tsx`, `CnfReferencePickerModal.tsx`, `cnf-tracker.css` |
| **Services / types** | `cnfTrackerService.ts`, `cnfTracker.ts`, `idGeneration.ts` (tracker IDs) |
| **Aggregation** | `cnfTrackerAggregation.ts` — match PO lines by CNF reference, roll up display fields |
| **Closure** | `cnfClosureValidation.ts` (tracker), `projectCloseValidation.ts` (project final status) |
| **Role access** | `canEditCnfTracker`, `canCopyCnfFromProject`, route entry for `/cnf-tracker` |
| **Project form** | `risk_control` on QA CNF entries; `ProjectHierarchyForm` / `projectFormFields` / `mappers` / `projectService` / `project.ts` |
| **Project entry** | Close blocker messaging wired via project close validation |
| **Data Map** | `buildIntegrityReport.ts` expanded findings; `DataMapPage.tsx` finding click highlights `relatedTables` subgraph |
| **Feedback** | `feedback-chat.tsx` Not Accepted label; `feedbackService.ts` `not_accepted_at`, purge RPC; migration 028 triggers + purge |
| **Constants** | Feedback copy / TTL constants where applicable |
| **Reference (untracked PRD)** | `reference/CNF_Tracker_PRD/` Apps Script/HTML reference for CNF Tracker UI behavior |

### CNF Tracker UI notes

- Tracker ID used in URL/search params and save flow but de-emphasized in the main form layout.
- Meeting/view-only modes respect `canEditCnfTracker` and read-only styling (`project-field-view-only`).
- PO table includes protocol and validation report columns with sticky/frozen leading columns per stylesheet.

---

## What Was Not Implemented

- Full parity audit vs every legacy CNF Tracker PRD control (edge exports, all legacy reports).
- Automated tests for CNF closure and project close rules.
- Database migration for `risk_control` as a separate column (stored in existing `cnf_entries_json` entry shape only).
- Applying migrations 027/028 in cloud Supabase (manual step for operator).
- Committing `reference/Screenshot 2026-06-16 215046.png` (left untracked; optional doc asset).

---

## Problems Encountered

- Large CNF Tracker page bundle contributes to Vite chunk size warning (>500 kB).
- Feedback purge RPC name unchanged (`purge_expired_addressed_feedback`) while behavior now includes Not Accepted rows — relies on migration 028 function body replacement.
- Data Map RLS findings depend on migration parser completeness; false negatives possible if policies use patterns not parsed.

---

## Lessons Learned

- Separate tracker registry (`cnf_tracker_records`) from project PO `cnf_entries_json` keeps header status stable while lines aggregate from projects.
- Distinct `not_accepted_at` timestamp allows TTL for Not Accepted without overloading `status` enum values.
- Integrity findings with `relatedTables` improve admin schema review more than isolated table selection alone.

---

## Assumptions

- CNF reference uniqueness for active tracker rows matches migration 027 partial unique index semantics.
- Roles `qa` and `val` are intended CNF Tracker editors per product direction.
- GitHub Pages deploy continues via `.github/workflows/deploy.yml` on push to `main` with repository secrets for Supabase env.
- `dist/` remains gitignored; Pages artifact comes from CI build.

---

## Risks

- **Supabase**: Until 027 and 028 are applied, CNF Tracker saves and Not Accepted TTL/purge will fail or behave inconsistently.
- **RLS**: `cnf_tracker_records` policies allow any active authenticated user to insert/update — acceptable for internal app but not role-scoped at DB layer.
- **Closure rules**: Divergence from legacy Apps Script if gate field list or Approved/NA semantics differ in production data.

---

## Verification

- `npm run build` — passed (TypeScript + Vite) before commit.

---

## Git Traceability

- Commit message: `v60: CNF Tracker, feedback TTL, and close validation`
- Commit hash: 37e6cd9

---

## Next Steps

1. Apply `supabase/migrations/027_cnf_tracker_records.sql` and `028_feedback_not_accepted_ttl.sql` in Supabase SQL editor or CLI.
2. Smoke-test CNF Tracker create/edit/close, reference picker, and view-only role in deployed app.
3. Confirm feedback Not Accepted auto-purge after 72h (or run purge RPC manually in admin workflow).
4. Validate project CLOSED blocked until validation report Approved per canonical PO.
5. Review Data Map findings against live Supabase policy list.
6. Consider code-splitting CNF Tracker route to reduce main bundle size.

---

## Summary Since v59

v59 delivered QA CNF layout and QRMR FG Month linkage. v60 adds the CNF Tracker feature surface (DB + UI + services), QA Risk Control on CNF entries, project and CNF closure validation, Data Map integrity subgraph UX, and feedback Not Accepted with shared 3-day TTL (migration 028).



