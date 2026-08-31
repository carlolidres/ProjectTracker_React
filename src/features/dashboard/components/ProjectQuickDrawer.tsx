import { Alert, Button, Descriptions, Drawer, List, Select, Space, Spin, Tag, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth-provider";
import { useMeetingViewReadOnly } from "@/app/meeting-view-provider";
import { useMenuPermissions } from "@/app/menu-permission-provider";
import { TaskFormModal } from "@/features/project-management/components/TaskFormModal";
import { stubPortfolioItem } from "@/lib/dashboardPmHub";
import { formatAppMonth } from "@/lib/date";
import {
  canReopenPmTask,
  canUpdateAssignedPmTask,
  isPmTaskAssigneeOption,
} from "@/lib/projectManagementPermissions";
import {
  deriveWorkflowSnapshot,
  mergeWorkflowBoardItems,
  buildDerivedWorkflowItems,
  buildCreateTaskDraftFromWorkspace,
  WORKFLOW_PHASE_LABELS,
} from "@/lib/projectManagementWorkflow";
import { canEditProjectFields } from "@/lib/roleAccess";
import { valueOrNA } from "@/lib/utils";
import {
  createProjectManagementTask,
  loadProjectManagementWorkspace,
  updateProjectManagementTask,
} from "@/services/projectManagementService";
import { getProjectById, updateProject } from "@/services/projectService";
import type {
  Profile,
  ProjectHierarchy,
  ProjectManagementTask,
  ProjectManagementTaskInput,
  ProjectRow,
  UserRole,
  WorkflowSnapshot,
} from "@/types";

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
  hubEnabled?: boolean;
  canCreateTask?: boolean;
  canAssignTasks?: boolean;
  assignmentEligible?: boolean;
  profiles?: Profile[];
  userId?: string;
  role?: UserRole;
  focusTaskId?: string | null;
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
  hubEnabled,
  canCreateTask,
  canAssignTasks,
  assignmentEligible,
  profiles = [],
  userId,
  role,
  focusTaskId,
}: ProjectQuickDrawerProps) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { can } = useMenuPermissions();
  const meetingViewReadOnly = useMeetingViewReadOnly();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectHierarchy | null>(null);
  const [finalStatus, setFinalStatus] = useState("OPEN");
  const [tasks, setTasks] = useState<ProjectManagementTask[]>([]);
  const [projectRows, setProjectRows] = useState<ProjectRow[]>([]);
  const [snapshot, setSnapshot] = useState<WorkflowSnapshot | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectManagementTask | null>(null);
  const [taskDraft, setTaskDraft] = useState<Partial<ProjectManagementTaskInput> | null>(null);

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
      if (hubEnabled) {
        const workspace = await loadProjectManagementWorkspace(stubPortfolioItem("process", id));
        setTasks(workspace.tasks);
        setProjectRows(workspace.projectRows);
        setSnapshot(deriveWorkflowSnapshot({
          sourceType: "process",
          projectRows: workspace.projectRows,
          overrides: workspace.overrides,
          userTasks: workspace.tasks,
        }));
      } else {
        setTasks([]);
        setProjectRows([]);
        setSnapshot(null);
      }
    } catch (err) {
      setProject(null);
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [hubEnabled]);

  useEffect(() => {
    if (open && projectId) void load(projectId);
    if (!open) {
      setProject(null);
      setError(null);
      setTaskModalOpen(false);
      setEditingTask(null);
    }
  }, [open, projectId, load]);

  useEffect(() => {
    if (!hubEnabled || !focusTaskId || !tasks.length) return;
    const match = tasks.find((task) => task.id === focusTaskId);
    if (!match) return;
    setEditingTask(match);
    setTaskDraft(null);
    setTaskModalOpen(true);
  }, [focusTaskId, hubEnabled, tasks]);

  const summary = useMemo(() => (project ? readSummary(project) : null), [project]);
  const dirty = Boolean(project && finalStatus !== readFinalStatus(project));
  const nextIncomplete = snapshot?.incompleteRequirements[0]?.label;
  const boardItems = useMemo(() => {
    if (!projectId) return [];
    return mergeWorkflowBoardItems(
      buildDerivedWorkflowItems({
        sourceType: "process",
        sourceId: projectId,
        projectRows,
      }),
      tasks,
    );
  }, [projectId, projectRows, tasks]);

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

  const openCreateTask = () => {
    if (!projectId || !snapshot) return;
    const fromWorkspace = buildCreateTaskDraftFromWorkspace({
      sourceType: "process",
      sourceId: projectId,
      snapshot,
      derivedItems: boardItems,
    });
    setEditingTask(null);
    setTaskDraft(fromWorkspace);
    setTaskModalOpen(true);
  };

  const openTask = (task: ProjectManagementTask) => {
    const canUpdate = Boolean(canCreateTask)
      || canUpdateAssignedPmTask(role, userId, task.assigneeIds, assignmentEligible);
    if (!canUpdate) {
      message.warning("You can view this task but cannot edit it.");
      return;
    }
    setEditingTask(task);
    setTaskDraft(null);
    setTaskModalOpen(true);
  };

  const handleSaveTask = async (input: ProjectManagementTaskInput, options?: { reopenReason?: string }) => {
    if (!projectId || !snapshot) return;
    if (options?.reopenReason && !canReopenPmTask(role)) {
      message.warning("You are not authorized to reopen completed tasks.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...input, sourceType: "process" as const, sourceId: projectId };
      if (editingTask) await updateProjectManagementTask(editingTask.id, payload, options);
      else await createProjectManagementTask(payload);
      setTaskModalOpen(false);
      setEditingTask(null);
      if (projectId) await load(projectId);
      onSaved?.();
      message.success("Task saved.");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setSaving(false);
    }
  };

  const assigneeProfiles = profiles.filter((entry) => (
    isPmTaskAssigneeOption(entry)
    || editingTask?.assigneeIds.includes(entry.id)
    || (taskDraft?.assigneeIds ?? []).includes(entry.id)
  ));

  return (
    <Drawer
      title={projectId ? `Project ${projectId}` : "Project"}
      open={open}
      onClose={onClose}
      width={hubEnabled ? 520 : 420}
      destroyOnClose
      extra={
        projectId ? (
          <Space>
            <Button onClick={() => navigate(`/ai-assistant?projectId=${encodeURIComponent(projectId)}`)}>
              Ask AI
            </Button>
            <Button type="link" onClick={() => onOpenFull(projectId)}>
              Open record
            </Button>
          </Space>
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

          {hubEnabled && snapshot ? (
            <>
              <div>
                <Typography.Text type="secondary">Phase</Typography.Text>
                <div style={{ marginTop: 6 }}>
                  <Tag color="blue">{WORKFLOW_PHASE_LABELS[snapshot.phase]}</Tag>
                </div>
                {nextIncomplete ? (
                  <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
                    Next incomplete: {nextIncomplete}
                  </Typography.Paragraph>
                ) : (
                  <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
                    No gated requirements remaining.
                  </Typography.Paragraph>
                )}
              </div>
              <div>
                <Space style={{ width: "100%", justifyContent: "space-between" }}>
                  <Typography.Text type="secondary">Tasks</Typography.Text>
                  {canCreateTask && !meetingViewReadOnly ? (
                    <Button size="small" onClick={openCreateTask}>New task</Button>
                  ) : null}
                </Space>
                <List
                  size="small"
                  style={{ marginTop: 8 }}
                  dataSource={tasks}
                  locale={{ emptyText: "No tasks yet." }}
                  renderItem={(task) => (
                    <List.Item
                      style={{ cursor: "pointer" }}
                      onClick={() => openTask(task)}
                    >
                      <List.Item.Meta
                        title={task.title}
                        description={`${task.status} · ${task.percentComplete}%`}
                      />
                    </List.Item>
                  )}
                />
              </div>
            </>
          ) : null}

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
                Final Status is editable for PP / Admin when Projects Edit is allowed. Use Open record for other fields.
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
                Open record
              </Button>
            ) : null}
          </Space>
        </Space>
      ) : null}

      {hubEnabled ? (
        <TaskFormModal
          open={taskModalOpen}
          loading={saving}
          canAssign={Boolean(canAssignTasks)}
          canReopen={canReopenPmTask(role)}
          profiles={assigneeProfiles}
          parentOptions={boardItems}
          dependencyOptions={boardItems}
          initial={taskDraft}
          existing={editingTask}
          onCancel={() => setTaskModalOpen(false)}
          onSubmit={handleSaveTask}
        />
      ) : null}
    </Drawer>
  );
}
