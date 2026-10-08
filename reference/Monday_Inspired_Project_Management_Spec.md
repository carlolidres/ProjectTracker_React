# Monday-inspired Project Management — Cursor Implementation Specification

Version: 1.0 | Prepared: 8 October 2026

## 1. Instructions to Cursor

Build a complete project management module using this document as the implementation contract. Inspect the existing repository, its instructions, authentication, database, UI components, routing, and test setup before changing code. Reuse the existing stack and design conventions where compatible with the references. Implement functioning persistence and interactions, not a static demonstration.

The experience should resemble the supplied monday.com references: a compact workspace sidebar, a clean project header, editable grouped task tables, colored status cells, and a persistent task detail drawer. Provide Table, Kanban, Gantt, and Calendar views over the same task records.

Use the application’s own name and assets. Do not insert monday.com branding, proprietary illustrations, or nonfunctional AI/integration buttons. The scope is the project-management experience described here, not every product in monday.com’s suite.

Proceed through the implementation stages in section 19. Maintain a checklist of completed requirements and explicitly identify any unfinished behavior. Do not mark a feature complete because only its UI exists.

## 2. Evidence and interpretation

Three types of requirements are used:

- **Observed:** visible in the six supplied screenshots, summarized below.
- **Documented:** established by the official sources in section 22.
- **Application design:** explicit implementation choices for this application, including architecture, permissions, edge cases, and scheduling algorithms. These are not claims about monday.com’s internal implementation or exact parity.

All detailed engineering requirements below are application design unless expressly identified otherwise. Sizes and colors are approximate design targets, not measured source design tokens.

### Screenshot inventory: all six inspected

| Reference filename | Observed interface | Implementation target |
| --- | --- | --- |
| Monday UI.png | Project title; main-table/Gantt tabs; New task; Search, Person, Filter, Sort, Hide, Group by; colored groups; owner avatars; filled status/priority cells; timeline pills; summaries | Main project shell and task table |
| Search Filter.png | Expanded search field; settings popover; “Choose columns to search”; column finder; All columns selection; individual checkboxes | Search scope picker |
| sidePanel colapse and expand.png | Left navigation; workspace selector; project list; active project highlight; collapse button with keyboard hint | Collapsible workspace navigation |
| RightSidePanel Message.png | Large right drawer; task title; close and previous/next controls; Updates, Files, Activity Log tabs; update composer with mention/attachment controls | Shared task drawer and discussion |
| file.png | Files tab; Add file; file search; grid/list controls; download action; upload empty state | Task attachment manager |
| activity log.png | Activity Log tab; filter and person controls; refresh/export icons; actor and elapsed-time entry | Task change history |

These screenshots do not display Kanban or Calendar, nor an expanded Gantt schedule. Those views use documented capabilities and the application design specified below. Screenshot illustrations and sample task names need not be reproduced.

## 3. Product hierarchy and navigation

Hierarchy: **Workspace → Project → Group → Task → Subtask**.

A project is the equivalent of a board for this implementation. A group is an organizational bucket; a status is a task attribute. Moving a task to a group called Done does not automatically set its status to Done unless an explicit automation is enabled.

### Workspace navigation

- Default first workspace: Main Workspace.
- Expanded sidebar target: 280–320 px; collapsed rail: approximately 52 px.
- Include Home, My work, Favorites, workspace selector, workspace actions, searchable project list, and New project.
- Workspace selector supports search, icon/color, and Add new workspace.
- Workspace menu: Manage workspace, Edit workspace, Add new workspace, Archive.
- Highlight the current project and keep the selected workspace visible.
- Collapse/expand through a labeled button and configurable keyboard shortcut. Persist this preference per user.
- On narrow screens, turn navigation into an overlay rather than squeezing the task table.

### Creation flows

Workspace modal: name required, description optional, icon/color optional. Creator becomes owner. After creation, show Create your first project and Invite members.

Project modal: name required, workspace, description optional, visibility, member selection. Start with a To do group and default status labels. Create all four view tabs immediately, even when empty.

