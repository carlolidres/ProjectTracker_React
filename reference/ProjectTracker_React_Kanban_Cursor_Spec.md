# Cursor Implementation Brief — Monday.com-Inspired Kanban View

## Objective
Implement a production-ready Kanban view inspired by the supplied Monday.com screenshot, integrated into the EXISTING application. Reproduce its information architecture and interaction quality without copying proprietary assets, source code, or branding. This file is an engineering specification, not a claim that features have already been implemented.

**Primary rule:** Inspect the existing codebase before making changes. Preserve its framework, component library, routing, authentication, authorization, database, API conventions, existing task fields, and design tokens. Do not scaffold a second app or a parallel task database. Implement changes incrementally and demonstrate working behavior.

## Reference
**Primary screenshot in the user\'s React repo (Windows absolute path):** `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React\screenshot\Kanban View.png`\n\n**Repo-relative screenshot path:** `screenshot/Kanban View.png`. Cursor should open/inspect THIS image file within the workspace, not search the internet for a substitute. Verify it exists before visual implementation; if missing, notify the user instead of fabricating screenshot details.\n\nThe screenshot shows a top toolbar, five color-coded lanes (Done / 3, Working on it / 1, Stuck / 1, Not Started / 2, Blank / 0), light-gray lane backgrounds, white elevated cards, compact actions, subtasks, and a multicolor status distribution indicator.

Official functionality references (review where useful):
- https://support.monday.com/hc/en-us/articles/360000661379-The-Kanban-View
- https://support.monday.com/hc/en-us/articles/360017143959-The-Item-Card
- https://support.monday.com/hc/en-us/articles/360011905480-All-about-subitems
- https://support.monday.com/hc/en-us/articles/360001568919-The-item-pop-up-card
- https://support.monday.com/hc/en-us/articles/360001267945-The-board-views

## Execution boundaries and screenshot-fidelity targets
- The repository is **ProjectTracker_React**. Treat the existing repository root opened in Cursor as the working directory. The path above identifies a local reference image, **not** a location accessible to ChatGPT. Cursor must read it from the user's machine.
- Create or update the Kanban view within this React app; **do not** create a new demo application or introduce separate/mock task storage.
- Screenshot baseline is approximately **1577 × 652 pixels**. At similar desktop width: white toolbar spanning board width (~86px high in image); horizontal lanes with ~20px gutters; lane header ~50px high; lanes approximately 325px wide; light neutral lane surfaces; white cards with soft shadow; 10–12px card padding; compact row height ~110–132px; color-coded headers. Translate these into responsive CSS tokens rather than fixed viewport-specific coordinates.
- The screenshot is a **visual reference**, not proof of every behind-the-scenes behavior. Implement the functional requirements below, using existing application patterns and official documentation only to clarify ambiguous controls.
- Never copy Monday.com logos, proprietary icons, or branding. Focus on comparable usability and design behavior.

## Phase 0 — Mandatory repository audit
Before edits:
1. Identify app framework, router, server/API framework, database and ORM, state/query libraries, DnD library, design system, icon set and test tooling.
2. Locate existing project, board, task, task status, subtask, team/people, activity/comment, attachment, role/permission, and view-preference models.
3. Map existing Table, Gantt, Timeline and Calendar views; identify shared task fetching and mutation paths.
4. Provide a short implementation plan with file-by-file intended changes, existing features to reuse, migrations needed, and nontrivial risks. Then proceed with implementation; do not stop for approval unless a destructive change is required.
5. Do not guess repository paths. Adapt names in this brief to actual codebase conventions.

## Product requirements
### A. View structure and layout
- Add/select a `Kanban` view alongside existing task views with a consistent view switcher.
- Responsive top toolbar: `New task` split action; `Search`; `Person`; `Filter`; `Sort`; `More`; status-distribution summary; export/share if supported; `Settings`; optional collapse control.
- Desktop: horizontally scrolling lanes with min width ~280–320px, adjustable where consistent with the app; full-height lane surface; vertical scrolling cards. On mobile: accessible horizontal snapping or intentionally designed alternative without clipping commands.
- Lane headers have configurable label, accessible foreground/background colors, and a LIVE count. Default lane names and example colors: Done `#00c875`, Working on it `#fdab3d`, Stuck `#e52d4c`, Not Started `#bdbdbd`, Blank `#0086b3`. Colors are defaults, not hardcoded business rules.
- Cards: white surface, compact 6–10px corner radius, subtle shadow, task title, comment/update count, action overflow, configurable preview metadata (initially subtasks). Visually distinct hover, focus and dragging states. For accessibility, darken or adapt text colors when needed to achieve legible contrast.
- Empty lanes remain visible by default with zero counts and an obvious add-task affordance; optional `Hide empty lanes` setting.
- Include clear loading/skeleton, empty-state, permission-denied, fetch-error, save-error and offline/reconnect feedback.
- Match the reference’s density, hierarchy, spacing and tonal palette rather than literally copying its brand assets.

