import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  FullscreenOutlined,
  InboxOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Modal,
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import type { TableProps } from "antd";
import dayjs from "dayjs";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import {
  getCNFDueDateItems,
  getCNFKPI,
  getDashboardSummary,
  getSampleDashboardData,
  recordMatchesDueWindow,
} from "@/lib/cnf";
import { formatAppDate, formatAppDateTime } from "@/lib/date";
import { handleScrollableArrowKeys } from "@/lib/keyboard-scroll";
import type {
  CNFDashboardSummary,
  CNFDueWindow,
  CNFOwnerRole,
  CNFRecord,
  CNFStatus,
  KPIResult,
  OverallStatus,
} from "@/types";

interface MeetingFilters {
  cnfStatus?: CNFStatus;
  ownerRole?: CNFOwnerRole;
  overallStatuses?: OverallStatus[];
  dueWindow?: CNFDueWindow;
}

type MeetingDrilldown =
  | { type: "cnf-list"; title: string; filters: MeetingFilters }
  | { type: "cnf-record"; record: CNFRecord }
  | null;

interface KpiCard {
  label: string;
  value: number;
  icon: ReactNode;
  color: string;
  route: string;
  meetingFilters: MeetingFilters;
}

const cnfStatusColor: Record<CNFStatus, string> = {
  "Internal Routing": "blue",
  "For Client Approval": "gold",
  "CNF Approved.": "green",
  Others: "default",
};

const overallStatusColor: Record<OverallStatus, string> = {
  open: "blue",
  in_progress: "cyan",
  completed: "green",
  closed: "default",
  overdue: "red",
};

const chartColors = ["#2563eb", "#f59e0b", "#22c55e", "#8b5cf6", "#ef4444"];

