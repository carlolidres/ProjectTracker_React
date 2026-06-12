import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, DatePicker, Input, Row, Select, Spin, Table, Typography } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { formatAppDateTime } from "@/lib/date";
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

  const filtered = useMemo(() => {
    if (!filters.search) return rows;
    const search = filters.search.toLowerCase();
    return rows.filter((row) =>
      Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(search)),
    );
  }, [rows, filters.search]);

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <Typography.Title level={3}>Audit Trail</Typography.Title>
          <Typography.Text type="secondary">Immutable record of field-level changes with old and new values.</Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>Refresh</Button>
      </div>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={6}>
            <Input prefix={<SearchOutlined />} placeholder="Search" value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} allowClear />
          </Col>
          <Col xs={24} md={4}>
            <Select allowClear placeholder="Module" style={{ width: "100%" }} value={filters.module}
              options={["Projects", "Support Activities", "Registry"].map((v) => ({ label: v, value: v }))}
              onChange={(module) => setFilters((f) => ({ ...f, module }))}
            />
          </Col>
          <Col xs={24} md={4}>
            <Select allowClear placeholder="Action" style={{ width: "100%" }} value={filters.action}
              options={["CREATE", "UPDATE", "DELETE"].map((v) => ({ label: v, value: v }))}
              onChange={(action) => setFilters((f) => ({ ...f, action }))}
            />
          </Col>
          <Col xs={24} md={4}>
            <Input placeholder="User email" value={filters.user} onChange={(e) => setFilters((f) => ({ ...f, user: e.target.value }))} />
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
          rowKey="audit_id"
          dataSource={filtered}
          scroll={{ x: 1400 }}
          pagination={{ pageSize: 25 }}
          columns={[
            { title: "Timestamp", dataIndex: "timestamp", render: (v) => formatAppDateTime(v), width: 180 },
            { title: "User", dataIndex: "user_email", width: 180 },
            { title: "Module", dataIndex: "module", width: 120 },
            { title: "Action", dataIndex: "action", width: 90 },
            { title: "Record ID", dataIndex: "record_id", width: 140 },
            { title: "Project ID", dataIndex: "project_id", width: 120 },
            { title: "Field", dataIndex: "field_name", width: 140 },
            { title: "Old Value", dataIndex: "old_value", ellipsis: true },
            { title: "New Value", dataIndex: "new_value", ellipsis: true },
            { title: "Remarks", dataIndex: "remarks", ellipsis: true },
          ]}
        />
      )}
    </AppShell>
  );
}