### B. Status columns and view configuration
- Default grouping: tasks by configurable Status field, including unset/Blank state.
- Maintain stable status IDs separate from visible labels and colors. Renaming a label must NOT relabel historical activity or orphan tasks.
- View settings panel provides: `Kanban column` (which status field), visible/hidden statuses, label order, task card fields and order, optional file/image cover with crop/fit, swimlane `Divide by` field (when supported), hide empty groups, WIP/task limits, card density and user preference scope.
- Sorting and manual task order must be explicitly defined. Persist manual order per task within its status/group using stable sortable rank values, not array indexes. If another sort is selected, visually explain that manual drag reordering is disabled or resets sort to Manual (choose one consistent rule).
- Allow drag reordering of lanes only if it maps to authorized status order changes or is explicitly view-local; avoid changing a shared company workflow silently.
- Column limits: configurable optional warning threshold. Visually flag exceeded limits and show a warning before moving a task into an over-limit lane. Enforce as a hard limit only if admin policy explicitly requires it; otherwise users may proceed.
- Status overview indicator is calculated from the same currently visible task set as the lane counts (or clearly label a different scope). Clicking a segment scrolls to its lane.

### C. Task creation and modification
- `New task` creates a real persisted task (modal or inline) with required name and default status; dropdown selects lane or task template if supported.
- Lane-level `+` creates a task already assigned to that lane.
- Click card to open task detail drawer/modal using existing shared task detail component. Preserve deep-linking, browser navigation and focus return.
- Inline edit configured card fields (e.g., status, priority, owner, date, subtask status) with validation and persistence. Single click on an interactive field must not trigger card navigation.
- Card `...` menu supports appropriate existing actions: Add subtask, Edit/Rename, Duplicate, Move, Archive, Delete, Copy link; expose only actions actually supported and authorized. Require confirmation for destructive actions and implement actual backend semantics.
- Comments/updates icon opens the task updates panel and shows real unread/update count; avoid nonfunctional badges.
- Render subtask count and completion state; expand inline or open appropriate subtask view. Subtasks should be persisted entities and support their own status/assignee/due date when the existing schema supports them.
- Task detail should use existing title, description, status, priority, assignees, dates/timeline, labels, dependencies, attachments, comments, audit history and custom column values; do not erase unavailable fields.

### D. Drag/drop behavior
- Mouse, touch and keyboard-accessible movement within and between lanes.
- Across lanes: update the canonical task status ID AND persisted ordering; same lane: update rank only.
- Use drag overlay, insertion indicator, auto-scroll at lane and board boundaries, clear drag targets, and no layout jitter.
- Optimistic UI update with rollback/toast if mutation fails. Prevent conflicting duplicate mutations while request is pending. Server permission checks mandatory.
- Sync status change to Table, Gantt, Timeline and Calendar views without refresh where architecture allows; otherwise invalidate shared queries correctly.
- Handle two simultaneous users changing the same card with version checks or robust server ordering, not silent data loss.
- If filtering/search is active, explain how manual ordering behaves. Ensure no task disappears unexpectedly after drop without an explanatory filter-related notification.
- Do not allow dragging archived, read-only or locked tasks.

### E. Top toolbar behavior
| Control | Required behavior |
|---|---|
| New task | Persist item; split button can select target status/task template if existing |
| Search | Debounced task name/description search; clear action, keyboard focus; combine predictably with filters |
| Person | Filter by one or more assignees, optionally unassigned/My tasks |
| Filter | Multi-condition filtering across supported status, priority, labels, people, date/timeline and board fields; Save/Reset and visible filter count |
| Sort | Manual, title, priority, due date, created date, last updated and available custom fields; ascending/descending where applicable |
| More | Only implemented board/view-level operations (e.g. refresh, duplicate view, saved views, export) |
| Overview | Relative color-coded counts, tooltip and click-to-scroll |
| Export/share | Honor user permission, scope, active filters and field visibility; do not leak restricted columns |
| Settings gear | Open persistent view configuration |
| Collapse | Hide/show optional toolbar header while maintaining navigation access |

