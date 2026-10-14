# Cursor Implementation Specification — CDMO Column Center

**Purpose:** Implement a monday.com-inspired **Column Center** in the existing CDMO/pharmaceutical project-management application, with fully functional, configurable columns and consistent data across **Main Table, Kanban, Gantt, and Calendar**.

> **Cursor execution instruction:** Inspect the repository, identify the actual framework, database, task/board schemas, routes, component library and test setup, then implement the requirements below in the existing architecture. Do **not** recreate the application, replace its design system, or implement a visually attractive but nonfunctional mock. Use the attached reference screenshots to guide the UI/UX, not as assets to copy. Preserve all existing board/task records and behavior.

## 0. Scope and non-negotiable rules

1. Implement the Column Center modal/drawer, the column catalog, add-to-board actions, column settings, cell editors/renderers, persistence, and view integrations. All **35** types below must appear in the catalog and be usable according to their specification (11 Essential + 7 Super Useful + 7 Team Power-Up + 10 Board Power-Up).
2. Adapt monday.com's **layout patterns and interaction affordances** (left category navigation; searchable cards with icon, title, description and Add to board; elegant spacing; hover and selection states) without copying branding, proprietary artwork, logos, or pixel-identical visual styling.
3. Integrate the new feature into the app's existing `+ Add column` entry point(s), column header menus, task grid and view controls. Existing task name/hierarchy and current Gantt schedule must survive migration.
4. Use **one source of truth** for column definitions and item values. A change in one view must update other views without duplicate fields or conflicting records.
5. Use database migrations/backward-compatible adapter logic for existing data; do not overwrite, delete, or silently reinterpret existing dates, project groups, task IDs, links, statuses or dependencies.
6. Implement real interactions. No fake Add to board buttons, dead configuration menus, random placeholder data, or simulated saving.
7. Respect existing authentication, board membership and permissions. Validate mutations server-side; do not rely solely on hidden/disabled UI controls.
8. Keep the app responsive and usable with large CDMO portfolios. Virtualize heavy grids/lists if existing tooling supports it; do not fetch every attached file or linked board record for each render.
9. Differentiate **project/board configuration** from **task data**. Column creation changes the board schema; filling a cell changes an individual item.
10. Run repository tests, type checks and lint checks where available. Fix failures introduced by this work and report any unrelated failures.

## 1. Target UI/UX — Column Center

### 1.1 Open/close and layout

- Open from the existing board's `+ Add column` action, and optionally from the final column header `+` and column management menu.
- Use a generous modal on desktop, approximately **min(1400px, 94vw)** wide and **min(850px, 90vh)** tall; on tablet reduce to a single content column; on mobile use a full-screen sheet.
- Header remains **sticky**: `Column Center` (left), prominent search input (center/left), close `×` (right). `Esc` and backdrop dismiss only when safe; retain focus trapping and restore focus when closed.
- Left category sidebar (roughly 230–260px wide) with: **Featured**, **Essentials**, **Super Useful**, **Team Power-Up**, **Board Power-Up**. Show each category's count if desired. AI-powered, Combos, and Marketplace are **out of scope**; do not show nonfunctional menu categories.
- Right panel scrolls independently. Use a responsive **two-column card grid** for most categories; Featured may use slightly larger cards. Maintain consistent card height and accessible button sizes.
- Each card: distinctive (but consistent) colored icon tile, **name**, one-sentence **description**, `Add to board` button; after adding, show `Added` state and offer `Configure`/`Add another` when repeatable. Premium/plan diamonds from monday.com **must not** be copied unless this application's own entitlements demand it.
- Category selection sets scroll/filtered content predictably. Search matches name, description and synonyms; search is case-insensitive, keyboard-friendly and has a helpful empty state.
- After click `Add to board`, add a visible column immediately to the current board, persist it, and offer optional configuration. Do not automatically dismiss the modal unless explicitly desired by the user.
- Styling: white/neutral surfaces, subtle 1px borders, 8–12px radius, soft active blue navigation highlight, comfortable whitespace, typography consistent with the current app; compact enough for enterprise use.

### 1.2 Board-level column operations

All applicable columns must support:

