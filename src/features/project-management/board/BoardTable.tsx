import { useEffect, useRef, useState } from "react";
import { Checkbox, Dropdown, Tooltip } from "antd";
import type { Profile } from "@/types";
import { LucideIcon } from "@/components/common/lucide-icon";
import { IMPACT_LABEL, priorityFromLaunch, priorityReason, type LaunchImpact, type LaunchReport } from "@/features/project-management/board/launchSchedule";
import { formatAppDate } from "@/lib/date";
import { labelColor, labelName, semanticStatus, type BoardLabel } from "@/features/project-management/board/boardLabels";
import { LabelPicker } from "@/features/project-management/board/LabelPicker";
import {
  PRIORITY_COLOR,
  STATUS_COLOR,
  addDays,
  daySpan,
  formatMonthDayYear,
  manilaToday,
  parseMonthDayYear,
  subtasksOf,
  type PmBoardTask,
  type PmGroup,
} from "@/features/project-management/board/boardRules";
import { OwnerAvatar, PriorityFill, StatusFill, isBoardTypingTarget, personName, relativeUpdated, timelineLabel } from "@/features/project-management/board/boardUi";
import { DependencyCell } from "@/features/project-management/board/DependencyCell";
import { ColumnCell } from "@/features/project-management/board/ColumnCell";
import type { BoardColumn } from "@/features/project-management/board/columnCatalog";
import type { PmDependency, PmProject } from "@/features/project-management/board/boardRules";

export interface BoardSection {
  id: string;
  label: string;
  color: string;
  tasks: PmBoardTask[];
}