Support inviting existing application users. External email invitation is a later integration; do not pretend an email was sent without a real delivery service.

### Membership design

Workspace roles: Owner, Admin, Member. Project roles: Owner, Editor, Commenter, Viewer. Workspace membership and project membership are distinct.

- Workspace-visible projects: workspace members receive viewer access by default; explicit project membership can elevate access.
- Private projects: only explicit project members have access; do not expose their names in unauthorized search results.
- Owner: manage project, members, settings, archive, restore, and content.
- Editor: create and edit tasks, groups, dependencies, and attachments.
- Commenter: read and post updates/replies/attachments through updates; no scheduling or field edits.
- Viewer: read permitted data and download permitted files.
- Workspace administration does not silently expose private project content.
- Prevent removing the last owner without transferring ownership.
- Enforce permissions on the server for every request, subscription, export, and attachment download.

## 4. Project shell and visual system

Use white content surfaces, a faint lavender-gray surrounding shell, dark navy text, thin cool-gray dividers, blue primary actions, and generous spacing between groups. Avoid oversized dashboard cards around the task table.

Suggested tokens:

| Token | Target |
| --- | --- |
| Primary action | #0073EA |
| Main text | #323338 |
| Muted text | #676879 |
| Border | #D0D4E4 |
| Shell background | #F6F7FB |
| Done | #00C875 |
| Working on it | #FDAB3D |
| Stuck | #E2445C |
| Not started | #C4C4C4 |
| Row height | 40–44 px |
| Control height | 32–40 px |
| Font | Existing app font, or a readable sans-serif fallback |

Check label contrast, particularly white text on orange or gray. Use darker text where necessary and always retain visible text labels.

Header: editable project title, description/info, favorite, member avatars, Invite, copy link, overflow menu. Below it: Table, Kanban, Gantt, Calendar, and Add view. Use a thin blue underline for the active tab.

Toolbar: New task split button, Search, Person, Filter, Sort, Hide, Group by, More. View-specific controls follow without displacing the common controls unnecessarily.

Persist view type and selected task in URL state. Preserve scroll position when opening and closing the task drawer. Keep project, toolbar, and view headers sticky where useful without overlapping content.

## 5. Table view

### Default columns

| Column | Behavior |
| --- | --- |
| Selection | Checkbox; header selects currently filtered rows with scope clearly labeled |
| Task | Inline title edit, subtask expander/count, task drawer action |
| Updates | Bubble icon and update count; opens Updates tab |
| Owner | Searchable multi-person picker restricted to eligible users |
| Status | Full-cell colored label and editable label menu |
| Timeline | Start/end range picker, compact rounded pill |
| Priority | High, Medium, Low, and empty; editable color labels |
| Depends on | Predecessor links and dependency editor |
| Files | Count/thumbnail and attachment actions |
| Last updated | Actor avatar and relative timestamp; exact timestamp on hover |
| Add column | Typed custom column selector |

Groups have color strips, titles, task counts, collapse controls, overflow menus, Add task rows, and summary footers. Group operations include rename, recolor, reorder, duplicate, archive, and restore. Dragging between groups changes group membership, not status.

Support column resize/reorder/hide, sticky task column, horizontal scrolling, row hover states, keyboard cell navigation, and stable manual ordering. Custom column types in the first complete release: text, number, date, single select, multi-select, people, checkbox, and URL. Keep identifiers stable when labels change.

Subtasks use parent_task_id and indentation. First release supports one level. Parent and child dates are independent editable schedules; summary ranges can be displayed separately but must never silently overwrite parent dates.

Summary footers: status distribution, priority distribution, earliest start/latest finish, and numeric sum/average where configured. Label whether totals reflect filtered rows. Parent/subtask counts must not double count the same work in aggregate statistics.

Bulk actions: assign, change status/priority, move group, archive, restore, and delete. Clarify selection scope; do not silently apply to hidden tasks. Destructive deletion requires confirmation. Archiving is reversible.

