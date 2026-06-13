# Version 45 Handoff - Add Batch Copy + Graphify Ignore Config

Project Location: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React`

Date: 2026-06-13

Previous Version: `agent-history/version-44-handoff.md`

Project Status: **Add Batch copies Batch 1 values; graphify tooling gitignored — deployed**

---

## What Was Requested

Commit and deploy:
- Add Batch copies Batch 1 entries to new batch (except PO Control No. and FG Month; SO No. remains project-level)
- Mother-linked CNF entries copied to new batch
- `.gitignore` entries for `graphify-out/` and `_graphify_code_only/`
- `.graphifyignore` for code-only graphify extraction

---

## What Was Implemented

| Area | Change |
|------|--------|
| `src/lib/projectHierarchy.ts` | `clonePoForAdd` preserves copied fields + CNF; clears only `po_control_no` and `fg_month` |
| `.gitignore` | Ignore generated graphify output directories |
| `.graphifyignore` | Restrict graphify scan to code/config files |

---

## Verification

- `npm run build` — pass (verified when change was made)

---

## Git Traceability

- Commit message: `v45: copy batch 1 values on add batch and add graphify ignores`
- Commit hash: *(pending)*

---

## Manual Test Plan

1. Load project → Add Batch → new batch has Batch 1 field values except empty PO Control No. and FG Month.
2. With mother-linked CNF on Batch 1 → Add Batch → CNF entries appear on new batch POs.
3. Confirm `graphify-out/` is not tracked by git.
