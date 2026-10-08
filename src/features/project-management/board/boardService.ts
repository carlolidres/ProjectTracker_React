import type { BoardTaskSeed } from "@/features/project-management/board/boardSourcePlan";
import { listAssignableProfiles } from "@/services/projectManagementService";
import { logAuditTrail } from "@/services/auditService";
import { supabase } from "@/lib/supabaseClient";
import {
  STANDARD_GROUPS,
  groupIdForStatus,
  type BoardPriority,
  type BoardStatus,
  type PmBoardTask,
  type PmGroup,
  type PmMembership,
  type PmProject,
  type PmWorkspace,
  type PmDependency,
  type ProjectAccess,
  type ProjectVisibility,
  type RelationType,
  type ScheduleSettings,
  type WorkspaceRole,
  wouldCycle,
  canDeleteGroup,
  datesAreOrdered,
} from "@/features/project-management/board/boardRules";

const MODULE = "Project Management";

function unavailable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return error.code === "42P01" || error.code === "PGRST205" || message.includes("does not exist") || message.includes("schema cache");
}

function fail(error: { message?: string; code?: string } | null): never {
  if (unavailable(error)) {
    throw new Error("Apply the Project Management workspace migration before saving.");
  }
  throw new Error(error?.message || "Project Management request failed.");
}

async function audit(
  userEmail: string,
  action: string,
  recordId: string,
  projectId: string,
  fieldName: string,
  oldValue: unknown,
  newValue: unknown,
  remarks: string,
) {
  await logAuditTrail({
    module: MODULE,
    action,
    recordId,
    projectId: projectId || "N/A",
    fieldName,
    oldValue,
    newValue,
    remarks,
    userEmail,
  });
}

function asStatus(value: unknown): BoardStatus {
  if (value === "Working on it" || value === "Done" || value === "Stuck") return value;
  return "Not Started";
}

function asPriority(value: unknown): BoardPriority {
  if (value === "Low" || value === "High") return value;
  return "Medium";
}

function asWorkspaceRole(value: unknown): WorkspaceRole {
  if (value === "Owner" || value === "Admin") return value;
  return "Member";
}

function asProjectAccess(value: unknown): ProjectAccess {
  if (value === "Owner" || value === "Viewer" || value === "Commenter") return value;
  return "Editor";
}

function mapWorkspace(row: Record<string, unknown>, role: WorkspaceRole): PmWorkspace {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    description: String(row.description ?? ""),
    icon: String(row.icon ?? "📋"),
    color: String(row.color ?? "#579bfc"),
    archivedAt: row.archived_at ? String(row.archived_at) : null,
    createdBy: String(row.created_by ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    role,
  };
}

function mapProject(row: Record<string, unknown>): PmProject {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id ?? ""),
    name: String(row.name ?? ""),
    description: String(row.description ?? ""),
    visibility: row.visibility === "invited" ? "invited" : "workspace",
    sortOrder: Number(row.sort_order ?? 0),
    archivedAt: row.archived_at ? String(row.archived_at) : null,
    createdBy: String(row.created_by ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    scheduleMode: row.schedule_mode === "strict" || row.schedule_mode === "none" ? row.schedule_mode : "flexible",
    workingDays: Array.isArray(row.working_days) && row.working_days.length
      ? row.working_days.map((day) => Number(day))
      : [1, 2, 3, 4, 5],
    holidays: Array.isArray(row.holidays) ? row.holidays.map((day) => String(day).slice(0, 10)) : [],
    sourceKind: row.source_kind === "spreadsheet" || row.source_kind === "support" ? row.source_kind : null,
    sourceId: String(row.source_id ?? ""),
    sourceRecordId: String(row.source_record_id ?? ""),
  };
}

export async function linkProjectSource(
  projectId: string,
  source: { kind: "spreadsheet" | "support"; id: string; recordId?: string },
): Promise<void> {
  const { error } = await supabase.from("pm_projects").update({
    source_kind: source.kind,
    source_id: source.id,
    source_record_id: source.recordId || null,
  }).eq("id", projectId);
  if (error) fail(error);
}