## 6. Search, filtering, sorting, and saved views

Reproduce the screenshot’s search interaction: compact Search control expands to an input; a sliders button opens “Choose columns to search.” Include a column finder, All columns tri-state checkbox, and individual typed column checkboxes.

Application rules:

- Default search: task names and displayed searchable text fields. Allow expanding scope to additional supported columns.
- Match display values for people/status/priority rather than opaque database IDs.
- Debounce typing around 250 ms and support clearing with a visible control.
- Search is OR across selected searchable fields. Combine its result with Person and advanced filters using AND.
- Person supports Me, selected users, and Unassigned.
- Advanced filters support nested AND/OR groups, field-specific operators, empty/not-empty, date ranges, and overdue.
- Sort supports multiple fields, directions, and explicit empty-value placement; ties use stable task IDs.
- Hide changes visibility, not permissions or stored data.
- Group by changes presentation; it does not overwrite original group membership.
- Display active filter chips, result count, and Clear all. If all search columns are deselected, show a prompt instead of searching everything silently.
- Retain active common filters when switching the four default tabs. Saved views may restore their own filters, clearly reflected in the toolbar.
- Save named personal or shared views. Only authorized editors change shared defaults.
- Drag reorder is disabled while a conflicting explicit sort is active; provide a clear explanation.

## 7. Shared task detail drawer

Open the same drawer from a table task, Kanban card, Gantt bar, Calendar event, or direct URL. Desktop width target: 600–880 px, resizable, with the underlying board visible. On mobile use a full-screen panel.

Header: close, editable task title, owner avatar(s), previous/next within the visible result set, overflow actions, and optional expand-to-full-page. Below: Updates, Files, Activity Log. Add an optional Details section for all editable fields.

Focus enters the drawer; Escape closes the topmost popover before closing the drawer. Closing restores focus to the originating control. Retain drafts per task and user while switching tasks; do not discard unsent text silently.

### Updates

Rich-text composer with basic formatting, links, @mentions, attachments, emoji, and Post update. Mention search must respect project access. Disable empty submissions. Display chronological discussion with author, timestamp, edited indicator, replies, reactions, and authorized edit/delete actions.

Keep discussion entries separate from system change events. Mention notifications are created only after successful posting. Avoid duplicate posts on retry with an idempotency key. Sanitize rich text server-side. Show a useful empty state without copying the reference illustration.

### Files

Add file, drag-and-drop, name search, grid/list toggle, selection, preview, download, and authorized delete. Show filename, type, size, uploader, upload date, progress, retry, and unsupported-preview fallback.

Include attachments posted in updates in the task’s Files tab with a link to their originating update. Store file metadata in the database and bytes in the existing object storage. Use authorized download endpoints or expiring URLs. Define configurable file size/type limits and validate them server-side. Do not accept arbitrary remote URLs as upload instructions.

### Activity Log

Append-only user-facing events for task creation, field edits, owner/status/date changes, dependency edits, file actions, moves, archive/restore, and automation execution. Each entry includes actor, timestamp, action, field, before/after values, and event source.

Provide event/person/date filters, refresh, pagination, and permission-aware CSV export. Group a cascading schedule change under one operation with expandable affected tasks. Undo creates a new compensating event; it never deletes history. This product log alone must not be represented as a validated pharmaceutical audit trail.

## 8. Kanban view

Documented foundation: monday.com uses Status-column labels for Kanban columns, supports selectable card fields/covers, card and column movement, and editable cards [S2].

Application requirements:

