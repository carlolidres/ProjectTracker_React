import { ReloadOutlined } from "@ant-design/icons";
import { Alert, Button, Spin, Table, Tabs, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { formatAppDate } from "@/lib/date";
import { listArchivedProjects } from "@/services/projectService";
import { listArchivedSupportActivities } from "@/services/supportActivityService";
import type { ProjectRow, SupportActivity } from "@/types";

export function ArchivedPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [support, setSupport] = useState<SupportActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [archivedProjects, archivedSupport] = await Promise.all([
        listArchivedProjects(),
        listArchivedSupportActivities(),
      ]);
      setProjects(archivedProjects);
      setSupport(archivedSupport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load archived records");
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
          <Typography.Title level={3}>Archived</Typography.Title>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>Refresh</Button>
      </div>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

      {loading ? (
        <div className="page-loading"><Spin size="large" /></div>
      ) : (
        <Tabs
          items={[
            {
              key: "projects",
              label: `Projects (${projects.length})`,
              children: (
                <Table
                  rowKey="record_id"
                  dataSource={projects}
                  pagination={{ pageSize: 20 }}
                  columns={[
                    { title: "Project ID", dataIndex: "project_id" },
                    { title: "Client", dataIndex: "client_name" },
                    { title: "Product", dataIndex: "product_name" },
                    { title: "PO", dataIndex: "po_control_no" },
                    { title: "Archived", dataIndex: "updated_at", render: (v) => formatAppDate(v) },
                  ]}
                />
              ),
            },
            {
              key: "support",
              label: `Support (${support.length})`,
              children: (
                <Table
                  rowKey="activity_id"
                  dataSource={support}
                  pagination={{ pageSize: 20 }}
                  columns={[
                    { title: "Project ID", dataIndex: "project_id" },
                    { title: "Activity ID", dataIndex: "activity_id" },
                    { title: "Kind", dataIndex: "activity_kind" },
                    { title: "Department", dataIndex: "Department" },
                    { title: "Archived", dataIndex: "updated_at", render: (v) => formatAppDate(v) },
                  ]}
                />
              ),
            },
          ]}
        />
      )}
    </AppShell>
  );
}