function mapGroup(row: Record<string, unknown>): PmGroup {
  return {
    id: String(row.id),
    projectId: String(row.project_id ?? ""),
    name: String(row.name ?? ""),
    color: String(row.color ?? "#579bfc"),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapTask(row: Record<string, unknown>): PmBoardTask {
  return {
    id: String(row.id),
    projectId: String(row.project_id ?? ""),
    groupId: String(row.group_id ?? ""),
    parentTaskId: row.parent_task_id ? String(row.parent_task_id) : null,
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    status: asStatus(row.status),
    priority: asPriority(row.priority),
    startDate: row.start_date ? String(row.start_date) : "",
    dueDate: row.due_date ? String(row.due_date) : "",
    ownerId: row.owner_id ? String(row.owner_id) : "",
    sortOrder: Number(row.sort_order ?? 0),
    createdBy: String(row.created_by ?? ""),
    updatedBy: String(row.updated_by ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export async function listMyWorkspaces(): Promise<PmWorkspace[]> {
  const { data, error } = await supabase
    .from("pm_workspace_members")
    .select("role, workspace:pm_workspaces(*)");
  if (error) fail(error);
  const workspaces: PmWorkspace[] = [];
  for (const row of data ?? []) {
    const record = row as { role?: string; workspace?: Record<string, unknown> | Record<string, unknown>[] | null };
    const workspace = Array.isArray(record.workspace) ? record.workspace[0] : record.workspace;
    if (!workspace) continue;
    workspaces.push(mapWorkspace(workspace, asWorkspaceRole(record.role)));
  }
  return workspaces.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createWorkspace(input: {
  name: string;
  description: string;
  icon: string;
  color: string;
  userEmail: string;
}): Promise<PmWorkspace> {
  const { data, error } = await supabase.rpc("create_pm_workspace", {
    p_name: input.name,
    p_description: input.description,
    p_icon: input.icon,
    p_color: input.color,
  });
  if (error) fail(error);
  const id = String(data);
  await audit(input.userEmail, "create", id, "N/A", "workspace", "", input.name, `Created workspace ${input.name}`);
  const workspaces = await listMyWorkspaces();
  const created = workspaces.find((workspace) => workspace.id === id);
  if (!created) throw new Error("Workspace was created but could not be opened.");
  return created;
}

export async function updateWorkspace(input: {
  workspace: PmWorkspace;
  patch: Partial<Pick<PmWorkspace, "name" | "description" | "icon" | "color">>;
  userEmail: string;
}) {
  const payload: Record<string, string> = {};
  if (input.patch.name !== undefined) payload.name = input.patch.name;
  if (input.patch.description !== undefined) payload.description = input.patch.description;
  if (input.patch.icon !== undefined) payload.icon = input.patch.icon;
  if (input.patch.color !== undefined) payload.color = input.patch.color;
  const { error } = await supabase.from("pm_workspaces").update(payload).eq("id", input.workspace.id);
  if (error) fail(error);
  await audit(
    input.userEmail,
    "update",
    input.workspace.id,
    "N/A",
    "workspace",
    input.workspace.name,
    input.patch.name ?? input.workspace.name,
    `Updated workspace ${input.patch.name ?? input.workspace.name}`,
  );
}

export async function setWorkspaceArchived(workspace: PmWorkspace, archived: boolean, userEmail: string) {
  const { error } = await supabase
    .from("pm_workspaces")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", workspace.id);
  if (error) fail(error);
  await audit(
    userEmail,
    archived ? "archive" : "restore",
    workspace.id,
    "N/A",
    "workspace",
    workspace.name,
    archived ? "Archived" : "Active",
    archived
      ? `Archived workspace ${workspace.name}. Its projects stay saved and leave the selector.`
      : `Restored workspace ${workspace.name}`,
  );
}

export async function listWorkspaceMembers(workspaceId: string): Promise<PmMembership[]> {
  const { data, error } = await supabase
    .from("pm_workspace_members")
    .select("user_id, role, created_at")
    .eq("workspace_id", workspaceId);
  if (error) fail(error);
  return (data ?? []).map((row) => ({
    userId: String(row.user_id),
    role: String(row.role),
    createdAt: String(row.created_at ?? ""),
  }));
}

export async function addWorkspaceMember(workspaceId: string, userId: string, role: WorkspaceRole, userEmail: string, personName: string) {
  const { error } = await supabase.from("pm_workspace_members").insert({
    workspace_id: workspaceId,
    user_id: userId,
    role,
  });
  if (error) fail(error);
  await audit(userEmail, "invite", workspaceId, "N/A", "member", "", `${personName} (${role})`, `Invited ${personName} to the workspace as ${role}`);
}

export async function updateWorkspaceMemberRole(workspaceId: string, userId: string, role: WorkspaceRole, userEmail: string, personName: string) {
  const { error } = await supabase
    .from("pm_workspace_members")
    .update({ role })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);
  if (error) fail(error);
  await audit(userEmail, "update", workspaceId, "N/A", "member role", personName, role, `Set ${personName} to ${role}`);
}

export async function removeWorkspaceMember(workspaceId: string, userId: string, userEmail: string, personName: string) {
  const { error } = await supabase
    .from("pm_workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);
  if (error) fail(error);
  await audit(userEmail, "remove", workspaceId, "N/A", "member", personName, "", `Removed ${personName} from the workspace`);
}

export async function listProjects(workspaceId: string): Promise<PmProject[]> {
  const { data, error } = await supabase
    .from("pm_projects")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("sort_order");
  if (error) fail(error);
  return (data ?? []).map((row) => mapProject(row as Record<string, unknown>));
}

export async function createProject(input: {
  workspaceId: string;
  name: string;
  description: string;
  visibility: ProjectVisibility;
  userEmail: string;
  seedSamples?: boolean;
}): Promise<PmProject> {
  const { data, error } = await supabase.rpc("create_pm_project", {
    p_workspace_id: input.workspaceId,
    p_name: input.name,
    p_description: input.description,
    p_visibility: input.visibility,
  });
  if (error) fail(error);
  const projectId = String(data);
  const groups = await Promise.all(STANDARD_GROUPS.map((group, index) => createGroup({
    projectId,
    name: group.name,
    color: group.color,
    sortOrder: index,
    userEmail: input.userEmail,
    quiet: true,
  })));
  if (input.seedSamples) await seedSampleTasks(projectId, groups, input.userEmail);
  await audit(
    input.userEmail,
    "create",
    projectId,
    projectId,
    "project",
    "",
    input.name,
    `Created project ${input.name} (${input.visibility === "invited" ? "invited members only" : "all workspace members"})`,
  );
  const projects = await listProjects(input.workspaceId);
  const created = projects.find((project) => project.id === projectId);
  if (!created) throw new Error("Project was created but could not be opened.");
  return created;
}

async function seedSampleTasks(projectId: string, groups: PmGroup[], userEmail: string) {
  const planned = groups.find((group) => group.name === "Planned") ?? groups[0];
  const ongoing = groups.find((group) => group.name === "On-going") ?? groups[1] ?? planned;
  const done = groups.find((group) => group.name === "Done") ?? groups[2] ?? planned;
  if (!planned || !ongoing || !done) return;
  const samples: Array<Parameters<typeof createTask>[0]> = [
    { projectId, groupId: planned.id, title: "Outline the work", status: "Not Started", priority: "Low", userEmail, quiet: true },
    { projectId, groupId: ongoing.id, title: "Run the first batch", status: "Working on it", priority: "Medium", startDate: "2026-10-06", dueDate: "2026-10-17", userEmail, quiet: true },
    { projectId, groupId: ongoing.id, title: "Waiting on a decision", status: "Stuck", priority: "High", startDate: "2026-10-01", dueDate: "2026-10-10", userEmail, quiet: true },
    { projectId, groupId: done.id, title: "Kickoff meeting", status: "Done", priority: "Medium", startDate: "2026-09-28", dueDate: "2026-09-28", userEmail, quiet: true },
  ];
  for (const sample of samples) await createTask(sample);
}

/** Writes each work step as a task and its required fields as subtasks in the matching group. */
export async function seedSourceTasks(projectId: string, groups: PmGroup[], seeds: BoardTaskSeed[], userEmail: string) {
  for (const seed of seeds) {
    const groupId = groupIdForStatus(seed.status, groups);
    if (!groupId) continue;
    const parent = await createTask({
      projectId,
      groupId,
      title: seed.title,
      status: seed.status,
      dueDate: seed.dueDate,
      userEmail,
      quiet: true,
    });
    for (const subtask of seed.subtasks) {
      await createTask({
        projectId,
        groupId,
        parentTaskId: parent.id,
        title: subtask.title,
        status: subtask.status,
        dueDate: subtask.dueDate,
        userEmail,
        quiet: true,
      });
    }
  }
}

export async function updateProject(project: PmProject, patch: Partial<Pick<PmProject, "name" | "description" | "visibility">>, userEmail: string) {
  const payload: Record<string, string> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.visibility !== undefined) payload.visibility = patch.visibility;
  const { error } = await supabase.from("pm_projects").update(payload).eq("id", project.id);
  if (error) fail(error);
  await audit(userEmail, "update", project.id, project.id, "project", project.name, patch.name ?? project.name, `Updated project ${patch.name ?? project.name}`);
}

export async function setProjectArchived(project: PmProject, archived: boolean, userEmail: string) {
  const { error } = await supabase
    .from("pm_projects")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", project.id);
  if (error) fail(error);
  await audit(userEmail, archived ? "archive" : "restore", project.id, project.id, "project", project.name, archived ? "Archived" : "Active", `${archived ? "Archived" : "Restored"} project ${project.name}`);
}

export async function listProjectMembers(projectId: string): Promise<PmMembership[]> {
  const { data, error } = await supabase
    .from("pm_project_members")
    .select("user_id, role, created_at")
    .eq("project_id", projectId);
  if (error) fail(error);
  return (data ?? []).map((row) => ({
    userId: String(row.user_id),
    role: String(row.role),
    createdAt: String(row.created_at ?? ""),
  }));
}

export async function myProjectRole(projectId: string, userId: string): Promise<ProjectAccess | null> {
  const { data, error } = await supabase
    .from("pm_project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) fail(error);
  if (!data) return null;
  return asProjectAccess(data.role);
}

export async function addProjectMember(projectId: string, userId: string, role: ProjectAccess, userEmail: string, personName: string) {
  const { error } = await supabase.from("pm_project_members").insert({
    project_id: projectId,
    user_id: userId,
    role,
  });
  if (error) fail(error);
  await audit(userEmail, "invite", projectId, projectId, "member", "", `${personName} (${role})`, `Invited ${personName} to the project as ${role}`);
}

export async function updateProjectMemberRole(projectId: string, userId: string, role: ProjectAccess, userEmail: string, personName: string) {
  const { error } = await supabase.from("pm_project_members").update({ role }).eq("project_id", projectId).eq("user_id", userId);
  if (error) fail(error);
  await audit(userEmail, "update", projectId, projectId, "member role", personName, role, `Set ${personName} to ${role} on the project`);
}

export async function removeProjectMember(projectId: string, userId: string, userEmail: string, personName: string) {
  const { error } = await supabase.from("pm_project_members").delete().eq("project_id", projectId).eq("user_id", userId);
  if (error) fail(error);
  await audit(userEmail, "remove", projectId, projectId, "member", personName, "", `Removed ${personName} from the project`);
}

export async function listGroups(projectId: string): Promise<PmGroup[]> {
  const { data, error } = await supabase.from("pm_groups").select("*").eq("project_id", projectId).order("sort_order");
  if (error) fail(error);
  return (data ?? []).map((row) => mapGroup(row as Record<string, unknown>));
}

export async function createGroup(input: {
  projectId: string;
  name: string;
  color: string;
  sortOrder?: number;
  userEmail: string;
  quiet?: boolean;
}): Promise<PmGroup> {
  const { data, error } = await supabase
    .from("pm_groups")
    .insert({
      project_id: input.projectId,
      name: input.name.trim(),
      color: input.color,
      sort_order: input.sortOrder ?? 0,
    })
    .select("*")
    .single();
  if (error) fail(error);
  const group = mapGroup(data as Record<string, unknown>);
  if (!input.quiet) {
    await audit(input.userEmail, "create", group.id, input.projectId, "group", "", group.name, `Added group ${group.name}`);
  }
  return group;
}

export async function updateGroup(group: PmGroup, patch: Partial<Pick<PmGroup, "name" | "color" | "sortOrder">>, userEmail: string) {
  const payload: Record<string, string | number> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.color !== undefined) payload.color = patch.color;
  if (patch.sortOrder !== undefined) payload.sort_order = patch.sortOrder;
  const { error } = await supabase.from("pm_groups").update(payload).eq("id", group.id);
  if (error) fail(error);
  if (patch.name !== undefined || patch.color !== undefined) {
    await audit(userEmail, "update", group.id, group.projectId, "group", group.name, patch.name ?? group.name, `Updated group ${patch.name ?? group.name}`);
  }
}

export async function deleteGroup(group: PmGroup, taskCount: number, userEmail: string) {
  if (!canDeleteGroup(taskCount)) throw new Error("Move or delete the tasks in this group first.");
  const { error } = await supabase.from("pm_groups").delete().eq("id", group.id);
  if (error) fail(error);
  await audit(userEmail, "delete", group.id, group.projectId, "group", group.name, "", `Deleted empty group ${group.name}`);
}

export async function listTasks(projectId: string): Promise<PmBoardTask[]> {
  const { data, error } = await supabase
    .from("pm_board_tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order");
  if (error) fail(error);
  return (data ?? []).map((row) => mapTask(row as Record<string, unknown>));
}

export interface TaskWrite {
  projectId: string;
  groupId: string;
  parentTaskId?: string | null;
  title: string;
  description?: string;
  status?: BoardStatus;
  priority?: BoardPriority;
  startDate?: string;
  dueDate?: string;
  ownerId?: string;
  userEmail: string;
  quiet?: boolean;
}

export async function createTask(input: TaskWrite): Promise<PmBoardTask> {
  if (!datesAreOrdered(input.startDate, input.dueDate)) {
    throw new Error("The due date cannot be earlier than the start date.");
  }
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("pm_board_tasks")
    .insert({
      project_id: input.projectId,
      group_id: input.groupId,
      parent_task_id: input.parentTaskId || null,
      title: input.title.trim(),
      description: input.description ?? "",
      status: input.status ?? "Not Started",
      priority: input.priority ?? "Medium",
      start_date: input.startDate || null,
      due_date: input.dueDate || null,
      owner_id: input.ownerId || null,
      created_by: userData.user?.id ?? null,
      updated_by: userData.user?.id ?? null,
    })
    .select("*")
    .single();
  if (error) fail(error);
  const task = mapTask(data as Record<string, unknown>);
  if (!input.quiet) {
    await audit(input.userEmail, "create", task.id, input.projectId, "task", "", task.title, `Created task ${task.title}`);
  }
  return task;
}

export async function updateTask(task: PmBoardTask, patch: Partial<PmBoardTask>, userEmail: string) {
  const start = patch.startDate !== undefined ? patch.startDate : task.startDate;
  const due = patch.dueDate !== undefined ? patch.dueDate : task.dueDate;
  if (!datesAreOrdered(start, due)) throw new Error("The due date cannot be earlier than the start date.");
  const { data: userData } = await supabase.auth.getUser();
  const payload: Record<string, string | number | null> = { updated_by: userData.user?.id ?? null };
  if (patch.title !== undefined) payload.title = patch.title.trim();
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.groupId !== undefined) payload.group_id = patch.groupId;
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.priority !== undefined) payload.priority = patch.priority;
  if (patch.startDate !== undefined) payload.start_date = patch.startDate || null;
  if (patch.dueDate !== undefined) payload.due_date = patch.dueDate || null;
  if (patch.ownerId !== undefined) payload.owner_id = patch.ownerId || null;
  if (patch.sortOrder !== undefined) payload.sort_order = patch.sortOrder;
  const { error } = await supabase.from("pm_board_tasks").update(payload).eq("id", task.id);
  if (error) fail(error);
  const changed = patch.status && patch.status !== task.status
    ? `Status ${task.status} → ${patch.status}`
    : patch.title && patch.title !== task.title
      ? `Renamed to ${patch.title}`
      : "Updated task";
  await audit(userEmail, "update", task.id, task.projectId, "task", task.title, patch.title ?? task.title, `${changed} on ${patch.title ?? task.title}`);
}

export async function deleteTask(task: PmBoardTask, userEmail: string) {
  const { error } = await supabase.from("pm_board_tasks").delete().eq("id", task.id);
  if (error) fail(error);
  await audit(userEmail, "delete", task.id, task.projectId, "task", task.title, "", `Deleted task ${task.title}`);
}

export async function updateProjectSchedule(project: PmProject, settings: ScheduleSettings, userEmail: string) {
  const { error } = await supabase.from("pm_projects").update({
    schedule_mode: settings.mode,
    working_days: settings.workingDays,
    holidays: settings.holidays,
  }).eq("id", project.id);
  if (error) fail(error);
  await audit(
    userEmail,
    "update",
    project.id,
    project.id,
    "schedule",
    project.scheduleMode,
    settings.mode,
    `Scheduling set to ${settings.mode}`,
  );
}

function mapDependency(row: Record<string, unknown>): PmDependency {
  const relation = String(row.relation_type ?? "FS");
  return {
    id: String(row.id),
    projectId: String(row.project_id ?? ""),
    successorId: String(row.successor_id ?? ""),
    predecessorId: String(row.predecessor_id ?? ""),
    relation: relation === "SS" || relation === "FF" || relation === "SF" ? relation : "FS",
    lagDays: Number(row.lag_days ?? 0),
  };
}

export async function listDependencies(projectId: string): Promise<PmDependency[]> {
  const { data, error } = await supabase.from("pm_task_dependencies").select("*").eq("project_id", projectId);
  if (error) fail(error);
  return (data ?? []).map((row) => mapDependency(row as Record<string, unknown>));
}

export async function replaceTaskDependencies(
  task: PmBoardTask,
  links: { predecessorId: string; relation: RelationType; lagDays: number }[],
  current: PmDependency[],
  userEmail: string,
) {
  const seen = new Set<string>();
  const kept = current.filter((link) => link.successorId !== task.id);
  for (const link of links) {
    if (link.predecessorId === task.id) throw new Error("A task cannot depend on itself.");
    if (seen.has(link.predecessorId)) throw new Error("This task is already linked to that predecessor.");
    seen.add(link.predecessorId);
    const graph = [
      ...kept.map((item) => ({ successorId: item.successorId, predecessorId: item.predecessorId })),
      ...links.map((item) => ({ successorId: task.id, predecessorId: item.predecessorId })),
    ];
    if (wouldCycle(graph, task.id, link.predecessorId)) {
      throw new Error("That link would create a circular chain, so it was not saved.");
    }
  }
  const { error: removed } = await supabase.from("pm_task_dependencies").delete().eq("successor_id", task.id);
  if (removed) fail(removed);
  if (links.length) {
    const { error } = await supabase.from("pm_task_dependencies").insert(links.map((link) => ({
      project_id: task.projectId,
      successor_id: task.id,
      predecessor_id: link.predecessorId,
      relation_type: link.relation,
      lag_days: Math.trunc(link.lagDays) || 0,
    })));
    if (error) fail(error);
  }
  await audit(userEmail, "update", task.id, task.projectId, "depends on", "", `${links.length} predecessor(s)`, `Updated dependencies for ${task.title}`);
  return listDependencies(task.projectId);
}

export interface PmTaskUpdate {
  id: string;
  taskId: string;
  body: string;
  authorId: string;
  createdAt: string;
}

export async function listTaskUpdates(taskId: string): Promise<PmTaskUpdate[]> {
  const { data, error } = await supabase.from("pm_task_updates").select("*").eq("task_id", taskId).order("created_at", { ascending: false });
  if (error) fail(error);
  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: String(record.id),
      taskId: String(record.task_id ?? ""),
      body: String(record.body ?? ""),
      authorId: String(record.author_id ?? ""),
      createdAt: String(record.created_at ?? ""),
    };
  });
}

