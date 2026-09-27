import { Button, Checkbox, DatePicker, Dropdown, Empty, Input, Popover, Table, message } from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import dayjs from "dayjs";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LucideIcon } from "@/components/common/lucide-icon";
import { formatAppDate, formatAppMonth, parseAppDateValue } from "@/lib/date";
import { getProfileDisplayName } from "@/lib/profileName";
import {
  BOARD_STATUS_ORDER,
  dueDateTone,
  portfolioGroupId,
  portfolioTimeline,
  sortPortfolioItems,
  summarizePortfolioGroup,
  type PortfolioGroupBy,
} from "@/lib/projectManagementPortfolio";
import { PM_TASK_STATUSES, WORKFLOW_PHASE_LABELS, WORKFLOW_PHASES } from "@/lib/projectManagementWorkflow";
import type {
  PmTaskPriority,
  PmTaskStatus,
  PortfolioBoardStatus,
  PortfolioItem,
  PortfolioSortKey,
  Profile,
  ProjectManagementTask,
  WorkflowPhase,
} from "@/types";

const TASK_PRIORITIES: readonly PmTaskPriority[] = ["Low", "Medium", "High"];

const COL_WIDTH = {
  select: 40,
  project: 240,
  owner: 72,
  status: 132,
  date: 140,
  timeline: 168,
  priority: 110,
  updated: 168,
  source: 100,
  phase: 180,
  client: 140,
  progress: 90,
  actions: 48,
} as const;

const OPTIONAL_COLUMNS: Array<[PortfolioOptionalColumn, number]> = [
  ["owner", COL_WIDTH.owner],
  ["status", COL_WIDTH.status],
  ["date", COL_WIDTH.date],
  ["timeline", COL_WIDTH.timeline],
  ["priority", COL_WIDTH.priority],
  ["updated", COL_WIDTH.updated],
  ["source", COL_WIDTH.source],
  ["phase", COL_WIDTH.phase],
  ["client", COL_WIDTH.client],
  ["progress", COL_WIDTH.progress],
];

function visibleTracks(hidden: Set<PortfolioOptionalColumn>): number[] {
  const tracks: number[] = [COL_WIDTH.select, COL_WIDTH.project];
  for (const [key, width] of OPTIONAL_COLUMNS) {
    if (!hidden.has(key)) tracks.push(width);
  }
  tracks.push(COL_WIDTH.actions);
  return tracks;
}

type TaskCellPatch = Partial<Pick<ProjectManagementTask, "status" | "priority" | "targetDate" | "startDate" | "title" | "assigneeIds">>;

const GROUP_COLLAPSE_KEY = "project-tracker:pm-board-groups";

