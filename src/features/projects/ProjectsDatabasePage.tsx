import { DownloadOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Input, Row, Select, Space, Spin, Table, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { formatAppDate } from "@/lib/date";
import { exportProjectsToExcel } from "@/services/exportService";
import { filterProjectRows, listActiveProjects } from "@/services/projectService";
import { getRegistryBundle } from "@/services/registryService";
import type { ProjectFilters, ProjectRow } from "@/types";

export function ProjectsDatabasePage() {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [registry, setRegistry] = useState<Record<string, string[]>>({});
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projects, bundle] = await Promise.all([listActiveProjects(), getRegistryBundle()]);
      setRows(projects);
      setRegistry(bundle);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => filterProjectRows(rows, filters), [rows, filters]);

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <Typography.Title level={3}>Projects Database</Typography.Title>
          <Typography.Text type="secondary">Search, filter, and export PO-line records.</Typography.Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>Refresh</Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => {
              exportProjectsToExcel(filtered);
              message.success("Export started");
            }}
            disabled={!filtered.length}
          >
            Export Excel
          </Button>
        </Space>
      </div>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search projects"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              allowClear
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              allowClear
              placeholder="Owner"
              style={{ width: "100%" }}
              value={filters.owner}
              onChange={(owner) => setFilters((f) => ({ ...f, owner }))}
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              allowClear
              placeholder="Activity Type"
              style={{ width: "100%" }}
              value={filters.activity_type}
              options={(registry.activity_type ?? []).map((v) => ({ label: v, value: v }))}
              onChange={(activity_type) => setFilters((f) => ({ ...f, activity_type }))}
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              allowClear
              placeholder="CNF Status"
              style={{ width: "100%" }}
              value={filters.cnf_status}
              options={(registry.cnf_status ?? []).map((v) => ({ label: v, value: v }))}
              onChange={(cnf_status) => setFilters((f) => ({ ...f, cnf_status }))}
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              allowClear
              placeholder="Final Status"
              style={{ width: "100%" }}
              value={filters.final_status}
              options={(registry.final_status ?? []).map((v) => ({ label: v, value: v }))}
              onChange={(final_status) => setFilters((f) => ({ ...f, final_status }))}
            />
          </Col>
        </Row>
      </Card>

      {loading ? (
        <div className="page-loading"><Spin size="large" /></div>
      ) : (
        <Table
          rowKey="record_id"
          dataSource={filtered}
          scroll={{ x: 1800 }}
          pagination={{ pageSize: 25, showSizeChanger: true }}
          columns={[
            { title: "Project ID", dataIndex: "project_id", fixed: "left" },
            { title: "Owner", dataIndex: "project_owner" },
            { title: "Client", dataIndex: "client_name" },
            { title: "Product", dataIndex: "product_name" },
            { title: "Batch", dataIndex: "unique_batch" },
            { title: "MO", dataIndex: "mo_control_no" },
            { title: "PO", dataIndex: "po_control_no" },
            { title: "FG Month", dataIndex: "fg_month", render: (v) => formatAppDate(v) },
            { title: "CNF Ref", dataIndex: "cnf_reference" },
            { title: "CNF Status", dataIndex: "cnf_status" },
            { title: "Final Status", dataIndex: "final_status" },
            { title: "Updated", dataIndex: "updated_at", render: (v) => formatAppDate(v) },
          ]}
        />
      )}
    </AppShell>
  );
}
