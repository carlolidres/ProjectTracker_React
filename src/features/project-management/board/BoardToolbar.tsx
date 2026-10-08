import { useMemo, useState } from "react";
import { Button, Checkbox, Dropdown, Popover } from "antd";
import { LucideIcon } from "@/components/common/lucide-icon";
import { personName } from "@/features/project-management/board/boardUi";
import {
  BOARD_PRIORITIES,
  BOARD_STATUSES,
  DEFAULT_SEARCH_COLUMNS,
  type BoardFilters,
  type BoardGroupBy,
  type BoardSortKey,
  type PmGroup,
  type SearchColumn,
} from "@/features/project-management/board/boardRules";
import type { Profile } from "@/types";

const SEARCH_COLUMNS: { key: SearchColumn; label: string }[] = [
  { key: "title", label: "Name" },
  { key: "owner", label: "Owner" },
  { key: "status", label: "Status" },
  { key: "timeline", label: "Timeline" },
  { key: "priority", label: "Priority" },
  { key: "updated", label: "Last Updated" },
];

const HIDE_COLUMNS = [
  ["owner", "Owner"],
  ["status", "Status"],
  ["timeline", "Timeline"],
  ["priority", "Priority"],
  ["depends", "Depends on"],
  ["updated", "Last Updated"],
] as const;