function readCollapsedGroups(): Record<string, boolean> {
  const defaults = { Completed: true, Cancelled: true };
  try {
    const raw = localStorage.getItem(GROUP_COLLAPSE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return defaults;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

function workItemLink(item: PortfolioItem): string {
  const params = new URLSearchParams();
  params.set(item.sourceType === "process" ? "projectId" : "activityId", item.sourceId);
  const base = import.meta.env.BASE_URL || "/";
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${window.location.origin}${prefix}#/project-management?${params.toString()}`;
}

function ownerInitials(name: string): string {
  const parts = name.split(/\s+/).filter((part) => part && part !== "N/A");
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
  return letters || "?";
}

const AVATAR_COLORS = ["#579bfc", "#00c875", "#fdab3d", "#a25ddc", "#e2445c", "#784bd1", "#ff642e", "#037f4c"];

function avatarColor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash + char.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash] ?? "#579bfc";
}

function OwnerMark({ name }: { name: string }) {
  const assigned = Boolean(name && name !== "N/A");
  const label = assigned ? name : "Unassigned";
  return (
    <span
      className="pm-avatar"
      title={label}
      aria-label={label}
      style={assigned ? { background: avatarColor(label), color: "#fff" } : undefined}
    >
      {ownerInitials(assigned ? label : "")}
    </span>
  );
}

function compactRange(label: string): string {
  const parts = label.split(" – ");
  if (parts.length !== 2) return label;
  const start = parts[0] ?? "";
  const end = parts[1] ?? "";
  if (start.slice(-4) === end.slice(-4) && start.length > 5) return `${start.slice(0, -5)} – ${end}`;
  return label;
}

function relativeUpdated(value: string): string {
  const ms = Date.parse(value);
  if (!ms) return "—";
  const minutes = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  return formatAppDate(value);
}

export type PortfolioOptionalColumn =
  | "owner"
  | "status"
  | "date"
  | "timeline"
  | "priority"
  | "updated"
  | "source"
  | "phase"
  | "client"
  | "progress";

const ADDABLE_COLUMNS: Array<{ key: PortfolioOptionalColumn; label: string; group: "Essentials" | "More columns" }> = [
  { key: "status", label: "Status", group: "Essentials" },
  { key: "owner", label: "People", group: "Essentials" },
  { key: "date", label: "Date", group: "Essentials" },
  { key: "timeline", label: "Timeline", group: "Essentials" },
  { key: "priority", label: "Priority", group: "Essentials" },
  { key: "updated", label: "Last updated", group: "More columns" },
  { key: "source", label: "Source", group: "More columns" },
  { key: "phase", label: "Phase", group: "More columns" },
  { key: "client", label: "Client", group: "More columns" },
  { key: "progress", label: "Progress", group: "More columns" },
];

interface ProjectBoardTableProps {
  items: PortfolioItem[];
  tasks?: ProjectManagementTask[];
  profiles?: Profile[];
  sortKey: PortfolioSortKey;
  sortDirection: "asc" | "desc";
  hiddenColumns?: PortfolioOptionalColumn[];
  groupBy?: PortfolioGroupBy;
  canEditTasks?: boolean;
  canCreate?: boolean;
  onSortChange: (key: PortfolioSortKey) => void;
  onHiddenChange?: (next: PortfolioOptionalColumn[]) => void;
  onOpen: (item: PortfolioItem) => void;
  onOpenSource?: (item: PortfolioItem) => void;
  onStatusIntent?: (item: PortfolioItem) => void;
  onSetTimeline?: (item: PortfolioItem, start: string, end: string) => void;
  onPatchTask?: (task: ProjectManagementTask, patch: TaskCellPatch) => void;
  onAddSubtask?: (item: PortfolioItem) => void;
  canOpenSource?: boolean;
  selectedId?: string | null;
  onSelectedChange?: (id: string | null) => void;
}

function formatDue(item: PortfolioItem): string {
  if (!item.targetDate || item.targetDate === "N/A") return "—";
  if (item.sourceType === "process") {
    const month = formatAppMonth(item.targetDate);
    return month === "-" ? item.targetDate : month;
  }
  const date = formatAppDate(item.targetDate);
  return date === "-" ? item.targetDate : date;
}

function statusSlug(status: string): string {
  return status.toLowerCase().replace(/\s+/g, "-");
}

function tasksForItem(tasks: ProjectManagementTask[], item: PortfolioItem): ProjectManagementTask[] {
  return tasks.filter((task) => task.sourceType === item.sourceType && task.sourceId === item.sourceId);
}

function ColumnMenu({
  hiddenColumns,
  onHiddenChange,
}: {
  hiddenColumns: PortfolioOptionalColumn[];
  onHiddenChange: (next: PortfolioOptionalColumn[]) => void;
}) {
  const [query, setQuery] = useState("");
  const hidden = new Set(hiddenColumns);
  const needle = query.trim().toLowerCase();
  const visible = ADDABLE_COLUMNS.filter((column) => column.label.toLowerCase().includes(needle));
  const toggle = (key: PortfolioOptionalColumn) => {
    const next = new Set(hiddenColumns);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onHiddenChange([...next]);
  };
  return (
    <div className="pm-add-column" onClick={(event) => event.stopPropagation()}>
      <Input
        allowClear
        prefix={<LucideIcon name="search" size={14} />}
        placeholder="Search or describe your column"
        aria-label="Search columns"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {(["Essentials", "More columns"] as const).map((group) => {
        const columns = visible.filter((column) => column.group === group);
        if (columns.length === 0) return null;
        return (
          <div key={group}>
            <p className="pm-add-column-label">{group}</p>
            <div className="pm-add-column-grid">
              {columns.map((column) => (
                <button
                  key={column.key}
                  type="button"
                  className={`pm-add-column-item${hidden.has(column.key) ? "" : " is-shown"}`}
                  onClick={() => toggle(column.key)}
                >
                  <span className={`pm-add-swatch pm-add-swatch-${column.key}`} aria-hidden="true" />
                  {column.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GroupSummary({ rows, hidden, aligned = false }: { rows: PortfolioItem[]; hidden?: Set<PortfolioOptionalColumn>; aligned?: boolean }) {
  const summary = summarizePortfolioGroup(rows);
  const priorityTotal = summary.high + summary.medium + summary.low;
  const statusTotal = BOARD_STATUS_ORDER.reduce((sum, status) => sum + summary.statusCounts[status], 0);
  const statusChip = (
    <span className="pm-summary-chip">
      {statusTotal > 0 ? BOARD_STATUS_ORDER.map((status) => (
        summary.statusCounts[status] > 0 ? (
          <span
            key={status}
            className={`pm-mix pm-mix-${statusSlug(status)}`}
            style={{ flex: summary.statusCounts[status] }}
          />
        ) : null
      )) : <span className="pm-mix pm-mix-none" />}
    </span>
  );
  const dueChip = (
    <span className={`pm-summary-range${summary.dueLabel === "—" ? " is-empty" : ""}`} title={summary.dueLabel}>
      {compactRange(summary.dueLabel)}
    </span>
  );
  const priorityChip = (
    <span className="pm-summary-chip">
      {priorityTotal > 0 ? (
        <>
          {summary.high > 0 ? <span className="pm-mix pm-mix-high" style={{ flex: summary.high }} /> : null}
          {summary.medium > 0 ? <span className="pm-mix pm-mix-medium" style={{ flex: summary.medium }} /> : null}
          {summary.low > 0 ? <span className="pm-mix pm-mix-low" style={{ flex: summary.low }} /> : null}
        </>
      ) : <span className="pm-mix pm-mix-none" />}
    </span>
  );
  if (!aligned || !hidden) {
    return (
      <div className="pm-group-foot" aria-hidden="true">
        {statusChip}
        {dueChip}
        {priorityChip}
      </div>
    );
  }
  const trailing = ["updated", "source", "phase", "client", "progress"] as const;
  return (
    <div className="pm-subtask-row" aria-hidden="true" style={{ gridTemplateColumns: visibleTracks(hidden).map((width) => `${width}px`).join(" ") }}>
      <span />
      <span />
      {hidden.has("owner") ? null : <span />}
      {hidden.has("status") ? null : <span className="pm-subtask-cell">{statusChip}</span>}
      {hidden.has("date") ? null : <span />}
      {hidden.has("timeline") ? null : <span className="pm-subtask-cell">{dueChip}</span>}
      {hidden.has("priority") ? null : <span className="pm-subtask-cell">{priorityChip}</span>}
      {Array.from({ length: trailing.filter((key) => !hidden.has(key)).length }, (_, index) => <span key={index} />)}
      <span />
    </div>
  );
}

function TimelineCell({
  item,
  tasks,
  canEdit,
  onSetTimeline,
}: {
  item: PortfolioItem;
  tasks: ProjectManagementTask[];
  canEdit: boolean;
  onSetTimeline?: (item: PortfolioItem, start: string, end: string) => void;
}) {
  const linked = tasksForItem(tasks, item);
  const range = portfolioTimeline(linked);
  const label = range.label || formatDue(item);
  const empty = label === "—";
  const tone = dueDateTone(item);
  const pill = (
    <button
      type="button"
      className={`pm-timeline-pill${empty ? " is-empty" : ""} pm-due-${tone}`}
      title={label}
      onClick={(event) => event.stopPropagation()}
    >
      {compactRange(label)}
    </button>
  );
  if (!canEdit || !onSetTimeline) return pill;
  const start = range.start ? dayjs(range.start) : null;
  const end = range.end ? dayjs(range.end) : null;
  const days = start && end ? end.diff(start, "day") + 1 : 0;
  return (
    <Popover
      trigger="click"
      placement="bottomLeft"
      content={(
        <div className="pm-date-popover" onClick={(event) => event.stopPropagation()}>
          <div className="pm-date-popover-head">
            <strong>Set dates</strong>
            <span>{days > 0 ? `${days} day${days === 1 ? "" : "s"} selected` : "Pick a start and end"}</span>
          </div>
          <DatePicker.RangePicker
            value={start && end ? [start, end] : null}
            allowClear
            format="DD MMM YYYY"
            onChange={(values) => {
              const nextStart = values?.[0]?.format("YYYY-MM-DD") ?? "";
              const nextEnd = values?.[1]?.format("YYYY-MM-DD") ?? "";
              onSetTimeline(item, nextStart, nextEnd);
            }}
          />
          <p className="pm-date-note">Saved on the subitem. Protocol, report, and final status stay on the project record.</p>
        </div>
      )}
    >
      {pill}
    </Popover>
  );
}

function SubtaskPanel({
  item,
  tasks,
  profiles,
  hidden,
  canEdit,
  canCreate,
  onPatchTask,
  onAddSubtask,
}: {
  item: PortfolioItem;
  tasks: ProjectManagementTask[];
  profiles: Profile[];
  hidden: Set<PortfolioOptionalColumn>;
  canEdit: boolean;
  canCreate: boolean;
  onPatchTask?: ProjectBoardTableProps["onPatchTask"];
  onAddSubtask?: (item: PortfolioItem) => void;
}) {
  const rows = tasksForItem(tasks, item);
  const tracks = visibleTracks(hidden).map((width) => `${width}px`).join(" ");
  const trailing = ["updated", "source", "phase", "client", "progress"] as const;
  const filler = trailing.filter((key) => !hidden.has(key)).length;
  return (
    <div className="pm-subtasks" onClick={(event) => event.stopPropagation()}>
      {rows.map((task) => {
        const owner = profiles.find((profile) => task.assigneeIds.includes(profile.id));
        const ownerName = owner ? getProfileDisplayName(owner) || owner.email : "";
        const slug = statusSlug(task.status);
        const statusCell = canEdit && onPatchTask ? (
          <Dropdown
            trigger={["click"]}
            menu={{
              items: PM_TASK_STATUSES.map((value) => ({ key: value, label: value })),
              onClick: ({ key, domEvent }) => {
                domEvent.stopPropagation();
                onPatchTask(task, { status: key as PmTaskStatus });
              },
            }}
          >
            <button type="button" className={`pm-fill-cell pm-task-${slug}`}>{task.status}</button>
          </Dropdown>
        ) : (
          <span className={`pm-fill-cell pm-task-${slug}`}>{task.status}</span>
        );
        const ownerCell = canEdit && onPatchTask ? (
          <Dropdown
            trigger={["click"]}
            menu={{
              items: profiles.map((profile) => ({
                key: profile.id,
                label: getProfileDisplayName(profile) || profile.email,
              })),
              onClick: ({ key, domEvent }) => {
                domEvent.stopPropagation();
                onPatchTask(task, { assigneeIds: [String(key)] });
              },
            }}
          >
            <button type="button" className="pm-avatar-btn" aria-label="Change owner">
              <OwnerMark name={ownerName} />
            </button>
          </Dropdown>
        ) : (
          <OwnerMark name={ownerName} />
        );
        const priorityCell = canEdit && onPatchTask ? (
          <Dropdown
            trigger={["click"]}
            menu={{
              items: TASK_PRIORITIES.map((value) => ({ key: value, label: value })),
              onClick: ({ key, domEvent }) => {
                domEvent.stopPropagation();
                onPatchTask(task, { priority: key as PmTaskPriority });
              },
            }}
          >
            <button type="button" className={`pm-fill-cell pm-priority-${task.priority ? task.priority.toLowerCase() : "none"}`}>
              {task.priority || "—"}
            </button>
          </Dropdown>
        ) : (
          <span className={`pm-fill-cell pm-priority-${task.priority ? task.priority.toLowerCase() : "none"}`}>
            {task.priority || "—"}
          </span>
        );
        const timelineCell = canEdit && onPatchTask ? (
          <DatePicker
            size="small"
            allowClear
            value={parseAppDateValue(task.targetDate)}
            format="DD MMM YYYY"
            onClick={(event) => event.stopPropagation()}
            onChange={(next) => onPatchTask(task, { targetDate: next ? next.format("YYYY-MM-DD") : "" })}
          />
        ) : (
          <span className="pm-timeline-pill">{task.targetDate ? formatAppDate(task.targetDate) : "—"}</span>
        );
        return (
          <div className="pm-subtask-row" key={task.id} style={{ gridTemplateColumns: tracks }}>
            <span />
            <span className="pm-subtask-name">
              {canEdit && onPatchTask ? (
                <Input
                  key={`${task.id}:${task.title}`}
                  className="pm-subtask-title"
                  size="small"
                  defaultValue={task.title}
                  aria-label="Subitem name"
                  onClick={(event) => event.stopPropagation()}
                  onBlur={(event) => {
                    const title = event.target.value.trim();
                    if (title && title !== task.title) onPatchTask(task, { title });
                  }}
                  onPressEnter={(event) => event.currentTarget.blur()}
                />
              ) : (
                <span className="pm-subtask-title">{task.title}</span>
              )}
            </span>
            {hidden.has("owner") ? null : <span className="pm-subtask-cell">{ownerCell}</span>}
            {hidden.has("status") ? null : <span className="pm-subtask-cell is-fill">{statusCell}</span>}
            {hidden.has("date") ? null : <span className="pm-subtask-cell" />}
            {hidden.has("timeline") ? null : <span className="pm-subtask-cell">{timelineCell}</span>}
            {hidden.has("priority") ? null : <span className="pm-subtask-cell is-fill">{priorityCell}</span>}
            {Array.from({ length: filler }, (_, index) => <span key={index} />)}
            <span />
          </div>
        );
      })}
      {canCreate && onAddSubtask ? (
        <div className="pm-subtask-row" style={{ gridTemplateColumns: tracks }}>
          <span />
          <span className="pm-subtask-name">
            <button type="button" className="pm-add-subtask" onClick={() => onAddSubtask(item)}>
              + Add subitem
            </button>
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function ProjectBoardTable({
  items,
  tasks = [],
  profiles = [],
  sortKey,
  sortDirection,
  hiddenColumns = [],
  groupBy = "status",
  canEditTasks = false,
  canCreate = false,
  onSortChange,
  onHiddenChange,
  onOpen,
  onOpenSource,
  onStatusIntent,
  onSetTimeline,
  onPatchTask,
  onAddSubtask,
  canOpenSource = false,
  selectedId = null,
  onSelectedChange,
}: ProjectBoardTableProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(readCollapsedGroups);
  useEffect(() => {
    localStorage.setItem(GROUP_COLLAPSE_KEY, JSON.stringify(collapsed));
  }, [collapsed]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const hidden = useMemo(() => new Set(hiddenColumns), [hiddenColumns]);
  const groups = useMemo(() => {
    const sorted = sortPortfolioItems(items, sortKey, sortDirection);
    const buckets = new Map<string, PortfolioItem[]>();
    for (const item of sorted) {
      const id = portfolioGroupId(item, groupBy);
      const current = buckets.get(id) ?? [];
      current.push(item);
      buckets.set(id, current);
    }
    const order = groupBy === "status"
      ? [...BOARD_STATUS_ORDER]
      : groupBy === "phase"
        ? [...WORKFLOW_PHASES]
        : [...buckets.keys()].sort((a, b) => a.localeCompare(b));
    return order
      .filter((id) => buckets.has(id))
      .map((id) => ({
        id,
        label: groupBy === "phase" ? WORKFLOW_PHASE_LABELS[id as WorkflowPhase] : id,
        tone: groupBy === "status" ? statusSlug(id) : "neutral",
        rows: buckets.get(id) ?? [],
      }));
  }, [groupBy, items, sortDirection, sortKey]);

  const columns: ColumnsType<PortfolioItem> = [
    {
      title: "",
      key: "select",
      width: COL_WIDTH.select,
      fixed: "left",
      render: (_, item) => (
        <Checkbox
          checked={selectedId === item.id}
          aria-label={`Select ${item.product !== "N/A" ? item.product : item.title}`}
          onClick={(event) => event.stopPropagation()}
          onChange={() => onSelectedChange?.(selectedId === item.id ? null : item.id)}
        />
      ),
    },
    {
      title: "Project",
      key: "project",
      sorter: true,
      ellipsis: true,
      className: "pm-project-col",
      fixed: "left",
      width: COL_WIDTH.project,
      render: (_, item) => {
        const open = expanded.includes(item.id);
        const count = tasksForItem(tasks, item).length;
        const toggle = () => setExpanded((current) => (
          current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]
        ));
        return (
          <span className="pm-board-link">
            <strong>
              <button
                type="button"
                className="pm-row-chevron"
                aria-expanded={open}
                aria-label={open ? "Hide subitems" : "Show subitems"}
                onClick={(event) => {
                  event.stopPropagation();
                  toggle();
                }}
              >
                {open ? "⌄" : "›"}
              </button>
              <button
                type="button"
                className="pm-board-name"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen(item);
                }}
              >
                {item.product !== "N/A" ? item.product : item.title}
              </button>
              {count > 0 ? <span className="pm-subitem-count">{count}</span> : null}
            </strong>
          </span>
        );
      },
    },
    ...(hidden.has("owner") ? [] : [{
      title: "Owner",
      key: "owner",
      sorter: true,
      width: COL_WIDTH.owner,
      className: "pm-owner-col",
      render: (_: unknown, item: PortfolioItem) => <OwnerMark name={item.owner} />,
    }]),
    ...(hidden.has("status") ? [] : [{
      title: "Status",
      key: "status",
      sorter: true,
      width: COL_WIDTH.status,
      className: "pm-fill-col",
      onCell: () => ({ className: "pm-fill-col" }),
      render: (_: unknown, item: PortfolioItem) => (
        <button
          type="button"
          className={`pm-fill-cell pm-status-${statusSlug(item.boardStatus)}`}
          title="This status is derived from the project record"
          onClick={(event) => {
            event.stopPropagation();
            onStatusIntent?.(item);
          }}
        >
          {item.boardStatus}
        </button>
      ),
    }]),
    ...(hidden.has("date") ? [] : [{
      title: "Date",
      key: "date",
      width: COL_WIDTH.date,
      render: (_: unknown, item: PortfolioItem) => {
        const linked = tasksForItem(tasks, item);
        const range = portfolioTimeline(linked);
        const due = range.end || linked.map((task) => task.targetDate).find((value) => parseAppDateValue(value)) || "";
        if (!canEditTasks || !onSetTimeline) return due ? formatAppDate(due) : formatDue(item);
        return (
          <DatePicker
            size="small"
            allowClear
            value={parseAppDateValue(due)}
            format="DD MMM YYYY"
            onClick={(event) => event.stopPropagation()}
            onChange={(next) => {
              const end = next ? next.format("YYYY-MM-DD") : "";
              const start = range.start && end && range.start <= end ? range.start : end;
              onSetTimeline(item, start, end);
            }}
          />
        );
      },
    }]),
    ...(hidden.has("timeline") ? [] : [{
      title: "Timeline",
      key: "due",
      sorter: true,
      className: "pm-center-col",
      width: COL_WIDTH.timeline,
      render: (_: unknown, item: PortfolioItem) => (
        <TimelineCell item={item} tasks={tasks} canEdit={canEditTasks} onSetTimeline={onSetTimeline} />
      ),
    }]),
    ...(hidden.has("priority") ? [] : [{
      title: "Priority",
      key: "priority",
      sorter: true,
      width: COL_WIDTH.priority,
      className: "pm-fill-col",
      onCell: () => ({ className: "pm-fill-col" }),
      render: (_: unknown, item: PortfolioItem) => (
        <span
          className={`pm-fill-cell pm-priority-${item.priority ? item.priority.toLowerCase() : "none"}`}
          title="Priority comes from open tasks"
        >
          {item.priority || "—"}
        </span>
      ),
    }]),
    ...(hidden.has("updated") ? [] : [{
      title: "Last Updated",
      key: "updated",
      sorter: true,
      className: "pm-center-col",
      width: COL_WIDTH.updated,
      render: (_: unknown, item: PortfolioItem) => (
        <span className="pm-updated-cell">
          <OwnerMark name={item.owner} />
          <span>{relativeUpdated(item.updatedAt)}</span>
        </span>
      ),
    }]),
    ...(hidden.has("source") ? [] : [{
      title: "Source",
      key: "source",
      width: COL_WIDTH.source,
      render: (_: unknown, item: PortfolioItem) => (item.sourceType === "process" ? "Project" : "Support"),
    }]),
    ...(hidden.has("phase") ? [] : [{
      title: "Phase",
      key: "phase",
      sorter: true,
      width: COL_WIDTH.phase,
      render: (_: unknown, item: PortfolioItem) => WORKFLOW_PHASE_LABELS[item.phase],
    }]),
    ...(hidden.has("client") ? [] : [{
      title: "Client",
      dataIndex: "client",
      ellipsis: true,
      width: COL_WIDTH.client,
    }]),
    ...(hidden.has("progress") ? [] : [{
      title: "Progress",
      key: "progress",
      sorter: true,
      width: COL_WIDTH.progress,
      render: (_: unknown, item: PortfolioItem) => `${item.progress}%`,
    }]),
    {
      title: onHiddenChange ? (
        <Popover
          trigger="click"
          placement="bottomRight"
          content={<ColumnMenu hiddenColumns={hiddenColumns} onHiddenChange={onHiddenChange} />}
        >
          <Button size="small" type="text" aria-label="Add column" icon={<LucideIcon name="plus" size={14} />} onClick={(event) => event.stopPropagation()} />
        </Popover>
      ) : "",
      key: "actions",
      width: COL_WIDTH.actions,
      fixed: "right",
      render: (_, item) => (
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              { key: "open", label: "Open task" },
              { key: "tab", label: "Open in new tab" },
              { key: "copy", label: "Copy task link" },
              canOpenSource ? { key: "source", label: "Open project record" } : null,
              canCreate && onAddSubtask ? { key: "subitem", label: "Add subitem" } : null,
            ].filter(Boolean),
            onClick: ({ key, domEvent }) => {
              domEvent.stopPropagation();
              const link = workItemLink(item);
              if (key === "open") onOpen(item);
              if (key === "tab") window.open(link, "_blank", "noopener,noreferrer");
              if (key === "copy") {
                void navigator.clipboard.writeText(link).then(
                  () => message.success("Link copied."),
                  () => message.error("Could not copy the link."),
                );
              }
              if (key === "source" && onOpenSource) onOpenSource(item);
              if (key === "subitem") onAddSubtask?.(item);
            },
          }}
        >
          <Button size="small" type="text" aria-label={`Actions for ${item.title}`} onClick={(event) => event.stopPropagation()}>
            ···
          </Button>
        </Dropdown>
      ),
    },
  ];

  const handleChange: TableProps<PortfolioItem>["onChange"] = (_pagination, _filters, sorter) => {
    const next = Array.isArray(sorter) ? sorter[0] : sorter;
    const key = String(next?.columnKey ?? "");
    if (
      key === "project"
      || key === "priority"
      || key === "status"
      || key === "phase"
      || key === "owner"
      || key === "progress"
      || key === "due"
      || key === "updated"
    ) {
      onSortChange(key);
    }
  };

  if (items.length === 0) {
    return <Empty description="No projects match the selected filters." />;
  }

  return (
    <div className="pm-board-table-wrap">
      {groups.map((group) => {
        const isCollapsed = Boolean(collapsed[group.id]);
        return (
          <ProjectGroupSection
            key={group.id}
            label={group.label}
            tone={group.tone}
            count={group.rows.length}
            collapsed={isCollapsed}
            summary={isCollapsed ? <GroupSummary rows={group.rows} /> : null}
            onToggle={() => setCollapsed((current) => ({ ...current, [group.id]: !current[group.id] }))}
          >
            <Table
              size="small"
              rowKey="id"
              className="pm-monday-table"
              columns={columns}
              dataSource={group.rows}
              pagination={false}
              tableLayout="fixed"
              scroll={{ x: visibleTracks(hidden).reduce((sum, width) => sum + width, 0) }}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={visibleTracks(hidden).length}>
                    <GroupSummary rows={group.rows} hidden={hidden} aligned />
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
              onChange={handleChange}
              expandable={{
                showExpandColumn: false,
                expandedRowKeys: expanded,
                onExpand: (open, record) => {
                  setExpanded((current) => (open ? [...current, record.id] : current.filter((id) => id !== record.id)));
                },
                expandedRowRender: (item) => (
                  <SubtaskPanel
                    item={item}
                    tasks={tasks}
                    profiles={profiles}
                    hidden={hidden}
                    canEdit={canEditTasks}
                    canCreate={canCreate}
                    onPatchTask={onPatchTask}
                    onAddSubtask={onAddSubtask}
                  />
                ),
              }}
              onRow={(item) => ({
                onClick: () => onOpen(item),
                className: selectedId === item.id ? "is-selected" : "",
                style: { cursor: "pointer" },
              })}
            />
          </ProjectGroupSection>
        );
      })}
    </div>
  );
}

export function ProjectGroupSection({
  status,
  label,
  tone,
  count,
  collapsed,
  summary,
  onToggle,
  children,
}: {
  status?: PortfolioBoardStatus;
  label?: string;
  tone?: string;
  count: number;
  collapsed: boolean;
  summary?: ReactNode;
  onToggle: () => void;
  children?: ReactNode;
}) {
  const title = label ?? status ?? "Group";
  const toneClass = tone ?? (status ? statusSlug(status) : "neutral");
  return (
    <section className={`pm-group pm-group-${toneClass}`} aria-labelledby={`pm-group-${title}`}>
      <div className="pm-group-head">
        <button
          type="button"
          className="pm-group-toggle"
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          <span className="pm-group-chevron" aria-hidden="true">{collapsed ? "›" : "⌄"}</span>
          <span id={`pm-group-${title}`} className="pm-group-title">{title}</span>
          <span className="pm-status-count">{count}</span>
        </button>
        {summary}
      </div>
      {collapsed ? null : children}
    </section>
  );
}
