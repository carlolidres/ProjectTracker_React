import { SearchOutlined } from "@ant-design/icons";
import { Input, Modal, Switch, Table, Tabs, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProjectIdLink } from "@/components/common/project-id-link";
import { formatAppDate, formatAppMonth } from "@/lib/date";
import { supportActivitiesRoute } from "@/lib/dashboardDrilldown";
import { ROLE_LABELS } from "@/lib/constants";
import {
  defaultShowAllWorklist,
  filterAndSortProcessWorklist,
  filterAndSortSupportWorklist,
  focusGroupForRole,
  supportKindForRole,
  supportWorklistTitle,
} from "@/lib/worklistSort";
import type { SupportWorklistItem, UserRole, WorklistItem } from "@/types";

const severityColor: Record<string, string> = {
  overdue: "red",
  critical: "volcano",
  high: "orange",
  medium: "gold",
  moderate: "gold",
  low: "green",
};

function matchesSearch(haystack: string[], query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return haystack.some((part) => String(part ?? "").toLowerCase().includes(needle));
}

export interface WorklistModalProps {
  open: boolean;
  onClose: () => void;
  role: UserRole | undefined;
  processItems: WorklistItem[];
  supportItems: SupportWorklistItem[];
  onOpenProject: (projectId: string) => void;
}

export function WorklistModal({
  open,
  onClose,
  role,
  processItems,
  supportItems,
  onOpenProject,
}: WorklistModalProps) {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  const [tab, setTab] = useState("process");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      setShowAll(defaultShowAllWorklist(role));
      setSearch("");
      setTab(role === "rnd" || role === "tsd" ? "support" : "process");
    }
  }, [open, role]);

  const preferredFocus = focusGroupForRole(role);
  const preferredSupportKind = supportKindForRole(role);

  const processRows = useMemo(() => {
    const scoped = filterAndSortProcessWorklist(processItems, role, showAll);
    return scoped.filter((row) =>
      matchesSearch(
        [
          row.project_id,
          row.client_name,
          row.product_name,
          row.po_control_no,
          row.fg_month,
          row.severity,
          row.focusGroup,
          row.nextAction,
          row.cnf_status,
          row.final_status,
        ],
        search,
      ),
    );
  }, [processItems, role, showAll, search]);

  const supportRows = useMemo(() => {
    const scoped = filterAndSortSupportWorklist(supportItems, role, showAll);
    return scoped.filter((row) =>
      matchesSearch(
        [
          supportWorklistTitle(row),
          row.activity_id,
          row.activity_kind,
          row.Department,
          row.Principal,
          row.Product,
          row.Material,
          row.Line,
          row.Planning_Schedule,
          row.Target_Date,
          row.severity,
          row.status,
        ],
        search,
      ),
    );
  }, [supportItems, role, showAll, search]);

  const roleLabel = role ? (ROLE_LABELS[role] ?? role) : "User";
  const scopeHint = showAll
    ? preferredFocus || preferredSupportKind
      ? `Showing all items; ${roleLabel} items stay first.`
      : "Showing all open worklist items."
    : preferredFocus
      ? `Showing ${preferredFocus} process items${preferredSupportKind ? ` and ${preferredSupportKind} support` : ""}.`
      : preferredSupportKind
        ? `Showing ${preferredSupportKind} support items.`
        : "Showing open worklist items.";

  const processColumns: ColumnsType<WorklistItem> = [
    {
      title: "Project",
      dataIndex: "project_id",
      width: 140,
      render: (projectId: string) => (
        <span onClick={(event) => event.stopPropagation()}>
          <ProjectIdLink projectId={projectId} />
        </span>
      ),
    },
    { title: "Client", dataIndex: "client_name", width: 180, ellipsis: true },
    { title: "Product", dataIndex: "product_name", width: 200, ellipsis: true },
    { title: "PO", dataIndex: "po_control_no", width: 120 },
    {
      title: "FG Month",
      dataIndex: "fg_month",
      width: 110,
      render: (value: string) => formatAppMonth(value),
    },
    {
      title: "Severity",
      dataIndex: "severity",
      width: 110,
      render: (value: string) => <Tag color={severityColor[value] ?? "default"}>{value}</Tag>,
    },
    { title: "Focus Group", dataIndex: "focusGroup", width: 110 },
    { title: "Next Action", dataIndex: "nextAction", ellipsis: true },
  ];

  const supportColumns: ColumnsType<SupportWorklistItem> = [
    {
      title: "Activity",
      key: "title",
      width: 200,
      ellipsis: true,
      render: (_: unknown, row) => supportWorklistTitle(row),
    },
    { title: "Kind", dataIndex: "activity_kind", width: 110 },
    { title: "Department", dataIndex: "Department", width: 120, ellipsis: true },
    {
      title: "Planning Schedule",
      dataIndex: "Planning_Schedule",
      width: 140,
      render: (value: string) => formatAppDate(value),
    },
    {
      title: "Target Date",
      dataIndex: "Target_Date",
      width: 130,
      render: (value: string) => formatAppDate(value),
    },
    {
      title: "Severity",
      dataIndex: "severity",
      width: 110,
      render: (value: string) => <Tag color={severityColor[value] ?? "default"}>{value}</Tag>,
    },
    { title: "Status", dataIndex: "status", width: 110 },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="My Worklist"
      width="98vw"
      style={{ top: 16, maxWidth: "98vw", paddingBottom: 0 }}
      styles={{
        body: { paddingTop: 12, maxHeight: "calc(100vh - 88px)", overflow: "hidden" },
      }}
      footer={null}
      destroyOnHidden
      className="dashboard-worklist-modal"
    >
      <div className="dashboard-worklist-modal-toolbar">
        <div className="dashboard-worklist-modal-meta">
          <Typography.Text strong>{roleLabel}</Typography.Text>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 2 }}>
            {scopeHint}
          </Typography.Paragraph>
        </div>
        <Input
          allowClear
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search project, client, product, PO, severity, action…"
          prefix={<SearchOutlined />}
          aria-label="Search worklist"
          className="dashboard-worklist-search"
        />
        <label className="dashboard-worklist-all-toggle">
          <span>All Worklist</span>
          <Switch
            checked={showAll}
            onChange={setShowAll}
            checkedChildren="On"
            unCheckedChildren="Off"
          />
        </label>
      </div>

      <Tabs
        activeKey={tab}
        onChange={setTab}
        className="dashboard-worklist-tabs"
        items={[
          {
            key: "process",
            label: `Process (${processRows.length})`,
            children: (
              <Table
                size="small"
                rowKey="recordId"
                dataSource={processRows}
                columns={processColumns}
                pagination={false}
                scroll={{ x: 1100, y: "calc(100vh - 260px)" }}
                locale={{ emptyText: "No process worklist items for this scope." }}
                onRow={(record) => ({
                  onClick: () => onOpenProject(record.project_id),
                  style: { cursor: "pointer" },
                })}
              />
            ),
          },
          {
            key: "support",
            label: `Support Activities (${supportRows.length})`,
            children: (
              <Table
                size="small"
                rowKey="activity_id"
                dataSource={supportRows}
                columns={supportColumns}
                pagination={false}
                scroll={{ x: 1100, y: "calc(100vh - 260px)" }}
                locale={{ emptyText: "No support worklist items for this scope." }}
                onRow={(record) => ({
                  onClick: () => {
                    onClose();
                    navigate(supportActivitiesRoute({ activityId: record.activity_id }));
                  },
                  style: { cursor: "pointer" },
                })}
              />
            ),
          },
        ]}
      />
    </Modal>
  );
}