URL-query state vs persisted preferences: reflect meaningful shareable filters/search/sort in URL when architecture supports it; save preferred layout/card configuration server-side per user or shared board view with explicit ownership.

### F. Configurable card fields / Column Center integration
- Reuse the app’s existing dynamic column definitions and values, not a new Kanban-only schema.
- Cards may show: Status, Priority, Label, People, Date, Timeline, Subtasks, Files, Numbers, Text, Dropdown, Checkbox, Progress, Dependencies, custom columns when supported.
- Card Settings checklist selects fields to show/hide and order. Provide a density option `Compact`, `Comfortable` and a preview.
- If a field is read-only/computed, display it but disable inline editing gracefully.
- Missing values should be accessible for editing where authorized, not show decorative disabled placeholders.
- Do not render unavailable custom fields as if they exist.

### G. Swimlanes (secondary grouping)
- Optional `Divide by` using existing board group, assignee, priority, linked item or supported categorical field.
- Group-by creates horizontal swimlanes; each contains consistent status lanes. Counts reflect each group.
- `Hide empty groups` option; virtualize when needed. If a computed/formula grouping cannot safely assign a target on drop, disable dragging into that group with explanation.
- This is advanced functionality and may be phased after core Kanban works.

### H. Pharma/CDMO extensions — separate from Monday.com feature parity
Because this application manages regulated pharmaceutical projects, add configurable *domain-specific enhancements*, without falsely presenting them as native Monday.com behavior:
- Project/client/product/batch identifiers and related activity types (PV, packaging verification, cleaning validation, equipment qualification, APR/APQR, stability, change controls, deviations).
- Target dates, approval/review blockers, responsible functions, progress/completion indicators and overdue markers.
- Optional gates for status transitions (`Review`, `Approved`, `Closed`) with role permissions and required evidence, only when supported by an explicit workflow configuration.
- Immutable or append-only audit/event history for task and field changes where regulated traceability is required: actor, UTC timestamp, before/after values, action, related record, reason where required. Do not claim electronic-signature or GMP/Annex 11 compliance solely on the strength of a Kanban UI.
- Restrict visibility and exports according to tenant/client/project roles and assigned record access.
- Consider throughput analytics and overdue/WIP trends as a later phase, not prerequisites for the core board.

## Suggested architecture (adapt to repo)
UI: `KanbanView` -> `KanbanToolbar`, `StatusOverview`, `KanbanLane`, `KanbanCard`, `TaskDetailDrawer`, `KanbanSettingsPanel`, `FilterPanel`, `SortPanel`; shared domain components for fields/subtasks/comments.

Data: existing Task/Board/Status/TaskValue models; optional `BoardViewConfig` with viewId, boardId, createdBy, isShared, settings JSON/schema version; optional `TaskRank` or rank field; existing ActivityLog; version/updatedAt for conflicts.

Typical operations (adapt to existing transport):
- fetch board tasks, statuses, card-field definitions, permissions, saved view config
- create/update/duplicate/archive/delete tasks (reuse existing mutations)
- move task to status with new ordered rank (atomic server transaction)
- reorder status lanes (authorized) and update view preferences
- fetch/create/update subitems and comments
- append activity/audit event in same transaction as authoritative mutations

Prefer an existing DnD library; if app uses React and has none, evaluate `@dnd-kit` for accessible sorting. Choose appropriate equivalents for Vue/Svelte/other frameworks. Use existing TanStack Query/SWR/Redux/Zustand/etc. rather than adding parallel state management without a reason.

## Engineering safeguards
- Tenant/project isolation and server-side authorization for every mutation, export and read.
- Stable IDs and consistent time-zone-aware due date handling.
- Ensure count reflects filtering. Avoid duplicate task records across client view and server data.
- Pagination, lazy loading or virtualization for large boards; correct keyboard and screen reader operation even when virtualized.
- Keyboard navigation: Tab to controls, Enter/Space open card or action menu, accessible move command for cards; Esc cancels drag/closes dialogs, focus management for drawers.
- Use aria labels and live announcements for status movement; do not rely on color alone.
- Screen widths: desktop 1440+, laptop 1024, tablet 768, mobile 375; avoid overflow outside intentional horizontally scrollable board area.
- E2E test cross-column drag, same-column reorder, keyboard move, create/edit/delete, filter/search/sort, subtasks, role restricted actions, failed network request, second-user update, saved preferences and cross-view consistency.