export function BoardTable({
  sections,
  tasks,
  groups,
  profiles,
  hidden,
  collapsed,
  selected,
  canEdit,
  onToggleCollapse,
  onToggleSelected,
  onOpen,
  onPatch,
  onAddTask,
  onAddSubtask,
  onRenameGroup,
  onDeleteGroup,
  onMoveGroup,
  dependencies,
  scheduleStrict,
  onOpenUpdates,
  onSaveDependencies,
  columns,
  cells,
  labels,
  onSaveLabels,
  projects,
  userId,
  userEmail,
  unseenTaskIds,
  launch,
  previewImpact,
  onSaveCell,
  onColumnAction,
  scrollKey,
  scrollTick,
}: {
  sections: BoardSection[];
  tasks: PmBoardTask[];
  groups: PmGroup[];
  profiles: Profile[];
  hidden: Set<string>;
  collapsed: Record<string, boolean>;
  selected: Set<string>;
  canEdit: boolean;
  onToggleCollapse: (id: string) => void;
  onToggleSelected: (id: string) => void;
  onOpen: (task: PmBoardTask) => void;
  onPatch: (task: PmBoardTask, patch: Partial<PmBoardTask>) => void;
  onAddTask: (sectionId: string, title: string) => void;
  onAddSubtask: (task: PmBoardTask, title: string) => void;
  onRenameGroup: (group: PmGroup, name: string) => void;
  onDeleteGroup: (group: PmGroup) => void;
  onMoveGroup: (group: PmGroup, direction: -1 | 1) => void;
  dependencies: PmDependency[];
  scheduleStrict: boolean;
  onOpenUpdates: (task: PmBoardTask) => void;
  onSaveDependencies: (task: PmBoardTask, links: { predecessorId: string; relation: PmDependency["relation"]; lagDays: number }[]) => Promise<void>;
  columns: BoardColumn[];
  cells: Record<string, Record<string, unknown>>;
  labels: BoardLabel[];
  onSaveLabels: (kind: BoardLabel["kind"], labels: BoardLabel[]) => Promise<void>;
  projects: PmProject[];
  userId: string;
  userEmail: string;
  unseenTaskIds: Set<string>;
  launch: LaunchReport | null;
  previewImpact?: (task: PmBoardTask, start: string, due: string) => string;
  onSaveCell: (task: PmBoardTask, column: BoardColumn, value: unknown) => void;
  onColumnAction: (column: BoardColumn, action: string) => void;
  scrollKey: string | null;
  scrollTick: number;
}) {
  const groupsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!scrollKey) return;
    document.querySelector(`[data-board-col="${CSS.escape(scrollKey)}"]`)?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [scrollKey, scrollTick]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isBoardTypingTarget(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;
      const root = groupsRef.current;
      if (!root) return;
      const horizontal = event.key === "ArrowLeft" || event.key === "ArrowRight";
      const vertical = event.key === "ArrowUp" || event.key === "ArrowDown";
      if (!horizontal && !vertical) return;
      const distance = event.shiftKey ? 480 : 220;
      if (horizontal) {
        const delta = event.key === "ArrowLeft" ? -distance : distance;
        root.querySelectorAll(".pmb-table-scroll").forEach((node) => node.scrollBy({ left: delta }));
      } else {
        root.scrollBy({ top: event.key === "ArrowUp" ? -distance : distance });
      }
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="pmb-groups" ref={groupsRef} aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown">
      {sections.map((section) => {
        const group = groups.find((item) => item.id === section.id);
        const isCollapsed = Boolean(collapsed[section.id]);
        return (
          <section key={section.id} className="pm-group" style={{ ["--pm-group-accent" as string]: section.color }}>
            <div className="pm-group-head">
              <button type="button" className="pm-group-toggle" aria-expanded={!isCollapsed} onClick={() => onToggleCollapse(section.id)}>
                <span className={`pm-group-chevron${isCollapsed ? "" : " is-open"}`} aria-hidden="true"><LucideIcon name="chevron-right" size={14} /></span>
                <span className="pm-group-title">{section.label}</span>
                <span className="pm-status-count">{section.tasks.length}</span>
              </button>
              {group && canEdit ? (
                <GroupMenu
                  group={group}
                  onRename={onRenameGroup}
                  onDelete={onDeleteGroup}
                  onMove={onMoveGroup}
                />
              ) : null}
            </div>
            {isCollapsed ? null : (
              <>
                <div className="pmb-table-scroll">
                  <table className="pmb-table">
                    <thead>
                      <tr>
                        <th className="pmb-check" />
                        <th className="pmb-col-task">Task</th>
                        {hidden.has("owner") ? null : <th className="pmb-col-owner" data-board-col="owner">Owner</th>}
                        {hidden.has("status") ? null : <th className="pmb-col-status" data-board-col="status">Status</th>}
                        {hidden.has("timeline") ? null : <th className="pmb-col-timeline" data-board-col="timeline">Timeline</th>}
                        {hidden.has("priority") ? null : (
                          <th className="pmb-col-priority" data-board-col="priority">
                            <Tooltip title="Priority follows Launch Impact and the quality gate. Delayed or Blocked is High. At Risk or Not Assessed with a clear gate is Medium. No Impact with a clear gate is Low.">
                              <span>Priority</span>
                            </Tooltip>
                          </th>
                        )}
                        {hidden.has("depends") ? null : <th className="pmb-col-depends" data-board-col="depends">Depends on</th>}
                        {hidden.has("updated") ? null : <th className="pmb-col-updated" data-board-col="updated">Last Updated</th>}
                        {hidden.has("float") ? null : (
                          <th className="pmb-col-float" data-board-col="float">
                            <Tooltip title="Float is the working days between this task's finish and the target launch. A positive number finishes before the target. A negative number finishes after it. It stays blank until the task has a timeline and the project has a target launch date.">
                              <span>Float</span>
                            </Tooltip>
                          </th>
                        )}
                        {hidden.has("impact") ? null : <th className="pmb-col-impact" data-board-col="impact">Launch Impact</th>}
                        {hidden.has("quality") ? null : (
                          <th className="pmb-col-quality" data-board-col="quality">
                            <Tooltip title="Quality gate is per task and separate from the schedule. Clear means this task does not hold release. Blocked means this task holds release and keeps launch impact At Risk.">
                              <span>Quality gate</span>
                            </Tooltip>
                          </th>
                        )}
                        {columns.map((column, index) => (
                          <th key={column.id} className="pmb-col-custom" data-board-col={column.id}>
                            <Dropdown
                              trigger={["click"]}
                              menu={{
                                items: [
                                  { key: "rename", label: "Rename", disabled: !canEdit },
                                  { key: "settings", label: "Edit settings", disabled: !canEdit },
                                  { key: "asc", label: "Sort ascending" },
                                  { key: "desc", label: "Sort descending" },
                                  { key: "hide", label: "Hide", disabled: !canEdit },
                                  { key: "left", label: "Move left", disabled: !canEdit || index === 0 },
                                  { key: "right", label: "Move right", disabled: !canEdit || index === columns.length - 1 },
                                  { key: "delete", label: "Delete column", disabled: !canEdit, danger: true },
                                ],
                                onClick: ({ key }) => onColumnAction(column, key),
                              }}
                            >
                              <button type="button" className="pmb-col-menu" aria-label={`${column.title} column`}>{column.title}</button>
                            </Dropdown>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.tasks.map((task) => (
                        <TaskRows
                          key={task.id}
                          task={task}
                          tasks={tasks}
                          profiles={profiles}
                          hidden={hidden}
                          selected={selected}
                          canEdit={canEdit}
                          depth={0}
                          onToggleSelected={onToggleSelected}
                          onOpen={onOpen}
                          onPatch={onPatch}
                          onAddSubtask={onAddSubtask}
                          dependencies={dependencies}
                          groups={groups}
                          scheduleStrict={scheduleStrict}
                          onOpenUpdates={onOpenUpdates}
                          onSaveDependencies={onSaveDependencies}
                          columns={columns}
                          cells={cells}
                          labels={labels}
                          onSaveLabels={onSaveLabels}
                          projects={projects}
                          userId={userId}
                          userEmail={userEmail}
                          unseenTaskIds={unseenTaskIds}
                          launch={launch}
                          previewImpact={previewImpact}
                          onSaveCell={onSaveCell}
                        />
                      ))}
                    </tbody>
                    <tfoot>
                      <SummaryRow tasks={section.tasks} hidden={hidden} extra={columns.length} labels={labels} />
                    </tfoot>
                  </table>
                </div>
                {canEdit ? <AddRow placeholder="Add task" onSubmit={(title) => onAddTask(section.id, title)} /> : null}
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}

function GroupMenu({
  group,
  onRename,
  onDelete,
  onMove,
}: {
  group: PmGroup;
  onRename: (group: PmGroup, name: string) => void;
  onDelete: (group: PmGroup) => void;
  onMove: (group: PmGroup, direction: -1 | 1) => void;
}) {
  return (
    <Dropdown
      trigger={["click"]}
      menu={{
        items: [
          { key: "rename", label: "Rename" },
          { key: "up", label: "Move up" },
          { key: "down", label: "Move down" },
          { key: "delete", label: "Delete empty group" },
        ],
        onClick: ({ key }) => {
          if (key === "rename") {
            const name = window.prompt("Group name", group.name);
            if (name?.trim()) onRename(group, name.trim());
          }
          if (key === "up") onMove(group, -1);
          if (key === "down") onMove(group, 1);
          if (key === "delete") onDelete(group);
        },
      }}
    >
      <button type="button" className="pmb-icon-btn" aria-label={`Group actions for ${group.name}`}>···</button>
    </Dropdown>
  );
}

function TaskRows(props: {
  task: PmBoardTask;
  tasks: PmBoardTask[];
  profiles: Profile[];
  hidden: Set<string>;
  selected: Set<string>;
  canEdit: boolean;
  depth: number;
  onToggleSelected: (id: string) => void;
  onOpen: (task: PmBoardTask) => void;
  onPatch: (task: PmBoardTask, patch: Partial<PmBoardTask>) => void;
  onAddSubtask: (task: PmBoardTask, title: string) => void;
  dependencies: PmDependency[];
  groups: PmGroup[];
  scheduleStrict: boolean;
  onOpenUpdates: (task: PmBoardTask) => void;
  onSaveDependencies: (task: PmBoardTask, links: { predecessorId: string; relation: PmDependency["relation"]; lagDays: number }[]) => Promise<void>;
  columns: BoardColumn[];
  cells: Record<string, Record<string, unknown>>;
  labels: BoardLabel[];
  onSaveLabels: (kind: BoardLabel["kind"], labels: BoardLabel[]) => Promise<void>;
  projects: PmProject[];
  userId: string;
  userEmail: string;
  unseenTaskIds: Set<string>;
  launch: LaunchReport | null;
  previewImpact?: (task: PmBoardTask, start: string, due: string) => string;
  onSaveCell: (task: PmBoardTask, column: BoardColumn, value: unknown) => void;
}) {
  const { task, tasks, depth } = props;
  const unseen = props.unseenTaskIds.has(task.id);
  const children = depth === 0 ? subtasksOf(tasks, task.id) : [];
  const [open, setOpen] = useState(children.length > 0);
  const colSpan = 2 + props.columns.length + ["owner", "status", "timeline", "priority", "depends", "updated", "float", "impact", "quality"].filter((key) => !props.hidden.has(key)).length;
  const groupIndex = props.tasks.filter((item) => item.groupId === task.groupId && !item.parentTaskId).findIndex((item) => item.id === (task.parentTaskId || task.id)) + 1;
  return (
    <>
      <tr className={`${props.selected.has(task.id) ? "is-selected" : ""}${unseen ? " is-unseen" : ""}${depth > 0 ? " is-subtask" : ""}`.trim()}>
        <td className="pmb-check">
          <Checkbox
            checked={props.selected.has(task.id)}
            aria-label={`Select ${task.title}`}
            onChange={() => props.onToggleSelected(task.id)}
          />
        </td>
        <td className="pmb-col-task">
          <span className="pmb-task-name" style={{ paddingLeft: depth > 0 ? 32 : 0 }}>
            {depth === 0 ? (
              <button type="button" className="pm-row-chevron" aria-expanded={open} aria-label={open ? "Hide subtasks" : "Show subtasks"} onClick={() => setOpen((value) => !value)}>
                <LucideIcon name="chevron-right" size={14} className={open ? "is-open" : ""} />
              </button>
            ) : null}
            <button type="button" className="pm-board-name" onClick={() => props.onOpen(task)}>{task.title}</button>
            <button type="button" className="pmb-row-updates" aria-label={`Updates for ${task.title}`} onClick={() => props.onOpenUpdates(task)}>
              <LucideIcon name="message-circle" size={14} />
            </button>
            {children.length > 0 ? <span className="pm-subitem-count">{children.length}</span> : null}
          </span>
        </td>
        {props.hidden.has("owner") ? null : (
          <td className="pmb-center pmb-col-owner">
            <OwnerPicker task={task} profiles={props.profiles} canEdit={props.canEdit} onPatch={props.onPatch} />
          </td>
        )}
        {props.hidden.has("status") ? null : (
          <td className="pmb-fill-cell pmb-col-status">
            <LabelPicker
              kind="status"
              value={task.status}
              labels={props.labels}
              tasks={props.tasks}
              canEdit={props.canEdit}
              onAssign={(status) => props.onPatch(task, { status })}
              onSave={(next) => props.onSaveLabels("status", next)}
            >
              <StatusFill name={labelName(props.labels, "status", task.status)} color={labelColor(props.labels, "status", task.status, toneColor("status", task.status))} />
            </LabelPicker>
          </td>
        )}
        {props.hidden.has("timeline") ? null : (
          <td className="pmb-col-timeline">
            <TimelineEditor task={task} labels={props.labels} canEdit={props.canEdit} onPatch={props.onPatch} preview={props.previewImpact ? (start, due) => props.previewImpact?.(task, start, due) ?? "" : undefined} />
          </td>
        )}
        {props.hidden.has("priority") ? null : (
          <td className="pmb-fill-cell pmb-col-priority">
            <AutoPriority task={task} labels={props.labels} launch={props.launch} />
          </td>
        )}
        {props.hidden.has("depends") ? null : (
          <td className="pmb-depends pmb-col-depends">
            <DependencyCell
              task={task}
              tasks={tasks}
              groups={props.groups}
              links={props.dependencies}
              canEdit={props.canEdit}
              strictLag={props.scheduleStrict}
              onOpen={props.onOpenUpdates}
              onSave={props.onSaveDependencies}
            />
          </td>
        )}
        {props.hidden.has("updated") ? null : (
          <td className="pmb-updated pmb-col-updated">
            <button type="button" className={`pmb-updated-btn${unseen ? " is-unseen" : ""}`} onClick={() => props.onOpenUpdates(task)}>
              {unseen ? <span className="pmb-unseen-dot" aria-hidden="true" /> : null}
              <OwnerAvatar name={personName(props.profiles, task.updatedBy || task.ownerId)} />
              <span>{relativeUpdated(task.updatedAt)}</span>
            </button>
          </td>
        )}
        {props.hidden.has("float") ? null : (
          <td className="pmb-col-float">
            <FloatValue days={props.launch?.tasks[task.id]?.floatWorkdays ?? null} />
          </td>
        )}
        {props.hidden.has("impact") ? null : (
          <td className="pmb-col-impact">
            <ImpactPill taskTitle={task.title} impact={props.launch?.tasks[task.id]} />
            {props.launch?.tasks[task.id]?.late ? <span className="pmb-late">Late</span> : null}
          </td>
        )}
        {props.hidden.has("quality") ? null : (
          <td className="pmb-col-quality">
            <Tooltip title={task.qualityBlocker
              ? "Blocked: this task holds the quality release. Launch impact stays At Risk until you set it back to Clear, even when the timeline meets the target launch."
              : "Clear: this task does not hold the quality release. The timeline can still be at risk or delayed against the target launch."}>
              <span className="pmb-quality-tip">
                <button
                  type="button"
                  className={`pmb-quality-flag${task.qualityBlocker ? " is-blocked" : ""}`}
                  disabled={!props.canEdit}
                  onClick={() => props.onPatch(task, { qualityBlocker: !task.qualityBlocker })}
                >
                  {task.qualityBlocker ? "Blocked" : "Clear"}
                </button>
              </span>
            </Tooltip>
          </td>
        )}
        {props.columns.map((column) => (
          <td key={column.id} className="pmb-custom-cell pmb-col-custom">
            <ColumnCell
              column={column}
              columns={props.columns}
              task={task}
              tasks={tasks}
              profiles={props.profiles}
              projects={props.projects}
              value={props.cells[task.id]?.[column.id]}
              cells={props.cells}
              canEdit={props.canEdit}
              userId={props.userId}
              userEmail={props.userEmail}
              groupIndex={groupIndex}
              onSave={(value) => props.onSaveCell(task, column, value)}
              onOpen={props.onOpen}
            />
          </td>
        ))}
      </tr>
      {open && depth === 0 ? children.map((child) => (
        <TaskRows key={child.id} {...props} task={child} depth={1} />
      )) : null}
      {open && depth === 0 && props.canEdit ? (
        <tr>
          <td colSpan={colSpan}>
            <AddRow placeholder="Add subtask" onSubmit={(title) => props.onAddSubtask(task, title)} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function taskImpact(launch: LaunchReport | null, taskId: string): LaunchImpact | null {
  return launch?.tasks[taskId]?.impact ?? null;
}

function AutoPriority({ task, labels, launch }: { task: PmBoardTask; labels: BoardLabel[]; launch: LaunchReport | null }) {
  const impact = taskImpact(launch, task.id);
  const priority = priorityFromLaunch(impact, task.qualityBlocker);
  return (
    <Tooltip title={priorityReason(impact, task.qualityBlocker)}>
      <span className="pmb-priority-auto">
        <PriorityFill name={labelName(labels, "priority", priority)} color={labelColor(labels, "priority", priority, toneColor("priority", priority))} />
      </span>
    </Tooltip>
  );
}

function FloatValue({ days }: { days: number | null }) {
  const text = days == null ? "—" : `${days}d`;
  const title = days == null
    ? "Float appears after this task has a timeline and the project has a target launch date."
    : days === 0
      ? "This task finishes on the target launch date."
      : days > 0
        ? `${days} working days before the target launch.`
        : `${Math.abs(days)} working days after the target launch.`;
  return <Tooltip title={title}><span>{text}</span></Tooltip>;
}

function ImpactPill({ taskTitle, impact }: { taskTitle: string; impact?: { impact: LaunchImpact; reasons: string[] } }) {
  const tone = impact?.impact ?? "NOT_ASSESSED";
  const title = impact?.reasons.join(" ") || `${taskTitle} has no launch impact yet. Set the project target launch and this task's timeline.`;
  return <span className={`pmb-impact is-${tone}`} title={title}>{IMPACT_LABEL[tone]}</span>;
}

function toneColor(kind: "status" | "priority", id: string): string {
  if (kind === "status" && (id === "Done" || id === "Working on it" || id === "Stuck" || id === "Not Started")) return STATUS_COLOR[id];
  if (kind === "priority" && (id === "Low" || id === "Medium" || id === "High")) return PRIORITY_COLOR[id];
  return "#c4c4c4";
}

function OwnerPicker({
  task,
  profiles,
  canEdit,
  onPatch,
}: {
  task: PmBoardTask;
  profiles: Profile[];
  canEdit: boolean;
  onPatch: (task: PmBoardTask, patch: Partial<PmBoardTask>) => void;
}) {
  const name = personName(profiles, task.ownerId);
  const mark = <OwnerAvatar name={name} />;
  if (!canEdit) return mark;
  return (
    <Dropdown
      trigger={["click"]}
      menu={{
        items: [
          { key: "", label: "Unassigned" },
          ...profiles.map((profile) => ({ key: profile.id, label: personName(profiles, profile.id) })),
        ],
        onClick: ({ key }) => onPatch(task, { ownerId: String(key) }),
      }}
    >
      <button type="button" className="pm-avatar-btn" aria-label={`Owner ${name}`}>{mark}</button>
    </Dropdown>
  );
}

function timelineTone(task: PmBoardTask, labels: BoardLabel[]): "empty" | "done" | "overdue" | "set" {
  if (!task.startDate && !task.dueDate) return "empty";
  if (semanticStatus(labels, task.status) === "Done") return "done";
  const due = task.dueDate || task.startDate;
  if (due && due < manilaToday()) return "overdue";
  return "set";
}

function TimelineEditor({
  task,
  labels,
  canEdit,
  onPatch,
  preview,
}: {
  task: PmBoardTask;
  labels: BoardLabel[];
  canEdit: boolean;
  onPatch: (task: PmBoardTask, patch: Partial<PmBoardTask>) => void;
  preview?: (start: string, due: string) => string;
}) {
  const tone = timelineTone(task, labels);
  const text = tone === "empty" ? "-" : timelineLabel(task);
  const pill = (
    <span className={`pm-timeline-pill${tone === "empty" ? " is-empty" : ""}${tone === "done" ? " pm-due-done" : ""}${tone === "overdue" ? " pm-due-overdue" : ""}${tone === "set" ? " is-set" : ""}`} title={text}>
      {tone === "done" ? <LucideIcon name="check-circle" size={12} /> : null}
      {tone === "overdue" ? <LucideIcon name="alert-triangle" size={12} /> : null}
      {text}
    </span>
  );
  if (!canEdit) return pill;
  return (
    <Dropdown
      trigger={["click"]}
      dropdownRender={() => <DateRangePanel task={task} onPatch={onPatch} preview={preview} />}
    >
      <button type="button" className="pmb-pill-btn" aria-label={`Timeline ${text}`}>{pill}</button>
    </Dropdown>
  );
}

function DateRangePanel({
  task,
  onPatch,
  preview,
}: {
  task: PmBoardTask;
  onPatch: (task: PmBoardTask, patch: Partial<PmBoardTask>) => void;
  preview?: (start: string, due: string) => string;
}) {
  const [startText, setStartText] = useState(formatMonthDayYear(task.startDate));
  const [endText, setEndText] = useState(formatMonthDayYear(task.dueDate));
  const [error, setError] = useState("");
  const [cursor, setCursor] = useState(task.startDate || task.dueDate || manilaToday());
  const [active, setActive] = useState<"start" | "end">("start");
  const startIso = parseMonthDayYear(startText);
  const endIso = parseMonthDayYear(endText);
  const year = Number(cursor.slice(0, 4));
  const month = Number(cursor.slice(5, 7));
  const days = startIso && endIso && endIso >= startIso ? daySpan(startIso, endIso) : null;

  useEffect(() => {
    setStartText(formatMonthDayYear(task.startDate));
    setEndText(formatMonthDayYear(task.dueDate));
  }, [task.startDate, task.dueDate]);

  const commit = (start: string, end: string) => {
    if (end < start) {
      setError("End is before start.");
      return;
    }
    setError("");
    onPatch(task, { startDate: start, dueDate: end });
  };

  const onDay = (iso: string) => {
    if (!startIso || (startIso && endIso) || iso < startIso) {
      setStartText(formatMonthDayYear(iso));
      setEndText("");
      setActive("end");
      setError("");
      return;
    }
    setEndText(formatMonthDayYear(iso));
    commit(startIso, iso);
  };

  const onBlur = () => {
    if (!startText.trim() && !endText.trim()) {
      setError("");
      onPatch(task, { startDate: "", dueDate: "" });
      return;
    }
    if ((startText.trim() && !startIso) || (endText.trim() && !endIso)) {
      setError("Use MM/DD/YYYY.");
      return;
    }
    if (startIso && endIso) commit(startIso, endIso);
  };

  const cells = monthCells(year, month);
  return (
    <div className="pmb-date-pop pmb-range" onClick={(event) => event.stopPropagation()}>
      <div className="pmb-range-head">
        <strong>Set dates</strong>
        <span>{days === null ? "Select dates" : `${days} day${days === 1 ? "" : "s"} selected`}</span>
      </div>
      <div className="pmb-range-fields">
        <input
          aria-label={`Start date for ${task.title}`}
          placeholder="MM/DD/YYYY"
          value={startText}
          className={active === "start" ? "is-active" : ""}
          onFocus={() => setActive("start")}
          onChange={(event) => setStartText(event.target.value)}
          onBlur={onBlur}
        />
        <input
          aria-label={`End date for ${task.title}`}
          placeholder="MM/DD/YYYY"
          value={endText}
          className={active === "end" ? "is-active" : ""}
          onFocus={() => setActive("end")}
          onChange={(event) => setEndText(event.target.value)}
          onBlur={onBlur}
        />
      </div>
      {error ? <p className="pmb-range-error">{error}</p> : null}
      {startIso && endIso && endIso >= startIso && preview ? <p className="pmb-range-note">{preview(startIso, endIso)}</p> : null}
      <div className="pmb-range-nav">
        <button type="button" aria-label="Previous month" onClick={() => setCursor(shiftMonth(cursor, -1))}>‹</button>
        <span>{monthName(month)} {year}</span>
        <button type="button" aria-label="Next month" onClick={() => setCursor(shiftMonth(cursor, 1))}>›</button>
      </div>
      <div className="pmb-range-week">{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="pmb-range-grid">
        {cells.map((cell) => {
          const inRange = Boolean(startIso && endIso && cell.iso >= startIso && cell.iso <= endIso);
          return (
            <button
              key={cell.iso}
              type="button"
              className={`${cell.inMonth ? "" : "is-out"}${inRange ? " is-range" : ""}${cell.iso === startIso || cell.iso === endIso ? " is-end" : ""}${cell.iso === manilaToday() ? " is-today" : ""}`}
              onClick={() => onDay(cell.iso)}
            >
              {Number(cell.iso.slice(8, 10))}
            </button>
          );
        })}
      </div>
      <div className="pmb-range-actions">
        <button type="button" onClick={() => { setStartText(""); setEndText(""); setError(""); onPatch(task, { startDate: "", dueDate: "" }); }}>Clear dates</button>
        <button
          type="button"
          onClick={() => {
            const iso = manilaToday();
            const start = active === "end" && startIso ? startIso : iso;
            const end = active === "start" && endIso ? endIso : iso;
            if (end < start) {
              setError("End is before start.");
              return;
            }
            setStartText(formatMonthDayYear(start));
            setEndText(formatMonthDayYear(end));
            commit(start, end);
          }}
        >
          Today
        </button>
      </div>
    </div>
  );
}

function shiftMonth(iso: string, delta: number): string {
  const [year, month] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1 + delta, 1));
  return date.toISOString().slice(0, 10);
}

function monthName(month: number): string {
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1] ?? "";
}

function monthCells(year: number, month: number): { iso: string; inMonth: boolean }[] {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const startPad = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const cells: { iso: string; inMonth: boolean }[] = [];
  for (let index = startPad; index > 0; index -= 1) cells.push({ iso: addDays(first, -index), inMonth: false });
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let day = 0; day < count; day += 1) cells.push({ iso: addDays(first, day), inMonth: true });
  const last = cells[cells.length - 1]?.iso ?? first;
  let extra = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ iso: addDays(last, extra), inMonth: false });
    extra += 1;
  }
  return cells;
}

function SummaryRow({ tasks, hidden, extra, labels }: { tasks: PmBoardTask[]; hidden: Set<string>; extra: number; labels: BoardLabel[] }) {
  const dates = tasks.flatMap((task) => [task.startDate, task.dueDate].filter(Boolean)).sort();
  const range = dates.length > 0 ? `${formatAppDate(dates[0])} – ${formatAppDate(dates[dates.length - 1])}` : "—";
  return (
    <tr className="pmb-summary-row">
      <td /><td />
      {hidden.has("owner") ? null : <td />}
      {hidden.has("status") ? null : <td><Mix tasks={tasks} field="status" labels={labels} /></td>}
      {hidden.has("timeline") ? null : <td><span className={`pm-summary-range${dates.length === 0 ? " is-empty" : ""}`} title={range}>{range}</span></td>}
      {hidden.has("priority") ? null : <td><Mix tasks={tasks} field="priority" labels={labels} /></td>}
      {hidden.has("depends") ? null : <td />}
      {hidden.has("updated") ? null : <td />}
      {hidden.has("float") ? null : <td />}
      {hidden.has("impact") ? null : <td />}
      {hidden.has("quality") ? null : <td />}
      {extra > 0 ? <td colSpan={extra} /> : null}
    </tr>
  );
}

function Mix({
  tasks,
  field,
  labels,
}: {
  tasks: PmBoardTask[];
  field: "status" | "priority";
  labels: BoardLabel[];
}) {
  const total = tasks.length;
  const known = labels.filter((item) => item.kind === field && !item.retired).sort((a, b) => a.order - b.order);
  const extra = tasks.map((task) => task[field]).filter((id) => !known.some((item) => item.id === id));
  const order = [...known.map((item) => item.id), ...new Set(extra)];
  return (
    <span className="pm-summary-chip">
      {total === 0 ? null : order.map((key) => {
        const count = tasks.filter((task) => task[field] === key).length;
        if (!count) return null;
        const percent = Math.round((count / total) * 100);
        const name = labelName(labels, field, key);
        const tip = `${name} ${count}/${total} ${percent}%`;
        return <span key={key} className="pm-mix" title={tip} aria-label={tip} style={{ width: `${(count / total) * 100}%`, background: labelColor(labels, field, key, toneColor(field, key)) }} />;
      })}
    </span>
  );
}

function AddRow({ placeholder, onSubmit }: { placeholder: string; onSubmit: (title: string) => void }) {
  const [title, setTitle] = useState("");
  return (
    <form
      className="pmb-add-row"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) return;
        onSubmit(title.trim());
        setTitle("");
      }}
    >
      <LucideIcon name="plus" size={14} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
    </form>
  );
}
