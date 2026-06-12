import { DownloadOutlined, PlusOutlined, ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Input, Row, Select, Space, Spin, Table, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { formatAppDate } from "@/lib/date";
import { exportSupportToExcel } from "@/services/exportService";
import { getRegistryBundle } from "@/services/registryService";
import {
  archiveSupportActivity,
  filterSupportRows,
  listActiveSupportActivities,
  saveSupportActivity,
} from "@/services/supportActivityService";
import type { ActivityKind, SupportActivity, SupportActivityFilters } from "@/types";

const emptyActivity = (): Partial<SupportActivity> => ({
  activity_id: "N/A",
  activity_kind: "TSD",
  Department: "",
  Material: "",
  Line: "",
  Bulk: "",
  Machinability_Protocol: "",
  Machinability_Protocol_Status: "",
  Machinability_Report: "",
  Machinability_Report_Status: "",
  Product_User: "",
  Principal: "",
  Product: "",
  Target_Date: "",
  Planning_Schedule: "",
});

export function SupportActivitiesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SupportActivity[]>([]);
  const [registry, setRegistry] = useState<Record<string, string[]>>({});
  const [filters, setFilters] = useState<SupportActivityFilters>({});
  const [form, setForm] = useState<Partial<SupportActivity>>(emptyActivity());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [activities, bundle] = await Promise.all([listActiveSupportActivities(), getRegistryBundle()]);
      setRows(activities);
      setRegistry(bundle);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load support activities");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => filterSupportRows(rows, filters), [rows, filters]);
  const isTsd = form.activity_kind === "TSD";

  async function handleSave() {
    if (!user?.email) return;
    setSaving(true);
    try {
      await saveSupportActivity(form, user.email);
      message.success("Support activity saved");
      setForm(emptyActivity());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <Typography.Title level={3}>Support Activities</Typography.Title>
          <Typography.Text type="secondary">Track TSD and RnD operational activities.</Typography.Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>Refresh</Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportSupportToExcel(filtered)} disabled={!filtered.length}>
            Export Excel
          </Button>
        </Space>
      </div>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

      <Card title="Add / Edit Activity" style={{ marginBottom: 16 }}
        extra={<Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => void handleSave()}>Save</Button>}
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} md={6}>
            <Select
              style={{ width: "100%" }}
              value={form.activity_kind as ActivityKind | undefined}
              options={[{ label: "TSD", value: "TSD" }, { label: "RnD", value: "RnD" }]}
              onChange={(activity_kind) => setForm((f) => ({ ...f, activity_kind: activity_kind as ActivityKind }))}
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              allowClear
              placeholder="Department"
              style={{ width: "100%" }}
              value={form.Department || undefined}
              options={(registry.department ?? []).map((v) => ({ label: v, value: v }))}
              onChange={(Department) => setForm((f) => ({ ...f, Department }))}
            />
          </Col>
          {isTsd ? (
            <>
              <Col xs={24} md={6}><Input placeholder="Material" value={form.Material} onChange={(e) => setForm((f) => ({ ...f, Material: e.target.value }))} /></Col>
              <Col xs={24} md={6}><Input placeholder="Line" value={form.Line} onChange={(e) => setForm((f) => ({ ...f, Line: e.target.value }))} /></Col>
              <Col xs={24} md={6}><Input placeholder="Bulk" value={form.Bulk} onChange={(e) => setForm((f) => ({ ...f, Bulk: e.target.value }))} /></Col>
              <Col xs={24} md={6}><Input placeholder="Product User" value={form.Product_User} onChange={(e) => setForm((f) => ({ ...f, Product_User: e.target.value }))} /></Col>
            </>
          ) : (
            <>
              <Col xs={24} md={6}><Input placeholder="Principal" value={form.Principal} onChange={(e) => setForm((f) => ({ ...f, Principal: e.target.value }))} /></Col>
              <Col xs={24} md={6}><Input placeholder="Product" value={form.Product} onChange={(e) => setForm((f) => ({ ...f, Product: e.target.value }))} /></Col>
              <Col xs={24} md={6}><Input placeholder="Line" value={form.Line} onChange={(e) => setForm((f) => ({ ...f, Line: e.target.value }))} /></Col>
            </>
          )}
          <Col xs={24} md={6}><Input placeholder="Target Date" value={form.Target_Date} onChange={(e) => setForm((f) => ({ ...f, Target_Date: e.target.value }))} /></Col>
          <Col xs={24} md={6}><Input placeholder="Planning Schedule" value={form.Planning_Schedule} onChange={(e) => setForm((f) => ({ ...f, Planning_Schedule: e.target.value }))} /></Col>
        </Row>
        <Button icon={<PlusOutlined />} style={{ marginTop: 12 }} onClick={() => setForm(emptyActivity())}>Clear Form</Button>
      </Card>

      <Card>
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={8}>
            <Input placeholder="Search" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} allowClear />
          </Col>
          <Col xs={24} md={4}>
            <Select allowClear placeholder="Kind" style={{ width: "100%" }} value={filters.activity_kind}
              options={[{ label: "TSD", value: "TSD" }, { label: "RnD", value: "RnD" }]}
              onChange={(activity_kind) => setFilters((f) => ({ ...f, activity_kind }))}
            />
          </Col>
        </Row>
        {loading ? <Spin /> : (
          <Table
            rowKey="activity_id"
            dataSource={filtered}
            pagination={{ pageSize: 20 }}
            columns={[
              { title: "ID", dataIndex: "activity_id" },
              { title: "Kind", dataIndex: "activity_kind" },
              { title: "Department", dataIndex: "Department" },
              { title: "Target Date", dataIndex: "Target_Date", render: (v) => formatAppDate(v) },
              { title: "Updated", dataIndex: "updated_at", render: (v) => formatAppDate(v) },
              {
                title: "Actions",
                render: (_, record) => (
                  <Space>
                    <Button type="link" onClick={() => setForm(record)}>Edit</Button>
                    <Button type="link" danger onClick={() => user?.email && archiveSupportActivity(record.activity_id, user.email).then(() => load())}>
                      Archive
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Card>
    </AppShell>
  );
}
