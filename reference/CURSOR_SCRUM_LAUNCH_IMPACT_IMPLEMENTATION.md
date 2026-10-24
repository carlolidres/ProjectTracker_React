# Cursor Implementation Specification: Scrum Main Table + Automated Launch Impact

> **Instruction to Cursor:** Implement this feature in the existing project management application, adapting to its actual framework, ORM, database schema, state management, permissions, and design system. **First inspect the repository.** Do not invent file paths or assume a particular stack. Preserve existing features and records. Document any assumptions and any migration needed. Build incrementally with tests.

## 1. Product goal

Enhance the **existing Main Table** (monday.com-style UI), not a separate Kanban board, to represent **Project → Milestones → Sprints → Tasks/Subtasks** and automatically recalculate downstream schedules and **Launch Impact** when relevant task forecasts, Sprint planning dates, dependencies, or milestones change.

Example context: **Daktarin Oral Gel (Reformulated)**; illustrative baseline launch date **2026-11-30**. This date and any example progress or schedule are **demonstration fixtures only**, not verified production data. Do not overwrite user-created records with examples.

### Definition of done

1. Main Table preserves its visual design and supports expand/collapse of project, milestone, Sprint, and task rows.
2. A schedule change to a linked task or Sprint planning window triggers deterministic recalculation of downstream task forecasts, milestone forecasts, and overall launch forecast.
3. Launch Impact indicators show **No Impact**, **At Risk**, **Delayed**, or **Not Assessed** with traceable reasoning.
4. Approved baseline dates are immutable to ordinary recalculation; changing a baseline requires an explicit authorized rebaseline workflow with audit history.
5. The results are consistent across table, Gantt, milestone summary, and project header.
6. GMP/quality or regulatory release blockers are visible independently of pure schedule impact.
7. Unit, integration, and end-to-end tests cover branching dependencies, concurrency, missing data, and schedule recovery.

## 2. Before writing code: repository discovery

- Identify framework, TypeScript/JavaScript conventions, ORM, date/time library, database, existing task/milestone hierarchy, scheduling rules, and table components.
- Inspect how due dates, planned timelines, status, priorities, user assignment, linked dependencies, work calendars, audit logs, and permissions are persisted.
- Reuse existing abstractions. Create additive migrations; avoid destructively converting existing task trees.
- Identify how reactive updates and server-side recalculation currently happen; prefer a server-authoritative scheduler and a thin frontend.
- Report discovered files and a concise implementation plan before editing.

## 3. Terminology and hierarchy

- **Project**: overall initiative with a controlled baseline launch milestone.
- **Milestone**: zero-duration achievement/checkpoint, potentially dependent on deliverables from different Sprints.
- **Sprint**: fixed timebox (typically 1–4 weeks), with a Sprint Goal and Sprint Backlog. A milestone is **not necessarily contained within one Sprint**, and a Sprint may serve multiple milestones.
- **Task/Subtask**: schedulable work item, with owner, duration, progress/status, and predecessor relationships.

**Important:** A display tree may show `Project > Milestone > Sprint > Task` for convenience, but this is **not a mandatory data hierarchy**. Model milestones and Sprints as orthogonal associations. A task can be assigned to one active Sprint and contribute to one or more milestones. Avoid coupling the scheduling graph to the UI nesting.

When a Sprint finishes with unfinished work, **do not automatically extend its fixed date range**. Keep incomplete work in the Product Backlog / carry it forward according to an explicit planning action. Reassign the task to a later Sprint only with a user decision, while continuing to forecast its effect on milestones and launch.

## 4. Data model (adapt names to repository)

Use existing entities where possible. The following is a logical schema, not a mandatory migration script:

