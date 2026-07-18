import {
  AlertOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Button, Empty, Spin, Tooltip } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FgDeliveryMetricsPanel,
  MonthlyTrendChart,
} from "@/features/dashboard/components/dashboard-charts";
import {
  pendingCnfDatabaseRoute,
  pendingProtocolDatabaseRoute,
  pendingReportDatabaseRoute,
  projectsDatabaseRoute,
  supportActivitiesRoute,
} from "@/lib/dashboardDrilldown";
import { formatAppDateTime } from "@/lib/date";
import { getDashboardData } from "@/services/dashboardService";
import type { DashboardData } from "@/types";

function dbRoute(params?: Record<string, string | undefined>) {
  return projectsDatabaseRoute(params);
}

interface MeetingViewOverlayProps {
  onExit: () => void;
}

export function MeetingViewOverlay({ onExit }: MeetingViewOverlayProps) {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getDashboardData());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const kpiCards = useMemo(() => {
    if (!data) return [];
    const { cards } = data;
    return [
      { label: "Projects", value: cards.totalProjects, icon: <FolderOpenOutlined />, color: "#2563eb", route: dbRoute() },
      { label: "PO Lines", value: cards.totalRecords, icon: <DatabaseOutlined />, color: "#0891b2", route: dbRoute() },
      { label: "Open", value: cards.totalOpen, icon: <ClockCircleOutlined />, color: "#2563eb", route: dbRoute({ final_status: "OPEN" }) },
      { label: "Closed", value: cards.totalClosed, icon: <CheckCircleOutlined />, color: "#16a34a", route: dbRoute({ final_status: "CLOSED" }) },
      { label: "Overdue", value: cards.overdue, icon: <ExclamationCircleOutlined />, color: "#dc2626", route: dbRoute({ final_status: "OPEN", due_window: "overdue" }) },
      { label: "Pending CNF", value: cards.pendingCnf, icon: <FileTextOutlined />, color: "#d97706", route: pendingCnfDatabaseRoute() },
      { label: "Pending Protocol", value: cards.pendingProtocol, icon: <AlertOutlined />, color: "#7c3aed", route: pendingProtocolDatabaseRoute() },
      { label: "Pending Report", value: cards.pendingReport, icon: <BarChartOutlined />, color: "#0d9488", route: pendingReportDatabaseRoute() },
    ];
  }, [data]);

  const dueDateCards = useMemo(() => {
    if (!data) return [];
    const counts = data.dueDateCounts;
    return [
      { label: "Overdue", value: counts.overdue, window: "overdue", tone: "overdue" as const },
      { label: "Due Today", value: counts.today, window: "today", tone: "today" as const },
      { label: "Within 3 Days", value: counts.within3, window: "within3", tone: "soon" as const },
      { label: "Within 7 Days", value: counts.within7, window: "within7", tone: "soon" as const },
      { label: "Within 15 Days", value: counts.within15, window: "within15", tone: "soon" as const },
      { label: "Within 30 Days", value: counts.within30, window: "within30", tone: "soon" as const },
    ];
  }, [data]);

  const drillToDatabase = (params?: Record<string, string | undefined>) => {
    navigate(dbRoute(params));
  };

  return (
    <div className="meeting-view-overlay" role="dialog" aria-modal="true" aria-label="Meeting View dashboard">
      <header className="meeting-view-header">
        <div>
          <h2 className="meeting-view-title">Meeting View</h2>
          {data ? (
            <p className="meeting-view-subtitle">Last updated {formatAppDateTime(data.generatedAt)}</p>
          ) : null}
        </div>
        <div className="meeting-view-header-actions">
          <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
            Refresh
          </Button>
          <Tooltip title="Back to Meeting Dashboard">
            <Button
              icon={<DashboardOutlined />}
              aria-label="Back to Meeting Dashboard"
              onClick={() => navigate("/dashboard")}
            />
          </Tooltip>
          <Button type="primary" icon={<CloseOutlined />} onClick={onExit}>
            Exit Meeting View
          </Button>
        </div>
      </header>

      <div className="meeting-view-body">
        {error ? <div className="meeting-view-error">{error}</div> : null}
        {loading && !data ? (
          <div className="meeting-view-loading">
            <Spin size="large" />
          </div>
        ) : data ? (
          <div className="meeting-view-workspace">
            <div className="meeting-view-kpi dashboard-kpi-grid">
              {kpiCards.map((metric) => (
                <button
                  type="button"
                  key={metric.label}
                  className="dashboard-kpi-card meeting-view-kpi-card"
                  title={`View ${metric.label.toLowerCase()}`}
                  onClick={() => navigate(metric.route)}
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

            <div className="dashboard-panel meeting-view-due-date">
              <div className="dashboard-panel-header">Due Date Overview</div>
              <div className="dashboard-panel-body">
                <div className="due-date-overview meeting-view-due-date-grid">
                  {dueDateCards.map((metric) => (
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

            <div className="meeting-view-bottom-row">
              <div className="dashboard-metrics-stack meeting-view-metrics-stack">
                <div className="dashboard-panel dashboard-panel-compact">
                  <div className="dashboard-panel-header">FG Delivery Performance</div>
                  <div className="dashboard-panel-body">
                    <FgDeliveryMetricsPanel
                      onTime={data.fgDeliveryMetrics.onTime}
                      late={data.fgDeliveryMetrics.late}
                      total={data.fgDeliveryMetrics.total}
                      onSelectDelivery={(delivery_status) =>
                        navigate(dbRoute({
                          final_status: "CLOSED",
                          delivery_status,
                          sort: "fg_month",
                          order: "asc",
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="dashboard-panel dashboard-panel-compact">
                  <div className="dashboard-panel-header">Support Activities</div>
                  <div className="dashboard-panel-body dashboard-support-summary">
                    <button type="button" className="due-date-action" onClick={() => navigate(supportActivitiesRoute())}>
                      <span>Total Activities</span>
                      <strong>{data.supportSummary.total}</strong>
                    </button>
                    <button
                      type="button"
                      className="due-date-action due-date-action--overdue"
                      onClick={() => navigate(supportActivitiesRoute({ due_window: "overdue" }))}
                    >
                      <span>Overdue</span>
                      <strong className="danger-text">{data.supportSummary.overdue}</strong>
                    </button>
                    <button
                      type="button"
                      className="due-date-action due-date-action--soon"
                      onClick={() => navigate(supportActivitiesRoute({ due_window: "within7" }))}
                    >
                      <span>Within 7 Days</span>
                      <strong>{data.supportSummary.dueSoon}</strong>
                    </button>
                    <Button
                      block
                      type="link"
                      className="dashboard-support-link"
                      onClick={() => navigate(supportActivitiesRoute())}
                    >
                      View Support Activities
                    </Button>
                  </div>
                </div>
              </div>

              <div className="dashboard-panel dashboard-panel-monthly-trend meeting-view-monthly-trend">
                <div className="dashboard-panel-body">
                  <MonthlyTrendChart
                    values={data.monthlyTrend}
                    onMonthClick={(monthKey) =>
                      navigate(dbRoute({
                        fg_month: monthKey,
                        final_status: "CLOSED",
                        sort: "fg_month",
                        order: "asc",
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Empty description="No dashboard data available">
            <Button onClick={() => void load()}>Reload</Button>
          </Empty>
        )}
      </div>
    </div>
  );
}
