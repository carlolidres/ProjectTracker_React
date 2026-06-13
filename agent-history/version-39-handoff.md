# Version 39 Handoff - Date Pickers, N/A Focus Clearing, Sticky Tab Alignment

Project Location: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React`

Date: 2026-06-13

Previous Version: `agent-history/version-38-handoff.md`

Project Status: **Form date inputs, N/A UX, Support Activities labels, and project sticky header/tab alignment deployed**

---

## What Was Requested

1. FG Month month/year picker; Client Approval Target calendar; app date format `DD MMM YYYY` (FG month displays `MMM YYYY`, stores last day of month).
2. Support Activities: Target Date → **Target Date to Execute** with calendar; Planning Schedule calendar; typed entry allowed.
3. N/A placeholder clears on focus for text fields (not date pickers).
4. Project sticky header + role tabs: tabs above hierarchy form; no gap when both stick on scroll.

---

## What Was Implemented

| Area | Change |
|------|--------|
| `date.ts` | `DD MMM YYYY` display; parse/serialize; FG month last-day storage |
| `app-date-picker.tsx` | Shared `AppDatePicker`, `AppMonthPicker` |
| `na-clearing-input.tsx` | N/A clears on focus for text/textarea |
| `ProjectFieldControl.tsx` | Date/month pickers + N/A clearing |
| `SupportActivitiesPage.tsx` | Date pickers, labels, `NaClearingInput` on text fields |
| `projectService.ts` / `supportActivityService.ts` | Server-side date normalization on save |
| `ProjectEntryPage.tsx` + `project-form.css` | Tabs restored above hierarchy; sticky flush alignment (`-1px` overlap, `getBoundingClientRect` height) |
| Labels | `Target Date to Execute` in audit/date-adjustment |

---

## Verification

- `npm run build` — pass

---

## Git Traceability

- Commit message: `v39: date pickers, N/A focus clearing, and sticky tab alignment`
- Commit hash: `4b7999f`

---

## Manual Test Plan

1. Projects → PO → FG Month: pick month/year; save shows `Aug 2026` in UI, `2026-08-31` in DB.
2. Client Approval Target: calendar + typed `31 Aug 2026`.
3. Focus empty text field showing N/A — placeholder clears without manual delete.
4. Scroll project form — header and tabs stick with no visible gap.
5. Support Activities — Target Date to Execute and Planning Schedule pickers work.
