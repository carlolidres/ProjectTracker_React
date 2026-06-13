# Version 41 Handoff - Dashboard Due Date KPI Layout

Project Location: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React`

Date: 2026-06-13

Previous Version: `agent-history/version-40-handoff.md`

Project Status: **Dashboard and Meeting View due-date KPI cards reorganized and deployed**

---

## What Was Requested

1. Meeting View: remove **More Than 30 Days** from Due Date Overview.
2. Dashboard Due Date Overview: show month-range cards only — **Within 15 Days**, **Within 30 Days**, **More Than 30 Days** (remove Overdue, Due Today, Within 3/7 Days).
3. Dashboard FG Month Tasks sidebar: show **Overdue**, **Due Today**, **Within 3 Days**, **Within 7 Days** (remove Within 15 Days from sidebar).
4. Do not affect Meeting View layout beyond removing More Than 30 Days.

---

## What Was Implemented

| Area | Change |
|------|--------|
| `MeetingViewOverlay.tsx` | Removed **More Than 30 Days** from meeting Due Date Overview |
| `DashboardPage.tsx` | Split `dueDateOverviewCards` (15/30/30+ days) and `fgMonthTaskCards` (Overdue, Today, 3/7 days) |
| `DashboardPage.tsx` | FG Month Tasks uses unified card list with red count on Overdue |

---

## Verification

- `npm run build` — pass

---

## Git Traceability

- Commit message: `v41: reorganize dashboard due date and FG month task KPIs`
- Commit hash: `dc3d81c`

---

## Manual Test Plan

1. Dashboard → Due Date Overview shows Within 15/30 Days and More Than 30 Days only.
2. Dashboard → FG Month Tasks shows Overdue, Due Today, Within 3 Days, Within 7 Days.
3. Meeting View → Due Date Overview shows Overdue through Within 30 Days; no More Than 30 Days.
4. Each card drills to Project Database with correct `due_window` filter.
