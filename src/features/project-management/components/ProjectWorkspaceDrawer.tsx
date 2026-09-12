import { Alert, Button, Descriptions, Drawer, Input, List, Modal, Space, Spin, Steps, Tabs, Tag, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WorkflowStatusBadge } from "@/components/common/workflow-status-badge";
import { formatAppDate, formatAppMonth } from "@/lib/date";
import { getProfileDisplayName } from "@/lib/profileName";
import { portfolioSourcePath } from "@/lib/projectManagementPortfolio";
import {
  canOverridePmPhase,
  canReopenPmTask,
  canUpdateAssignedPmTask,
  isPmTaskAssigneeOption,
} from "@/lib/projectManagementPermissions";
import {
  buildCreateTaskDraftFromWorkspace,
  buildDerivedWorkflowItems,
  buildTaskDraftFromBoardItem,
  deriveWorkflowSnapshot,
  findUserTaskForBoardItem,
  mergeWorkflowBoardItems,
  WORKFLOW_PHASE_LABELS,
  WORKFLOW_PHASES,
} from "@/lib/projectManagementWorkflow";
import { listAuditLogs } from "@/services/auditService";
import {
  addTaskComment,
  createProjectManagementTask,
  loadProjectManagementWorkspace,
  listTaskComments,
  savePhaseOverride,
  updateProjectManagementTask,
} from "@/services/projectManagementService";
import { OverridePhaseModal } from "@/features/project-management/components/OverridePhaseModal";
import { TaskFormModal } from "@/features/project-management/components/TaskFormModal";
import {
  MyTasksView,
  TaskBoardView,
  TaskCalendarView,
  TaskTableView,
} from "@/features/project-management/components/TaskViews";
import type {
  PhaseOverrideRecord,
  PortfolioItem,
  Profile,
  ProjectManagementComment,
  ProjectManagementTask,
  ProjectManagementTaskInput,
  ProjectRow,
  SupportActivity,
  UserRole,
  AuditLog,
  WorkflowBoardItem,
  WorkflowGate,
} from "@/types";

interface ProjectWorkspaceDrawerProps {
  item: PortfolioItem | null;
  open: boolean;
  canOpenSource: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canAssignTasks: boolean;
  assignmentEligible: boolean;
  role: UserRole | undefined;
  userId: string | undefined;
  profiles: Profile[];
  onClose: () => void;
  onOpenSource: (path: string) => void;
  onChanged: () => void;
}

function formatTargetDate(item: PortfolioItem): string {
  if (!item.targetDate || item.targetDate === "N/A") return "N/A";
  if (item.sourceType === "process") {
    const month = formatAppMonth(item.targetDate);
    return month === "-" ? item.targetDate : month;
  }
  const date = formatAppDate(item.targetDate);
  return date === "-" ? item.targetDate : date;
}

