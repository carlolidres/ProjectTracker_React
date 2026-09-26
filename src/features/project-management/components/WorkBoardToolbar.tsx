import { Button, Checkbox, Dropdown, Input, Popover, Select, Space } from "antd";
import { LucideIcon } from "@/components/common/lucide-icon";
import { PortfolioFiltersBar } from "@/features/project-management/components/PortfolioFilters";
import type { PortfolioOptionalColumn } from "@/features/project-management/components/ProjectBoardTable";
import type { ActivityKind } from "@/types/supportActivity";
import type { PortfolioGroupBy } from "@/lib/projectManagementPortfolio";
import type { PortfolioFilters, PortfolioSortKey } from "@/types";

const SORT_OPTIONS: Array<{ key: PortfolioSortKey; label: string }> = [
  { key: "updated", label: "Last updated" },
  { key: "project", label: "Project" },
  { key: "owner", label: "Owner" },
  { key: "status", label: "Status" },
  { key: "due", label: "Timeline" },
  { key: "priority", label: "Priority" },
  { key: "phase", label: "Phase" },
  { key: "progress", label: "Progress" },
];

const HIDE_OPTIONS: Array<{ key: PortfolioOptionalColumn; label: string }> = [
  { key: "date", label: "Date" },
  { key: "source", label: "Source" },
  { key: "phase", label: "Phase" },
  { key: "client", label: "Client" },
  { key: "progress", label: "Progress" },
];

interface WorkBoardToolbarProps {
  filters: PortfolioFilters;
  owners: string[];
  sortKey: PortfolioSortKey;
  hiddenColumns: PortfolioOptionalColumn[];
  groupBy: PortfolioGroupBy;
  showTableTools: boolean;
  showColumnTools: boolean;
  canCreate: boolean;
  canCreateProject: boolean;
  canCreateSupport: boolean;
  loading: boolean;
  onFiltersChange: (next: PortfolioFilters) => void;
  onSortChange: (key: PortfolioSortKey) => void;
  onHiddenChange: (next: PortfolioOptionalColumn[]) => void;
  onGroupByChange: (next: PortfolioGroupBy) => void;
  onNewTask: () => void;
  onNewProject: () => void;
  onNewSupport: (kind: ActivityKind) => void;
  onRefresh: () => void;
}