- Default lanes: Not started, Working on it, Stuck, Done, plus Unassigned when needed.
- Lane header: color, label, count, add task, collapse, overflow. Optional WIP limit shows a warning when exceeded; do not block moves by default.
- Card: task title, owner avatars, priority, dates, update/file counts, subtask progress, and optional dependency-conflict indicator.
- Card click opens the shared drawer; clicking an inline field edits that field without opening the drawer.
- Moving a card between lanes updates its selected status field. Moving within a lane updates view ordering only.
- Provide keyboard Move to lane and Move before/after alternatives to drag-and-drop.
- Create in a lane preselects that lane’s status. Group is chosen separately, or inferred from a visible group swimlane.
- Optional group swimlanes maintain the distinction between organizational groups and workflow status.
- Settings: selected status field, visible card fields, covers, lane order/visibility, and swimlanes.
- Update optimistically; on server rejection restore the original position and show the reason.
- A task that stops matching filters after a move may disappear; explain with a brief toast and Undo.
- Do not automatically complete predecessors, successors, or subtasks when a card becomes Done.

## 9. Gantt view

Documented foundation: monday.com supports Gantt time scales, a today marker, dependencies, milestones, baseline comparisons, and critical-path features. Visual weekend hiding is separate from excluding weekends in scheduling [S3–S5].

Application requirements:

- Split view: resizable task list on the left and time grid on the right, with synchronized vertical scrolling.
- Task list includes name, owner, start, finish, duration; support groups and subtasks.
- Grid includes Day/Week/Month zoom initially, Quarter/Year later, Today, Fit project, weekend shading, and a today line.
- Render dated tasks as bars, milestones as diamonds, and group summaries as distinct non-editable ranges.
- Undated tasks remain in an Unscheduled list and task table. Never invent dates merely to render a bar.
- Bar drag changes start while preserving duration. Edge resize changes duration while preserving the opposite edge. Reject inverted ranges.
- Bar click opens the shared drawer. Tooltips show full task title, dates, duration, owner, and status.
- Draw directional dependency connectors. Use relevant start/finish endpoints according to relationship type.
- Selecting a connector opens its relationship editor. Create links through endpoint dragging or an accessible task-picker alternative.
- Red conflict connectors include an explanatory tooltip; do not rely on color alone.
- Hidden tasks still participate in scheduling. Show a count/indicator when affected dependencies extend outside the current filtered view.
- Use the scheduling service in section 11 for every move and resize, including Calendar and Table edits.
- Preview affected tasks during drag when feasible, then commit the full change atomically on drop.

Advanced stage: immutable named baselines, current-versus-baseline variance, and optional critical-path calculation. Baselines are snapshots, not live references. Critical-path labels require a tested calculation over a complete declared scope; disable the feature with an explanation for unsupported dependency/calendar combinations. Do not approximate it by highlighting overdue tasks.

## 10. Dependency column and relationship editor

Documented foundation: dependencies connect tasks to a Date/Timeline field. monday.com distinguishes Flexible, Strict, and No action; has FS, SS, FF, and SF relationships; supports lead/lag in Strict mode; and shifts existing dates rather than generating blank schedules [S1].

Application UI:

- Label the column Depends on and display predecessor-name chips with a compact overflow count.
- Clicking opens an editor with search by name or ID, group/status/date context, multi-selection, relation type, and signed offset days.
- Store links by task ID. Renaming a task updates every visible label automatically.
- Default relationship is Finish-to-Start. Explain types using A as predecessor and B as dependent.
- Positive offset means lag; negative offset means lead; show plain-language preview of the effect.
- Prevent self-links, duplicate predecessor/successor pairs, and cycles before saving.
- First release permits links within one project. Cross-project links require a later explicit design for dual-project authorization and scheduling ownership.
- Adding a dependency with missing dates stores the link and displays Dates required; it does not manufacture a schedule.
- Editing links in automatic modes previews a reschedule. No action records the link and reports any clash without moving dates.

## 11. Scheduling engine — explicit application contract

The following deterministic rules are this application’s design. Official documentation does not specify the internal algorithms, tie-breaking, or database behavior.

### 11.1 Dates and duration

Use project-local ISO dates for all-day schedules. Do not convert them to midnight UTC and back. Store timed events separately as instants with a timezone. Default project timezone may be Asia/Manila, editable by the owner.