- Add, rename, configure, reorder by drag/drop and keyboard alternative, resize, pin/freeze, hide/show per view, duplicate, and remove with confirmation.
- `Column settings` menu from column header: **Rename**, **Edit settings**, **Sort ascending**, **Sort descending**, **Filter**, **Hide in this view**, **Pin/Unpin**, **Duplicate column**, **Move left/right**, **Delete column** (permission gated).
- Display name is distinct from immutable **column type** and stable column ID. Renaming must not break formulas, filters or values.
- Duplicating a column defaults to copying configuration **only**, not values; optional `Copy values` requires explicit selection.
- Deleting a column warns about loss of values and references, shows impacted formulas/mirrors/filters, and follows existing retention or soft-delete policy. Never silently delete associated uploaded documents or external records.
- New columns default to visible in the Main Table, and can be toggled independently for other views. Preserve user-specific view configuration where the app supports it.
- Column creation is separate from adding tasks; newly added columns display a proper empty value and cell editor.

## 2. Catalog: 35 required column types

Each row below specifies the **default editor / behavior**. All values should have schema-based validation, appropriate null/empty states, permission checks and persistent storage.

### 2.1 Essentials (11)

| Column | Required functional behavior |
|---|---|
| **Status** | Single-select, color-coded workflow state; default options `Not Started`, `Working on It`, `Stuck`, `Done`; board admins can rename/recolor/add/reorder choices. Distinguish category semantics (not-started/in-progress/blocked/completed) from display text so automation remains reliable. |
| **Priority** | Single-select urgency; `Critical`, `High`, `Medium`, `Low` (optional `None`); custom labels/colors allowed. Keep distinct from Status and Label. |
| **Label** | Configurable color-coded **single-select** categorization; options per column (e.g., `Validation`, `QC Testing`, `Documentation`, `Client Review`). |
| **People** | One or multiple assignees drawn from permitted workspace/board users; searchable picker with avatars, clear/remove, prevent unauthorized external assignment. |
| **Date** | Date picker with optional time and timezone policy, clear action, locale-aware display, stable ISO storage. |
| **Timeline** | Start and end date picker, inclusive date-range visual, positive duration validation, Gantt-aware; configure working-day/calendar behavior explicitly. |
| **Numbers** | Validated numeric entry supporting integer/decimal, min/max, unit/precision, configurable display (`number`, `%`, currency if relevant); sort numerically. |
| **Text** | Single-line text editor, inline editing, reasonable length limits, trim/display policy. |
| **monday doc equivalent: Task Document** | Associate a document with a task using the app's existing document/attachment/editor integration. Create/link/open document; protect permissions and version metadata. **Do not pretend an embedded collaborative editor exists**: implement an editor only if compatible infrastructure is present; otherwise a persisted document reference and open/upload flow are acceptable, visibly labeled `Task Document`. |
| **Connect Boards** | Select a destination board and one or more accessible items, persist stable cross-board references; disallow broken/unauthorized links; display linked item names and navigation action. |
| **Mirror** | Requires a Connect Boards relationship; select connected board column and render sourced values (read-only initially unless the app already has safe cross-board editing); update when source changes; show deleted/inaccessible source states. |

### 2.2 Super Useful (7)

| Column | Required functional behavior |
|---|---|
| **Checkbox** | Persistent true/false switch; keyboard accessible; distinguish false from unset if needed. |
| **Link** | URL and optional display label; validate safe `https:`/`http:` schemes; open using safe external-link handling. |
| **World Clock** | Configurable IANA timezone (e.g., `Asia/Manila`, `Europe/London`); display current localized time; refresh without storing constantly changing time values; clarify DST. |
| **Item ID** | Read-only stable task/item identifier copied from existing system, not generated from row position; searchable and copyable. |
| **Phone** | Country-code-aware text validation and `tel:` action; allow international formatting; do not destroy leading zeroes. |
| **Location** | Free-form address plus optional structured location coordinates when available; do not require maps/geocoding API for basic editing. |
| **Files** | Multi-file attachment picker/upload linked to task, file metadata, download/open, permitted delete; enforce access control, file limits, allowed MIME/extension policy and backend scanning if available. |

### 2.3 Team Power-Up (7)

