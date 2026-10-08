# Current Handoff

Last Updated: `2026-10-08`

## Current Status

Sidebar item **Project board** opens a wide popup over the current page. The old Project Management portfolio page is no longer in the sidebar; `#/project-management` returns to the dashboard. That popup shows the workspace rail and the board, and it uses this tab's sign-in. The page heading follows the selected project name. The board is Workspace, then Project, then groups and tasks. It does not list CNF or support projects. Standard groups are Planned, On-going, and Done. Status stays separate: Not Started, Working on it, Done, and Stuck. A private project is visible only to invited project members. Apply migration `20261007213000_pm_workspaces` before the board can save, and `20261008193000_pm_board_dependencies` for Depends on, updates, and files. Both were applied to the Project Tracker database.

## Recently Completed

- The rail project list scrolls on its own. Workspace, search, and My work stay put, and the bottom New Project button is gone. Add subtask no longer starts with a plus. The Gantt uses a split task list and timeline, phase summary lines, right-angle dependency arrows, and zoom. Dependency and date editors use tighter spacing.
- The board window keeps the same frozen rail, title, tabs, toolbar, group head, and column headers as the popup. Scrollbars in the board are thin. The more menu exports the visible tasks to Excel. A linked title is Unique Batch, Control #, Kind when present, and Product, all in capitals, and it follows those record fields. Renaming that title is turned off so a manual name cannot change the spreadsheet or support record.
- Spreadsheet Product names display and save in capital letters. A linked board title follows the current spreadsheet or support record, including that capital product name. Archive and Open in new window are icon buttons. Gantt Day columns show the weekday and date with a line per day, and dependency arrows draw between dated bars or, when a bar is missing, from the task name.
- A board project created from Spreadsheet or Support keeps that link. Changing a step’s status or dates writes the matching status, target date, or schedule on the source record, and opening the board reads those fields back. Changing an existing date still asks for a Lessons Learned reason.
- The board title opens an archive of hidden workspaces and projects, with restore. Spreadsheet choices show Unique Batch, Control #, and Product. Support choices show activity kind and title. The empty board is a short prompt with create and invite actions.
- New Project can copy a Spreadsheet project or a Support activity onto the board. Protocol, Execution, Report, and Endorsement become tasks, and the fields those steps need become subtasks. Finished steps land in Done, work in progress in On-going, and steps that have not started in Planned.
- Board rows list High, then Medium, then Low. Stuck stays above Not Started inside Planned. Working on it moves the task to On-going, Done moves it to Done, and Not Started or Stuck move it to Planned. Subtasks are indented. The add row reads “Add task”. The popup title can open a signed-in board window and then closes. Rail, groups, Gantt labels, calendar toolbar, and the task panel use tighter spacing and type.
- Project board follows the Monday-inspired spec for the working core: project header (rename, favorite, invite, copy link), persisted rail collapse with the `[` shortcut, My work, Me/Unassigned filters, filter chips, personal saved views, Kanban status lanes, Commenter role, holiday-aware scheduling, and previous/next plus activity export in the task panel.
- Custom columns, multi-person owners, rich-text replies, shared saved views, realtime sync, pinned dates, baselines, and critical path are not in this pass.
- Independent Project Management board with workspaces, projects, groups, and tasks stored apart from CNF and support records.
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
| `npx tsc --noEmit -p tsconfig.app.json` | PASSED | clean after the scrolling rail and Gantt layout |
| `npm run test:pm-board` | PASSED | spreadsheet title is batch, control, kind, and product in capitals |
| `npm run test:projects-db-validation` | PASSED | Product edits are stored in capitals |
| Browser smoke | NOT RUN | signed-in spreadsheet, board title, and Gantt still need a browser pass |

## Next Action

Open Project Management while signed in. Confirm Main Workspace, the Getting started project, and that a task edit shows on Main Table, Kanban, Gantt, and Calendar after refresh.

## Dumb-Zone Recovery

- Status: `NOT_TRIGGERED`
