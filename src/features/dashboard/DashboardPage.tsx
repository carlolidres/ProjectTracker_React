import {
  AlertOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  ExperimentOutlined,
  FundViewOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Alert, App as AntApp, Button, Card, Empty, Space, Spin, Table, Tag, Tooltip, Typography } from "antd";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth-provider";
import { useMeetingView } from "@/app/meeting-view-provider";
import { ProjectIdLink } from "@/components/common/project-id-link";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardActionStrip } from "@/features/dashboard/components/DashboardActionStrip";
import { DashboardChartsBlock } from "@/features/dashboard/components/DashboardChartsBlock";
import { ProjectQuickDrawer } from "@/features/dashboard/components/ProjectQuickDrawer";
import { WorklistModal } from "@/features/dashboard/components/WorklistModal";
import { getSandboxDashboardData, getSandboxNotifications } from "@/lib/dashboardSandbox";
import {
  pendingCnfDatabaseRoute,
  pendingProtocolDatabaseRoute,
  pendingReportDatabaseRoute,
  projectsDatabaseRoute,
  supportActivitiesRoute,
} from "@/lib/dashboardDrilldown";
import { formatAppDateTime } from "@/lib/date";
import { appendReturnToDashboard } from "@/lib/dashboardReturnTo";
import { isDashboardWorkspaceEnabled } from "@/lib/featureFlags";
import { getDashboardData } from "@/services/dashboardService";
import { listNotifications, refreshAllNotifications } from "@/services/notificationService";
import type { DashboardData, Notification } from "@/types";

const severityColor: Record<string, string> = {
  overdue: "red",
  critical: "volcano",
  high: "orange",
  moderate: "gold",
  low: "green",
};

const finalStatusColor: Record<string, string> = {
  OPEN: "blue",
  CLOSED: "green",
  CANCELLED: "default",
};

const DASHBOARD_HELP =
  "Live project status, due-date monitoring, and department workflow visibility.";

const DASHBOARD_STACK_BREAKPOINT = 1200;

const cnfStatusColor: Record<string, string> = {
  "CNF Creation": "default",
  Routing: "processing",
  "Client Approval": "warning",
  Approved: "success",
};

function dbRoute(params?: Record<string, string | undefined>) {
  return projectsDatabaseRoute(params);
}