| Column | Required functional behavior |
|---|---|
| **Tags** | Multi-select searchable workspace/board tags, allow governed creation if authorized; shared across tasks and optionally boards. Distinct from single-select Label. |
| **Vote** | One vote per eligible user per item per Vote column (default), toggle/remove vote, show count and voter list according to access controls; enforce uniqueness server-side. |
| **Rating** | Configurable 1–5 stars (or validated maximum), click/keyboard rating, clear rating; do not confuse with Priority. |
| **Creation Log** | Read-only server-generated creator identity and created timestamp (historical existing values retained). |
| **Last Updated** | Read-only last modifying user and timestamp, updated by successful data mutations (not merely rendering); handle system automations distinctly. |
| **Auto-Number** | Read-only ordinal generated per board or group according to explicit configuration; stable IDs remain separate; reordering may change displayed sequence if configured. |
| **Progress Tracking** | Show a 0–100% progress bar; choose **manual numeric progress** or an explicitly configured aggregation from selected Status/Checkbox/subtask fields. Define denominators and empty-set behavior; never fabricate percentages. |

### 2.4 Board Power-Up (10)

| Column | Required functional behavior |
|---|---|
| **Dependencies** | Search/select predecessor items, support FS (Finish-to-Start) initially and additional SS/FF/SF only if scheduling engine supports them; prevent cycles/self-linking; visible connector lines in Gantt; edit/remove; handle lag and non-working days consistently if supported. |
| **Formula** | Read-only computed column with safe expression parser, typed references by stable column ID, supported operators/functions documented (`+`, `-`, `*`, `/`, `IF`, `ROUND`, `DATEDIFF`, etc. as implemented), null/error states, cycle prevention; **never use `eval`/arbitrary JS execution**. |
| **Time Tracking** | Start/stop work timer where supported; persist elapsed segments server-side, pause/resume, total duration and responsible user; prevent duplicate concurrent sessions per policy and account for browser close/reconnection. |
| **Dropdown** | Configurable single- or multi-select choices; search, clear, configurable options, no silent replacement of deleted options. |
| **Button** | Configurable permitted actions (e.g., open item details, create subtask, copy ID, trigger a registered workflow); no arbitrary client code or unapproved GMP status transition. Display disabled when not configured/authorized. |
| **Week** | Choose calendar week with year, honor configurable locale/ISO week policy; avoid ambiguous `Week 1` without year. |
| **Hour** | Pick a clock time in user-configured 12/24h format; no implicit date/timezone association unless configured. |
| **Email** | Email validation and `mailto:` action, robust for international domains when existing validator allows. |
| **Country** | Searchable country selection storing stable ISO 3166-1 alpha-2 code and localized display label. |
| **Color Picker** | Palette and validated hex color selection; persist color value, keyboard accessible, optional clear. |

### 2.5 Important semantics

- **Status, Priority and Label** can reuse a configurable chip UI but must have different defaults and independent option lists.
- **Label** = single classification option. **Tags** = multiple reusable keywords. **Dropdown** = configurable single/multi selection. Do not merge their storage indiscriminately.
- **Progress Tracking** does not imply Status automatically unless explicitly configured.
- **Creation Log, Last Updated, Item ID and Formula** are system/computed fields and must not allow direct value edits.
- **Dependencies** must use immutable item identifiers, not visual row positions or task names.

## 3. Data model and persistence

Use existing schema if available; otherwise implement equivalent normalized tables/entities (names illustrative):

- `board_columns`: `id`, `board_id`, `type`, `title`, `settings_json`, `position`, `created_at`, `created_by`, `deleted_at?`.
- `item_column_values`: `item_id`, `column_id`, `value_json`, `updated_at`, `updated_by`, with composite uniqueness and appropriate typed validation.
- `view_column_preferences`: `view_id`, `column_id`, `visible`, `position`, `width`, `pinned`, optional `user_id` depending on existing view model.
- Relations for `board_item_links` (connect boards), `item_dependencies`, `item_votes`, `time_entries`, `item_attachments`, and `activity_history` as warranted; **reuse existing tables instead of duplicating them**.
- All reads/writes are scoped by workspace/board membership. API rejects updates to read-only fields or to invalid option values. Reuse existing optimistic updates and rollback/error toast patterns if present.
- Existing default task fields (`name`, `owner`, `status`, `start_date`, `due_date`, `group`, `batch`, etc.) should either map to canonical columns or stay as synchronized system fields; **no shadow copies that drift**.
- Provide migration/seed logic creating default Status, Priority, People and Timeline columns for boards lacking column metadata, **idempotently**; map existing values and preserve exact dates and groups. Execute with transactional safeguards.
- Provide indexes for board order, item/column lookup, dependency lookup and cross-board references; avoid N+1 queries.

