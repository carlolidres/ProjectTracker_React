import { FormOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Input, Modal, Switch, Table, Tabs, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { formatAppDate, formatAppMonth } from "@/lib/date";
import { supportActivitiesRoute } from "@/lib/dashboardDrilldown";
import { ROLE_LABELS } from "@/lib/constants";
import { isMissingValue } from "@/lib/utils";
import {
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
  tab: string;
  search: string;
  showAll: boolean;
  onTabChange: (tab: string) => void;
  onSearchChange: (search: string) => void;
  onShowAllChange: (showAll: boolean) => void;
}

export function WorklistModal({
  open,
  onClose,
  role,
  processItems,
  supportItems,
  onOpenProject,
  tab,
  search,
  showAll,
  onTabChange,
  onSearchChange,
  onShowAllChange,
}: WorklistModalProps) {
  const navigate = useNavigate();

  const preferredFocus = focusGroupForRole(role);
  const preferredSupportKind = supportKindForRole(role);

  const processRows = useMemo(() => {
    const scoped = filterAndSortProcessWorklist(processItems, role, showAll);
    return scoped.filter((row) =>
      matchesSearch(
        [
          row.project_id,
          row.client_name,
          row.project_owner,
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
      title: "",
      key: "open_project",
      dataIndex: "project_id",
      width: 48,
      fixed: "left",
      align: "center",
      render: (projectId: string) => {
        if (isMissingValue(projectId)) {
          return (
            <span className="dashboard-worklist-open-cell is-disabled" aria-hidden>
              <FormOutlined />
            </span>
          );
        }
        return (
          <Button
            type="link"
            size="small"
            className="dashboard-worklist-open-cell"
            icon={<FormOutlined />}
            title={`Open project form ${projectId}`}
            aria-label={`Open project form ${projectId}`}
            onClick={(event) => {
              event.stopPropagation();
              onOpenProject(projectId);
            }}
          />
        );
      },
    },
    { title: "Client", dataIndex: "client_name", width: 180, ellipsis: true },
    { title: "Project Owner", dataIndex: "project_owner", width: 140, ellipsis: true },
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
      title={
        <div className="dashboard-worklist-modal-header">
          <span className="dashboard-worklist-modal-heading">My Worklist</span>
          <Input
            allowClear
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search project, client, product, PO, severity, action…"
            prefix={<SearchOutlined />}
            aria-label="Search worklist"
            className="dashboard-worklist-search"
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          />
        </div>
      }
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
        <label className="dashboard-worklist-all-toggle">
          <span>All Worklist</span>
          <Switch
            checked={showAll}
            onChange={onShowAllChange}
            checkedChildren="On"
            unCheckedChildren="Off"
          />
        </label>
      </div>

      <Tabs
        activeKey={tab}
        onChange={onTabChange}
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
                scroll={{ x: 1240, y: "calc(100vh - 260px)" }}
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
                    // Keep worklist snapshot open so Back restores modal UI state.
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
