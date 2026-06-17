# Version 56 Handoff - QA Role, QA Tab, QRMR Fields, Not Applicable Disable Logic

Project Location: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React`

Date: 2026-06-17

Previous Version: `agent-history/version-55-handoff.md`

Project Status: **v56 committed — QA user role and tab; QRMR moved off AM/BM/PL; NA disable on QA/VAL**

---

## What Was Requested

1. Add **QA** user role (`qa`) with dedicated project-entry tab between AM/BM/PL and PP
2. Per-CNF **QRMR No.**, **Status**, and **Target Date** on the QA tab
3. Remove QRMR fields from the AM/BM/PL CNF section
4. **Not Applicable** status should disable paired target-date inputs on QA and VAL tabs (aligned with VAL rules)
5. Ship Supabase migration for QA role enum, QRMR columns, and RLS updates
6. Commit, push, deploy per AGENTS.md (v56)

---

## What Was Implemented

| Area | Change |
|------|--------|
| `supabase/migrations/025_qa_cnf_fields.sql` | `user_role` adds `qa`; `qrmr_status` / `qrmr_target_date` on `cnf_projects`; role helper + RLS for QA |
| `src/types/user.ts`, `roleMapping.ts`, `roleAccess.ts`, `constants.ts` | QA role in types, nav, and access matrix |
| `ProjectRoleTabs.tsx`, `ProjectHierarchyForm.tsx`, `ProjectEntryPage.tsx` | QA tab placement; per-CNF QRMR UI; AM/BM/PL QRMR removed |
| `projectFormFields.ts`, `projectHierarchy.ts`, `mappers.ts`, `types/project.ts` | Field definitions and persistence for QRMR |
| `valReportDates.ts`, form components | Not Applicable disables target dates on QA and VAL |
| `projectService.ts`, `dashboardService.ts`, `dashboardSandbox.ts`, `DashboardPage.tsx` | Load/save and dashboard awareness |
| `duplicateReview.ts`, `projectPriority.ts`, `fgUrgency.ts`, `cnfMotherLink.ts` | Review/priority/link logic without AM/BM/PL QRMR |
| `scripts/seed-auth-users.ts` | Seed path for QA test user |
| `src/styles/project-form.css` | QA tab layout spacing |

---

## Verification

- `npm run build` — pass (2026-06-17, pre-commit)
- Manual Supabase migration **not run in CI** — operator must apply `025_qa_cnf_fields.sql` in Supabase SQL editor or CLI

---

## Migration Steps (Supabase)

1. Open Supabase Dashboard → SQL → New query
2. Run contents of `supabase/migrations/025_qa_cnf_fields.sql`
3. Confirm `user_role` includes `qa` and `cnf_projects` has `qrmr_status`, `qrmr_target_date`
4. Optionally run `npm run seed:auth-users` locally with `DUMMY_USER_PASSWORD` to add a QA test profile (after migration)

---

## Assumptions

- QRMR per-CNF detail lives in `cnf_entries_json`; flat columns mirror the first CNF entry for reporting compatibility
- QA users edit QRMR fields only on the QA tab; AM/BM/PL no longer surface QRMR in the CNF block

---

## Risks

- Enum `ADD VALUE` for `qa` cannot run inside a transaction on some Postgres versions; migration uses idempotent patterns but still requires one-time apply on each environment
- Until migration runs, QA role saves may fail against older schema
- RLS changes must match seeded profile roles in each environment

---

## Git Traceability

- Commit message: `v56: QA role, QA tab, QRMR fields, Not Applicable disable logic`
- Commit hash: `6e15d03`

---

## Next Steps

1. Apply migration `025_qa_cnf_fields.sql` on production Supabase
2. Smoke test: login as QA, edit QRMR per CNF, confirm Not Applicable disables target date on QA and VAL
3. Confirm AM/BM/PL tab no longer shows QRMR fields
4. Optional: dashboard KPI spot-check after QA data entry

