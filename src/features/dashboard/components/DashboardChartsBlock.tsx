import { Button, Progress } from "antd";
import type { RefObject } from "react";
import {
  FgDeliveryMetricsPanel,
  MonthlyTrendChart,
  SegmentedChart,
} from "@/features/dashboard/components/dashboard-charts";
import type { DashboardData } from "@/types";

export interface DashboardChartsBlockProps {
  data: DashboardData;
  pairedMetricsHeight: number | null;
  departmentRoles: ReadonlyArray<readonly [string, number]>;
  finalStatusPanelRef: RefObject<HTMLDivElement | null>;
  metricsStackRef: RefObject<HTMLDivElement | null>;
  fgDeliveryPanelRef: RefObject<HTMLDivElement | null>;
  supportActivitiesPanelRef: RefObject<HTMLDivElement | null>;
  monthlyTrendPanelRef: RefObject<HTMLDivElement | null>;
  onDrillCnf: (status: string) => void;
  onDrillFinal: (status: string) => void;
  onDrillPending: (pendingRole: string) => void;
  onSelectDelivery: (deliveryStatus: string) => void;
  onSupportNavigate: (params?: Record<string, string | undefined>) => void;
  onMonthClick: (monthKey: string) => void;
}

export function DashboardChartsBlock({
  data,
  pairedMetricsHeight,
  departmentRoles,
  finalStatusPanelRef,
  metricsStackRef,
  fgDeliveryPanelRef,
  supportActivitiesPanelRef,
  monthlyTrendPanelRef,
  onDrillCnf,
  onDrillFinal,
  onDrillPending,
  onSelectDelivery,
  onSupportNavigate,
  onMonthClick,
}: DashboardChartsBlockProps) {
  return (
    <>
      <div className="dashboard-two-col">
        <div className="dashboard-panel">
          <div className="dashboard-panel-header">CNF Status Distribution</div>
          <div className="dashboard-panel-body">
            <SegmentedChart
              entries={Object.entries(data.cnfStatusCounts)}
              centerLabel="records"
              onEntryClick={onDrillCnf}
            />
          </div>
        </div>
        <div className="dashboard-panel" ref={finalStatusPanelRef}>
          <div className="dashboard-panel-header">Final Status Distribution</div>
          <div className="dashboard-panel-body">
            <SegmentedChart
              entries={Object.entries(data.finalStatusCounts).filter(([, count]) => count > 0)}
              centerLabel="records"
              onEntryClick={onDrillFinal}
            />
          </div>
        </div>
      </div>

      <div className="dashboard-two-col dashboard-two-col-balanced">
        <div
          className="dashboard-panel dashboard-panel-department"
          style={pairedMetricsHeight ? { height: pairedMetricsHeight } : undefined}
        >
          <div className="dashboard-panel-header">Department Pending Actions</div>
          <div className="dashboard-panel-body department-pending-panel department-pending-panel-balanced">
            {departmentRoles.map(([role, count]) => {
              const percent = data.cards.totalOpen
                ? Math.round((count / data.cards.totalOpen) * 100)
                : 0;
              const pendingRole = role.replace("AM / BM / PL", "AM/BM/PL");
              return (
                <button
                  type="button"
                  key={role}
                  className="department-action-button"
                  onClick={() => onDrillPending(pendingRole)}
                >
                  <span>{role}</span>
                  <Progress percent={percent} showInfo={false} size="small" />
                  <strong>{count}</strong>
                </button>
              );
            })}
          </div>
        </div>
        <div className="dashboard-metrics-stack" ref={metricsStackRef}>
          <div className="dashboard-panel dashboard-panel-compact" ref={fgDeliveryPanelRef}>
            <div className="dashboard-panel-header">FG Delivery Performance</div>
            <div className="dashboard-panel-body">
              <FgDeliveryMetricsPanel
                onTime={data.fgDeliveryMetrics.onTime}
                late={data.fgDeliveryMetrics.late}
                total={data.fgDeliveryMetrics.total}
                onSelectDelivery={onSelectDelivery}
              />
            </div>
          </div>
          <div className="dashboard-panel dashboard-panel-compact" ref={supportActivitiesPanelRef}>
            <div className="dashboard-panel-header">Support Activities</div>
            <div className="dashboard-panel-body dashboard-support-summary">
              <button type="button" className="due-date-action" onClick={() => onSupportNavigate()}>
                <span>Total Activities</span>
                <strong>{data.supportSummary.total}</strong>
              </button>
              <button
                type="button"
                className="due-date-action due-date-action--overdue"
                onClick={() => onSupportNavigate({ due_window: "overdue" })}
              >
                <span>Overdue</span>
                <strong className="danger-text">{data.supportSummary.overdue}</strong>
              </button>
              <button
                type="button"
                className="due-date-action due-date-action--soon"
                onClick={() => onSupportNavigate({ due_window: "within7" })}
              >
                <span>Within 7 Days</span>
                <strong>{data.supportSummary.dueSoon}</strong>
              </button>
              <Button
                block
                type="link"
                className="dashboard-support-link"
                onClick={() => onSupportNavigate()}
              >
                View Support Activities
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-panel dashboard-panel-monthly-trend" ref={monthlyTrendPanelRef}>
        <div className="dashboard-panel-body">
          <MonthlyTrendChart values={data.monthlyTrend} onMonthClick={onMonthClick} />
        </div>
      </div>
    </>
  );
}