```ts
type ItemType = 'PROJECT' | 'MILESTONE' | 'SPRINT' | 'TASK' | 'SUBTASK';
type LaunchImpact = 'NO_IMPACT' | 'AT_RISK' | 'DELAYED' | 'NOT_ASSESSED';
type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'IN_REVIEW' | 'BLOCKED' | 'DONE';
type DependencyType = 'FS' | 'SS' | 'FF' | 'SF'; // initially support FS; handle others explicitly

type Project = {
  id: string;
  name: string;
  launchMilestoneId: string | null;
  baselineLaunchDate: string | null; // local DATE, e.g. 2026-11-30
  forecastLaunchDate: string | null;
  calendarId: string;
  riskBufferThresholdDays: number; // configurable, e.g. 2 working days
  launchImpact: LaunchImpact;
  riskReasons: string[];
  scheduleVersion: number;
};

type ScheduleItem = {
  id: string;
  projectId: string;
  type: 'MILESTONE' | 'TASK' | 'SUBTASK';
  title: string;
  status: ProgressStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ownerId: string | null;
  baselineStart: string | null;
  baselineFinish: string | null;
  forecastStart: string | null;
  forecastFinish: string | null;
  actualStart: string | null;
  actualFinish: string | null;
  remainingDurationWorkdays: number | null;
  manualConstraintDate?: string | null;
  calendarId?: string;
  totalFloatWorkdays: number | null;
  isCriticalPath: boolean | null;
  milestoneIds: string[];
  sprintId: string | null;
  qualityBlocker: boolean;
  qualityBlockerReason?: string;
  launchImpact: LaunchImpact;
  impactReasons: string[];
};

type Sprint = {
  id: string;
  projectId: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;  // fixed, except explicit sprint replanning
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED';
  milestoneIds: string[];
  taskIds: string[];
  projectedGoalCompletionDate: string | null;
  launchImpact: LaunchImpact;
};

type Dependency = {
  id: string;
  projectId: string;
  predecessorId: string;
  successorId: string;
  type: DependencyType;
  lagWorkdays: number; // may be negative only if explicitly supported/validated
};

type ScheduleAudit = {
  id: string;
  projectId: string;
  changedBy: string;
  changedAt: string;
  trigger: string;
  before: unknown;
  after: unknown;
  affectedItemIds: string[];
  scheduleVersion: number;
};
```

- Use a project work calendar (timezone, weekdays, holidays) consistently. Store date-only values as dates, not UTC timestamps subject to browser timezone conversion.
- Store **baseline**, **forecast**, and **actual** separately. Never rewrite actual dates during projections.
- Milestones have zero duration. Do not calculate sprint progress by treating milestones as tasks.
- Allow progress/status and priority to be manually curated; **do not infer launch impact just from status or priority**.
- Make launch-impact reasons available in tooltip/details, including predecessor path and number of days of forecast launch variance.

## 5. Scheduling engine: authoritative algorithm

Implement schedule computation in a pure, testable module/service such as `recalculateProjectSchedule(projectId, changedItemIds, options)`. Avoid burying scheduling logic in UI components or spreadsheet-like column formula strings.

### 5.1 Validate the dependency network

1. Fetch all project schedule items, links, milestone requirements, sprint assignments, calendar, and baseline launch date.
2. Reject cross-project dependencies unless explicitly supported.
3. Detect self-links, missing endpoints, duplicate/conflicting links, and **cycles**. Give actionable errors; do not partially persist invalid results.
4. Initially implement **finish-to-start (FS)** with configurable workday lag if that is all the app supports. If other dependency types exist, either implement their rules and tests or reject clearly; never silently treat them as FS.

### 5.2 Compute forecasts

