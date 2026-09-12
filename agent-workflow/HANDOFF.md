# Current Handoff

Last Updated: `2026-09-12`
Version: `v0.95.0`
Branch: `main`
Commit: pending push to `origin/main` (My Work Monday upgrade + layout fix)
App version: `0.95.0`

## Current Status

`#/project-management` (My work) is a Monday-style workspace on existing CNF/support portfolio rows and `project_management_tasks`. No parallel project table. Sidebar route unchanged.

Layout: summary cards wrap with `auto-fit` instead of a forced 6-column viewport grid, so an ~868px content column (sidebar still open) no longer stacks card labels on top of each other. Portfolio table scroll width was raised so cells do not compress into overlapping text.

## Recently Completed

- Always-on summary cards, grouped Portfolio table, Board kanban, expanded filters/sort
- New Project → `#/projects?return_to=/project-management`; New task unchanged
- My Tasks grouped Overdue/Today/This Week/Later/Completed with inline task edits
- Calendar shows project due dates; day click still creates a task
- Drawer Activity tab from `audit_logs`; source edits stay confirmation-gated

## Deferred

- `@dnd-kit` and persisted sort_order overlay (native drag + confirmation only)
- Mentions, attachments, websockets
- Quick-add blank project rows

## Verification

| Check | Status | Result |
|---|---|---|
| `npm run typecheck` | PASSED | clean |
| `npm run test:project-management-portfolio` | PASSED | derived board status + grouping |
| `npm run test:project-management-workflow` | PASSED | My Tasks section buckets |
| `npm run test:dashboard-pm-hub` | PASSED | stub portfolio fields |
| Browser smoke | NOT RUN | no browser automation in this session |

## Next Action

Refresh `#/project-management` at ~1150px window width (sidebar open, ~868px content). Confirm summary labels, header actions, filters, and table cells no longer overlap. Then switch Portfolio / My Tasks / Board / Calendar and confirm a card click still opens the workspace drawer.

## Dumb-Zone Recovery

- Status: `NOT_TRIGGERED`
