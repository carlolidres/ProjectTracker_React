# Version 49 Handoff - Per-PO SO No on Add Batch

Project Location: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React`

Date: 2026-06-13

Previous Version: `agent-history/version-48-handoff.md`

Project Status: **SO No. no longer copies from Batch 1 when adding a new batch — deployed**

---

## What Was Requested

When **Add Batch** is used inside the same project, the new batch's **SO No.** field must not copy the value from Batch 1 (same exclusion rule as PO Control No. and FG Month).

---

## What Was Implemented

| Area | Change |
|------|--------|
| `PoControl` / `project.ts` | Added per-PO `so_no` field |
| `projectHierarchy.ts` | `clonePoForAdd` clears `so_no` on new batch/PO clones |
| `ProjectHierarchyForm.tsx` | SO No. read/write per PO; canonical PO syncs `project.so_no` for save compat |
| `projectFormFields.ts` | Removed project-level SO No. binding |
| `projectService.ts` | Load/save `so_no` per PO line |
| `ProjectEntryPage.tsx` | `emptyPo()` initializes `so_no` as empty |

---

## Verification

- `npm run build` — pass

---

## Assumptions

- Each batch may have its own SO No.; Batch 1 canonical PO remains the source for legacy `project.so_no` on save.
- Existing rows load `so_no` from each database line.

---

## Risks

- Projects edited only at project-head `so_no` before this change may need Batch 1 PO re-entry once (canonical fallback reads `project.so_no` until PO value is set).

---

## Git Traceability

- Commit message: `v49: stop copying SO No when adding batch`
- Commit hash: _(pending)_

---

## Manual Test Plan

1. Open project with Batch 1 SO No. filled in.
2. Click **Add Batch** → Batch 2 SO No. shows empty/N/A.
3. Enter distinct SO No. on Batch 2 → save → reload → each batch keeps its own value.

---

## Next Steps

1. Live smoke test on GitHub Pages after deploy workflow completes.
2. Continue migration gap items as prioritized.
