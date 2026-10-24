# ProjectTracker React — Monday.com-Inspired Main Table: Cursor Implementation Specification

**Purpose:** Implement the Monday.com-style Main Table UI/UX and *working* interactions inside the EXISTING `ProjectTracker_React` application. This is an execution brief for Cursor Agent, not a proposal for a standalone demo.

**Reference project root (user's Windows machine):**
`C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React`

**Reference image folder:** `screenshot/` (relative to the repository root).

## 0. Instructions to Cursor Agent — read before coding

1. **Inspect first:** `package.json`, app routing, existing Main Table/Kanban/Gantt/Workload views, task/group/column models, state management, API routes, backend persistence, authentication/permissions, styling tokens, component library, and tests. Document the actual architecture before changes.
2. **Open and inspect each image** named in §1 with Cursor's image capabilities. Where a screenshot depicts an open popup, replicate both its open state and its functional transitions. Treat screenshot values as EXAMPLES, not hardcoded task data.
3. **Reuse and refactor** existing components rather than building a parallel demo. Keep the live data model canonical; do not create duplicate task stores per view.
4. **Match the screenshots closely** for desktop sizes (~1550–1800px widths): spacing, dense table, border treatments, popover anchoring, menus, colored labels, date-range picker, drawer, summary bars, scrolling and selected rows. Adapt responsively rather than hardcoding pixel coordinates.
5. **Functional means functional:** interactions must read/write the actual application data; edits survive reload; mutations invalidate/refresh other views; server errors are surfaced; permissions enforced in UI AND backend.
6. **Do not assume** packages, database fields, server endpoints or installed dependencies exist. Inspect, adapt, and add migrations only where necessary. Prefer current application libraries and design conventions.
7. **Preserve existing features** including project-specific custom fields, validation milestones, task dependencies, approvals, history, existing filters and import/export where present.
8. Implement incrementally (§15), run lint/typecheck/tests/build, and report changed files, migrations, test results, and any real blockers. No fake-success toasts, placeholder handlers, or destructive schema overwrites.
9. Use Monday.com as an interaction reference; do not copy its branding, logos or proprietary illustrations. Continue to use ProjectTracker branding.

## 1. Screenshot reference manifest — inspect all nine

All files below are located in `PROJECT_ROOT/screenshot/`. File names, including spaces and capitalization, must be respected.

| Image | Features to inspect and implement |
|---|---|
| `Monday UI.png` | Overall shell, board title, view tabs, workspace navigation, command header, groups and board-level styling |
| `Screenshot 2026-10-17 194949.png` | Main table with normal rows, To do/Done groups, owners, status, timeline, priority, last updated, footer summaries |
| `Screenshot 2026-10-17 195010.png` | Hover tooltip for status distribution bar, percentage and per-label count |
| `Screenshot 2026-10-17 200422.png` | Priority label editor/dropdown, selected option, add new label, apply button |
| `Screenshot 2026-10-17 200509.png` | Status dropdown colored options, Edit Labels entry, blank label |
| `Search Filter.png` | Search activation and Choose columns to search popover with search, checkboxes, select-all and category grouping |
| `sidePanel colapse and expand.png` | Full application sidebar expanded/collapsed; navigation, workspace selector and active item highlighting |
| `activity log.png` | Task drawer Activity Log tab, actor/time/action, filters, audit history |
| `file.png` | Task drawer Files tab, upload, search, grid/list switch, file empty state |

If the local screenshot names differ, **ask for the missing image** rather than guessing. Also inspect any previous `screenshot/Kanban View.png` for style consistency, but prioritize these nine for the Main Table.

## 2. Scope / architecture / non-goals

- Implement a **Main Table (board) view** sharing records with Kanban, Gantt, Timeline, Calendar, Workload and other existing views.
- `Task` has stable ID, board/project ID, group ID, title, owner IDs, status label ID, priority label ID, timeline start/end, timestamps, parent ID/subtasks, order/index, and optional custom fields. **Map these concepts onto actual existing schema** rather than blindly recreating fields.
- `BoardGroup` maintains id/name/color/sort index/collapsed state (collapsed state may be per-user preference).
- `BoardColumn` maintains id/key/type/name/order/width/visible/searchable/summary configuration, with support for persisted custom columns.
- `LabelOption` maintains stable ID, column ID, text, color, order, optional semantic completion indicator, inactive flag; task values reference IDs rather than storing just color/text.
- Keep server-side write authority, audit trail and permissions; optional optimistic UI must rollback on failure.
- **Not required:** Monday.com proprietary AI, proprietary paid functionality, external integrations without existing credentials, or visual reproduction of its branded iconography. Buttons for unavailable features should either be omitted or clearly disabled with an explanatory tooltip—not masquerade as functional.

## 3. Layout / visual fidelity — Main Table page

### 3.1 Application shell
- Header: board title **Project Management** (dynamic, renameable if permissions allow) with chevron; board-level right actions if available; view tabs beneath (Main table active, Gantt, Workload, Kanban, `+` to add view).
- Tab underline: thin active blue line; preserve tab selection via route/query/persisted view preference.
- Left navigation when expanded: Home, My Work, More, workspace section, board items, active board soft-blue background. Collapse/expand button anchored beside content and keyboard accessible. Collapsing widens content; toggle never destroys navigation state.
- Desktop layout: white base; subtle gray borders, compact text, few shadows except floating overlays. Content must handle narrow viewport using horizontal scrolling, not squished unreadable cells.

### 3.2 Table toolbar
Order resembles screenshots: **New task** with dropdown caret; **Search**; **Person**; **Filter**; **Sort**; **Hide**; **Group by**; overflow menu; collapse control on right.
- Buttons have icon + readable label; hover, active, keyboard focus and disabled states.
- Search can expand into input. Person filters assignees. Filter opens structured conditions. Sort opens configurable sort direction. Hide controls column visibility. Group by changes grouping dimension without losing original groups. Overflow exposes valid existing commands.
- On create: add task to currently selected group/default group; row appears without reload; persist; allow keyboard entry.
- Avoid overlays clipped by scroll containers; portal popovers to overlay layer with proper anchor collision detection.

### 3.3 Group sections
- Group header row with chevron, editable group name, task count, distinct group-color text and slim colored rail on left edge; reference **To do** blue and **Done** green.
- Chevron collapses/expands task rows; persisted per user/view where supported. Collapsed group still shows correct count and summary if desired.
- Group settings: rename, recolor, reorder, add task, duplicate or delete (confirm destructive action; respect permissions). `+ Add new group` at bottom.
- Same table column widths and alignment across all groups, even when group has zero tasks. Sticky table headers where feasible.

### 3.4 Columns / rows (reference order)
`selection checkbox | Task (title + updates icon) | Owner | Status | Timeline | Priority | Last Updated | + Add Column`
- Dense compact row heights approximately 44–46px; header height approximately 43px; thin cool-gray grid lines; white background.
- Selection checkbox at row left; multi-select action bar; Shift range selection when feasible; hovering row shows left gutter ellipsis; clicked/selected row light-blue highlight.
- Task title truncates with ellipsis, supports click-to-open right drawer, edit-on-intent/double-click, Enter to save and Escape to cancel.
- Subtask expandable chevron for parent with visible count; expand/collapse nested rows and indent appropriately. Do not include expanded child rows twice in group task counts.
- Updates/comments speech bubble with count/badge; opens drawer on Updates tab.
- Owner circular avatar or pale outlined empty-avatar icon; click to assign one or several valid users; type-to-search, clear, respect access roles.
- Last Updated displays actor avatar and relative time (`3 weeks ago`), tooltip with exact timestamp; updates on every successful task change.
- Far-right `+` opens column library to add supported field types; existing column headers support context actions and drag resize/reorder if app supports it.

## 4. Status and Priority label cells — exact visual and editing behavior

### 4.1 Render labels
- Each Status and Priority cell has **full-cell colored rectangle** with centered white label text. Empty status/priority uses neutral gray, not the same as an active filled status unless configured.
- Seed example **Status** palette where no existing configuration: `Done #00C875`, `Working on it #FDAB3D`, `Stuck #E52B4B`, `Not Started #BDBDBD`, blank blue/teal option as in screenshot. Keep customizable.
- Example **Priority** palette: `Critical` dark brown/muted gray-red; `High` deep purple; `Medium` saturated purple/indigo; `Low` bright blue; empty neutral gray. Colors and label order should be configuration-driven and visually close to reference, not rigidly coupled to label text.
- Ellipsize long names with tooltip; maintain WCAG contrast where possible (choose readable text color), accessible name including column and value.

### 4.2 Cell interaction
- Click selected cell opens floating option menu **anchored directly below/adjacent**; only one menu at a time; focused option, search if many labels, outside click/Escape closes; up/down arrows navigate, Enter selects.
- Status menu example vertically stacked colored bars: Done, Working on it, Stuck, Not Started, blank; divider; `Edit Labels` at bottom.
- Priority menu example selectable bordered white option cards with colored icon, names Critical/High/Medium/Low, optional Default Label, `+ New label`, and `Apply` where selection is staged. Mirror screenshot interaction: clicking a priority option may stage selection until Apply. Choose consistent UX per column and document any intentional difference.
- Selecting a label immediately updates the affected task when menu is auto-apply, OR updates only on Apply in staged mode. Never change task value merely when hovering.
- Preserve canonical `labelId`. Rename/recolor label globally across tasks referencing it; audit configurations separately from task edits.

### 4.3 Full Edit Labels workflow — required
Provide via **Edit Labels** inside cell popup and **column header → Settings → Customize labels**:
1. Open editor (popover or modal) showing current labels as rows with colored swatch, editable text input, drag handle, ellipsis actions and optional completion marker for status.
2. **Rename:** click text → edit → Enter or Save; Escape cancels; trim whitespace, reject blank/duplicate names according to app policy.
3. **Color:** click swatch → visual palette of swatches plus custom color input if supported; preview immediately, save with contrast-adjusted foreground; persist label metadata.
4. **Reorder:** drag/drop or keyboard Move up/down; persist order and apply in dropdowns.
5. **Add:** `+ New label` inserts draft row; require name; assign distinctive default palette; Save/Apply.
6. **Delete/deactivate:** contextual action, confirm when in use; do not silently orphan tasks. Prefer deactivate while retaining existing task values/history or require an explicit replacement label; guard built-in options if necessary.
7. **Blank:** clearing a task label is separate from deleting a configured label. Support empty cell value.
8. **Semantic Done:** optional configure which status labels count as complete; summary/overdue/deadline logic must derive from the configured semantic property, **not** from green color or text `Done` alone.
9. Apply editing permissions, audit changes, sync updated label text/colors across Main Table, Kanban and other consumers without page refresh.
10. Undo/cancel changes if editing is staged. Explicit success or error feedback.

## 5. Timeline cell and date-range calendar — high priority

### 5.1 Timeline pill rendering
- Empty range: centered neutral gray rounded capsule containing `-`.
- Populated range: colored rounded pill with readable abbreviated start/end labels (`May 1, '23 - ...`), tooltips exposing full dates. Reference shows **red** on overdue and **green** on completed/on-time rows, with leading warning `!` or check icon. Ensure dates are not erroneously marked complete solely because of color: derive from semantic status and due date.
- Timeline is a start/end interval, not a single due date. Keep both dates in persistent canonical task record; all views use same dates.

### 5.2 Calendar popup layout (match screenshot)
- On timeline cell click, open a floating white ~340–380px wide panel with subtle shadow, anchored to cell and repositioned away from viewport edges.
- Header `Set dates` left, live `N days selected` right.
- Top **two independently editable fields** `MM/DD/YYYY` (Start on left, End on right) with visible focus and input errors. Clicking field indicates which endpoint is active.
- Month selector (`Jul` chevron), year selector (`2023` chevron), previous/next month arrows; below, Mon→Sun weekday headers and a 7-column day grid (weeks align correctly for selected month/year); out-of-month dates in muted gray.
- Start and end dates use saturated blue circular/rounded endpoint styling; intervening selected dates have pale-blue fill spanning contiguous days; today indicated subtly; keyboard-accessible focus.
- Click first date sets start; click later date sets end; allow editing either endpoint individually once range exists. If click precedes existing start, use a documented consistent rule (e.g., set start and await end) with visible indication.
- **Select across months** using arrows/month/year controls; highlight range even when part of it is offscreen.
- Tooltip/header count uses **inclusive calendar days** by default (July 1–10 = 10 days), unless actual product has configured business-day duration. Do not confuse date differences with inclusive count.

### 5.3 Manual field interactions and validation
- Allow typing/pasting start/end in locale display format; parse safely; do not persist partially typed invalid dates.
- Reject impossible dates, end before start, and out-of-policy ranges with inline errors. Permit valid same-day interval (1 inclusive day).
- Support explicit **Clear dates**, **Today**, optional **Apply/Cancel** actions. If screenshot has auto-apply interactions, still ensure edit is atomic so invalid intermediate range never leaks into app state.
- Support changing start without accidentally changing end, changing end without changing start, and complete range replacement. Clearly indicate whether duration changes or date shift behavior is used; default to independent endpoint editing unless configured otherwise.
- Store date-only calendar values as date-only strings (`YYYY-MM-DD`) or established schema convention; prevent UTC/timezone shifts (e.g. selected July 1 becoming June 30 for Philippine users). Use locale only for formatting. When time-enabled columns exist, keep timezone explicit.
- Day-grid keyboard navigation, Home/End, PageUp/PageDown when available, Escape closes, focus returns to previously selected cell.
- Save updates server, mark dirty/pending during request, rollback on failure, update relative/absolute modified timestamp and log a clear `timeline_changed` event containing old/new start and end.
- Gantt, Calendar, Kanban and any scheduling/dependency logic refresh from one source of truth. If dependencies/critical path/business-day scheduling exist, apply their established constraints—do not silently shift linked tasks.

### 5.4 Date-range acceptance cases (must test)
- July 1–10: `10 days selected`, correct 7-column blue highlight including weekends.
- Same-day Jul 1–1: `1 day selected`.
- Cross-month Jan 30–Feb 3: `5 days selected` (non-leap year).
- Leap year Feb 28–Mar 1, 2028: `3 days selected`.
- Typed `02/30/2027` invalid; End < Start invalid, no database write.
- Start/end individually editable; clearing leaves neutral placeholder; save/reload retains values exactly in Asia/Manila timezone.

## 6. Toolbar Search and Choose columns to search

- Search button becomes focused input; filters visible rows across the current board (and subtasks where included). Provide highlighted matches if appropriate.
- `sliders` icon embedded at trailing side of search field opens **Choose columns to search** popover matching `Search Filter.png`.
- Popover: title `Choose columns to search`; nested `Find a column` search input; tri-state **All columns** checkbox with `N selected` live count; section `Item columns`; individually checkable rows e.g. Name, Owner, Status, Timeline, Priority, Last Updated; scrollable list. Support additional dynamic columns.
- Entirely checked = checked; partial = indeterminate; none = clear; user can select all / deselect all. Ensure search always obeys permitted/readable fields.
- Search field is distinct from column-selector's Find a column field. Search targets configured searchable fields, with text/date/label/people value normalization.
- Persist column search selection per user and board/view; keep active filters when editing a task. Debounce remote requests; avoid heavy synchronous rerender on large boards.
- Show clear-search action, result count, and empty-results explanation. Clearing filters must restore full group contents.

## 7. Person, Filter, Sort, Hide and Group by

- **Person**: searchable list of authorized assignees, avatars, multiple selection, `Unassigned`, optional `My tasks`, count indicator, clear action; reflect in table group counts/summary of visible results.
- **Filter**: structured builder for Owner, Status, Priority, Timeline (before/after/between/empty/overdue), groups and custom columns. Support AND/OR appropriately, save/clear active rules, visible filter chips. Avoid applying a local filter in one view that alters underlying task records.
- **Sort**: choose column, ascending/descending, optional multi-sort if existing system supports it; tie-break with stable task ID/order to avoid visual jitter.
- **Hide**: searchable column toggle, show all, restore defaults, persist per user. Do not let a hidden column delete field data; keep Task identity accessible.
- **Group by**: source group, status, priority, owner or available grouping field; clearly distinguish display-only groupings from persistent `groupId` changes. Preserve task order/identity across grouping changes.
- Toolbar/menu positions must reposition within viewport and close on outside click/Escape; icons must have accessible labels.

## 8. Row selection / nested subtasks / direct editing / add new column

- Select row via checkbox (independent of opening drawer). Header checkbox selects visible rows in that group; mixed state indeterminate; multi-item bulk controls and confirmation for destructive operations.
- Nested subtasks: chevron toggles child display; persist/restore expansion when useful; create subtask from task menu; ensure parent-child relationships and rollups remain correct.
- Owner cell inline picker; Status/Priority inline label pickers; Timeline inline range calendar; Last Updated read-only; title inline editor; optional custom field cell editors chosen based on field type.
- `+` on far-right header opens Column Center with suitable field types, including Status, Priority, Text, Number, Date, Timeline, People, Dropdown/Labels, Checkbox, Files, Link. Map to existing schemas; block unsupported types with explanation.
- Column headers: rename, sort, hide, duplicate/add, width resize and reorder as supported; maintain alignment between groups and footer summaries. Keyboard-friendly controls.

## 9. Summary / footer row (status and priority distribution)

- Each group footer has status color distribution segmented horizontally, Timeline aggregate range pill, Priority distribution bar; align to corresponding columns like the screenshots.
- Calculate counts from **actual tasks currently included in each group**, with documented behavior for search/filter and whether subtasks are included; exclude non-task placeholders (`+ Add task`).
- Hover individual status segments to show tooltip of `Stuck 1/5 20%` (example only), using exact label name, count, denominator, percentage; adjust for 0 tasks; handle very thin segments with accessible focus targets.
- Colors come from label configuration. Recompute after task creation/deletion, status/priority change, moving between groups, or filter change. No hardcoded screenshot proportions.
- Timeline aggregate span = earliest valid start to latest valid end of included tasks; show empty when no dates. Ensure cross-month/year formatting.

## 10. Task details right-side drawer — persistent across views

### 10.1 Drawer shell
- Clicking task title, comment icon, or suitable open action launches **right-side drawer** occupying roughly half viewport width on desktop, leaving compressed table visible on left. Overlay appropriately on small devices.
- Header: close X, editable task title, assigned user/avatar, updates indicator, previous/next task navigation arrows and overflow task actions. Previous/next navigates current visible ordering and respects filtering.
- Tabs: **Updates | Files | Activity Log | +**. Active tab has blue underline. Persist selected tab only if it makes sense per session; opening comments icon should default to Updates.
- Drawer maintains a stable selected task ID. Do not lose unsaved form edits silently; confirm before dismissing dirty state. Deep-link task ID if existing routing supports it.

### 10.2 Updates tab
- Show discussion thread in chronological/reverse chronology per app convention, authors with avatars, timestamps, rich text/plain text editor consistent with existing tech stack, mentions if supported, attached files, edit/delete own updates with permission.
- New update saved to backend, updates badge count and creates activity event as appropriate. Empty state and loading/error states.

### 10.3 Files tab
- Match image: top row `+ Add file`, `Search for files`, **grid/list** view toggle, download option for permitted files; spacious informative empty state and centered Add file CTA (create an original ProjectTracker illustration or icon, not Monday proprietary artwork).
- Upload via click/drop; drag-over highlight; validation for allowable extensions, MIME, size, duplicates; show upload progress, cancel and failure retry. Backend must persist metadata and blob using existing secured storage.
- Grid view previews thumbnails where applicable; list view includes name, type, uploaded by, date, size and actions. Search filenames, download/open, rename/delete with permissions and audit trail.
- Validate file safety in backend; signed/authorized access; prevent insecure direct public URLs; optional malware scan where infrastructure permits. Preserve existing attachments on task edits.

### 10.4 Activity Log tab
- Match image: `Other activities` banner/link to automation activity if available; `Filter log` dropdown, `Person`, optionally AI indicator ONLY if real, refresh icon, export (when authorized).
- Append-only task history entries: created, title changed, owner assigned/unassigned, status/priority changed, timeline changed (old/new dates), group moved, subtask created/changed, file added/deleted, comment created/edited, other applicable domain actions.
- Each entry shows precise actor avatar/name, action description, old/new values where appropriate, absolute timestamp tooltip and relative-time display. Audit log ordered newest first, supports filter by event type/user/time and pagination.
- **Audit integrity:** do not permit arbitrary client-side editing/deletion of events. Server writes transactionally with domain change, avoid client-provided actor IDs, enforce access policies and retention settings. Surface system/automation actors accurately.
- The sample screenshot shows a board creation event; decide based on existing schema whether drawer shows task-specific vs board-wide history. Label clearly; **do not misattribute board events to individual tasks**.

## 11. Sidebar collapse/expand

- Expanded: workspace navigation visible and main content offset; active board highlighted. Collapsed: thin icon rail or fully hidden navigation as shown, with accessible toggle to restore.
- Animate width modestly; preserve app content scroll and overlay positions. Avoid horizontal viewport jumps or reset of selected group/task. Persist per-user preference if existing preference mechanism is available.
- Do not conflate global navigation sidebar toggle with the task detail drawer toggle or group chevrons; they are independent state machines.

## 12. Persisted state, event contracts and synchronization

- Read from actual APIs/db state. If backend is missing functionality, implement properly with migration, validation and authorization; do not use `localStorage` as the only task store.
- Derive view models from canonical tasks, labels, groups and columns; prefer selectors/memoization for filtering, ordering, aggregation.
- On task mutation: persist task update + audit event atomically if supported; update query cache; other views must reflect the same record; avoid stale tab view snapshots.
- Configuration changes (label name/color/order, column visibility, group arrangement) also persist in their appropriate shared or per-user scope.
- Concurrent changes: respect version/updated_at, show conflict or reconcile; don't silently overwrite newer task edits.
- Use stable keys (IDs), optimistic updates only with reversible rollback, explicit loading/empty/error states and unsaved indicators.
- Distinguish **board-global metadata** (labels/group names) from **personal view preferences** (sidebar, chosen columns, filters/sorts where appropriate).

### Recommended TypeScript conceptual contracts — adapt to existing types, do not copy blindly

```ts
type DateOnly = string; // validated YYYY-MM-DD
interface LabelOption {
  id: string;
  columnId: string;
  name: string;
  color: string;
  order: number;
  isComplete?: boolean;
  inactive?: boolean;
}
interface TaskTimeline { startDate: DateOnly | null; endDate: DateOnly | null; }
interface TaskPatch {
  title?: string;
  ownerIds?: string[];
  statusLabelId?: string | null;
  priorityLabelId?: string | null;
  timeline?: TaskTimeline;
  groupId?: string;
  order?: number;
}
interface ActivityEntry {
  id: string;
  taskId?: string;
  boardId: string;
  actorId: string | null;
  action: string;
  previousValue?: unknown;
  nextValue?: unknown;
  occurredAt: string; // ISO timestamp
}
```

## 13. Visual tokens / behavior guidelines

- Use existing typography/design tokens if available; fallback: 14–16px body, 24–30px board heading, subtle #D0D4E4 borders, blue primary buttons, white table background, transparent toolbars.
- Label cells appear **full width/height** (not tiny badges). Timeline cells use inset rounded colored pills. Group rail left edge follows group color; header labels are colored text.
- Selected row pale blue. Hover slightly tinted. Menus white with rounded 8–12px corners, moderate shadow and ample click targets. Distinguish interactive vs disabled.
- Make column widths adjustable; maintain consistent shared column grid, no alignment drift between groups.
- Desktop target 1440+; at 1024 enable horizontal table scroll; mobile provide usable scroll/card fallback without reducing important actions to unclickable icons.
- Accessibility: focus trapping in modal, no trap in popover; `aria-expanded`, correct checkbox `aria-checked=mixed`, associated labels, cell descriptions, adequate keyboard reachability, informative screen reader text for status/colors/date-range.
- Color must not be the only source of meaning; include text and tooltip, icons for warning/done on timeline.

## 14. Security and regulated-project considerations

- This ProjectTracker may manage CDMO/pharmaceutical tasks. Preserve distinctions between **workflow status** and formal GMP approvals: changing task status to Done must NOT imply QA authorization, electronic signature, batch disposition or validation approval.
- For regulated change control, report review and validation tasks, if existing app supports authorization/approval gates, maintain them server-side. Never silently bypass via drag/drop or bulk edit.
- Capture who/what/when for changes; optional reason-for-change on protected records according to current app policies. Do not claim Part 11/Annex 11 compliance from UI alone; that requires validated controls, procedures and evidence.
- Limit visibility of files and task records to authorized users; protect private information and avoid logging file contents or secrets.

## 15. Implementation milestones / build order

**Phase A — repository audit and detailed map**
- Report actual frontend framework/version, state/cache mechanism, data access, persistence schema, table implementation, row/detail functionality and missing features. Create a concise screenshot-feature gap matrix. Do not start with wholesale rewrite.

**Phase B — table foundation**
- Match app shell, tabs, toolbar, group table grid, column widths, selected/hover rows, group expand/collapse, sidebar expand/collapse, create/edit task, owner, nested subtasks and view sync.

**Phase C — editable labels and timeline calendar**
- Implement Status/Priority cells and menus, global Edit Labels (add/rename/color/reorder/deactivate), full functional two-date calendar, date semantics, validation, footer summaries and persistence.

**Phase D — discovery controls**
- Search with choose-columns popover, Person, Filter, Sort, Hide, Group by, add/reorder/rescale columns; user preference persistence.

**Phase E — task drawer and collaboration**
- Drawer header/navigation, Updates, Files (upload/search/grid-list/download), append-only Activity Log (filters and pagination); audit integration.

**Phase F — integration and testing**
- Sync all changes across views, error handling, permissions, keyboard accessibility, responsive behavior, migrations, tests, screenshot comparisons and quality review.

Stop and report genuine blockers (e.g. unsupported backend permissions/files storage) rather than silently removing requirements. Complete one milestone at a time and show results before pursuing risky schema changes.

## 16. Definition of done (acceptance test matrix)

| ID | Scenario | Expected |
|---|---|---|
| MT-01 | Open board Main Table | Desktop layout visually consistent with reference, existing data displayed |
| MT-02 | Collapse/expand app sidebar | Content reflows, no lost state, toggle remains functional |
| MT-03 | Collapse/expand To do or Done group | Correct child visibility, count and preferences |
| MT-04 | Add task, rename, assign owner | Persisted data, Last Updated and activity change |
| MT-05 | Click Status cell, select Done | Full-cell correct color/text, persisted, summary updates, Kanban sync |
| MT-06 | Edit Status label name/color | All tasks using label show new text/color; history and ID integrity preserved |
| MT-07 | Reorder/add/deactivate label | Dropdown order and task references remain safe |
| MT-08 | Priority menu New label and Apply | New label saved, correct cell preview and assignment |
| MT-09 | Timeline select July 1–10 | 10 calendar days inclusive, two blue endpoints and highlighted range |
| MT-10 | Timeline manually edit start and end | Independent edits, invalid ranges blocked, date unchanged on reload |
| MT-11 | Timeline month/year navigation | Correct days/leap-year layout and cross-month highlight |
| MT-12 | Change timeline | Gantt/Calendar sync and old/new dates in activity log |
| MT-13 | Search choose columns | Tri-state checks, searchable column list, correct resulting tasks |
| MT-14 | Filter owner/status/date; clear | Consistent visible tasks, restored table after clear |
| MT-15 | Sort/Hide/Group by | Working menus and persistent scoped settings |
| MT-16 | Hover group distribution segment | Actual count and percentage tooltip, no static values |
| MT-17 | Open task drawer, switch tabs | Right-side layout, functional Updates/Files/Activity Log |
| MT-18 | Upload/download/search/delete file | Authenticated backend operation, persistent after reload |
| MT-19 | Edit owner/status/priority/timeline | Append-only attributable events, correct before/after |
| MT-20 | Select tasks and apply bulk action | Only selected eligible tasks affected, confirmation as required |
| MT-21 | Refresh, navigate views, reopen | No lost task, labels, date ranges, notes, files or preferences |
| MT-22 | Server failure, unauthorized edit | Rejected with clear error, rollback UI, no false success |
| MT-23 | Keyboard + responsive checks | Reachable controls, appropriate focus and no clipped popup |
| MT-24 | Run lint/typecheck/build/tests | Passing or specifically documented remaining defects |

## 17. Cursor output / final engineering report

After completion Cursor must report:

1. A mapping of screenshots → implemented components and workflows.
2. Files created/modified, new dependencies and why needed.
3. Schema/data migrations and rollback guidance, if any.
4. Actual verification commands with their output status.
5. Screenshots of implementation in normal table, status editor, priority editor, date range selection, search selector, expanded/collapsed sidebar, files and activity log.
6. Known gaps, permissions/endpoint blockers and recommended next actions; do not label unfinished features as done.

## 18. Vendor behavior references (for implementation interpretation, not for copying assets)

- Monday.com Status Column: https://support.monday.com/hc/en-us/articles/360001269685-The-Status-Column
- Monday.com Timeline Column: https://support.monday.com/hc/en-us/articles/115005333969-The-Timeline-Column
- Monday.com available column types: https://support.monday.com/hc/en-us/articles/115005310285-Available-column-types-on-monday-com
- Monday.com Deadline Mode: https://support.monday.com/hc/en-us/articles/360002646059-Deadline-Mode

**Important:** The screenshots provide direct evidence of appearance and some menu states. Requirements beyond what the still images can prove (such as Save/Apply semantics, API behavior, permission enforcement or date-selection edge cases) are proposed implementation rules to deliver reliable functionality and should be reconciled with existing app patterns.

---

### Suggested Cursor Agent command

> Inspect every screenshot referenced by `ProjectTracker_Monday_Main_Table_Cursor_Implementation.md` and the actual ProjectTracker_React repository. Implement this specification in the existing Main Table, preserving the real backend and shared data model. Begin with a repository audit and screenshot gap matrix, then implement Phases B–F in order. Prioritize a truly editable label management system and a two-ended date-range calendar matching the screenshot. Do not make static demo UI, do not hardcode example tasks, and verify persistence, activity logging and synchronization with Kanban/Gantt/Calendar. Test each acceptance case and give an engineering report.
