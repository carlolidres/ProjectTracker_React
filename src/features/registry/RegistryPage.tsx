import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Popconfirm,
  Result,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/auth-provider";
import { useRegistry } from "@/app/registry-provider";
import { AppShell } from "@/components/layout/app-shell";
import { DEFAULT_REGISTRY } from "@/lib/constants";
import { canManageRegistry } from "@/lib/roleAccess";
import { formatAppDateTime } from "@/lib/date";
import {
  listRegistryEntries,
  saveRegistryValue,
  setRegistryStatus,
} from "@/services/registryService";
import type { RegistryEntry } from "@/types";

const REGISTRY_TYPES = Object.keys(DEFAULT_REGISTRY);

export function RegistryPage() {
  const { user, profile } = useAuth();
  const { refreshRegistry } = useRegistry();
  const [rows, setRows] = useState<RegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>("Active");
  const [search, setSearch] = useState("");
  const [form] = Form.useForm();

  const isAdmin = canManageRegistry(profile?.role);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listRegistryEntries());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load registry");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (typeFilter && row.registry_type !== typeFilter) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      if (!query) return true;
      const blob = [row.registry_type, row.registry_value, row.description, row.status, row.updated_by]
        .join(" ")
        .toLowerCase();
      return blob.includes(query);
    });
  }, [rows, search, statusFilter, typeFilter]);

  async function handleAdd(values: { registry_type: string; registry_value: string; description?: string }) {
    if (!user?.email) return;
    setSaving(true);
    setError(null);
    try {
      await saveRegistryValue(values.registry_type, values.registry_value, values.description ?? "", user.email);
      message.success("Registry value added");
      form.resetFields();
      await load();
      await refreshRegistry();
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "Failed to save registry value";
      setError(messageText);
      message.error(messageText);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(entry: RegistryEntry, status: "Active" | "Inactive") {
    if (!user?.email) return;
    setError(null);
    try {
      await setRegistryStatus(entry, status, user.email);
      message.success(status === "Active" ? "Registry value reactivated" : "Registry value deactivated");
      await load();
      await refreshRegistry();
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "Failed to update registry value";
      setError(messageText);
      message.error(messageText);
    }
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <Result
          status="403"
          title="Administrator access required"
          subTitle="Only administrators can manage registry values."
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <Typography.Title level={3}>Registry</Typography.Title>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>Refresh</Button>
      </div>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

      <Card title="Add Registry Value" style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline" onFinish={handleAdd}>
          <Form.Item name="registry_type" rules={[{ required: true, message: "Select a registry type" }]}>
            <Select
              placeholder="Type"
              style={{ width: 220 }}
              options={REGISTRY_TYPES.map((key) => ({ label: key, value: key }))}
            />
          </Form.Item>
          <Form.Item name="registry_value" rules={[{ required: true, message: "Enter a value" }]}>
            <Input placeholder="Value" style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="description">
            <Input placeholder="Description (optional)" style={{ width: 260 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={saving}>Add</Button>
          </Form.Item>
        </Form>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search registry values"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              allowClear
              placeholder="Type"
              style={{ width: "100%" }}
              value={typeFilter}
              options={REGISTRY_TYPES.map((key) => ({ label: key, value: key }))}
              onChange={setTypeFilter}
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              allowClear
              placeholder="Status"
              style={{ width: "100%" }}
              value={statusFilter}
              options={[
                { label: "Active", value: "Active" },
                { label: "Inactive", value: "Inactive" },
              ]}
              onChange={setStatusFilter}
            />
          </Col>
        </Row>
      </Card>

      {loading ? (
        <div className="page-loading"><Spin size="large" /></div>
      ) : (
        <Table
          className="registry-table"
          rowKey="id"
          dataSource={filtered}
          pagination={{ pageSize: 25, showSizeChanger: true }}
          columns={[
            { title: "Type", dataIndex: "registry_type", align: "left" },
            { title: "Value", dataIndex: "registry_value", align: "left" },
            { title: "Description", dataIndex: "description", align: "left", ellipsis: true },
            {
              title: "Status",
              dataIndex: "status",
              align: "left",
              render: (status: string) => (
                <Tag color={status === "Active" ? "green" : "default"}>{status}</Tag>
              ),
            },
            {
              title: "Updated",
              dataIndex: "updated_at",
              align: "left",
              render: (value: string) => formatAppDateTime(value),
            },
            { title: "Updated By", dataIndex: "updated_by", align: "left", ellipsis: true },
            {
              title: "Actions",
              align: "left",
              render: (_: unknown, record: RegistryEntry) => (
                <Space>
                  {record.status === "Active" ? (
                    <Popconfirm
                      title="Deactivate this registry value?"
                      description="The value will be removed from form dropdowns but can be reactivated later."
                      okText="Deactivate"
                      onConfirm={() => void handleStatusChange(record, "Inactive")}
                    >
                      <Button type="link" danger>Deactivate</Button>
                    </Popconfirm>
                  ) : (
                    <Popconfirm
                      title="Reactivate this registry value?"
                      okText="Reactivate"
                      onConfirm={() => void handleStatusChange(record, "Active")}
                    >
                      <Button type="link">Reactivate</Button>
                    </Popconfirm>
                  )}
                </Space>
              ),
            },
          ]}
        />
      )}
    </AppShell>
  );
}
