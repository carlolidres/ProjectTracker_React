# Version 59 Handoff - QA CNF Layout and QRMR FG Month Linkage

Project Location: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React`

Date: 2026-06-17

Previous Version: `agent-history/version-58-handoff.md`

Project Status: **v59 — QA CNF read-only fields and QRMR FG Month deadline logic committed**

---

## What Was Requested

1. Add read-only **Change Description** on the QA tab below CNF Reference, with QRMR fields on the row below.
2. Keep CNF Reference and Change Description on QA mirrored from AM/BM/PL (shared `cnf_entries` data).
3. Tie QRMR workflow to PO **FG Month** — QRMR must be Approved or Not Applicable on or before the FG Month deadline.

---

## What Was Implemented

| Area | Change |
|------|--------|
| `projectFormFields.ts` | QA CNF layout: `change_description` (read-only, span 3) between CNF Reference and QRMR row; updated QRMR tooltips |
| `ProjectHierarchyForm.tsx` | QA read-only for `change_description`; auto-sync QRMR target dates when FG Month changes |
| `qrmrFgMonth.ts` | New helper: FG Month last day → QRMR target date; applies to all non-Approved/NA CNF entries on the PO |
| `valReportDates.ts` | QRMR status complete only when Approved or Not Applicable |
| `projectPriority.ts` | Updated next-action label for QRMR status |

---

## Verification

- `npm run build` — passed (TypeScript + Vite)

---

## Assumptions

- FG Month deadline uses the last calendar day of the selected month (same as FG delivery urgency).
- Existing Approved/Not Applicable QRMR entries are not overwritten when FG Month changes.
- `QA_CNF_ENTRY_KEYS` remains QRMR-only for edit ownership; mirrored AM/BM/PL fields are display-only on QA.

---

## Git Traceability

- Commit message: `v59: QA CNF layout and QRMR FG Month linkage`
- Commit hash: `63fae29`

---

## Next Steps

1. Verify QA tab layout and FG Month → QRMR target date sync in the live form.
2. Confirm dashboard/priority reflects QRMR Approved/NA requirement for open projects.
