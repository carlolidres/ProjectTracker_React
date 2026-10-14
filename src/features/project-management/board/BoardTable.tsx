import { useEffect, useState, type ReactNode } from "react";
import { Checkbox, Dropdown } from "antd";
import type { Profile } from "@/types";
import { LucideIcon } from "@/components/common/lucide-icon";
import { formatAppDate } from "@/lib/date";
import {
  PRIORITY_COLOR,
  STATUS_COLOR,
  subtasksOf,
  type BoardPriority,
  type BoardStatus,
  type PmBoardTask,
  type PmGroup,
} from "@/features/project-management/board/boardRules";
import { OwnerAvatar, PriorityFill, StatusFill, personName, relativeUpdated, timelineLabel } from "@/features/project-management/board/boardUi";
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
  projects,
  userId,
  userEmail,
  unseenTaskIds,
  onAddColumn,
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
  projects: PmProject[];
  userId: string;
  userEmail: string;
  unseenTaskIds: Set<string>;
  onAddColumn: () => void;
  onSaveCell: (task: PmBoardTask, column: BoardColumn, value: unknown) => void;
  onColumnAction: (column: BoardColumn, action: string) => void;
  scrollKey: string | null;
  scrollTick: number;
}) {
  useEffect(() => {
    if (!scrollKey) return;
    document.querySelector(`[data-board-col="${CSS.escape(scrollKey)}"]`)?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [scrollKey, scrollTick]);
  return (
    <div className="pmb-groups">
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
                        <th>Task</th>
                        {hidden.has("owner") ? null : <th data-board-col="owner">Owner</th>}
                        {hidden.has("status") ? null : <th data-board-col="status">Status</th>}
                        {hidden.has("timeline") ? null : <th data-board-col="timeline">Timeline</th>}
                        {hidden.has("priority") ? null : <th data-board-col="priority">Priority</th>}
                        {hidden.has("depends") ? null : <th data-board-col="depends">Depends on</th>}
                        {hidden.has("updated") ? null : <th data-board-col="updated">Last Updated</th>}
                        {columns.map((column, index) => (
                          <th key={column.id} data-board-col={column.id}>
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
                        <th className="pmb-add-col"><button type="button" className="pmb-add-col-btn" aria-label="Add column" onClick={onAddColumn}>+</button></th>
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
                          projects={projects}
                          userId={userId}
                          userEmail={userEmail}
                          unseenTaskIds={unseenTaskIds}
                          onSaveCell={onSaveCell}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                <GroupFooter tasks={section.tasks} />
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
  projects: PmProject[];
  userId: string;
  userEmail: string;
  unseenTaskIds: Set<string>;
  onSaveCell: (task: PmBoardTask, column: BoardColumn, value: unknown) => void;
}) {
  const { task, tasks, depth } = props;
  const unseen = props.unseenTaskIds.has(task.id);
  const children = depth === 0 ? subtasksOf(tasks, task.id) : [];
  const [open, setOpen] = useState(children.length > 0);
  const colSpan = 3 + props.columns.length + ["owner", "status", "timeline", "priority", "depends", "updated"].filter((key) => !props.hidden.has(key)).length;
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
        <td>
          <span className="pmb-task-name" style={{ paddingLeft: depth > 0 ? 32 : 0 }}>
            {depth === 0 ? (
              <button type="button" className="pm-row-chevron" aria-expanded={open} aria-label={open ? "Hide subtasks" : "Show subtasks"} onClick={() => setOpen((value) => !value)}>
                <LucideIcon name="chevron-right" size={14} className={open ? "is-open" : ""} />
              </button>
            ) : null}
            <button type="button" className="pm-board-name" onClick={() => props.onOpen(task)}>{task.title}</button>
            {children.length > 0 ? <span className="pm-subitem-count">{children.length}</span> : null}
          </span>
        </td>
        {props.hidden.has("owner") ? null : (
          <td className="pmb-center">
            <OwnerPicker task={task} profiles={props.profiles} canEdit={props.canEdit} onPatch={props.onPatch} />
          </td>
        )}
        {props.hidden.has("status") ? null : (
          <td className="pmb-fill-cell">
            <Choice
              label={task.status}
              options={["Not Started", "Working on it", "Done", "Stuck"]}
              canEdit={props.canEdit}
              onChange={(status) => props.onPatch(task, { status: status as BoardStatus })}
            >
              <StatusFill status={task.status} />
            </Choice>
          </td>
        )}
        {props.hidden.has("timeline") ? null : (
          <td>
            <TimelineEditor task={task} canEdit={props.canEdit} onPatch={props.onPatch} />
          </td>
        )}
        {props.hidden.has("priority") ? null : (
          <td className="pmb-fill-cell">
            <Choice
              label={task.priority}
              options={["High", "Medium", "Low"]}
              canEdit={props.canEdit}
              onChange={(priority) => props.onPatch(task, { priority: priority as BoardPriority })}
            >
              <PriorityFill priority={task.priority} />
            </Choice>
          </td>
        )}
        {props.hidden.has("depends") ? null : (
          <td className="pmb-depends">
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
          <td className="pmb-updated">
            <button type="button" className={`pmb-updated-btn${unseen ? " is-unseen" : ""}`} onClick={() => props.onOpenUpdates(task)}>
              {unseen ? <span className="pmb-unseen-dot" aria-hidden="true" /> : null}
              <OwnerAvatar name={personName(props.profiles, task.updatedBy || task.ownerId)} />
              <span>{relativeUpdated(task.updatedAt)}</span>
            </button>
          </td>
        )}
        {props.columns.map((column) => (
          <td key={column.id} className="pmb-custom-cell">
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
        <td />
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

function Choice({
  label,
  options,
  canEdit,
  onChange,
  children,
}: {
  label: string;
  options: string[];
  canEdit: boolean;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  if (!canEdit) return children;
  return (
    <Dropdown
      trigger={["click"]}
      menu={{
        items: options.map((option) => ({ key: option, label: option })),
        onClick: ({ key }) => onChange(String(key)),
      }}
    >
      <button type="button" className="pmb-fill-btn" aria-label={label}>{children}</button>
    </Dropdown>
  );
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

function TimelineEditor({
  task,
  canEdit,
  onPatch,
}: {
  task: PmBoardTask;
  canEdit: boolean;
  onPatch: (task: PmBoardTask, patch: Partial<PmBoardTask>) => void;
}) {
  const label = timelineLabel(task);
  const pill = <span className={`pm-timeline-pill${label === "—" ? " is-empty" : ""}`} title={label}>{label}</span>;
  if (!canEdit) return pill;
  return (
    <Dropdown
      trigger={["click"]}
      dropdownRender={() => (
        <div className="pmb-date-pop" onClick={(event) => event.stopPropagation()}>
          <label>
            Start
            <input
              type="date"
              aria-label={`Start date for ${task.title}`}
              value={task.startDate}
              onChange={(event) => onPatch(task, { startDate: event.target.value })}
            />
          </label>
          <label>
            Due
            <input
              type="date"
              aria-label={`Due date for ${task.title}`}
              value={task.dueDate}
              onChange={(event) => onPatch(task, { dueDate: event.target.value })}
            />
          </label>
        </div>
      )}
    >
      <button type="button" className="pmb-pill-btn" aria-label={`Timeline ${label}`}>{pill}</button>
    </Dropdown>
  );
}

function GroupFooter({ tasks }: { tasks: PmBoardTask[] }) {
  const dates = tasks.flatMap((task) => [task.startDate, task.dueDate].filter(Boolean)).sort();
  const range = dates.length > 0 ? `${formatAppDate(dates[0])} – ${formatAppDate(dates[dates.length - 1])}` : "—";
  return (
    <div className="pmb-footer">
      <Mix tasks={tasks} field="status" colors={STATUS_COLOR} order={["Not Started", "Working on it", "Done", "Stuck"]} />
      <span className="pm-summary-range" title={range}>{range}</span>
      <Mix tasks={tasks} field="priority" colors={PRIORITY_COLOR} order={["Low", "Medium", "High"]} />
    </div>
  );
}

function Mix<T extends string>({
  tasks,
  field,
  colors,
  order,
}: {
  tasks: PmBoardTask[];
  field: "status" | "priority";
  colors: Record<T, string>;
  order: T[];
}) {
  const total = Math.max(tasks.length, 1);
  return (
    <span className="pm-summary-chip" aria-hidden="true">
      {order.map((key) => {
        const count = tasks.filter((task) => task[field] === key).length;
        if (!count) return null;
        return <span key={key} className="pm-mix" style={{ width: `${(count / total) * 100}%`, background: colors[key] }} />;
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
