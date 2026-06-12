import { DownloadOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, DatePicker, Input, Row, Select, Space, Spin, Table, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { ProjectIdLink } from "@/components/common/project-id-link";
import { AppShell } from "@/components/layout/app-shell";
import {
  formatAuditActivity,
  formatAuditDetails,
  formatAuditProjectId,
  formatAuditTimestamp,
} from "@/lib/auditFormat";
import { exportAuditToExcel } from "@/services/exportService";
import { listAuditLogs } from "@/services/auditService";
import type { AuditFilters, AuditLog } from "@/types";

export function AuditTrailPage() {
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [filters, setFilters] = useState<AuditFilters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listAuditLogs(filters));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit trail");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <Typography.Title level={3}>Audit Trail</Typography.Title>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>Refresh</Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => {
              exportAuditToExcel(rows);
              message.success("Export started");
            }}
            disabled={!rows.length}
          >
            Export Data to Excel
          </Button>
        </Space>
      </div>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={6}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              allowClear
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              allowClear
              placeholder="Module"
              style={{ width: "100%" }}
              value={filters.module}
              options={["Projects", "Support Activities", "Registry"].map((v) => ({ label: v, value: v }))}
              onChange={(module) => setFilters((f) => ({ ...f, module }))}
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              allowClear
              placeholder="Action"
              style={{ width: "100%" }}
              value={filters.action}
              options={["CREATE", "UPDATE", "DELETE"].map((v) => ({ label: v, value: v }))}
              onChange={(action) => setFilters((f) => ({ ...f, action }))}
            />
          </Col>
          <Col xs={24} md={4}>
            <Input
              placeholder="User email"
              value={filters.user}
              onChange={(e) => setFilters((f) => ({ ...f, user: e.target.value }))}
            />
          </Col>
          <Col xs={24} md={6}>
            <Input
              placeholder="Project ID"
              value={filters.project_id}
              onChange={(e) => setFilters((f) => ({ ...f, project_id: e.target.value }))}
            />
          </Col>
          <Col xs={24} md={6}>
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              onChange={(dates) => setFilters((f) => ({
                ...f,
                startDate: dates?.[0]?.startOf("day").toISOString(),
                endDate: dates?.[1]?.endOf("day").toISOString(),
              }))}
            />
          </Col>
        </Row>
      </Card>

      {loading ? (
        <div className="page-loading"><Spin size="large" /></div>
      ) : (
        <Table
          className="audit-trail-table"
          rowKey="audit_id"
          dataSource={rows}
          scroll={{ x: 1100 }}
          pagination={{ pageSize: 25, showSizeChanger: true }}
          columns={[
            {
              title: "Date and Time",
              dataIndex: "timestamp",
              align: "left",
              width: 180,
              render: (value: string) => formatAuditTimestamp(value),
            },
            {
              title: "User",
              dataIndex: "user_email",
              align: "left",
              width: 200,
            },
            {
              title: "Activity",
              align: "left",
              width: 220,
              render: (_: unknown, row: AuditLog) => (
                <span className="audit-activity-text">{formatAuditActivity(row)}</span>
              ),
            },
            {
              title: "Project ID",
              dataIndex: "project_id",
              align: "left",
              width: 150,
              render: (projectId: string) => {
                const label = formatAuditProjectId(projectId);
                if (label === "N/A") return <span className="project-id-na">N/A</span>;
                return <ProjectIdLink projectId={projectId} />;
              },
            },
            {
              title: "Details",
              align: "left",
              render: (_: unknown, row: AuditLog) => (
                <div className="audit-details-text">{formatAuditDetails(row)}</div>
              ),
            },
          ]}
        />
      )}
    </AppShell>
  );
}