## 4. Integration with existing views

### Main Table

- All 35 types are available via `+ Add column` and display as appropriate editors/renderers.
- Header and cell remain aligned on horizontal scroll; pin/freeze primary task name; support large boards with stable scroll behavior.
- Sort/filter/group columns according to data type: dates chronologically, numbers numerically, categorical by configured order, People/Tags by membership, checkboxes by Boolean, etc.

### Gantt (highest priority)

- Retain current task hierarchy, planned/in-progress group rows, batch subtasks, and date bars.
- Keep task-name column sticky; users can reveal/hide **Owner, Status, Priority, Start, End, Timeline, Dependencies, Progress** in the left Gantt grid.
- Bind Gantt bars to the **canonical Timeline** dates (or existing dates via an explicit non-lossy mapping). Dragging/resizing a bar updates stored dates, and editing Timeline updates the bar immediately.
- Dependency arrows reflect stored relationships. When predecessor dates change, show impact and apply only the configured scheduling policy; **do not silently move GMP-critical tasks**.
- Show percent-complete overlay on Gantt bars only where the progress value exists. Distinguish overdue, blocked, complete and not-started states without relying on color alone.
- Maintain day/week/month navigation, Today marker, zoom, current scroll and expand/collapse state while updating cells.
- Treat unscheduled tasks (missing dates) as explicitly unscheduled, not as zero-duration or Jan 1 defaults.

### Kanban

- Allow grouping by Status, Priority, Label or configured Dropdown; draggable item movement updates underlying value and respects workflow permissions.
- Other columns appear in item cards selectively; no separate Kanban-only state.

### Calendar

- Allow configuration of Date or Timeline fields used for calendar events; changes on calendar update same canonical values.
- Respect current timezone/date-only behavior and avoid one-day date shifts.

## 5. CDMO-specific recommended default templates (not extra custom data types)

Populate board templates using the **35 generic types** rather than hard-coded new types:

| Template column name | Underlying type | Example configuration |
|---|---|---|
| Project Status | Status | Not Started / In Progress / Blocked / Completed |
| GMP Criticality | Priority or Label | Critical / Major / Minor (configure separately from urgency) |
| Responsible Department | Dropdown | Validation / Production / QC / QA / Engineering / Regulatory |
| Assigned Personnel | People | Multiple assignees enabled |
| Batch / Lot No. | Text | e.g. `2026DKGC-5` |
| Validation Phase | Dropdown | URS / DQ / FAT / SAT / IQ / OQ / PQ / PV / Reporting |
| Protocol Reference | Text or Link | Reference number + validated document URL |
| Change Control Reference | Text or Link | Cross-reference to quality system |
| Deviation / CAPA Reference | Link or Connect Boards | Governed reference, not unapproved edit of quality record |
| Client Approval | Status | Not Required / Pending / Approved / Rejected |
| Planned Execution | Timeline | Task start and finish |
| Actual Completion | Date | Real completion date, distinct from plan |
| Task Predecessors | Dependencies | Manufacturing before Bulk Sampling |
| Task Completion | Progress Tracking | Manual or subtask-based |
| Supporting Records | Files / Task Document | Approved protocols, reports, COAs |

Prefer starter views: **Portfolio**, **Gantt Schedule**, **Validation Execution**, **Client Deliverables**, **Management Overview**. Do not force every template column visible on every board.

## 6. Key workflows and interaction acceptance criteria