function formatStatusLabel(value: string) {
  return value
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDashboardError(error: { code?: string; message: string }) {
  const isPermissionError = error.code === "42501" || /permission denied|row-level security|row level security|rls/i.test(error.message);
  return isPermissionError
    ? "Role-based access blocked Dashboard data. Verify the active profile, table permissions, and access policies."
    : error.message;
}

function getKpiCards(summary: CNFDashboardSummary): KpiCard[] {
  return [
    {
      label: "Total CNF Records",
      value: summary.records.length,
      icon: <DatabaseOutlined />,
      color: "#2563eb",
      route: "/cnf",
      meetingFilters: {},
    },
    {
      label: "Internal Routing",
      value: summary.cnfStatusCounts["Internal Routing"],
      icon: <FileTextOutlined />,
      color: "#2563eb",
      route: "/cnf?status=Internal%20Routing",
      meetingFilters: { cnfStatus: "Internal Routing" },
    },
    {
      label: "For Client Approval",
      value: summary.cnfStatusCounts["For Client Approval"],
      icon: <ClockCircleOutlined />,
      color: "#d48806",
      route: "/cnf?status=For%20Client%20Approval",
      meetingFilters: { cnfStatus: "For Client Approval" },
    },
    {
      label: "Pending PP",
      value: summary.pendingRoleCounts.PP,
      icon: <InboxOutlined />,
      color: "#1677ff",
      route: "/cnf?ownerRole=PP",
      meetingFilters: { ownerRole: "PP" },
    },
    {
      label: "Pending TSD",
      value: summary.pendingRoleCounts.TSD,
      icon: <InboxOutlined />,
      color: "#7c3aed",
      route: "/cnf?ownerRole=TSD",
      meetingFilters: { ownerRole: "TSD" },
    },
    {
      label: "Pending VAL",
      value: summary.pendingRoleCounts.VAL,
      icon: <InboxOutlined />,
      color: "#16a34a",
      route: "/cnf?ownerRole=VAL",
      meetingFilters: { ownerRole: "VAL" },
    },
    {
      label: "Overdue Items",
      value: summary.dueDateCounts.overdue,
      icon: <ExclamationCircleOutlined />,
      color: "#dc2626",
      route: "/cnf?overdue=true",
      meetingFilters: { dueWindow: "overdue" },
    },
    {
      label: "Completed / Closed",
      value: summary.overallStatusCounts.completed + summary.overallStatusCounts.closed,
      icon: <CheckCircleOutlined />,
      color: "#16a34a",
      route: "/cnf?status=Closed",
      meetingFilters: { overallStatuses: ["completed", "closed"] },
    },
  ];
}

function SegmentedChart({
  entries,
  centerLabel,
  onEntryClick,
}: Readonly<{ entries: Array<[string, number]>; centerLabel: string; onEntryClick?: (label: string) => void }>) {
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  let cursor = 0;
  const segments = entries.map(([, value], index) => {
    const start = cursor;
    cursor += total > 0 ? (value / total) * 100 : 0;
    return `${chartColors[index % chartColors.length]} ${start}% ${cursor}%`;
  });
  const style = { "--chart-segments": total > 0 ? `conic-gradient(${segments.join(",")})` : "#dbe4f0" } as CSSProperties;

  return (
    <div className="dashboard-chart-layout">
      <div className="segmented-donut" style={style}>
        <div>
          <strong>{total}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>
      <div className="chart-legend">
        {entries.map(([label, value], index) => (
          <button
            type="button"
            key={label}
            className={onEntryClick ? "chart-legend-action" : undefined}
            disabled={!onEntryClick}
            onClick={() => onEntryClick?.(label)}
          >
            <span className="chart-legend-dot" style={{ background: chartColors[index % chartColors.length] }} />
            <span>{formatStatusLabel(label)}</span>
            <strong>{value}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

function MonthlyTrendChart({ values }: Readonly<{ values: Array<{ label: string; count: number }> }>) {
  const max = Math.max(1, ...values.map((item) => item.count));
  const points = values.map((item, index) => ({
    ...item,
    x: 45 + index * (510 / Math.max(1, values.length - 1)),
    y: 135 - (item.count / max) * 100,
  }));
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return (
    <div className="monthly-trend-chart">
      <svg viewBox="0 0 600 180" role="img" aria-label="Monthly completed CNF trend">
        {[35, 85, 135].map((y) => (
          <line key={y} x1="45" x2="555" y1={y} y2={y} className="trend-grid-line" />
        ))}
        <path d={path} className="trend-line-path" />
        {points.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              className={index === points.length - 1 ? "trend-point trend-point-latest" : "trend-point"}
            >
              <title>{`${point.label}: ${point.count} completed`}</title>
            </circle>
            <text x={point.x} y="164" textAnchor="middle" className="trend-month-label">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function FGDeliveryMetrics({ summary }: Readonly<{ summary: CNFDashboardSummary }>) {
  const delivered = summary.finalChildren.filter((item) => item.actual_fg_delivery_date && item.fg_delivery_due_date);
  const fgDeliveredOnTime = delivered.filter((item) => item.actual_fg_delivery_date! <= item.fg_delivery_due_date!).length;
  const fgDeliveredLate = delivered.filter((item) => item.actual_fg_delivery_date! > item.fg_delivery_due_date!).length;
  const totalFGDelivered = fgDeliveredOnTime + fgDeliveredLate;
  const onTimePercent = totalFGDelivered > 0 ? (fgDeliveredOnTime / totalFGDelivered) * 100 : 0;
  const latePercent = totalFGDelivered > 0 ? (fgDeliveredLate / totalFGDelivered) * 100 : 0;

  return (
    <div className="completion-metrics-card">
      <div className="completion-metrics-legend">
        <div>
          <span>FG Delivered On Time</span>
          <strong className="completion-metrics-value">{fgDeliveredOnTime} ({onTimePercent.toFixed(0)}%)</strong>
        </div>
        <div>
          <span>FG Delivered Late</span>
          <strong className="completion-metrics-value danger-text">{fgDeliveredLate} ({latePercent.toFixed(0)}%)</strong>
        </div>
      </div>
      <div
        className={`completion-metrics-bar ${totalFGDelivered === 0 ? "completion-metrics-bar--empty" : ""}`}
        role="img"
        aria-label={`${onTimePercent.toFixed(0)} percent FG delivered on time and ${latePercent.toFixed(0)} percent FG delivered late`}
        title={`${fgDeliveredOnTime} FG delivered on time; ${fgDeliveredLate} FG delivered late`}
      >
        <span
          className="completion-metrics-segment completion-metrics-segment--on-time"
          style={{ width: `${onTimePercent}%` }}
        />
        <span
          className="completion-metrics-segment completion-metrics-segment--late"
          style={{ width: `${latePercent}%` }}
        />
      </div>
    </div>
  );
}

function getUrgentRecords(summary: CNFDashboardSummary) {
  const today = dayjs().startOf("day");
  return summary.records
    .filter((record) => record.overall_status !== "completed" && record.overall_status !== "closed")
    .map((record) => {
      const dates = getCNFDueDateItems(record, summary.batches).map((item) => dayjs(item.date).startOf("day").diff(today, "day"));
      return { record, days: dates.length > 0 ? Math.min(...dates) : Number.POSITIVE_INFINITY };
    })
    .filter((item) => Number.isFinite(item.days))
    .sort((first, second) => first.days - second.days)
    .slice(0, 5);
}

function filterMeetingRecords(summary: CNFDashboardSummary, filters: MeetingFilters) {
  return summary.records.filter((record) => {
    if (filters.cnfStatus && record.cnf_status !== filters.cnfStatus) return false;
    if (filters.ownerRole && record.current_owner_role !== filters.ownerRole) return false;
    if (filters.overallStatuses && !filters.overallStatuses.includes(record.overall_status)) return false;
    if (filters.dueWindow && !recordMatchesDueWindow(record, summary.batches, filters.dueWindow)) return false;
    return true;
  });
}

export function DashboardPage() {
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [summary, setSummary] = useState<CNFDashboardSummary | null>(null);
  const [kpi, setKpi] = useState<KPIResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMeetingViewOpen, setIsMeetingViewOpen] = useState(false);
  const [meetingDrilldown, setMeetingDrilldown] = useState<MeetingDrilldown>(null);
  const [sampleMode, setSampleMode] = useState(false);
  const [sampleStats, setSampleStats] = useState({ taskCount: 0, notificationCount: 0 });
  const isAdmin = profile?.role === "Admin" && profile.status === "active";

  const loadDashboard = useCallback(async () => {
    if (!profile) return;
    setIsLoading(true);
    setError(null);
    const [dashboardResult, kpiResult] = await Promise.all([getDashboardSummary(profile?.role), getCNFKPI(profile, "overall")]);
    setIsLoading(false);

    if (dashboardResult.error || !dashboardResult.data || kpiResult.error || !kpiResult.data) {
      const dashboardError = dashboardResult.error ?? kpiResult.error;
      setError(dashboardError ? formatDashboardError(dashboardError) : "Dashboard data could not be loaded.");
      setSummary(null);
      setKpi(null);
      return;
    }

    setSummary(dashboardResult.data);
    setKpi(kpiResult.data);
  }, [profile]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!isMeetingViewOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMeetingDrilldown(null);
        setIsMeetingViewOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isMeetingViewOpen]);

  const kpiCards = useMemo(() => (summary ? getKpiCards(summary) : []), [summary]);
  const urgentRecords = useMemo(() => (summary ? getUrgentRecords(summary) : []), [summary]);
  const dueDateCards: Array<{ label: string; value: number; window: CNFDueWindow }> = summary
    ? [
        { label: "Due Today", value: summary.dueDateCounts.today, window: "today" },
        { label: "Due Within 3 Days", value: summary.dueDateCounts.within3Days, window: "3" },
        { label: "Due Within 7 Days", value: summary.dueDateCounts.within7Days, window: "7" },
        { label: "Due Within 15 Days", value: summary.dueDateCounts.within15Days, window: "15" },
        { label: "Due Within 30 Days", value: summary.dueDateCounts.within30Days, window: "30" },
      ]
    : [];

  const monthlyTrend = useMemo(() => {
    if (!summary) return [];
    return Array.from({ length: 6 }, (_, offset) => {
      const month = dayjs().subtract(5 - offset, "month");
      return {
        label: month.format("MMM"),
        count: summary.records.filter(
          (record) =>
            (record.overall_status === "completed" || record.overall_status === "closed") &&
            dayjs(record.updated_at).format("YYYY-MM") === month.format("YYYY-MM"),
        ).length,
      };
    });
  }, [summary]);

  function enableSampleMode() {
    if (!profile || !isAdmin) return;
    const sampleData = getSampleDashboardData(profile);
    setSummary(sampleData.summary);
    setKpi(sampleData.kpi);
    setSampleStats({ taskCount: sampleData.taskCount, notificationCount: sampleData.notificationCount });
    setSampleMode(true);
    setError(null);
    message.success("Sample Mode enabled. No database records were created.");
  }

  async function refreshDashboard() {
    setSampleMode(false);
    setSampleStats({ taskCount: 0, notificationCount: 0 });
    setMeetingDrilldown(null);
    await loadDashboard();
  }

  function openMeetingList(title: string, filters: MeetingFilters) {
    setMeetingDrilldown({ type: "cnf-list", title, filters });
  }

  function exitMeetingView() {
    setMeetingDrilldown(null);
    setIsMeetingViewOpen(false);
  }

  function openRecord(record: CNFRecord) {
    if (sampleMode) {
      message.info("Sample Mode records are demonstration data and do not have editable database forms.");
      return;
    }
    navigate(`/cnf/${record.id}/edit`);
  }

  const recentColumns: TableProps<CNFRecord>["columns"] = [
    {
      title: "CNF Number",
      dataIndex: "cnf_reference",
      key: "cnf_reference",
      width: 150,
      render: (value: string, record) => (
        <Button type="link" onClick={() => openRecord(record)} style={{ padding: 0 }}>
          {value}
        </Button>
      ),
    },
    { title: "Client", dataIndex: "client_name", key: "client_name", width: 150 },
    { title: "Product", dataIndex: "product", key: "product", width: 170 },
    {
      title: "Status",
      dataIndex: "cnf_status",
      key: "cnf_status",
      width: 160,
      render: (value: CNFStatus) => <Tag color={cnfStatusColor[value]}>{value}</Tag>,
    },
    {
      title: "Owner",
      dataIndex: "current_owner_role",
      key: "current_owner_role",
      width: 100,
      render: (value: CNFOwnerRole) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: "Due Date",
      dataIndex: "fg_delivery_due_date",
      key: "fg_delivery_due_date",
      width: 130,
      render: (value: string | null) => formatAppDate(value),
    },
  ];

  const meetingListColumns: TableProps<CNFRecord>["columns"] = [
    {
      title: "CNF Number",
      dataIndex: "cnf_reference",
      render: (value: string, record) => (
        <Button type="link" onClick={() => setMeetingDrilldown({ type: "cnf-record", record })} style={{ padding: 0 }}>
          {value}
        </Button>
      ),
    },
    { title: "Client", dataIndex: "client_name" },
    { title: "Product", dataIndex: "product" },
    {
      title: "Status",
      dataIndex: "cnf_status",
      render: (value: CNFStatus) => <Tag color={cnfStatusColor[value]}>{value}</Tag>,
    },
    { title: "Owner", dataIndex: "current_owner_role" },
    { title: "Due Date", dataIndex: "fg_delivery_due_date", render: (value: string | null) => formatAppDate(value) },
  ];

  let meetingBody: ReactNode = null;
  if (summary && meetingDrilldown?.type === "cnf-list") {
    const filteredRecords = filterMeetingRecords(summary, meetingDrilldown.filters);
    meetingBody = (
      <Card
        title={meetingDrilldown.title}
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => setMeetingDrilldown(null)}>
            Go Back to Meeting View
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={meetingListColumns}
          dataSource={filteredRecords}
          pagination={false}
          scroll={{ x: 760 }}
          locale={{ emptyText: <Empty description="No CNF records match this view" /> }}
        />
      </Card>
    );
  } else if (meetingDrilldown?.type === "cnf-record") {
    const record = meetingDrilldown.record;
    meetingBody = (
      <Card
        title={`CNF ${record.cnf_reference}`}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => setMeetingDrilldown(null)}>
              Go Back to Meeting View
            </Button>
            <Button type="primary" disabled={sampleMode} onClick={() => openRecord(record)}>
              Open Edit Form
            </Button>
          </Space>
        }
      >
        <Descriptions bordered column={{ xs: 1, md: 2 }}>
          <Descriptions.Item label="CNF Number">{record.cnf_reference}</Descriptions.Item>
          <Descriptions.Item label="Client">{record.client_name}</Descriptions.Item>
          <Descriptions.Item label="Product">{record.product}</Descriptions.Item>
          <Descriptions.Item label="Batch No.">{record.batch_no}</Descriptions.Item>
          <Descriptions.Item label="CNF Status">{record.cnf_status}</Descriptions.Item>
          <Descriptions.Item label="Overall Status">{formatStatusLabel(record.overall_status)}</Descriptions.Item>
          <Descriptions.Item label="Current Owner">{record.current_owner_role}</Descriptions.Item>
          <Descriptions.Item label="Due Date">{formatAppDate(record.fg_delivery_due_date)}</Descriptions.Item>
          <Descriptions.Item label="Change Description" span={2}>{record.change_description}</Descriptions.Item>
        </Descriptions>
      </Card>
    );
  } else if (summary) {
    meetingBody = (
      <>
        <div className="dashboard-kpi-grid meeting-kpi-grid">
          {kpiCards.map((metric) => (
            <Card
              key={metric.label}
              size="small"
              className="meeting-action-card"
              role="button"
              tabIndex={0}
              onClick={() => openMeetingList(metric.label, metric.meetingFilters)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") openMeetingList(metric.label, metric.meetingFilters);
              }}
            >
              <Statistic title={metric.label} value={metric.value} valueStyle={{ color: metric.color }} />
            </Card>
          ))}
        </div>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Card title="CNF Status">
              <SegmentedChart
                entries={Object.entries(summary.cnfStatusCounts)}
                centerLabel="records"
                onEntryClick={(status) => openMeetingList(formatStatusLabel(status), { cnfStatus: status as CNFStatus })}
              />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Due-Date Status">
              <div className="due-date-overview">
                {dueDateCards.map((item) => (
                  <button
                    type="button"
                    className="due-date-action"
                    key={item.window}
                    onClick={() => openMeetingList(item.label, { dueWindow: item.window })}
                  >
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </button>
                ))}
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Department Pending Actions">
              {(["PP", "TSD", "VAL"] as const).map((role) => (
                <button
                  type="button"
                  className="department-action-row department-action-button"
                  key={role}
                  onClick={() => openMeetingList(`Pending ${role}`, { ownerRole: role })}
                >
                  <span>Pending {role}</span>
                  <Progress
                    percent={summary.records.length ? Math.round((summary.pendingRoleCounts[role] / summary.records.length) * 100) : 0}
                    format={() => summary.pendingRoleCounts[role]}
                  />
                </button>
              ))}
            </Card>
          </Col>
        </Row>
        <Card title="Top 5 Overdue / Due-Soon CNFs">
          <div className="urgent-record-list">
            {urgentRecords.map(({ record, days }) => (
              <button
                type="button"
                key={record.id}
                onClick={() => setMeetingDrilldown({ type: "cnf-record", record })}
              >
                <strong>{record.cnf_reference}</strong>
                <span>{record.product}</span>
                <Tag color={days < 0 ? "red" : days === 0 ? "volcano" : "gold"}>
                  {days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? "Due today" : `Due in ${days} days`}
                </Tag>
              </button>
            ))}
          </div>
        </Card>
      </>
    );
  }

  return (
    <AppShell notificationSampleMode={sampleMode}>
      <div className="dashboard-page-heading">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">Live CNF status and due-date monitoring with validated workflow visibility.</p>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={() => void refreshDashboard()} loading={isLoading}>Refresh</Button>
          {isAdmin ? (
            <Button icon={<ExperimentOutlined />} type={sampleMode ? "primary" : "default"} onClick={enableSampleMode}>
              Sample
            </Button>
          ) : null}
          <Button type="primary" icon={<FullscreenOutlined />} onClick={() => setIsMeetingViewOpen(true)} disabled={!summary}>
            Meeting View
          </Button>
        </Space>
      </div>

      {sampleMode ? (
        <Alert
          type="info"
          showIcon
          message="Sample Mode Active"
          description={`Dashboard is displaying demonstration data: ${sampleStats.taskCount} sample tasks and ${sampleStats.notificationCount} sample notifications. Refresh to return to live data.`}
          style={{ marginBottom: 16 }}
        />
      ) : null}

      {error ? <Alert type="error" showIcon message="Dashboard data failed to load" description={error} style={{ marginBottom: 16 }} /> : null}

      {isLoading ? (
        <div className="auth-page"><Spin aria-label="Loading dashboard" /></div>
      ) : summary ? (
        <>
          <div className="dashboard-workspace">
            <div className="dashboard-primary">
              <div className="dashboard-kpi-grid">
                {kpiCards.map((metric) => (
                  <Card
                    key={metric.label}
                    className="dashboard-kpi-card dashboard-kpi-card-action"
                    role="link"
                    tabIndex={0}
                    title={`View ${metric.label.toLowerCase()}`}
                    onClick={() => navigate(metric.route)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(metric.route);
                      }
                    }}
                  >
                    <Space align="center" size={14}>
                      <span className="metric-card-icon" style={{ color: metric.color }}>{metric.icon}</span>
                      <Statistic title={metric.label} value={metric.value} />
                    </Space>
                  </Card>
                ))}
              </div>

              <Card title="Due Date Overview" className="dashboard-section dashboard-due-date-card">
                <div className="due-date-overview">
                  {dueDateCards.map((metric) => (
                    <button
                      type="button"
                      key={metric.window}
                      className="due-date-action"
                      title={`Open Database filtered to ${metric.label.toLowerCase()}`}
                      aria-label={`View ${metric.value} CNF records ${metric.label.toLowerCase()}`}
                      onClick={() => navigate(`/cnf?dueWindow=${metric.window}`)}
                    >
                      <span>{metric.label}</span>
                      <strong>{metric.value}</strong>
                    </button>
                  ))}
                </div>
              </Card>

              <Row gutter={[16, 16]} className="dashboard-section dashboard-equal-row">
                <Col xs={24} xl={12}>
                  <Card title="CNF Status Distribution" className="dashboard-equal-card">
                    <SegmentedChart
                      entries={Object.entries(summary.cnfStatusCounts)}
                      centerLabel="records"
                      onEntryClick={(status) => navigate(`/cnf?cnfStatus=${encodeURIComponent(status)}`)}
                    />
                  </Card>
                </Col>
                <Col xs={24} xl={12}>
                  <Card title="Overall Status Summary" className="dashboard-equal-card">
                    <SegmentedChart
                      entries={Object.entries(summary.overallStatusCounts)}
                      centerLabel="records"
                      onEntryClick={(status) => navigate(`/cnf?overallStatus=${encodeURIComponent(status)}`)}
                    />
                  </Card>
                </Col>
              </Row>

              <Row gutter={[16, 16]} className="dashboard-section dashboard-equal-row">
                <Col xs={24} lg={12}>
                  <Card title="Department Pending Actions" className="dashboard-equal-card">
                    {(["PP", "TSD", "VAL"] as const).map((role) => (
                      <button
                        type="button"
                        className="department-action-row department-action-button"
                        key={role}
                        onClick={() => navigate(`/cnf?ownerRole=${role}`)}
                      >
                        <span>Pending {role}</span>
                        <Progress
                          percent={summary.records.length ? Math.round((summary.pendingRoleCounts[role] / summary.records.length) * 100) : 0}
                          format={() => summary.pendingRoleCounts[role]}
                        />
                      </button>
                    ))}
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="FG Delivery Metrics" className="dashboard-equal-card">
                    <FGDeliveryMetrics summary={summary} />
                  </Card>
                </Col>
              </Row>

              <Card title="Monthly Trend (Completed)" className="dashboard-section dashboard-trend-card">
                {monthlyTrend.some((item) => item.count > 0) ? (
                  <MonthlyTrendChart values={monthlyTrend} />
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No completed trend data yet" />
                )}
              </Card>
            </div>

            <aside className="dashboard-side-panel">
              <Card title="My Tasks" className="dashboard-operational-card">
                <div className="due-date-overview compact">
                  <button type="button" className="due-date-action" onClick={() => navigate("/my-tasks?dueWindow=overdue")}>
                    <span>Currently Overdue</span><strong className="danger-text">{summary.dueDateCounts.overdue}</strong>
                  </button>
                  {dueDateCards.map((item) => (
                    <button type="button" className="due-date-action" key={item.window} onClick={() => navigate(`/my-tasks?dueWindow=${item.window}`)}>
                      <span>{item.label}</span><strong>{item.value}</strong>
                    </button>
                  ))}
                </div>
                <Button block type="link" onClick={() => navigate("/my-tasks")}>View My Tasks</Button>
              </Card>
              <Card title="Missing Required Fields" className="dashboard-operational-card">
                <div className="due-date-overview compact">
                  {[
                    ["AM / BM / NB / PL", summary.missingFieldCounts.commercial],
                    ["PP", summary.missingFieldCounts.PP],
                    ["TSD", summary.missingFieldCounts.TSD],
                    ["VAL", summary.missingFieldCounts.VAL],
                  ].map(([label, count]) => (
                    <button type="button" className="due-date-action" key={label} onClick={() => navigate("/my-tasks")}>
                      <span>{label}</span><strong>{count}</strong>
                    </button>
                  ))}
                  <button type="button" className="due-date-action" onClick={() => navigate("/my-tasks")}>
                    <span>Total Missing Required Fields</span><strong className="danger-text">{summary.missingFieldCounts.total}</strong>
                  </button>
                </div>
              </Card>
              <Card title="Due Soon" className="dashboard-operational-card">
                <div className="urgent-record-list keyboard-scroll-region" tabIndex={0} onKeyDown={handleScrollableArrowKeys}>
                  {urgentRecords.length ? urgentRecords.map(({ record, days }) => (
                    <button type="button" key={record.id} onClick={() => openRecord(record)}>
                      <strong>{record.cnf_reference}</strong>
                      <span>{record.product}</span>
                      <Tag color={days < 0 ? "red" : days === 0 ? "volcano" : "gold"}>
                        {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : `${days}d`}
                      </Tag>
                    </button>
                  )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No due-soon records" />}
                </div>
              </Card>
            </aside>
          </div>

          <Card title="Recent CNF Records" className="dashboard-section">
            <Table
              rowKey="id"
              columns={recentColumns}
              dataSource={summary.recentRecords}
              pagination={false}
              size="small"
              scroll={{ x: 860 }}
              locale={{ emptyText: <Empty description="No recent CNF records found" /> }}
            />
          </Card>
        </>
      ) : (
        <Empty description="No dashboard data available"><Button onClick={() => void refreshDashboard()}>Reload dashboard</Button></Empty>
      )}

      <Modal
        open={isMeetingViewOpen}
        onCancel={exitMeetingView}
        footer={null}
        closable={false}
        width="100vw"
        className="meeting-view-modal"
        destroyOnHidden={false}
      >
        <div className="meeting-view-content">
          <div className="meeting-view-heading">
            <div>
              <Space align="center" wrap>
                <Typography.Title level={2}>CNF Executive Meeting View</Typography.Title>
                {sampleMode ? <Tag color="blue">Sample Mode Active</Tag> : null}
              </Space>
              <Typography.Text type="secondary">
                Validated workflow visibility as of {formatAppDateTime(dayjs())}
              </Typography.Text>
            </div>
            <Button onClick={exitMeetingView}>Exit Meeting View</Button>
          </div>
          {meetingBody}
        </div>
      </Modal>
    </AppShell>
  );
}