Internally calculate using half-open work-time intervals: S is the start boundary, F is the boundary after the occupied work interval, and duration d = F − S. A one-workday task has d = 1. The UI presents inclusive occupied start/end dates. A milestone has d = 0 and is rendered at its boundary. A tested calendar adapter converts boundaries to civil dates.

This avoids adding inconsistent extra days to different relationship types. Example: an all-day predecessor displayed as Monday–Tuesday finishes at the next eligible workday boundary; its zero-lag FS successor starts Wednesday.

Working calendars specify working weekdays and holidays. Visual weekend hiding has no scheduling effect. Calendar edits preview their affected schedules and require an explicit Save before committing.

### 11.2 Relationships

For predecessor A and successor B, offset L is measured in project working-day units:

| Type | Constraint | Candidate lower bound for B start |
| --- | --- | --- |
| FS | S_B ≥ F_A + L | F_A + L |
| SS | S_B ≥ S_A + L | S_A + L |
| FF | F_B ≥ F_A + L | F_A + L − d_B |
| SF | F_B ≥ S_A + L | S_A + L − d_B |

Take the maximum candidate bound across all valid predecessors. Apply calendar arithmetic through the shared adapter. Preserve duration during automatic moves.

### 11.3 Modes

- **No action:** retain dates exactly as edited; calculate and display violations.
- **Flexible:** start becomes max(current start, predecessor lower bounds). Move only as far forward as required; earlier predecessor changes do not pull a successor earlier. For the initial release offsets are editable only in Strict mode.
- **Strict:** set an unpinned successor to the earliest start satisfying all predecessor lower bounds and an optional explicit not-before constraint. This allows movement earlier or later. With one predecessor it follows that predecessor’s relevant boundary shift. With several predecessors, the controlling maximum wins; do not apply predecessor deltas repeatedly.

In Strict mode, desired slack is represented by explicit lag or a not-before constraint rather than an undocumented gap. A user dragging a constrained successor later is offered a not-before constraint; dragging it earlier than its allowed bound is rejected with an explanation. This policy is a design choice, not an assertion of exact monday.com parity.

Optional locked/pinned schedules must remain fixed. If an automatic change would violate a pinned successor, reject the automatic transaction and display the affected link. Do not silently break the lock or partially save the upstream task. In No action, permit the edit and flag the conflict.

Do not infer actual task completion from dates. A schedule relationship is not automatically a workflow lock on status changes. Any “prevent starting until predecessors complete” rule must be a separate, explicitly enabled workflow feature.

### 11.4 Transaction flow

1. Authorize the initiating edit and all affected entities.
2. Load the relevant project graph, dates, settings, and versions.
3. Validate self-links, duplicate links, cycles, and date ranges.
4. Find downstream affected tasks and topologically order them.
5. Recalculate each affected task once, after all its predecessors.
6. Collect violations, missing-date warnings, and old/new values.
7. Commit the initiating mutation, resulting schedules, and activity events atomically using version checks.
8. Return the complete affected set to every client view.
9. On concurrent conflict, reload and preview/retry; do not overwrite newer values blindly.

Undated tasks are unresolved constraints. Do not propagate fabricated dates through them. Process independent resolvable paths, mark the incomplete chain, and explain that its schedule remains provisional.

Undo uses the original operation ID and verifies affected versions. If newer edits exist, show a conflict instead of overwriting them.

## 12. Calendar view

Documented foundation: monday.com offers Month, Week, and Day displays, Today/navigation controls, selectable date/timeline sources, and timed ranges [S6].

Application requirements:

