import { ReloadOutlined, UndoOutlined } from "@ant-design/icons";
import { Alert, App as AntApp, Button, Spin, Table, Tabs, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { formatAppDate } from "@/lib/date";
import { listArchivedProjects, restoreProject } from "@/services/projectService";
import { listArchivedSupportActivities, restoreSupportActivity } from "@/services/supportActivityService";
import type { ProjectRow, SupportActivity } from "@/types";

export function ArchivedPage() {
  const { user } = useAuth();
  const { modal } = AntApp.useApp();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [support, setSupport] = useState<SupportActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringKey, setRestoringKey] = useState<string | null>(null);
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

  async function handleRestoreProject(record: ProjectRow) {
    const userEmail = user?.email;
    if (!userEmail) return;
    modal.confirm({
      title: "Restore project?",
      content: `Restore all archived PO lines for ${record.project_id}?`,
      okText: "Restore",
      onOk: async () => {
        setRestoringKey(record.project_id);
        try {
          await restoreProject(record.project_id, userEmail);
          message.success(`Project ${record.project_id} restored`);
          await load();
        } catch (err) {
          message.error(err instanceof Error ? err.message : "Failed to restore project");
        } finally {
          setRestoringKey(null);
        }
      },
    });
  }

  async function handleRestoreSupport(record: SupportActivity) {
    const userEmail = user?.email;
    if (!userEmail) return;
    modal.confirm({
      title: "Restore support activity?",
      content: `Restore activity ${record.activity_id}?`,
      okText: "Restore",
      onOk: async () => {
        setRestoringKey(record.activity_id);
        try {
          await restoreSupportActivity(record.activity_id, userEmail);
          message.success(`Support activity ${record.activity_id} restored`);
          await load();
        } catch (err) {
          message.error(err instanceof Error ? err.message : "Failed to restore support activity");
        } finally {
          setRestoringKey(null);
        }
      },
    });
  }

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
                    {
                      title: "Actions",
                      fixed: "right",
                      width: 120,
                      render: (_: unknown, record: ProjectRow) => (
                        <Button
                          type="link"
                          icon={<UndoOutlined />}
                          loading={restoringKey === record.project_id}
                          onClick={() => void handleRestoreProject(record)}
                        >
                          Restore
                        </Button>
                      ),
                    },
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
                    {
                      title: "Actions",
                      fixed: "right",
                      width: 120,
                      render: (_: unknown, record: SupportActivity) => (
                        <Button
                          type="link"
                          icon={<UndoOutlined />}
                          loading={restoringKey === record.activity_id}
                          onClick={() => void handleRestoreSupport(record)}
                        >
                          Restore
                        </Button>
                      ),
                    },
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