export function ProjectWorkspaceDrawer({
  item,
  open,
  canOpenSource,
  canCreate,
  canEdit,
  canAssignTasks,
  assignmentEligible,
  role,
  userId,
  profiles,
  onClose,
  onOpenSource,
  onChanged,
}: ProjectWorkspaceDrawerProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ProjectManagementTask[]>([]);
  const [overrides, setOverrides] = useState<PhaseOverrideRecord[]>([]);
  const [projectRows, setProjectRows] = useState<ProjectRow[]>([]);
  const [support, setSupport] = useState<SupportActivity | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectManagementTask | null>(null);
  const [taskDraft, setTaskDraft] = useState<Partial<ProjectManagementTaskInput> | null>(null);
  const [activeTab, setActiveTab] = useState("table");
  const [commentTask, setCommentTask] = useState<ProjectManagementTask | null>(null);
  const [comments, setComments] = useState<ProjectManagementComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [activity, setActivity] = useState<AuditLog[]>([]);

  const load = useCallback(async () => {
    if (!item) return;
    setLoading(true);
    setError(null);
    try {
      const workspace = await loadProjectManagementWorkspace(item);
      setTasks(workspace.tasks);
      setOverrides(workspace.overrides);
      setProjectRows(workspace.projectRows);
      setSupport(workspace.support);
      const logs = await listAuditLogs({ project_id: item.sourceId }).catch(() => []);
      setActivity(logs.filter((row) => {
        const haystack = `${row.project_id} ${row.record_id} ${row.remarks}`.toLowerCase();
        return haystack.includes(item.sourceId.toLowerCase())
          || workspace.tasks.some((task) => row.record_id === task.id);
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspace");
    } finally {
      setLoading(false);
    }
  }, [item]);

  useEffect(() => {
    if (open && item) void load();
  }, [item, load, open]);

  useEffect(() => {
    if (open && item) setActiveTab("table");
  }, [item?.id, open]);

  const snapshot = useMemo(
    () => deriveWorkflowSnapshot({
      sourceType: item?.sourceType ?? "process",
      projectRows,
      support: support ?? undefined,
      overrides,
      userTasks: tasks,
    }),
    [item?.sourceType, overrides, projectRows, support, tasks],
  );

  const boardItems = useMemo(() => {
    if (!item) return [];
    return mergeWorkflowBoardItems(
      buildDerivedWorkflowItems({
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        projectRows,
        support: support ?? undefined,
      }),
      tasks,
    );
  }, [item, projectRows, support, tasks]);

  const phaseIndex = Math.max(0, WORKFLOW_PHASES.indexOf(snapshot.phase));
  const assigner = canAssignTasks;
  const canOverride = canOverridePmPhase(role);
  const canMaintainTask = canCreate || canEdit;

  const createTask = (draft?: Partial<ProjectManagementTaskInput>) => {
    if (!item) return;
    const fromWorkspace = buildCreateTaskDraftFromWorkspace({
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      snapshot,
      derivedItems: boardItems,
    });
    const phase = draft?.phase ?? fromWorkspace.phase;
    setEditingTask(null);
    setTaskDraft({
      ...fromWorkspace,
      ...draft,
      phase,
    });
    setTaskModalOpen(true);
    setCommentTask(null);
  };

  const openUserTask = (boardItem: WorkflowBoardItem) => {
    const linked = findUserTaskForBoardItem(boardItem, tasks);
    if (linked) {
      const canUpdate = canMaintainTask
        || canUpdateAssignedPmTask(role, userId, linked.assigneeIds, assignmentEligible);
      if (!canUpdate) {
        message.warning("You can view this task but cannot edit it.");
        return;
      }
      setEditingTask(linked);
      setTaskDraft(null);
      setTaskModalOpen(true);
      setCommentTask(linked);
      void listTaskComments(linked.id).then(setComments).catch(() => setComments([]));
      return;
    }
    if (!item || !canCreate) {
      message.info("Open New task to add work, or open the project record to complete source fields.");
      return;
    }
    createTask(buildTaskDraftFromBoardItem(boardItem, item.sourceType, item.sourceId));
  };

  const handleSaveTask = async (input: ProjectManagementTaskInput, options?: { reopenReason?: string }) => {
    if (!item) return;
    if (options?.reopenReason && !canReopenPmTask(role)) {
      message.warning("You are not authorized to reopen completed tasks.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...input, sourceType: item.sourceType, sourceId: item.sourceId };
      if (editingTask) await updateProjectManagementTask(editingTask.id, payload, options);
      else await createProjectManagementTask(payload);
      setTaskModalOpen(false);
      setEditingTask(null);
      await load();
      onChanged();
      message.success("Task saved.");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setSaving(false);
    }
  };

  const handleOverride = async (input: { gate: WorkflowGate; justification: string }) => {
    if (!item) return;
    setSaving(true);
    try {
      await savePhaseOverride({
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        gate: input.gate,
        justification: input.justification,
      });
      setOverrideOpen(false);
      await load();
      onChanged();
      message.success("Override recorded.");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to save override");
    } finally {
      setSaving(false);
    }
  };

  const handleComment = async () => {
    if (!commentTask || !commentBody.trim()) return;
    try {
      const saved = await addTaskComment(commentTask, commentBody);
      setComments((current) => [...current, saved]);
      setCommentBody("");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to add comment");
    }
  };

  const sourceLabel = item?.sourceType === "process" ? "Project record" : "Support activity";

  return (
    <Drawer
      title={item?.title ?? "Workspace"}
      open={open}
      onClose={onClose}
      width={1100}
      destroyOnClose
      extra={
        item ? (
          <Space>
            {canCreate ? (
              <Button onClick={() => createTask()}>New task</Button>
            ) : null}
            <Button
              onClick={() => {
                const path = item.sourceType === "process"
                  ? `/ai-assistant?projectId=${encodeURIComponent(item.sourceId)}`
                  : `/ai-assistant?activityId=${encodeURIComponent(item.sourceId)}`;
                onClose();
                navigate(path);
              }}
            >
              Ask AI
            </Button>
            {canOverride && snapshot.incompleteRequirements.length > 0 ? (
              <Button onClick={() => setOverrideOpen(true)}>Override gate</Button>
            ) : null}
            {canOpenSource ? (
              <Button
                type="primary"
                onClick={() => {
                  Modal.confirm({
                    title: `Edit ${sourceLabel.toLowerCase()}?`,
                    content: "Owner, due date, client, and official status are saved on the source record.",
                    okText: `Open ${sourceLabel}`,
                    onOk: () => onOpenSource(portfolioSourcePath(item)),
                  });
                }}
              >
                Open {sourceLabel}
              </Button>
            ) : null}
          </Space>
        ) : null
      }
    >
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <Spin />
        </div>
      ) : item ? (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {error ? <Alert type="error" showIcon message={error} /> : null}
          <div className="pm-phase-steps">
            <Steps
              size="small"
              current={phaseIndex}
              items={WORKFLOW_PHASES.map((phase) => ({ title: WORKFLOW_PHASE_LABELS[phase] }))}
            />
          </div>
          {!snapshot.canEnterExecution ? (
            <Alert
              type="warning"
              showIcon
              message="Execution is gated until the protocol is Approved or Not Applicable."
              description={snapshot.incompleteRequirements.map((row) => row.label).join(". ")}
            />
          ) : null}
          {snapshot.canEnterExecution && !snapshot.canEnterReport ? (
            <Alert
              type="warning"
              showIcon
              message="Report/Endorsement is gated until execution requirements are complete."
              description={snapshot.incompleteRequirements.map((row) => row.label).join(". ")}
            />
          ) : null}

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: "overview",
                label: "Overview",
                children: (
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label="Source">
                      {item.sourceType === "process" ? "Projects Database" : "Support Activities"}
                    </Descriptions.Item>
                    <Descriptions.Item label="ID">{item.identifier}</Descriptions.Item>
                    <Descriptions.Item label="Client">{item.client}</Descriptions.Item>
                    <Descriptions.Item label="Product">{item.product}</Descriptions.Item>
                    <Descriptions.Item label="Unique batch">{item.uniqueBatch}</Descriptions.Item>
                    <Descriptions.Item label="Change">{item.changeLabel}</Descriptions.Item>
                    <Descriptions.Item label="Category">{item.category}</Descriptions.Item>
                    <Descriptions.Item label="Owner">
                      {item.owner}
                      {canOpenSource ? (
                        <Button type="link" size="small" onClick={() => onOpenSource(portfolioSourcePath(item))}>
                          Edit on source
                        </Button>
                      ) : null}
                    </Descriptions.Item>
                    <Descriptions.Item label="Target date">{formatTargetDate(item)}</Descriptions.Item>
                    <Descriptions.Item label="Current phase">{WORKFLOW_PHASE_LABELS[snapshot.phase]}</Descriptions.Item>
                    <Descriptions.Item label="Protocol">{snapshot.protocolStatus}</Descriptions.Item>
                    <Descriptions.Item label="Execution">{snapshot.executionStatus}</Descriptions.Item>
                    <Descriptions.Item label="Report">{snapshot.reportStatus}</Descriptions.Item>
                    <Descriptions.Item label="Portfolio status">{item.statusGroup}</Descriptions.Item>
                    <Descriptions.Item label="Source status">
                      <WorkflowStatusBadge status={item.sourceStatus} />
                    </Descriptions.Item>
                    {overrides.length > 0 ? (
                      <Descriptions.Item label="Overrides">
                        {overrides.map((row) => (
                          <Tag key={row.gate}>{row.gate}</Tag>
                        ))}
                      </Descriptions.Item>
                    ) : null}
                  </Descriptions>
                ),
              },
              {
                key: "table",
                label: "Tasks",
                children: (
                  <>
                    <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
                      Click a task to edit it. Click a source row to open or create its task.
                    </Typography.Paragraph>
                    <TaskTableView
                      items={boardItems}
                      profiles={profiles}
                      currentUserId={userId}
                      onOpen={openUserTask}
                    />
                  </>
                ),
              },
              {
                key: "board",
                label: "Board",
                children: (
                  <TaskBoardView
                    items={boardItems}
                    profiles={profiles}
                    currentUserId={userId}
                    onOpen={openUserTask}
                  />
                ),
              },
              {
                key: "calendar",
                label: "Calendar",
                children: (
                  <TaskCalendarView
                    items={boardItems}
                    profiles={profiles}
                    currentUserId={userId}
                    onOpen={openUserTask}
                  />
                ),
              },
              {
                key: "my-tasks",
                label: "My Tasks",
                children: (
                  <MyTasksView
                    items={boardItems}
                    profiles={profiles}
                    currentUserId={userId}
                    onOpen={openUserTask}
                  />
                ),
              },
              {
                key: "activity",
                label: "Activity",
                children: (
                  <List
                    size="small"
                    dataSource={activity}
                    locale={{ emptyText: "No activity recorded for this record yet." }}
                    renderItem={(row) => (
                      <List.Item>
                        <List.Item.Meta
                          title={`${row.user_email} ${row.action.toLowerCase()} ${row.field_name.replace(/_/g, " ")}`}
                          description={`${row.old_value || "—"} → ${row.new_value || "—"} · ${row.timestamp}${row.remarks ? ` · ${row.remarks}` : ""}`}
                        />
                      </List.Item>
                    )}
                  />
                ),
              },
            ]}
          />

          {commentTask ? (
            <div className="pm-comments">
              <Typography.Title level={5}>Comments · {commentTask.title}</Typography.Title>
              <List
                size="small"
                dataSource={comments}
                locale={{ emptyText: "No comments yet." }}
                renderItem={(row) => {
                  const profile = profiles.find((entry) => entry.id === row.createdBy);
                  return (
                    <List.Item>
                      <List.Item.Meta
                        title={getProfileDisplayName(profile) || profile?.email || "User"}
                        description={row.body}
                      />
                    </List.Item>
                  );
                }}
              />
              {canEdit || canCreate || canUpdateAssignedPmTask(role, userId, commentTask.assigneeIds, assignmentEligible) ? (
                <Space.Compact style={{ width: "100%" }}>
                  <Input
                    value={commentBody}
                    onChange={(event) => setCommentBody(event.target.value)}
                    placeholder="Add a comment"
                    onPressEnter={() => void handleComment()}
                  />
                  <Button onClick={() => void handleComment()}>Post</Button>
                </Space.Compact>
              ) : null}
            </div>
          ) : null}
        </Space>
      ) : null}

      <TaskFormModal
        open={taskModalOpen}
        loading={saving}
        canAssign={assigner}
        canReopen={canReopenPmTask(role)}
        profiles={profiles.filter((entry) => (
          isPmTaskAssigneeOption(entry)
          || editingTask?.assigneeIds.includes(entry.id)
          || (taskDraft?.assigneeIds ?? []).includes(entry.id)
        ))}
        parentOptions={boardItems}
        dependencyOptions={boardItems}
        initial={taskDraft}
        existing={editingTask}
        onCancel={() => setTaskModalOpen(false)}
        onSubmit={handleSaveTask}
      />
      <OverridePhaseModal
        open={overrideOpen}
        loading={saving}
        onCancel={() => setOverrideOpen(false)}
        onSubmit={handleOverride}
      />
    </Drawer>
  );
}
