# Current Handoff

Last Updated: `2026-09-26`

## Current Status

`#/project-management` (My work) opens on the main table. Board, Calendar, and My Tasks sit under More views. Search, New task, New Project, and Refresh stay on the toolbar. Person, filter, sort, hide, and group by sit under View options. The person filter starts on the signed-in user when they own a row. The drawer opens on This step: Protocol, Execution, Report, or Endorsement, with Update this step and Add a task. Execution dates are a checklist. New Project names the four steps. A saved project or support activity returns to My work and opens that row. Official protocol, report, and final status stay on the source record.

## Recently Completed

- Board chrome: Main table / Board / Calendar / My Tasks, toolbar search, person, filter, sort, hide, group by
- Collapsed groups show priority mix and timeline range
- New Project menu adds a validation project or a TSD, RnD, or Non-Process support activity. The support form opens on that kind and returns to My work after save.
- Main table: add-column menu, timeline range on a subitem, expandable subitems, group summary bars. No custom text, file, or formula columns.
- Simpler path: Your tasks returns to the main table, the drawer opens on This step, extra views and filters are tucked away, execution dates are a checklist, and New Project describes the four steps.
- Gantt is under More views. Each project charts Protocol, Execution, Report, and Endorsement from its subitem dates.
- Sign-in keeps the same form. A carousel on the left advances every few seconds through four product slides.
- Main table columns share one width, so project rows, subitems, and the group summary line up. Group titles, counts, selection, and expanded rows use that group’s color. Timeline chips stay on one line, and owners show as colored initials.
- Gantt hides the board toolbar. The sidebar and access menu call this page Project Management. The More views item for the board is Kanban.
- Gantt timeline matches the task panel: expandable steps, start date, duration, week or month zoom, dependency arrows, a today line, and draggable task bars. Bars and arrows stay clipped to the calendar and cannot cover Task, Start date, or Duration while scrolling. Admin, AM/BM/PL, and VAL can still delete a subtask.
- Sidebar groups are an accordion: opening one closes the others. The current page’s section opens on navigation. Drag a main menu by its row to rearrange it. The order stays in this browser. There is no drag handle.
- Execution on the Gantt and on This step can add the shared subtasks: manufacturing start week, MO/BMR/PO activation, AR availability, and packaging schedule on a validation project, or Support execution on a support activity. Official dates and status stay on the source record.
- New Project → `#/projects?return_to=/project-management`; New task unchanged
- My Tasks uses the same grouped board as the main table: colored groups, compact rows, status fills, timeline pills, and priority fills. Groups are Overdue, Today, This Week, Later, and Completed.
- Calendar shows project due dates; day click still creates a task
- Drawer Activity tab from `audit_logs`; source edits stay confirmation-gated

## Deferred

- `@dnd-kit` and persisted sort_order overlay (native drag + confirmation only)
- Mentions, attachments, websockets
- Quick-add blank project rows

## Verification

| Check | Status | Result |
|---|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | PASSED | clean after the simpler My work path |
| `npm run test:project-management-portfolio` | PASSED | group summary, status mix, and timeline span |
| `npm run test:project-management-workflow` | PASSED | checklist replaces execution date rows; four-step mapping |
| `scripts/verify-url-derived-filters.ts` | PASSED | return path keeps the new record id |
| Browser smoke | NOT RUN | open My Tasks empty state, a row’s This step, and New Project |

## Next Action

Refresh My work. Confirm the main table is the default, My Tasks empty state returns there, and a row opens on This step. New Project should describe the four steps.

## Dumb-Zone Recovery

- Status: `NOT_TRIGGERED`