1. Open an existing board, click `+ Add column`: Column Center opens with the correct board context and the five supported categories.
2. Search `priority`, click `Add to board`: a Priority column appears at the insertion point, persists after refresh and exposes editable Critical/High/Medium/Low chips.
3. Add two **Status** columns; configure each differently. Verify settings and values do not interfere with each other.
4. Add **People**, assign two authorized users to a task, save and reload; both persist and can be removed.
5. Add **Timeline**; choose Oct 15–16, 2026 for a packaging task. Gantt bar aligns to those days. Drag the bar or edit the date range; both views remain synchronized.
6. Add **Dependencies**, choose predecessor `Manufacturing`; verify connector appears in Gantt; attempt self-dependency or a cycle and receive a clear validation error.
7. Add **Progress Tracking** set to manual 65%; Gantt and Main Table show 65% consistently; zero is not mistaken for empty.
8. Add **Files**; attach, reopen and download a file with existing access controls; unauthorized user cannot delete it.
9. Add **Connect Boards** and **Mirror**; choose a linked board item and source field; change the source and verify mirrored value refreshes, honoring permissions.
10. Add **Formula** with a supported expression; recalculates when referenced values change, returns a clear error for divide-by-zero and circular references.
11. Add **Creation Log**, **Last Updated**, **Item ID**; values are correct and not directly editable; creation timestamp survives updates.
12. Add **Time Tracking**, start/stop; actual elapsed time persists after refresh and user switch; no runaway browser-only timer.
13. Hide Priority in Gantt only: it remains visible in Main Table. Reorder two columns and refresh: order persists.
14. Duplicate a Dropdown column: options copy but cell values stay blank by default. Delete a referenced column: show warning and prevent silent breakage.
15. Search and keyboard interaction: focus trap, `Esc`, tab order, accessible names, visible focus ring and responsive phone layout function correctly.
16. Existing Daktarin board is still intact: batches, status groups, task ordering, original scheduled dates and current dependency arrows preserved after migration.
17. All add/configure/edit/delete actions handle loading, success, validation failure, network failure, and unauthorized response gracefully.

## 7. Implementation sequence for Cursor

### Phase A — Repository inspection and plan
- Identify board data model, tables, existing column implementation and grid/Gantt/calendar/kanban components.
- Document integration points and migration risks. Identify any of the 35 behaviors already implemented and reuse them.

### Phase B — Shared infrastructure
- Add type registry, column definition model, config validators, typed value serialization, repository/API changes and permission checks.
- Create idempotent migrations; add tests ensuring legacy boards still load correctly.

### Phase C — Column Center UX
- Build polished modal, sticky header, sidebar, searchable catalog, cards, add flow, configuration panels, toast/empty/loading/error states.

### Phase D — Renderers, editors and board actions
- Implement every catalog type with proper persistence, then header settings and per-view hide/show/resize/reorder functions.
- Use shared reusable label picker, people picker, date picker and multi-select components.

### Phase E — View synchronization
- Integrate Main Table first, Gantt second, then Kanban and Calendar; ensure same canonical values and dependencies.

### Phase F — Verification and delivery
- Run migrations/tests/type checks; verify all acceptance cases. Include component/API tests and end-to-end smoke tests where supported.
- Produce a concise summary of changed files, any new migrations, tested scenarios, and actual remaining limitations. **Do not claim completion for types that are only visual placeholders.**

## 8. Definition of done

- [ ] All **35 column types** are discoverable, addable, configurable as applicable, and persist their values.
- [ ] Column Center reflects the provided references' interaction pattern while fitting the existing application style.
- [ ] Same task data displays correctly in Main Table, Kanban, Gantt and Calendar.
- [ ] Gantt Timeline, Dependencies and Progress Tracking are genuinely integrated.
- [ ] Column settings, filters, sorts, hidden state, widths and ordering persist.
- [ ] Historical board records remain intact after migration.
- [ ] Permission validation, safe formula handling, document access control and error states are implemented.
- [ ] Build/tests pass, and no unrelated core features regress.

**Priority rule:** Build the complete feature, not just its modal. If the existing infrastructure lacks document collaboration, real-time cross-board reactivity, time-entry backend or secure file storage, implement a secure, working baseline using current capabilities and explicitly list any unsupported advanced behaviors rather than mocking them.
