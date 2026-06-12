import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Alert, Button, Card, Col, Empty, Row, Space, Spin, Statistic, Table, Tag, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { formatAppDate, formatAppDateTime } from "@/lib/date";
import { getDashboardData } from "@/services/dashboardService";
import type { DashboardData } from "@/types";

const severityColor: Record<string, string> = {
  overdue: "red",
  critical: "volcano",
  high: "orange",
  moderate: "gold",
  low: "green",
};

export function DashboardPage() {
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

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <Typography.Title level={3}>Dashboard</Typography.Title>
          <Typography.Text type="secondary">
            Real-time KPI monitoring for CNF implementation and support activities.
          </Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
          Refresh
        </Button>
      </div>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

      {loading && !data ? (
        <div className="page-loading"><Spin size="large" /></div>
      ) : data ? (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Row gutter={[16, 16]}>
            {[
              { title: "Projects", value: data.cards.totalProjects, icon: <DatabaseOutlined /> },
              { title: "PO Lines", value: data.cards.totalRecords, icon: <DatabaseOutlined /> },
              { title: "Open", value: data.cards.totalOpen, icon: <ClockCircleOutlined /> },
              { title: "Closed", value: data.cards.totalClosed, icon: <CheckCircleOutlined /> },
              { title: "Overdue", value: data.cards.overdue, icon: <ExclamationCircleOutlined /> },
              { title: "Due in 7 Days", value: data.cards.dueWithin7, icon: <ClockCircleOutlined /> },
              { title: "Pending CNF", value: data.cards.pendingCnf, icon: <ExclamationCircleOutlined /> },
              { title: "Pending Protocol", value: data.cards.pendingProtocol, icon: <ExclamationCircleOutlined /> },
            ].map((card) => (
              <Col xs={24} sm={12} md={8} lg={6} key={card.title}>
                <Card>
                  <Statistic title={card.title} value={card.value} prefix={card.icon} />
                </Card>
              </Col>
            ))}
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="CNF Status Distribution">
                {Object.entries(data.cnfStatusCounts).map(([status, count]) => (
                  <div key={status} className="distribution-row">
                    <span>{status}</span>
                    <Tag>{count}</Tag>
                  </div>
                ))}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Final Status Distribution">
                {Object.entries(data.finalStatusCounts).map(([status, count]) => (
                  <div key={status} className="distribution-row">
                    <span>{status}</span>
                    <Tag>{count}</Tag>
                  </div>
                ))}
              </Card>
            </Col>
          </Row>

          <Card title="Priority Worklist">
            <Table
              rowKey="recordId"
              dataSource={data.worklist}
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: <Empty description="No open worklist items" /> }}
              columns={[
                { title: "Project", dataIndex: "project_id" },
                { title: "Client", dataIndex: "client_name" },
                { title: "Product", dataIndex: "product_name" },
                { title: "PO", dataIndex: "po_control_no" },
                { title: "FG Month", dataIndex: "fg_month", render: (v) => formatAppDate(v) },
                {
                  title: "Severity",
                  dataIndex: "severity",
                  render: (value: string) => <Tag color={severityColor[value] ?? "default"}>{value}</Tag>,
                },
                { title: "Next Action", dataIndex: "nextAction" },
              ]}
            />
          </Card>

          <Card title="Recent Updates">
            <Table
              rowKey="recordId"
              dataSource={data.recentRecords}
              pagination={false}
              columns={[
                { title: "Project", dataIndex: "project_id" },
                { title: "Client", dataIndex: "client_name" },
                { title: "CNF Ref", dataIndex: "cnf_reference" },
                { title: "CNF Status", dataIndex: "cnf_status" },
                { title: "Final Status", dataIndex: "final_status" },
                { title: "Updated", dataIndex: "updatedAt", render: (v) => formatAppDateTime(v) },
              ]}
            />
          </Card>

          <Typography.Text type="secondary">
            Generated at {formatAppDateTime(data.generatedAt)}
          </Typography.Text>
        </Space>
      ) : null}
    </AppShell>
  );
}
