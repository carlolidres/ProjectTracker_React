import { message } from "antd";
import { useMemo, useState } from "react";
import { TaskFormModal } from "@/features/project-management/components/TaskFormModal";
import { stubPortfolioItem, type TaskSourceOption } from "@/lib/dashboardPmHub";
import { canReopenPmTask, isPmTaskAssigneeOption } from "@/lib/projectManagementPermissions";
import {
  buildCreateTaskDraftFromWorkspace,
  buildDerivedWorkflowItems,
  deriveWorkflowSnapshot,
} from "@/lib/projectManagementWorkflow";
import {
  createProjectManagementTask,
  loadProjectManagementWorkspace,
} from "@/services/projectManagementService";
import type { Profile, ProjectManagementTaskInput, UserRole } from "@/types";

interface DashboardTaskComposerProps {
  open: boolean;
  sourceOptions: TaskSourceOption[];
  profiles: Profile[];
  canAssign: boolean;
  role: UserRole | undefined;
  initialTargetDate?: string;
  initialAssigneeIds?: string[];
  onClose: () => void;
  onSaved: () => void;
}

export function DashboardTaskComposer({
  open,
  sourceOptions,
  profiles,
  canAssign,
  role,
  initialTargetDate,
  initialAssigneeIds,
  onClose,
  onSaved,
}: DashboardTaskComposerProps) {
  const [saving, setSaving] = useState(false);
  const initial = useMemo(
    () => ({
      status: "Planned" as const,
      priority: "Medium" as const,
      percentComplete: 0,
      phase: "execution" as const,
      category: "Other" as const,
      assigneeIds: initialAssigneeIds ?? [],
      targetDate: initialTargetDate ?? "",
    }),
    [initialAssigneeIds, initialTargetDate],
  );

  const handleSubmit = async (input: ProjectManagementTaskInput, options?: { reopenReason?: string }) => {
    if (options?.reopenReason && !canReopenPmTask(role)) {
      message.warning("You are not authorized to reopen completed tasks.");
      return;
    }
    setSaving(true);
    try {
      const workspace = await loadProjectManagementWorkspace(
        stubPortfolioItem(input.sourceType, input.sourceId),
      );
      const snapshot = deriveWorkflowSnapshot({
        sourceType: input.sourceType,
        projectRows: workspace.projectRows,
        support: workspace.support ?? undefined,
        overrides: workspace.overrides,
        userTasks: workspace.tasks,
      });
      const derived = buildDerivedWorkflowItems({
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        projectRows: workspace.projectRows,
        support: workspace.support ?? undefined,
      });
      const defaults = buildCreateTaskDraftFromWorkspace({
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        snapshot,
        derivedItems: derived,
      });
      await createProjectManagementTask({
        ...defaults,
        ...input,
        phase: input.phase || defaults.phase,
        category: input.category || defaults.category,
        title: input.title.trim() || defaults.title,
        priority: input.priority || "Medium",
      });
      message.success("Task saved.");
      onSaved();
      onClose();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <TaskFormModal
      open={open}
      loading={saving}
      canAssign={canAssign}
      canReopen={canReopenPmTask(role)}
      profiles={profiles.filter((entry) => isPmTaskAssigneeOption(entry))}
      parentOptions={[]}
      dependencyOptions={[]}
      sourceOptions={sourceOptions}
      onLoadSourceDefaults={async (sourceType, sourceId) => {
        const workspace = await loadProjectManagementWorkspace(stubPortfolioItem(sourceType, sourceId));
        const snapshot = deriveWorkflowSnapshot({
          sourceType,
          projectRows: workspace.projectRows,
          support: workspace.support ?? undefined,
          overrides: workspace.overrides,
          userTasks: workspace.tasks,
        });
        return buildCreateTaskDraftFromWorkspace({
          sourceType,
          sourceId,
          snapshot,
          derivedItems: buildDerivedWorkflowItems({
            sourceType,
            sourceId,
            projectRows: workspace.projectRows,
            support: workspace.support ?? undefined,
          }),
        });
      }}
      initial={initial}
      existing={null}
      onCancel={onClose}
      onSubmit={handleSubmit}
    />
  );
}