export function BoardToolbar({
  canEdit,
  access,
  filters,
  profiles,
  groups,
  sortKey,
  hidden,
  groupBy,
  searchColumns,
  onFilters,
  onSort,
  onToggleHidden,
  onGroupBy,
  onSearchColumns,
  onNewTask,
  onMembers,
  onArchive,
  onExport,
  onSchedule,
  currentUserId,
  savedViews,
  onSaveView,
  onOpenView,
}: {
  canEdit: boolean;
  access: string | null;
  filters: BoardFilters;
  profiles: Profile[];
  groups: PmGroup[];
  sortKey: BoardSortKey;
  hidden: Set<string>;
  groupBy: BoardGroupBy;
  searchColumns: SearchColumn[];
  onFilters: (patch: Partial<BoardFilters>) => void;
  onSort: (value: BoardSortKey) => void;
  onToggleHidden: (key: string) => void;
  onGroupBy: (value: BoardGroupBy) => void;
  onSearchColumns: (columns: SearchColumn[]) => void;
  onNewTask: (groupId?: string) => void;
  onMembers: () => void;
  onArchive: () => void;
  onExport: () => void;
  onSchedule: () => void;
  currentUserId: string;
  savedViews: { name: string }[];
  onSaveView: () => void;
  onOpenView: (name: string) => void;
}) {
  const [columnQuery, setColumnQuery] = useState("");
  const personLabel = filters.ownerId === "all"
    ? "Person"
    : filters.ownerId === "unassigned"
      ? "Unassigned"
      : filters.ownerId === currentUserId
        ? "Me"
        : personName(profiles, filters.ownerId);
  const filterOn = filters.status !== "all" || filters.priority !== "all" || filters.groupId !== "all";
  const shownColumns = useMemo(
    () => SEARCH_COLUMNS.filter((column) => column.label.toLowerCase().includes(columnQuery.trim().toLowerCase())),
    [columnQuery],
  );

  const toggleColumn = (key: SearchColumn, checked: boolean) => {
    const next = checked ? [...searchColumns, key] : searchColumns.filter((column) => column !== key);
    onSearchColumns(next.length ? next : DEFAULT_SEARCH_COLUMNS);
  };

  return (
    <div className="pmb-toolbar" role="toolbar" aria-label="Board tools">
      <Dropdown
        trigger={["click"]}
        menu={{
          items: groups.map((group) => ({ key: group.id, label: group.name })),
          onClick: ({ key }) => onNewTask(String(key)),
        }}
      >
        <Button type="primary" disabled={!canEdit}>
          New task
        </Button>
      </Dropdown>
      <div className="pmb-search">
        <LucideIcon name="search" size={14} />
        <input
          aria-label="Search tasks"
          placeholder="Search"
          value={filters.search}
          onChange={(event) => onFilters({ search: event.target.value })}
        />
        <Popover
          trigger="click"
          title="Choose columns to search"
          content={(
            <div className="pmb-column-picker">
              <input
                aria-label="Find a column"
                placeholder="Find a column"
                value={columnQuery}
                onChange={(event) => setColumnQuery(event.target.value)}
              />
              <Checkbox
                checked={searchColumns.length === SEARCH_COLUMNS.length}
                onChange={(event) => onSearchColumns(event.target.checked ? SEARCH_COLUMNS.map((column) => column.key) : ["title"])}
              >
                All columns
              </Checkbox>
              {shownColumns.map((column) => (
                <Checkbox
                  key={column.key}
                  checked={searchColumns.includes(column.key)}
                  onChange={(event) => toggleColumn(column.key, event.target.checked)}
                >
                  {column.label}
                </Checkbox>
              ))}
            </div>
          )}
        >
          <button type="button" className="pmb-search-columns" aria-label="Choose columns to search">▾</button>
        </Popover>
      </div>
      <Dropdown
        trigger={["click"]}
        menu={{
          items: [
            { key: "all", label: "Everyone" },
            { key: "me", label: "Me" },
            { key: "unassigned", label: "Unassigned" },
            ...profiles.map((person) => ({ key: person.id, label: personName(profiles, person.id) })),
          ],
          onClick: ({ key }) => onFilters({
            ownerId: key === "me" ? currentUserId || "all" : String(key),
          }),
        }}
      >
        <button type="button" className="pmb-tool" aria-label="Person">
          <LucideIcon name="user" size={14} /> {personLabel}
        </button>
      </Dropdown>
      <Dropdown
        trigger={["click"]}
        menu={{
          items: [
            { key: "status", label: "Status", children: [{ key: "status:all", label: "Any status" }, ...BOARD_STATUSES.map((status) => ({ key: `status:${status}`, label: status }))] },
            { key: "priority", label: "Priority", children: [{ key: "priority:all", label: "Any priority" }, ...BOARD_PRIORITIES.map((priority) => ({ key: `priority:${priority}`, label: priority }))] },
            { key: "group", label: "Group", children: [{ key: "group:all", label: "Any group" }, ...groups.map((group) => ({ key: `group:${group.id}`, label: group.name }))] },
          ],
          onClick: ({ key }) => {
            const [kind, value] = String(key).split(":");
            if (kind === "status") onFilters({ status: value as BoardFilters["status"] });
            if (kind === "priority") onFilters({ priority: value as BoardFilters["priority"] });
            if (kind === "group") onFilters({ groupId: value });
          },
        }}
      >
        <button type="button" className={`pmb-tool${filterOn ? " is-on" : ""}`} aria-label="Filter">
          <LucideIcon name="filter" size={14} /> Filter
        </button>
      </Dropdown>
      <Dropdown
        trigger={["click"]}
        menu={{
          items: [
            { key: "priority", label: "Priority" },
            { key: "updated", label: "Last updated" },
            { key: "title", label: "Task name" },
            { key: "due", label: "Due date" },
          ],
          selectedKeys: [sortKey],
          onClick: ({ key }) => onSort(key as BoardSortKey),
        }}
      >
        <button type="button" className="pmb-tool" aria-label="Sort">
          <LucideIcon name="arrow-up-down" size={14} /> Sort
        </button>
      </Dropdown>
      <Dropdown
        trigger={["click"]}
        menu={{
          items: HIDE_COLUMNS.map(([key, label]) => ({
            key,
            label: `${hidden.has(key) ? "Show" : "Hide"} ${label}`,
          })),
          onClick: ({ key }) => onToggleHidden(String(key)),
        }}
      >
        <button type="button" className="pmb-tool" aria-label="Hide">
          <LucideIcon name="eye-off" size={14} /> Hide
        </button>
      </Dropdown>
      <Dropdown
        trigger={["click"]}
        menu={{
          items: [
            { key: "group", label: "Group" },
            { key: "status", label: "Status" },
            { key: "priority", label: "Priority" },
          ],
          selectedKeys: [groupBy],
          onClick: ({ key }) => onGroupBy(key as BoardGroupBy),
        }}
      >
        <button type="button" className="pmb-tool" aria-label="Group by">
          <LucideIcon name="layers" size={14} /> Group by
        </button>
      </Dropdown>
      <Dropdown
        trigger={["click"]}
        menu={{
          items: [
            { key: "schedule", label: "Scheduling", disabled: access !== "Owner" },
            { key: "save-view", label: "Save view" },
            ...savedViews.map((view) => ({ key: `view:${view.name}`, label: view.name })),
            { key: "members", label: "Manage members", disabled: access !== "Owner" },
            { key: "archive", label: "Archive project", disabled: access !== "Owner" },
            { key: "export", label: "Export to Excel" },
          ],
          onClick: ({ key }) => {
            if (key === "schedule") onSchedule();
            if (key === "save-view") onSaveView();
            if (String(key).startsWith("view:")) onOpenView(String(key).slice(5));
            if (key === "members") onMembers();
            if (key === "archive") onArchive();
            if (key === "export") onExport();
          },
        }}
      >
        <button type="button" className="pmb-tool" aria-label="More actions">···</button>
      </Dropdown>
    </div>
  );
}