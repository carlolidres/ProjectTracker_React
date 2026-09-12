import { Button, Dropdown, Empty, Progress, Table, Tag } from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import { useMemo, useState, type ReactNode } from "react";
import { formatAppDate, formatAppMonth } from "@/lib/date";
import {
  BOARD_STATUS_COLORS,
  BOARD_STATUS_ORDER,
  dueDateTone,
  groupPortfolioByBoardStatus,
  sortPortfolioItems,
} from "@/lib/projectManagementPortfolio";
import { WORKFLOW_PHASE_LABELS } from "@/lib/projectManagementWorkflow";
import type { PortfolioBoardStatus, PortfolioItem, PortfolioSortKey } from "@/types";

interface ProjectBoardTableProps {
  items: PortfolioItem[];
  sortKey: PortfolioSortKey;
  sortDirection: "asc" | "desc";
  onSortChange: (key: PortfolioSortKey) => void;
  onOpen: (item: PortfolioItem) => void;
  onOpenSource?: (item: PortfolioItem) => void;
  canOpenSource?: boolean;
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

export function ProjectBoardTable({
  items,
  sortKey,
  sortDirection,
  onSortChange,
  onOpen,
  onOpenSource,
  canOpenSource = false,
}: ProjectBoardTableProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    Completed: true,
    Cancelled: true,
  });
  const grouped = useMemo(() => {
    const next = groupPortfolioByBoardStatus(items);
    for (const status of BOARD_STATUS_ORDER) {
      next[status] = sortPortfolioItems(next[status], sortKey, sortDirection);
    }
    return next;
  }, [items, sortDirection, sortKey]);

  const columns: ColumnsType<PortfolioItem> = [
    {
      title: "Project",
      key: "project",
      sorter: true,
      ellipsis: true,
      minWidth: 180,
      render: (_, item) => (
        <button type="button" className="pm-board-link" onClick={() => onOpen(item)}>
          <strong>{item.product !== "N/A" ? item.product : item.title}</strong>
          <span>{item.uniqueBatch !== "N/A" ? item.uniqueBatch : item.identifier}</span>
        </button>
      ),
    },
    {
      title: "Source",
      width: 110,
      render: (_, item) => (item.sourceType === "process" ? "Project" : "Support"),
    },
    {
      title: "Phase",
      key: "phase",
      sorter: true,
      width: 180,
      render: (_, item) => WORKFLOW_PHASE_LABELS[item.phase],
    },
    {
      title: "Status",
      key: "status",
      sorter: true,
      width: 120,
      render: (_, item) => <Tag color={BOARD_STATUS_COLORS[item.boardStatus]}>{item.boardStatus}</Tag>,
    },
    { title: "Owner", key: "owner", sorter: true, dataIndex: "owner", ellipsis: true },
    {
      title: "Priority",
      key: "priority",
      sorter: true,
      width: 100,
      render: (_, item) => item.priority || "—",
    },
    {
      title: "Progress",
      key: "progress",
      sorter: true,
      width: 120,
      render: (_, item) => <Progress percent={item.progress} size="small" />,
    },
    {
      title: "Due Date",
      key: "due",
      sorter: true,
      width: 120,
      render: (_, item) => (
        <span className={`pm-due pm-due-${dueDateTone(item)}`}>{formatDue(item)}</span>
      ),
    },
    { title: "Client", dataIndex: "client", ellipsis: true, width: 140 },
    {
      title: "Last Update",
      key: "updated",
      sorter: true,
      width: 140,
      render: (_, item) => formatAppDate(item.updatedAt),
    },
    {
      title: "Actions",
      key: "actions",
      width: 88,
      render: (_, item) => (
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              { key: "open", label: "Open" },
              canOpenSource ? { key: "source", label: "Open project record" } : null,
            ].filter(Boolean),
            onClick: ({ key, domEvent }) => {
              domEvent.stopPropagation();
              if (key === "open") onOpen(item);
              if (key === "source" && onOpenSource) onOpenSource(item);
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
      {BOARD_STATUS_ORDER.map((status) => {
        const rows = grouped[status];
        if (rows.length === 0) return null;
        const isCollapsed = Boolean(collapsed[status]);
        return (
          <ProjectGroupSection
            key={status}
            status={status}
            count={rows.length}
            collapsed={isCollapsed}
            onToggle={() => setCollapsed((current) => ({ ...current, [status]: !current[status] }))}
          >
            {isCollapsed ? null : (
              <Table
                size="small"
                rowKey="id"
                columns={columns}
                dataSource={rows}
                pagination={false}
                scroll={{ x: 1480 }}
                onChange={handleChange}
                onRow={(item) => ({
                  onClick: () => onOpen(item),
                  style: { cursor: "pointer" },
                })}
              />
            )}
          </ProjectGroupSection>
        );
      })}
    </div>
  );
}

export function ProjectGroupSection({
  status,
  count,
  collapsed,
  onToggle,
  children,
}: {
  status: PortfolioBoardStatus;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  return (
    <section className={`pm-group pm-group-${status.toLowerCase().replace(" ", "-")}`} aria-labelledby={`pm-group-${status}`}>
      <button
        type="button"
        className="pm-group-toggle"
        aria-expanded={!collapsed}
        onClick={onToggle}
      >
        <span className="pm-group-marker" aria-hidden="true" />
        <span id={`pm-group-${status}`}>
          {collapsed ? "▶" : "▼"} {status}
        </span>
        <span className="pm-status-count">{count}</span>
      </button>
      {children}
    </section>
  );
}
