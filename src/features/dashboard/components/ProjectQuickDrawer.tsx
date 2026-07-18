import { Alert, Button, Descriptions, Drawer, Select, Space, Spin, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/auth-provider";
import { useMeetingViewReadOnly } from "@/app/meeting-view-provider";
import { useMenuPermissions } from "@/app/menu-permission-provider";
import { formatAppMonth } from "@/lib/date";
import { canEditProjectFields } from "@/lib/roleAccess";
import { valueOrNA } from "@/lib/utils";
import { getProjectById, updateProject } from "@/services/projectService";
import type { ProjectHierarchy } from "@/types";

const FINAL_STATUS_OPTIONS = [
  { value: "OPEN", label: "OPEN" },
  { value: "CLOSED", label: "CLOSED" },
  { value: "CANCELLED", label: "CANCELLED" },
  { value: "Others", label: "Others" },
];

export interface ProjectQuickDrawerProps {
  open: boolean;
  projectId: string | null;
  onClose: () => void;
  onOpenFull: (projectId: string) => void;
  onSaved?: () => void;
}

function applyFinalStatus(project: ProjectHierarchy, finalStatus: string): ProjectHierarchy {
  const next = structuredClone(project);
  for (const batch of next.batches ?? []) {
    for (const mo of batch.mo_controls ?? []) {
      for (const po of mo.po_controls ?? []) {
        po.final_status = finalStatus;
      }
    }
  }
  return next;
}

function readFinalStatus(project: ProjectHierarchy): string {
  return project.batches?.[0]?.mo_controls?.[0]?.po_controls?.[0]?.final_status ?? "OPEN";
}

function readSummary(project: ProjectHierarchy) {
  const po = project.batches?.[0]?.mo_controls?.[0]?.po_controls?.[0];
  return {
    client: project.client_name,
    product: project.product_name,
    fgMonth: po?.fg_month ?? "",
    cnfRef: po?.cnf_reference ?? po?.cnf_entries?.[0]?.cnf_reference ?? "",
    cnfStatus: po?.cnf_status ?? "",
    poControl: po?.po_control_no ?? "",
  };
}

export function ProjectQuickDrawer({
  open,
  projectId,
  onClose,
  onOpenFull,
  onSaved,
}: ProjectQuickDrawerProps) {
  const { user, profile } = useAuth();
  const { can } = useMenuPermissions();
  const meetingViewReadOnly = useMeetingViewReadOnly();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectHierarchy | null>(null);
  const [finalStatus, setFinalStatus] = useState("OPEN");

  const canEdit =
    can("projects_entry", "edit")
    && !meetingViewReadOnly
    && (canEditProjectFields(profile?.role ?? "view", "pp") || profile?.role === "admin");

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const row = await getProjectById(id);
      if (!row) {
        setProject(null);
        setError(`Project ${id} was not found.`);
        return;
      }
      setProject(row);
      setFinalStatus(readFinalStatus(row));
    } catch (err) {
      setProject(null);
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && projectId) void load(projectId);
    if (!open) {
      setProject(null);
      setError(null);
    }
  }, [open, projectId, load]);

  const summary = useMemo(() => (project ? readSummary(project) : null), [project]);
  const dirty = Boolean(project && finalStatus !== readFinalStatus(project));

  async function handleSave() {
    if (!project || !user?.email || !canEdit || !projectId) return;
    setSaving(true);
    setError(null);
    try {
      const payload = applyFinalStatus(project, finalStatus);
      await updateProject(projectId, payload, user.email);
      message.success(`Project ${projectId} updated`);
      setProject(payload);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save project");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      title={projectId ? `Project ${projectId}` : "Project"}
      open={open}
      onClose={onClose}
      width={420}
      destroyOnClose
      extra={
        projectId ? (
          <Button type="link" onClick={() => onOpenFull(projectId)}>
            Open full form
          </Button>
        ) : null
      }
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: 32 }}>
          <Spin />
        </div>
      ) : null}
      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}
      {!loading && project && summary ? (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Client">{valueOrNA(summary.client)}</Descriptions.Item>
            <Descriptions.Item label="Product">{valueOrNA(summary.product)}</Descriptions.Item>
            <Descriptions.Item label="PO">{valueOrNA(summary.poControl)}</Descriptions.Item>
            <Descriptions.Item label="FG Month">{formatAppMonth(summary.fgMonth)}</Descriptions.Item>
            <Descriptions.Item label="CNF Ref">{valueOrNA(summary.cnfRef)}</Descriptions.Item>
            <Descriptions.Item label="CNF Status">{valueOrNA(summary.cnfStatus)}</Descriptions.Item>
          </Descriptions>

          <div>
            <Typography.Text type="secondary">Final Status</Typography.Text>
            <Select
              style={{ width: "100%", marginTop: 6 }}
              value={finalStatus}
              options={FINAL_STATUS_OPTIONS}
              disabled={!canEdit}
              onChange={setFinalStatus}
            />
            {!canEdit ? (
              <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
                Final Status is editable for PP / Admin when Projects Edit is allowed. Use Open full form for other fields.
              </Typography.Paragraph>
            ) : null}
          </div>

          <Space wrap>
            {canEdit ? (
              <Button type="primary" loading={saving} disabled={!dirty} onClick={() => void handleSave()}>
                Save
              </Button>
            ) : null}
            <Button onClick={onClose}>Close</Button>
            {projectId ? (
              <Button type="default" onClick={() => onOpenFull(projectId)}>
                Open full form
              </Button>
            ) : null}
          </Space>
        </Space>
      ) : null}
    </Drawer>
  );
}