- Topologically sort the task dependency DAG.
- For a task not started: `earliestForecastStart = max(planned/allowed start, successors of all predecessor finish constraints, manual not-before date)`; calculate its finish from remaining workday duration using the configured calendar.
- For an in-progress task: respect actual start and the user-supplied forecast/remaining duration; propagate delays, preserving actuals.
- For a done task: preserve actual finish, irrespective of future changes to baseline/forecast.
- Milestone forecast = latest required predecessor finish (plus any required lag), or its explicit forecast if independent. The launch milestone forecast is the authoritative `project.forecastLaunchDate`.
- Support parallel branches properly: a 5-day delay on a non-critical branch can be absorbed, while concurrent delays must **not** be added together twice.
- Compute backward-pass latest dates and total float (in workdays) for valid unconstrained DAGs when baseline target is known; otherwise use an explicit `NOT_ASSESSED` state instead of making up float.
- Respect immovable regulatory / QA approval gates as predecessor nodes, not merely textual notes.
- Determine affected Sprints by the tasks they contain and milestone paths they influence. Updating a Sprint end date is a **planning action**, not proof that each task's duration or completion changed. Trigger recalculation but only propagate changed underlying task forecasts or explicitly revised assignment/constraints.

### 5.3 Impact rules

Define `launchVarianceDays = workdayDifference(baselineLaunchDate, forecastLaunchDate)` (expose calendar-day equivalent in UI only if clearly labeled).

- **NOT_ASSESSED**: baseline launch, required dependencies, task duration/forecast, or release prerequisite data insufficient; or invalid schedule graph.
- **DELAYED**: forecast launch later than approved baseline (`launchVarianceDays > 0`).
- **AT_RISK**: forecast currently meets baseline but critical/near-critical path remaining float is at/below configurable threshold, or a critical unresolved blocker makes schedule feasibility uncertain.
- **NO_IMPACT**: sufficient validated inputs, forecast launch no later than baseline, and no risk trigger.

Add a **separate release/readiness gate** (e.g. `qualityReleaseStatus = CLEAR | BLOCKED | PENDING_ASSESSMENT`) for GMP deviations, failed acceptance criteria, and mandatory client/regulatory approvals. Never mark a product **Launch Ready** simply because launch impact is NO_IMPACT.

For *individual task* impact, do not label an off-path delay as delayed launch. Derive task severity from whether it reaches the launch node, float erosion, and blockers; keep a separate task lateness flag for tasks exceeding their own baseline dates.

For *Sprint* impact, aggregate underlying task-to-launch consequences and indicate incomplete Sprint Goal separately. Multiple milestones may be affected by one Sprint.

### 5.4 Suggested pseudocode

```ts
function onScheduleChange(change) {
  authorize(change.actor, change.projectId);
  validateChange(change);
  return transaction(async () => {
    saveChange(change);             // preserve approved baselines by default
    const graph = loadScheduleGraph(change.projectId);
    validateDAG(graph);
    const forecasts = forwardPass(graph, projectCalendar(graph));
    const floats = backwardPass(graph, forecasts, graph.launchMilestone);
    const impacts = classifyImpacts(graph, forecasts, floats, graph.qualityGates);
    persistComputedFields(forecasts, floats, impacts);
    appendAuditEvent(change, forecasts, impacts);
    incrementScheduleVersion(change.projectId);
    publishScheduleUpdated(change.projectId);
  });
}
```

**Important:** Build the real scheduling semantics from work calendars, lag rules, dependencies, and actual task states. The toy shortcut `launchDelay = max(0, sprintDelay - buffer)` is valid only for a single linear chain and must **not** be the production calculation.

## 6. Main Table UI/UX (no separate Kanban required)

Retain the existing monday.com-inspired **Main Table** layout, grouping, sorting, filtering, row editing, selection, navigation, and keyboard interactions.

### 6.1 Recommended columns