## Delivery phases and definition of done
### Phase 1 — Core parity, mandatory
- Screenshot-matched board layout and toolbar
- Real task loading, lane counts, status overview
- Create task, open task details, quick status edit
- Drag and drop across/within lanes, persisted and reflected in other views
- Basic search/person/filter/sort
- Context menu with implemented actions
- Responsive and keyboard-accessible fundamentals

### Phase 2 — Advanced parity
- Card column configuration, hide/show lanes, lane reordering, lane WIP limits
- Subtasks inline details, comments/updates, file/image covers
- Saved view configuration and preference persistence
- Swimlanes and hide empty groups, deeper filters

### Phase 3 — CDMO enhancements
- Review/approval gates, audit trail enrichment, validated-record references
- Client/project/batch facets, overdue indicators, workload and WIP analytics

**Definition of done:** All rendered visible controls perform their stated actions, edits persist across page reloads, permission boundaries work, failed mutations roll back, counts are accurate, no data forks across views, and automated tests pass. No fake data in production, no mocked persistence, no inert menu items, and no destructive refactors without necessity.

## Explicit QA scenarios
1. Create a task under Not Started: appears immediately, count increments, survives reload and appears in Table.
2. Drag to Working on it: persists status and activity history; counts +1/-1; Table/Gantt observe status.
3. Reorder two tasks within Done: order persists after reload.
4. Filter assignee A and status Stuck: all counts/overview match currently visible tasks; clearing filter restores items.
5. Search title while advanced filters are active: documented AND semantics; clear search preserves filters.
6. Edit priority directly on card: field updates across views and survives reload.
7. Add subtask and mark complete: subtask count/progress updates accurately.
8. Attempt cross-lane drag without edit permission: no mutation; accessible explanation.
9. Server returns 409/500 on move: optimistic state rolls back; user sees nonblocking error.
10. Two users reorder the same lane simultaneously: deterministic result with no lost tasks.
11. WIP limit exceeded: correct warning/enforcement per admin configuration.
12. Screen reader and keyboard-only user can move task to a new status.
13. Saved visible fields and density survive navigation and reload.
14. Mobile lane scroll works without trapping the page or obscuring task actions.
15. Audit history tracks actor, change and timestamp for configured regulated workflows.

## Development steps for Cursor Agent
1. Inspect `screenshot/Kanban View.png` and capture a short visual layout analysis (toolbar, columns, cards, icons, spacing, typography and states).
2. Inspect `package.json`, app routes, view switcher, task state/query hooks, server endpoints, database schema and existing UI design components. Report which modules can be reused.
3. Create a phased implementation checklist in the repository, marking items completed only when they work end-to-end.
4. Implement **Phase 1** directly in the existing React app and actual data endpoints. Do not stop after generating only a mockup or plan.
5. If a backend capability is missing, implement the smallest compatible migration/API change, or clearly label the blocked feature without adding a pretend UI.
6. Test interactions with real persisted records: reload, navigate to Table and back, verify status/assignee/subtasks, reject unauthorized changes and test errors.
7. Run existing lint, typecheck, unit and build commands; run E2E where configured. Fix issues caused by your changes.
8. Summarize changed files, features verified, tests run, migrations, limitations and Phase 2 backlog.

## Cursor execution prompt
Act as a senior full-stack engineer and UI/UX designer. Use this document as the full implementation specification. FIRST audit the existing repository and identify reusable models/components/routes, THEN implement the Monday.com-inspired Kanban view using our existing architecture and shared task data. Do not replace the app, create a disconnected Kanban task table, copy Monday.com assets, or display nonfunctional controls. Preserve Table/Gantt/Timeline/Calendar synchronization. Work phase by phase, run tests/type checks/build, and report completed features, changed files, migrations, known limitations and any items deferred to later phases. Open the exact screenshot at `screenshot/Kanban View.png` (full Windows path specified at the top) and apply it as the visual reference for spacing, card shape, lane colors, top toolbar and overall density. Implement actual functionality, not just the appearance.