export function DashboardPage() {
  const { message } = AntApp.useApp();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === "admin";
  const { isMeetingView, enterMeetingView } = useMeetingView();
  const [data, setData] = useState<DashboardData | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sandboxMode, setSandboxMode] = useState(false);
  const workspaceEnabled = isDashboardWorkspaceEnabled();
  const [quickProjectId, setQuickProjectId] = useState<string | null>(null);
  const [worklistOpen, setWorklistOpen] = useState(false);
  const [pairedMetricsHeight, setPairedMetricsHeight] = useState<number | null>(null);
  const [fgMonthTasksHeight, setFgMonthTasksHeight] = useState<number | null>(null);
  const [notificationsPanelHeight, setNotificationsPanelHeight] = useState<number | null>(null);
  const [dueSoonPanelHeight, setDueSoonPanelHeight] = useState<number | null>(null);
  const metricsStackRef = useRef<HTMLDivElement>(null);
  const primaryTopRef = useRef<HTMLDivElement>(null);
  const finalStatusPanelRef = useRef<HTMLDivElement>(null);
  const fgDeliveryPanelRef = useRef<HTMLDivElement>(null);
  const supportActivitiesPanelRef = useRef<HTMLDivElement>(null);
  const monthlyTrendPanelRef = useRef<HTMLDivElement>(null);
  const dueSoonPanelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await refreshAllNotifications().catch(() => undefined);
      const [dashboard, notifRows] = await Promise.all([
        getDashboardData(),
        listNotifications().catch(() => []),
      ]);
      setData(dashboard);
      setNotifications(notifRows.slice(0, 6));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    setSandboxMode(false);
    await load();
  }, [load]);

  const enableSandbox = useCallback(() => {
    if (!isAdmin) return;
    setData(getSandboxDashboardData());
    setNotifications(getSandboxNotifications());
    setSandboxMode(true);
    setError(null);
    setLoading(false);
    message.success("Sandbox mode enabled with demonstration data.");
  }, [isAdmin, message]);

  useEffect(() => {
    void load();
  }, [load]);

  useLayoutEffect(() => {
    const syncHeights = () => {
      const isStacked = window.innerWidth <= DASHBOARD_STACK_BREAKPOINT;
      if (isStacked) {
        setPairedMetricsHeight(null);
        setFgMonthTasksHeight(null);
        setNotificationsPanelHeight(null);
        setDueSoonPanelHeight(null);
        return;
      }

      if (metricsStackRef.current) {
        setPairedMetricsHeight(metricsStackRef.current.getBoundingClientRect().height);
      }
      if (primaryTopRef.current) {
        setFgMonthTasksHeight(primaryTopRef.current.getBoundingClientRect().height);
      }
      if (finalStatusPanelRef.current && fgDeliveryPanelRef.current) {
        const top = finalStatusPanelRef.current.getBoundingClientRect().top;
        const bottom = fgDeliveryPanelRef.current.getBoundingClientRect().bottom;
        setNotificationsPanelHeight(Math.max(0, bottom - top));
      }
      if (dueSoonPanelRef.current && monthlyTrendPanelRef.current) {
        const dueSoonRect = dueSoonPanelRef.current.getBoundingClientRect();
        const trendRect = monthlyTrendPanelRef.current.getBoundingClientRect();
        setDueSoonPanelHeight(Math.max(0, trendRect.bottom - dueSoonRect.top));
      }
    };

    syncHeights();
    const observer = new ResizeObserver(syncHeights);
    if (metricsStackRef.current) observer.observe(metricsStackRef.current);
    if (primaryTopRef.current) observer.observe(primaryTopRef.current);
    if (finalStatusPanelRef.current) observer.observe(finalStatusPanelRef.current);
    if (fgDeliveryPanelRef.current) observer.observe(fgDeliveryPanelRef.current);
    if (supportActivitiesPanelRef.current) observer.observe(supportActivitiesPanelRef.current);
    if (monthlyTrendPanelRef.current) observer.observe(monthlyTrendPanelRef.current);
    if (dueSoonPanelRef.current) observer.observe(dueSoonPanelRef.current);
    window.addEventListener("resize", syncHeights);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncHeights);
    };
  }, [data, sandboxMode, loading]);

  const kpiCards = useMemo(() => {
    if (!data) return [];
    const { cards } = data;
    return [
      { label: "Projects", browseLabel: "Browse all projects", value: cards.totalProjects, icon: <FolderOpenOutlined />, color: "#2563eb", route: dbRoute() },
      { label: "PO Lines", browseLabel: "Browse all PO lines", value: cards.totalRecords, icon: <DatabaseOutlined />, color: "#0891b2", route: dbRoute() },
      { label: "Open", browseLabel: "Browse open projects", value: cards.totalOpen, icon: <ClockCircleOutlined />, color: "#2563eb", route: dbRoute({ final_status: "OPEN" }) },
      { label: "Closed", browseLabel: "Browse closed projects", value: cards.totalClosed, icon: <CheckCircleOutlined />, color: "#16a34a", route: dbRoute({ final_status: "CLOSED" }) },
      { label: "Overdue", browseLabel: "Browse overdue open projects", value: cards.overdue, icon: <ExclamationCircleOutlined />, color: "#dc2626", route: dbRoute({ final_status: "OPEN", due_window: "overdue" }) },
      { label: "Pending CNF", browseLabel: "Browse pending CNF", value: cards.pendingCnf, icon: <FileTextOutlined />, color: "#d97706", route: pendingCnfDatabaseRoute() },
      { label: "Pending Protocol", browseLabel: "Browse pending protocol", value: cards.pendingProtocol, icon: <AlertOutlined />, color: "#7c3aed", route: pendingProtocolDatabaseRoute() },
      { label: "Pending Report", browseLabel: "Browse pending report", value: cards.pendingReport, icon: <BarChartOutlined />, color: "#0d9488", route: pendingReportDatabaseRoute() },
    ];
  }, [data]);

  const dueDateOverviewCards = useMemo(() => {
    if (!data) return [];
    const counts = data.dueDateCounts;
    return [
      { label: "Within 15 Days", value: counts.within15, window: "within15", tone: "soon" as const },
      { label: "Within 30 Days", value: counts.within30, window: "within30", tone: "soon" as const },
      { label: "More Than 30 Days", value: counts.beyond30, window: "beyond30", tone: "low" as const },
    ];
  }, [data]);

  const fgMonthTaskCards = useMemo(() => {
    if (!data) return [];
    const counts = data.dueDateCounts;
    return [
      { label: "Overdue", value: counts.overdue, window: "overdue", tone: "overdue" as const },
      { label: "Due Today", value: counts.today, window: "today", tone: "today" as const },
      { label: "Within 3 Days", value: counts.within3, window: "within3", tone: "soon" as const },
      { label: "Within 7 Days", value: counts.within7, window: "within7", tone: "soon" as const },
    ];
  }, [data]);

  const urgentRecords = useMemo(
    () => (data?.worklist ?? []).filter((item) => item.priorityRank <= 2).slice(0, 5),
    [data],
  );

  const departmentRoles = useMemo(
    () =>
      data
        ? ([
            ["AM / BM / PL", data.pendingRoleCounts["AM/BM/PL"]],
            ["QA", data.pendingRoleCounts.QA],
            ["PP", data.pendingRoleCounts.PP],
            ["TSD", data.pendingRoleCounts.TSD],
            ["VAL", data.pendingRoleCounts.VAL],
            ["QC", data.pendingRoleCounts.QC],
          ] as const)
        : [],
    [data],
  );

  const openProject = (projectId: string) => {
    if (sandboxMode) {
      message.info("Sandbox records are demonstration data and cannot be opened.");
      return;
    }
    if (workspaceEnabled) {
      setQuickProjectId(projectId);
      return;
    }
    navigate(`/projects?projectId=${encodeURIComponent(projectId)}`);
  };

  const openProjectFull = (projectId: string) => {
    setQuickProjectId(null);
    navigate(`/projects?projectId=${encodeURIComponent(projectId)}`);
  };

  const drillToDatabase = (params?: Record<string, string | undefined>) => {
    if (sandboxMode) {
      message.info("Sandbox mode is for layout preview only. Use Refresh to return to live data.");
      return;
    }
    navigate(dbRoute(params));
  };

  return (
    <AppShell>
      <div className="dashboard-page-heading">
        <div>
          <div className="dashboard-title-row">
            <h1 className="page-title">Dashboard</h1>
            <Tooltip title={DASHBOARD_HELP} placement="right">
              <button type="button" className="dashboard-title-help" aria-label="About the dashboard">
                <QuestionCircleOutlined />
              </button>
            </Tooltip>
          </div>
          {data ? (
            <p className="dashboard-sync-note">Last updated {formatAppDateTime(data.generatedAt)}</p>
          ) : null}
        </div>
        <Space wrap>
          {isAdmin ? (
            <Button
              icon={<ExperimentOutlined />}
              type={sandboxMode ? "primary" : "default"}
              onClick={enableSandbox}
            >
              Sandbox
            </Button>
          ) : null}
          <Button
            icon={<FundViewOutlined />}
            type={isMeetingView ? "primary" : "default"}
            onClick={enterMeetingView}
          >
            Meeting View
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => void refreshDashboard()} loading={loading && !sandboxMode}>
            Refresh
          </Button>
        </Space>
      </div>

      {sandboxMode ? (
        <Alert
          type="info"
          showIcon
          message="Sandbox Mode Active"
          description="Demonstration data is shown so you can preview the populated dashboard layout. Click Refresh to return to live data."
          style={{ marginBottom: 16 }}
        />
      ) : null}

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

      {workspaceEnabled && data ? (
        <DashboardActionStrip
          sandboxMode={sandboxMode}
          onNewProject={() => navigate(appendReturnToDashboard("/projects?new=1"))}
          onBrowseOverdue={() => drillToDatabase({ final_status: "OPEN", due_window: "overdue" })}
          onNewSupport={() => navigate(appendReturnToDashboard("/support-activities?new=1"))}
          onNewCnf={() => navigate(appendReturnToDashboard("/cnf-tracker?new=1"))}
          onOpenWorklist={() => setWorklistOpen(true)}
        />
      ) : null}

      {loading && !data ? (
        <div className="page-loading"><Spin size="large" /></div>
      ) : data ? (
        <>
          <div className="dashboard-workspace">
            <div className="dashboard-primary">
              <div className="dashboard-primary-top" ref={primaryTopRef}>
              {workspaceEnabled ? (
                <Typography.Text type="secondary" className="dashboard-zone-label">
                  Browse
                </Typography.Text>
              ) : null}
              <div className="dashboard-kpi-grid">
                {kpiCards.map((metric) => (
                  <button
                    type="button"
                    key={metric.label}
                    className="dashboard-kpi-card"
                    title={workspaceEnabled ? metric.browseLabel : `View ${metric.label.toLowerCase()}`}
                    onClick={() => {
                      if (sandboxMode) {
                        message.info("Sandbox mode is for layout preview only. Use Refresh to return to live data.");
                        return;
                      }
                      navigate(metric.route);
                    }}
                  >
                    <div className="dashboard-kpi-card-top">
                      <span className="metric-card-icon" style={{ color: metric.color }}>{metric.icon}</span>
                      <div>
                        <span className="dashboard-kpi-label">{metric.label}</span>
                        <strong className="dashboard-kpi-value">{metric.value}</strong>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="dashboard-panel">
                <div className="dashboard-panel-header">
                  {workspaceEnabled ? "Browse by due window" : "Due Date Overview"}
                </div>
                <div className="dashboard-panel-body">
                  <div className="due-date-overview">
                    {dueDateOverviewCards.map((metric) => (
                      <button
                        type="button"
                        key={metric.window}
                        className={`due-date-action due-date-action--${metric.tone}`}
                        onClick={() => drillToDatabase({ final_status: "OPEN", due_window: metric.window })}
                      >
                        <span>{metric.label}</span>
                        <strong>{metric.value}</strong>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              </div>

              <DashboardChartsBlock
                data={data}
                pairedMetricsHeight={pairedMetricsHeight}
                departmentRoles={departmentRoles}
                finalStatusPanelRef={finalStatusPanelRef}
                metricsStackRef={metricsStackRef}
                fgDeliveryPanelRef={fgDeliveryPanelRef}
                supportActivitiesPanelRef={supportActivitiesPanelRef}
                monthlyTrendPanelRef={monthlyTrendPanelRef}
                onDrillCnf={(status) => drillToDatabase({ cnf_status: status })}
                onDrillFinal={(status) => drillToDatabase({ final_status: status })}
                onDrillPending={(pendingRole) =>
                  drillToDatabase({ final_status: "OPEN", pending_role: pendingRole })
                }
                onSelectDelivery={(delivery_status) => {
                  if (sandboxMode) {
                    message.info("Sandbox mode is for layout preview only. Use Refresh to return to live data.");
                    return;
                  }
                  navigate(dbRoute({
                    final_status: "CLOSED",
                    delivery_status,
                    sort: "fg_month",
                    order: "asc",
                  }));
                }}
                onSupportNavigate={(params) => {
                  if (sandboxMode) {
                    message.info("Sandbox mode is for layout preview only. Use Refresh to return to live data.");
                    return;
                  }
                  navigate(supportActivitiesRoute(params));
                }}
                onMonthClick={(monthKey) => {
                  if (sandboxMode) {
                    message.info("Sandbox mode is for layout preview only. Use Refresh to return to live data.");
                    return;
                  }
                  navigate(dbRoute({
                    fg_month: monthKey,
                    final_status: "CLOSED",
                    sort: "fg_month",
                    order: "asc",
                  }));
                }}
              />
            </div>

            <aside className="dashboard-side-panel">
              <div
                className="dashboard-panel dashboard-panel-fg-month-tasks"
                style={fgMonthTasksHeight ? { height: fgMonthTasksHeight } : undefined}
              >
                <div className="dashboard-panel-header">FG Month Tasks</div>
                <div className="dashboard-panel-body dashboard-fg-month-tasks-body">
                  <div className="due-date-overview compact dashboard-fg-month-tasks-list">
                    {fgMonthTaskCards.map((item) => (
                      <button
                        type="button"
                        key={item.window}
                        className={`due-date-action due-date-action--${item.tone}`}
                        onClick={() => drillToDatabase({ final_status: "OPEN", due_window: item.window })}
                      >
                        <span>{item.label}</span>
                        <strong className={item.tone === "overdue" ? "danger-text" : undefined}>
                          {item.value}
                        </strong>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="dashboard-panel dashboard-panel-notifications"
                style={notificationsPanelHeight ? { height: notificationsPanelHeight } : undefined}
              >
                <div className="dashboard-panel-header">
                  {workspaceEnabled ? "My notifications" : "Open Notifications"}
                </div>
                <div className="dashboard-panel-body dashboard-notifications-body">
                  <div className="notification-feed dashboard-notifications-feed">
                    {notifications.length ? notifications.map((item) => (
                      <button
                        type="button"
                        key={item.notification_id}
                        className="notification-feed-item"
                        onClick={() => openProject(item.project_id)}
                      >
                        <strong>{item.title}</strong>
                        <span>{item.message}</span>
                        <time>{formatAppDateTime(item.created_at)}</time>
                      </button>
                    )) : (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No open notifications" />
                    )}
                  </div>
                </div>
              </div>

              <div
                ref={dueSoonPanelRef}
                className="dashboard-panel dashboard-panel-due-soon"
                style={dueSoonPanelHeight ? { height: dueSoonPanelHeight } : undefined}
              >
                <div className="dashboard-panel-header">
                  {workspaceEnabled ? "My due soon" : "Due Soon"}
                </div>
                <div className="dashboard-panel-body dashboard-due-soon-body">
                  <div className="urgent-record-list dashboard-due-soon-list">
                    {urgentRecords.length ? urgentRecords.map((item) => (
                      <button
                        type="button"
                        key={item.recordId}
                        className="urgent-record-action"
                        onClick={() => openProject(item.project_id)}
                      >
                        <strong>{item.po_control_no || item.project_id}</strong>
                        <span>{item.client_name} · {item.product_name}</span>
                        <Tag color={severityColor[item.severity] ?? "default"}>{item.severity}</Tag>
                      </button>
                    )) : (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No due-soon records" />
                    )}
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <Card title="Recent Updates" className="dashboard-section" style={{ marginTop: 16 }}>
            <Table
              className="dashboard-recent-table"
              rowKey="recordId"
              dataSource={data.recentRecords}
              pagination={false}
              scroll={{ x: 900 }}
              columns={[
                {
                  title: "Project",
                  dataIndex: "project_id",
                  render: (projectId: string) => <ProjectIdLink projectId={projectId} />,
                },
                { title: "Client", dataIndex: "client_name" },
                { title: "CNF Ref", dataIndex: "cnf_reference" },
                {
                  title: "CNF Status",
                  dataIndex: "cnf_status",
                  render: (value: string) => <Tag color={cnfStatusColor[value] ?? "default"}>{value}</Tag>,
                },
                {
                  title: "Final Status",
                  dataIndex: "final_status",
                  render: (value: string) => <Tag color={finalStatusColor[value] ?? "default"}>{value}</Tag>,
                },
                { title: "Updated", dataIndex: "updatedAt", render: (v) => formatAppDateTime(v) },
                {
                  title: "Action",
                  key: "action",
                  render: (_: unknown, record: { project_id: string }) => (
                    <Button type="link" size="small" onClick={() => openProject(record.project_id)}>
                      Edit
                    </Button>
                  ),
                },
              ]}
            />
          </Card>
        </>
      ) : (
        <Empty description="No dashboard data available">
          <Button onClick={() => void refreshDashboard()}>Reload dashboard</Button>
        </Empty>
      )}

      {workspaceEnabled ? (
        <ProjectQuickDrawer
          open={Boolean(quickProjectId)}
          projectId={quickProjectId}
          onClose={() => setQuickProjectId(null)}
          onOpenFull={openProjectFull}
          onSaved={() => void refreshDashboard()}
        />
      ) : null}

      {data ? (
        <WorklistModal
          open={worklistOpen}
          onClose={() => setWorklistOpen(false)}
          role={profile?.role}
          processItems={data.worklist}
          supportItems={data.supportWorklist ?? []}
          onOpenProject={(projectId) => {
            setWorklistOpen(false);
            openProject(projectId);
          }}
        />
      ) : null}
    </AppShell>
  );
}