| Column | Editable? | Behavior |
|---|---|---|
| Item / Task | Yes | Expandable row, hierarchy; icons for Project, Milestone, Sprint, Task |
| Type | Usually read-only | Badge indicating row kind |
| Owner | Yes | Assignment and responsible stakeholder |
| Sprint | Yes, tasks only | Sprint membership; milestone may span multiple Sprints |
| Sprint Goal | Yes, Sprint only | Visible on Sprint parent row |
| Baseline Finish | Controlled | Original approved date, not overwritten |
| Forecast Finish | Calculated / authorized override | Derived from network and permitted user input |
| Status | Yes | To Do, In Progress, Review, Blocked, Done |
| Priority | Yes | Independent urgency indicator |
| Progress | Calculated where appropriate | Task completion / Sprint backlog / milestone completion, labeled clearly |
| Depends On | Yes | Link to predecessor tasks, including gating QA approvals |
| Float (working days) | Calculated | Highlight zero/negative or low float |
| Launch Impact | Read-only | NO_IMPACT / AT_RISK / DELAYED / NOT_ASSESSED |
| Impact (working days) | Calculated | Forecast launch variance attributable or project variance (clearly labeled) |
| Quality Gate | Separate | Clear, Blocked, Pending Assessment |

### 6.2 Row presentation

- Project row: baseline launch date, forecast launch date, variance, risk label, overall progress.
- Milestone row: milestone target, forecast date, dependent deliverables, status, launch impact.
- Sprint row: fixed start/end, Sprint Goal, incomplete task count, progress, forecast goal achievement, impact.
- Task rows: planned/forecast/actual dates, dependencies, status, owner, float, individual risk.
- Nest tasks visually under a Sprint when selected, but keep data relationships flexible.
- Use launch impact colors: green = No Impact, amber = At Risk, red = Delayed, grey = Not Assessed. Supplement with text/icons for accessibility.
- Show a **why this label?** popover: `Forecast launch 03 Dec vs baseline 30 Nov (+3 calendar days); delayed dependency: Analytical Report → QA Review → Approval`.
- Add a `Preview impact` experience before saving major date changes; on save run authoritative server recalculation.
- When a Sprint ends with unfinished tasks, show **Carry over / Return to Backlog** action; never move work silently.
- Keep existing Kanban and Gantt views intact, but bind them to the same persisted forecast fields.

## 7. Trigger matrix

| Trigger | Expected action |
|---|---|
| Task forecast finish or remaining duration updated | Recalculate downstream task/milestone/launch forecasts |
| Predecessor dependency added/removed/edited | Validate DAG and recompute affected network |
| Task moved to Done with actual finish | Lock actual finish and recompute |
| Task becomes Blocked | Recalculate from documented forecast; flag uncertainty separately if no estimate |
| Sprint date edited | Update fixed timebox only through authorized replanning; assess Sprint Goal and assigned-task forecasts, **do not assume all tasks shift** |
| Task carried to a future Sprint | Update task's planning constraints as explicitly approved; recompute |
| Milestone/launch baseline change | Require approved rebaseline action, permission, reason, audit record |
| Approval / regulatory / GMP gate becomes blocked | Update release readiness and schedule risk; preserve independent quality status |
| Recovery or early completion | Recompute; downgrade impact only when data supports it |

Prevent infinite event loops: computed-field persistence should not re-fire the same user-edit trigger. Use project-level optimistic concurrency (`scheduleVersion`) or equivalent locking; one authoritative recalculation per committed change.

## 8. Worked test scenarios (fixtures, not production dates)

Baseline launch: **2026-11-30**. Simplified critical chain `Analytical Report → Results Evaluation → PV Report → QA Approval → Launch`.