- Provide Month, Week, Day, and an optional accessible Agenda list.
- Display task dates from the selected scheduling field; default to the shared project timeline.
- Include Today, previous/next period, date picker, color by status/priority/group, owner filtering, and settings.
- Date-only tasks appear as all-day events; ranges span every occupied civil date with clear start/end styling. Timed events appear in time slots.
- Clicking an event opens the shared drawer. Clicking empty space opens New task with that date; selecting a range pre-fills start/end.
- Dragging/resizing uses the same server scheduling engine. Preview cascades and roll back rejected edits.
- When scheduling excludes non-working days, a drop on one snaps to the next eligible day and clearly previews that result.
- Show +N more for crowded days and a popover listing hidden events.
- Include an Unscheduled task count/list; blank-date tasks remain discoverable.
- Preserve all-day dates across timezone changes. Show the display timezone for timed events and handle daylight-saving transitions using a timezone-aware library.
- Do not create separate Calendar copies of tasks. Event IDs reference the original task and selected date field.
- External calendar sync is optional future work, not required for the internal Calendar view.

## 13. Shared state and view synchronization

All views consume a common task repository and mutation service. Never store independent authoritative task lists for Table, Kanban, Gantt, and Calendar.

| User action | Required shared effect |
| --- | --- |
| Edit title in drawer | Update row, card, bar tooltip, calendar event, and dependency chips |
| Move Kanban card | Update status everywhere; group stays unchanged |
| Drag Gantt bar | Update dates, dependent schedules, timeline pills, and Calendar |
| Move Calendar event | Update same scheduling fields and dependent Gantt bars |
| Add attachment in Updates | Appear in Files and file counts |
| Archive task | Remove from active views; retain history and restoration path |
| Rename status | All representations resolve the new label through its stable ID |
| Apply common filter | All four tabs use the same selected result scope |

Real-time updates should use the application’s existing mechanism. Subscribe only to authorized project data; remove subscriptions and cached data when access is revoked. Deduplicate optimistic and server events using operation IDs.

## 14. Suggested logical data model

Adapt names to the repository. The relationships and invariants are required; the exact SQL/ORM schema is not.

| Entity | Essential fields |
| --- | --- |
| Workspace | id, name, description, icon, color, archived_at |
| WorkspaceMember | workspace_id, user_id, role |
| Project | id, workspace_id, name, visibility, timezone, calendar_id, dependency_mode, version |
| ProjectMember | project_id, user_id, role |
| Group | id, project_id, name, color, position, archived_at |
| Task | id, project_id, group_id, parent_task_id, title, description, status_id, priority_id, start_date, end_date, duration, milestone, not_before, position, version, archived_at, deleted_at |
| TaskAssignee | task_id, user_id |
| ColumnDefinition | id, project_id, type, name, config, position |
| TaskFieldValue | task_id, column_id, typed_value |
| StatusLabel | id, column_id, label, color, position, is_complete |
| Dependency | id, project_id, predecessor_id, successor_id, type, offset_days, version |
| Update | id, task_id, author_id, body, parent_update_id, created_at, edited_at |
| Reaction | update_id, user_id, emoji |
| Attachment | id, task_id, update_id, storage_key, filename, mime_type, size, uploader_id |
| ActivityEvent | id, project_id, task_id, actor_id, source, action, before, after, operation_id, created_at |
| SavedView | id, project_id, type, name, owner_id, shared, config, version |
| WorkingCalendar | id, timezone, working_weekdays, holidays |
| Baseline | id, project_id, name, created_by, created_at, snapshot |
| Notification | id, recipient_id, project_id, task_id, event_id, read_at |

Use composite checks or transactional validation to prevent cross-project group, parent, assignee, and dependency references. Index project/group/status/date lookups and dependency predecessor/successor IDs. Use versioned schema migrations with a rollback strategy.

## 15. Application service boundaries

Suggested modules: workspace access, project access, task repository, custom-field validation, view configuration, dependency graph, scheduling/calendar arithmetic, discussion, attachments, notifications, and activity recording.

Suggested operations:

- Create/update/archive/restore workspace and project.
- Manage memberships and transfer ownership.
- Query tasks with typed filters, sort, pagination, and subtasks.
- Mutate tasks with expected_version and operation_id.
- Preview schedule, commit schedule, and undo operation.
- Add/update/remove dependency through the same scheduling transaction.
- Post/edit/delete update, reply, react, and upload attachment.
- Read activity with authorized filters and export.
- Save personal/shared view configuration.