export async function addTaskUpdate(task: PmBoardTask, body: string, userEmail: string) {
  const text = body.trim();
  if (!text) throw new Error("Write an update before posting.");
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("pm_task_updates").insert({
    task_id: task.id,
    project_id: task.projectId,
    body: text,
    author_id: userData.user?.id ?? null,
  });
  if (error) fail(error);
  await audit(userEmail, "create", task.id, task.projectId, "update", "", text, `Posted an update on ${task.title}`);
}

export interface PmTaskFile {
  id: string;
  taskId: string;
  fileName: string;
  storagePath: string;
  createdAt: string;
}

export async function listTaskFiles(taskId: string): Promise<PmTaskFile[]> {
  const { data, error } = await supabase.from("pm_task_files").select("*").eq("task_id", taskId).order("created_at", { ascending: false });
  if (error) fail(error);
  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: String(record.id),
      taskId: String(record.task_id ?? ""),
      fileName: String(record.file_name ?? ""),
      storagePath: String(record.storage_path ?? ""),
      createdAt: String(record.created_at ?? ""),
    };
  });
}

export async function uploadTaskFile(task: PmBoardTask, file: File, userEmail: string) {
  const { data: userData } = await supabase.auth.getUser();
  const safeName = file.name.replace(/[^\w.\- ]+/g, "_");
  const storagePath = `${task.projectId}/${task.id}/${crypto.randomUUID()}-${safeName}`;
  const uploaded = await supabase.storage.from("pm-task-files").upload(storagePath, file);
  if (uploaded.error) fail(uploaded.error);
  const { error } = await supabase.from("pm_task_files").insert({
    task_id: task.id,
    project_id: task.projectId,
    file_name: file.name,
    storage_path: storagePath,
    uploaded_by: userData.user?.id ?? null,
  });
  if (error) fail(error);
  await audit(userEmail, "create", task.id, task.projectId, "file", "", file.name, `Added file ${file.name} to ${task.title}`);
}

export async function taskFileUrl(storagePath: string) {
  const { data, error } = await supabase.storage.from("pm-task-files").createSignedUrl(storagePath, 60);
  if (error) fail(error);
  return data.signedUrl;
}

export interface TaskActivity {
  id: string;
  action: string;
  remarks: string;
  userEmail: string;
  timestamp: string;
}

export async function listTaskActivity(taskId: string): Promise<TaskActivity[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("audit_id, action, remarks, user_email, timestamp")
    .eq("record_id", taskId)
    .order("timestamp", { ascending: false })
    .limit(80);
  if (error) fail(error);
  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: String(record.audit_id),
      action: String(record.action ?? ""),
      remarks: String(record.remarks ?? ""),
      userEmail: String(record.user_email ?? ""),
      timestamp: String(record.timestamp ?? ""),
    };
  });
}

export { listAssignableProfiles };
