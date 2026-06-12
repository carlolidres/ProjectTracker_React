import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Select, Spin, Table, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { DEFAULT_REGISTRY } from "@/lib/constants";
import { listRegistryEntries, saveRegistryValue } from "@/services/registryService";
import type { RegistryEntry } from "@/types";

export function RegistryPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<RegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();

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
    void load();
  }, [load]);

  async function handleAdd(values: { registry_type: string; registry_value: string; description?: string }) {
    if (!user?.email) return;
    setSaving(true);
    try {
      await saveRegistryValue(values.registry_type, values.registry_value, values.description ?? "", user.email);
      message.success("Registry value added");
      form.resetFields();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save registry value");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <Typography.Title level={3}>Registry</Typography.Title>
          <Typography.Text type="secondary">Manage dropdown lookup values used across forms.</Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>Refresh</Button>
      </div>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

      <Card title="Add Registry Value" style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline" onFinish={handleAdd}>
          <Form.Item name="registry_type" rules={[{ required: true }]}>
            <Select
              placeholder="Type"
              style={{ width: 200 }}
              options={Object.keys(DEFAULT_REGISTRY).map((key) => ({ label: key, value: key }))}
            />
          </Form.Item>
          <Form.Item name="registry_value" rules={[{ required: true }]}>
            <Input placeholder="Value" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="description">
            <Input placeholder="Description" style={{ width: 240 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={saving}>Add</Button>
          </Form.Item>
        </Form>
      </Card>

      {loading ? (
        <div className="page-loading"><Spin size="large" /></div>
      ) : (
        <Table
          rowKey="id"
          dataSource={rows}
          pagination={{ pageSize: 25 }}
          columns={[
            { title: "Type", dataIndex: "registry_type" },
            { title: "Value", dataIndex: "registry_value" },
            { title: "Description", dataIndex: "description" },
            { title: "Status", dataIndex: "status" },
            { title: "Updated By", dataIndex: "updated_by" },
          ]}
        />
      )}
    </AppShell>
  );
}