Return structured errors: permission_denied, version_conflict, dependency_cycle, duplicate_dependency, invalid_date_range, missing_schedule, pinned_schedule_conflict, upload_rejected. Map each to understandable UI copy.

Deleting a task with dependencies requires an impact preview. Remove the links only as part of an explicit confirmed operation. Archive retains links but suspends their scheduling effect with a warning; restore revalidates before reactivating links. Keep this policy consistent across all views.

## 16. Optional enhancements after the core works

- My work across authorized projects, with overdue/today/upcoming groupings.
- Personal favorites and pinned projects.
- Notification center for mentions, assignments, and relevant schedule changes.
- Simple explicit automations, such as status Done → move to a chosen group. Record actor/source and guard against loops.
- Task/project templates and controlled duplication options for dates, members, dependencies, files, and updates.
- CSV import with field mapping, preview, validation, and rollback; CSV export of authorized filtered data.
- Baselines, tested critical path, workload summaries, and dashboards.
- Cross-project dependencies only after permissions and transaction ownership are specified.

AI suggestions, inbound email updates, external integrations, enterprise SSO, and external calendar synchronization are outside the initial scope. Keep unavailable controls hidden rather than displaying decorative actions.

## 17. Accessibility, resilience, and performance

- Labeled controls, visible focus, keyboard navigation, accessible dialogs, and non-drag alternatives.
- Text and icons supplement all color-coded states.
- Loading skeletons, empty states, retry controls, and permission-denied states in every view.
- Failed mutations retain input and display an error; never show success before persistence is confirmed.
- Virtualize large task tables and Gantt rows; progressively load discussion/activity/files.
- Use pagination and indexed queries rather than fetching every workspace task.
- Cancel stale searches and avoid race conditions on rapid project switches.
- Preserve task drafts and sensible view state on refresh.
- Target responsive interaction with at least 1,000 tasks per project; measure using a documented fixture and environment rather than making an unsupported performance claim.
- Keep existing application modules working and avoid introducing a second authentication system.

## 18. Acceptance scenarios

| ID | Scenario | Expected result |
| --- | --- | --- |
| A01 | Create workspace and project | Creator owns them; four views exist; records survive refresh |
| A02 | Open private project as nonmember | Server denies data, files, search results, and subscription |
| A03 | Collapse navigation, reopen app | Preference persists; project remains selected |
| A04 | Add task in table | Same task appears in Kanban; date-based views show it once dated |
| A05 | Move task between groups | group_id changes; status does not |
| A06 | Drag Kanban card to Done | Same task’s status changes across all views |
| A07 | Search only Name | Matches other fields do not appear until those fields are selected |
| A08 | Combine search, person, and status filter | Result is their intersection; Clear all restores tasks |
| A09 | Open task from each view | Same drawer, discussion, files, and history |
| A10 | Upload attachment through update | Attachment appears once in Files and survives refresh |
| A11 | Create A→B→C, attempt C→A | Cycle rejected with readable explanation |
| A12 | Link undated predecessor | Link saved; Dates required shown; no invented dates |
| A13 | Flexible: A Mon–Tue, B Friday; move A to Wed–Thu | B remains Friday because no conflict exists |
| A14 | Flexible: A now finishes Friday, B previously Friday | B moves to Monday on a Mon–Fri calendar |
| A15 | Strict FS zero lag: A Mon–Tue, B Wed–Thu; shift A one workday later | B becomes Thu–Fri, duration unchanged |
| A16 | Strict with two predecessors | Later controlling bound determines successor; no double shifting |
| A17 | No action and overlapping FS schedules | Dates unchanged; visible conflict explanation |
| A18 | SS, FF, SF with offsets | Bounds match section 11 and preserve successor duration |
| A19 | Friday finish with next Monday holiday | FS successor starts Tuesday on a Mon–Fri calendar |
| A20 | Automatic move conflicts with pinned successor | Entire automatic transaction rejected; no partial date saves |
| A21 | Drag Calendar event | Table/Gantt and affected successors update atomically |
| A22 | Concurrent edits and Undo | Newer changes preserved; conflicts surfaced |
| A23 | Filter out a predecessor then edit it elsewhere | Successor still recalculates; hidden dependency indicated |
| A24 | Revoke user access with drawer open | Data subscriptions stop and private content becomes inaccessible |
| A25 | Keyboard-only user | Can create/edit task, move card, create dependency, and close drawer |
| A26 | Date-only task viewed in another timezone | Occupied civil dates remain unchanged |
| A27 | Refresh after mutations | Data, order, view settings, and links persist correctly |
| A28 | Failed upload or task save | Input preserved; retry available; no false success or phantom record |