export function WorkBoardToolbar({
  filters,
  owners,
  sortKey,
  hiddenColumns,
  groupBy,
  showTableTools,
  showColumnTools,
  canCreate,
  canCreateProject,
  canCreateSupport,
  loading,
  onFiltersChange,
  onSortChange,
  onHiddenChange,
  onGroupByChange,
  onNewTask,
  onNewProject,
  onNewSupport,
  onRefresh,
}: WorkBoardToolbarProps) {
  const hidden = new Set(hiddenColumns);
  return (
    <div className="pm-board-toolbar" role="toolbar" aria-label="Board tools">
      {canCreate ? (
        <Button type="primary" icon={<LucideIcon name="plus" size={14} />} onClick={onNewTask}>
          New task
        </Button>
      ) : null}
      {showTableTools ? (
        <>
          <Input
            className="pm-toolbar-search"
            allowClear
            prefix={<LucideIcon name="search" size={14} />}
            placeholder="Search"
            aria-label="Search projects"
            value={filters.search}
            onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
          />
          {showColumnTools ? (
            <>
              <Popover trigger="click" placement="bottomLeft" content={(
                <Select
                  className="pm-toolbar-owner"
                  aria-label="Filter by owner"
                  value={filters.owner}
                  popupMatchSelectWidth={false}
                  options={[
                    { label: "Everyone", value: "all" },
                    ...owners.map((owner) => ({ label: owner, value: owner })),
                  ]}
                  onChange={(owner: string) => onFiltersChange({ ...filters, owner })}
                />
              )}>
                <Button className="pm-tool-quiet" type="text" icon={<LucideIcon name="user" size={14} />}>Person</Button>
              </Popover>
              <Popover trigger="click" placement="bottomLeft" content={(
                <PortfolioFiltersBar filters={filters} owners={owners} showSearch={false} onChange={onFiltersChange} />
              )}>
                <Button className="pm-tool-quiet" type="text" icon={<LucideIcon name="filter" size={14} />}>Filter</Button>
              </Popover>
              <Popover trigger="click" placement="bottomLeft" content={(
                <Select
                  aria-label="Sort"
                  value={sortKey}
                  popupMatchSelectWidth={false}
                  options={SORT_OPTIONS.map((option) => ({ label: option.label, value: option.key }))}
                  onChange={(key: PortfolioSortKey) => onSortChange(key)}
                />
              )}>
                <Button className="pm-tool-quiet" type="text" icon={<LucideIcon name="arrow-up-down" size={14} />}>Sort</Button>
              </Popover>
              <Popover trigger="click" placement="bottomLeft" content={(
                <div className="pm-hide-menu">
                  {HIDE_OPTIONS.map((option) => (
                    <Checkbox
                      key={option.key}
                      checked={!hidden.has(option.key)}
                      onChange={(event) => {
                        const next = new Set(hiddenColumns);
                        if (event.target.checked) next.delete(option.key);
                        else next.add(option.key);
                        onHiddenChange([...next]);
                      }}
                    >
                      {option.label}
                    </Checkbox>
                  ))}
                </div>
              )}>
                <Button className="pm-tool-quiet" type="text" icon={<LucideIcon name="eye-off" size={14} />}>Hide</Button>
              </Popover>
              <Popover trigger="click" placement="bottomLeft" content={(
                <Select
                  aria-label="Group by"
                  value={groupBy}
                  popupMatchSelectWidth={false}
                  options={[
                    { label: "Group by status", value: "status" },
                    { label: "Group by owner", value: "owner" },
                    { label: "Group by phase", value: "phase" },
                  ]}
                  onChange={(value: PortfolioGroupBy) => onGroupByChange(value)}
                />
              )}>
                <Button className="pm-tool-quiet" type="text" icon={<LucideIcon name="layers" size={14} />}>Group by</Button>
              </Popover>
            </>
          ) : (
            <Popover
              trigger="click"
              placement="bottomLeft"
              content={(
                <div className="pm-view-options">
                  <Select
                    className="pm-toolbar-owner"
                    aria-label="Filter by owner"
                    value={filters.owner}
                    popupMatchSelectWidth={false}
                    options={[
                      { label: "Everyone", value: "all" },
                      ...owners.map((owner) => ({ label: owner, value: owner })),
                    ]}
                    onChange={(owner: string) => onFiltersChange({ ...filters, owner })}
                  />
                  <PortfolioFiltersBar filters={filters} owners={owners} showSearch={false} onChange={onFiltersChange} />
                </div>
              )}
            >
              <Button className="pm-tool-quiet" type="text">Filter</Button>
            </Popover>
          )}
        </>
      ) : null}
      <Space className="pm-toolbar-end" size={8}>
        <NewProjectMenu
          canCreateProject={canCreateProject}
          canCreateSupport={canCreateSupport}
          onNewProject={onNewProject}
          onNewSupport={onNewSupport}
        />
        <Button aria-label="Refresh" icon={<LucideIcon name="refresh-cw" size={14} />} loading={loading} onClick={onRefresh} />
      </Space>
    </div>
  );
}

export function NewProjectMenu({
  canCreateProject,
  canCreateSupport,
  onNewProject,
  onNewSupport,
  type = "default",
}: {
  canCreateProject: boolean;
  canCreateSupport: boolean;
  onNewProject: () => void;
  onNewSupport: (kind: ActivityKind) => void;
  type?: "default" | "primary";
}) {
  if (!canCreateProject && !canCreateSupport) return null;
  const describe = (title: string, detail: string) => (
    <span className="pm-new-project-item">
      <strong>{title}</strong>
      <span>{detail}</span>
    </span>
  );
  const items = [
    canCreateProject ? { key: "project", label: describe("Validation project", "Protocol, execution, report, endorsement") } : null,
    canCreateSupport ? { key: "TSD", label: describe("TSD", "The same four steps, on a support activity") } : null,
    canCreateSupport ? { key: "RnD", label: describe("RnD", "The same four steps, on a support activity") } : null,
    canCreateSupport ? { key: "Non-Process", label: describe("Non-Process", "The same four steps, on a support activity") } : null,
  ].filter((item): item is { key: string; label: ReturnType<typeof describe> } => Boolean(item));
  return (
    <Dropdown
      trigger={["click"]}
      menu={{
        items,
        onClick: ({ key }) => {
          if (key === "project") onNewProject();
          else if (key === "TSD" || key === "RnD" || key === "Non-Process") onNewSupport(key);
        },
      }}
    >
      <Button type={type}>New Project</Button>
    </Dropdown>
  );
}