1. **No delay:** all dependent forecasts within baseline → NO_IMPACT, +0 days.
2. **Off-critical delay:** a task slips five days but stays within calculated float → project remains NO_IMPACT; task may show LATE.
3. **Critical delay with buffer:** a critical predecessor slips 3 days with 5 days of actual schedule float → on-time launch; residual float 2 days; AT_RISK if threshold is 2.
4. **Critical delay exceeds buffer:** same predecessor slips 8 days with 5 days float → launch delayed 3 days; DELAYED.
5. **Parallel dependencies:** two predecessor branches finish on the same day after each slipping 4 days → successor waits for latest branch; do not sum to 8 days.
6. **Recovery:** reducing remaining duration restores date inside baseline → relabel after recomputation.
7. **Missing estimates:** insufficient data to forecast required release gate → NOT_ASSESSED, do not imply on track.
8. **Cycle:** A depends on B and B depends on A → reject update with user-visible error; nothing partly saved.
9. **Sprint timebox change only:** Sprint 2 date range changes, but no task forecasts/constraints change → no fabricated launch delay.
10. **Sprint unfinished:** Sprint ends while assay testing incomplete → task stays incomplete; prompt for backlog/replanning; calculate effect of its independent forecast.
11. **Quality blocker:** unresolved critical deviation blocks launch readiness even if forecast meets baseline.
12. **Rebaseline permission:** normal editor cannot alter approved baseline; authorized action with reason is logged.
13. **Timezone:** same date-only project schedule in Manila and another user timezone shows identical calendar dates.
14. **Holiday/weekend:** workday additions skip non-working calendar days.
15. **Multi-user edits:** concurrent dependency/date updates cannot leave mixed-version forecasts.

## 9. Testing and observability

- Unit tests for dependency graph validation, topological sort, FS + lag, forward/backward pass, float, milestone rollups, classification, calendars, and Sprint carryover semantics.
- Integration tests for data migration, audit events, authorization, optimistic locking, and event-driven recomputation.
- UI end-to-end tests: change a task forecast in Main Table; verify affected linked rows, forecast launch, label, tooltip, and Gantt update after persistence.
- Performance: validate a realistically large project graph; avoid recalculating unrelated projects, debounce client-side previews, use deterministic server updates.
- Log recomputation origin, affected IDs, schedule version, before/after launch forecasts, quality-state changes, and validation errors; avoid leaking protected product/customer data to telemetry.
- Accessibility: impact statuses cannot be communicated by color alone.

## 10. Rollout checklist and deliverables

- [ ] Repository architecture discovery completed
- [ ] Additive database migration and backfill plan reviewed
- [ ] Pure scheduling service implemented and covered by tests
- [ ] Main Table hierarchy and columns implemented
- [ ] Change-triggered recalculation and audit trail working
- [ ] Launch Impact reasons inspectable by end users
- [ ] Separate GMP quality / regulatory release gate implemented
- [ ] Baseline approval and rebaseline guardrails implemented
- [ ] Existing Kanban/Gantt compatibility verified
- [ ] Automated tests pass; lint/typecheck/build pass
- [ ] Demo scenario provided with screenshots or reproducible steps
- [ ] README / user instructions explain how changing forecasts changes Launch Impact

## 11. Cursor execution instructions

1. Inspect the repository and summarize the current data model and UI architecture.
2. Propose the smallest backward-compatible implementation plan and identify migrations.
3. Implement one cohesive vertical slice: task dependency + task forecast edit → recalculation → Main Table Launch Impact update.
4. Expand to milestones, Sprints, project-level forecast, float, blockers, and approvals.
5. Add tests and run them. Report exact commands, results, affected files, and any unsupported scheduling modes.
6. Do not claim completion if dependencies, holidays, baselines, or important edge cases are unimplemented; disclose limitations.

### Required UX copy for tooltips

- **No Impact:** "The current forecast meets the approved launch target with no identified schedule risk."
- **At Risk:** "The launch target remains achievable, but schedule float is low or a critical dependency requires attention."
- **Delayed:** "The forecast launch date is later than the approved target. Review the critical path and recovery options."
- **Not Assessed:** "Required schedule or dependency information is missing. Launch impact cannot yet be calculated reliably."

### Non-goals for this phase

- Automatically modifying GMP acceptance criteria or quality decisions.
- Automatically declaring a batch releasable.
- Silently editing approved baselines, Sprint boundaries, or completed-task actual dates.
- Replacing existing Kanban or Gantt functionality.
- Using the `max(0, sprintDelay - buffer)` demonstration formula as a substitute for a full dependency scheduler.