Test schedule boundaries, holidays, negative offsets, cycles, multiple predecessors, missing dates, and permission isolation at the service level. Use a small end-to-end suite for synchronization and drawer workflows. Visually inspect wide desktop, laptop, and mobile layouts against the supplied screenshots.

## 19. Implementation sequence

1. Inspect repository and record existing conventions; identify gaps without replacing working infrastructure.
2. Add migrations, entities, authorization, and task APIs.
3. Build workspace/project navigation, shell, and complete grouped table.
4. Build shared drawer, updates, files, and activity persistence.
5. Implement search/filter/sort and saved-view state.
6. Implement Kanban with real task mutations.
7. Implement dependency graph and scheduling engine with boundary tests before visual scheduling.
8. Implement Gantt and Calendar using the shared engine.
9. Verify cross-view synchronization, concurrent edits, permissions, accessibility, and empty/error states.
10. Add optional advanced features only after required acceptance scenarios pass.

After each stage, report implemented behavior, relevant tests, and remaining gaps. The final delivery should include migrations, setup instructions, tests, screenshots of all four views, and a requirements checklist.

## 20. Definition of done

The user can create a workspace/project, invite existing users with clear access roles, manage tasks and groups, collaborate through a shared drawer, and schedule work through synchronized Table, Kanban, Gantt, and Calendar views. Dependencies move dates predictably according to explicit rules, persist correctly, and reject invalid graphs. Every visible primary control works; no view uses disconnected mock data. Required acceptance scenarios pass, and limitations are documented.

## 21. Suggested first message to Cursor

> Read this specification in full and inspect the existing project. Implement the monday-inspired Project Management module in the current application, following the supplied screenshot references and the requirements in this file. Start with repository-compatible persistence, permissions, workspace navigation, and the shared task model. Complete Table, Kanban, Gantt with dependencies, Calendar, and the Updates/Files/Activity Log drawer. Use one scheduling engine and one authoritative task store for every view. Work through the implementation stages and verify the acceptance scenarios. Do not stop at a visual mockup.

## 22. Official references

Consulted 8 October 2026. These establish selected public capabilities, not the proposed application’s architecture. Product plans and rollout availability vary. The screenshot-based and application-specific requirements above remain the implementation contract.

- **S1 — Dependencies:** https://support.monday.com/hc/en-us/articles/360007402599-Dependencies-on-monday-com
- **S2 — Kanban:** https://support.monday.com/hc/en-us/articles/360000661379-The-Kanban-View
- **S3 — Gantt:** https://support.monday.com/hc/en-us/articles/360015643840-The-Gantt-Chart-View-and-Widget
- **S4 — Baseline:** https://support.monday.com/hc/en-us/articles/360020978159-The-Gantt-Baseline
- **S5 — Critical path:** https://support.monday.com/hc/en-us/articles/4420037448850-Critical-Path-for-the-Gantt-Chart
- **S6 — Calendar:** https://support.monday.com/hc/en-us/articles/360001262965-The-Calendar-Widget

No live signed-in monday.com account was inspected. The six supplied images were visually inspected; the public documentation was researched separately. This document specifies a substantial independent implementation, not exhaustive verified parity with the entire monday.com platform.
