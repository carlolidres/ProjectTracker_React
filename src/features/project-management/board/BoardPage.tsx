import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, App, Button, Input, Modal, Popover, Select, Skeleton } from "antd";
import { useAuth } from "@/app/auth-provider";
import { useDateAdjustment } from "@/app/date-adjustment-provider";
import { ROLE_LABELS } from "@/lib/constants";
import { subscribeProjectDataChanged, subscribeSupportDataChanged } from "@/lib/projectDataEvents";
import { BOARD_WINDOW_NAME, stageBoardSessionHandoff } from "@/lib/boardSessionHandoff";
import { alignBoardFromSource, boardOwnsSourceWriteNow, markBoardSourceWrite, pushTaskToSource } from "@/features/project-management/board/boardSourceSync";
import { exportBoardTasksToExcel } from "@/services/exportService";
import { listActiveProjects } from "@/services/projectService";
import { listActiveSupportActivities } from "@/services/supportActivityService";
import type { ProjectRow, SupportActivity } from "@/types";
import {
  planSpreadsheetTasks,
  planSupportTasks,
  spreadsheetRowLabel,
  supportActivityLabel,
  type BoardTaskSeed,
} from "@/features/project-management/board/boardSourcePlan";
import { LucideIcon } from "@/components/common/lucide-icon";
import { BoardCalendar } from "@/features/project-management/board/BoardCalendar";
import { BoardGantt } from "@/features/project-management/board/BoardGantt";
import { BoardKanban, columnPatch } from "@/features/project-management/board/BoardKanban";
import { BoardRail } from "@/features/project-management/board/BoardRail";
import { BoardTable } from "@/features/project-management/board/BoardTable";
import { BoardToolbar } from "@/features/project-management/board/BoardToolbar";
import { TaskDetailsDrawer } from "@/features/project-management/board/TaskDetailsDrawer";
import { TaskSidePanel } from "@/features/project-management/board/TaskSidePanel";
import { ColumnCenter } from "@/features/project-management/board/ColumnCenter";
import { builtinColumnKey, columnSortKey, type BoardColumn } from "@/features/project-management/board/columnCatalog";
import {
  addWorkspaceMember,
  createGroup,
  createProject,
  createTask,
  createWorkspace,
  deleteGroup,
  deleteTask,
  listGroups,
  listMyWorkspaces,
  listProjectMembers,
  linkProjectSource,
  listProjects,
  listDependencies,
  listCompletedProjectIds,
  listTasks,
  seedSourceTasks,
  shareProjectWithAssignee,
  listWorkspaceMembers,
  myProjectRole,
  removeProjectMember,
  removeWorkspaceMember,
  replaceTaskDependencies,
  setProjectArchived,
  setWorkspaceArchived,
  updateGroup,
  updateProject,
  updateProjectMemberRole,
  updateProjectSchedule,
  saveLaunchPlan,
  updateTask,
  updateWorkspace,
  updateWorkspaceMemberRole,
  addProjectMember,
  listAssignableProfiles,
  listBoardColumns,
  listBoardLabels,
  saveBoardLabels,
  addBoardColumn,
  updateBoardColumn,
  archiveBoardColumn,
  listCellValues,
  saveCellValue,
  listUpdateCounts,
  listUpdateMarks,
  type UpdateMark,
} from "@/features/project-management/board/boardService";
import { personName } from "@/features/project-management/board/boardUi";
import { defaultBoardLabels, labelColor, labelName, selectableLabels, semanticStatus, type BoardLabel } from "@/features/project-management/board/boardLabels";
import { IMPACT_LABEL, QUALITY_LABEL, assessLaunch, priorityFromLaunch, priorityReason } from "@/features/project-management/board/launchSchedule";
import {
  DEFAULT_SEARCH_COLUMNS,
  EMPTY_BOARD_FILTERS,
  canEditBoard,
  canCommentOnBoard,
  canManageWorkspace,
  filterBoardTasks,
  compareBoardTasks,
  groupIdForStatus,
  formatMonthDayYear,
  readLastBoard,
  rescheduleFrom,
  resolveProjectAccess,
  topLevelTasks,
  writeLastBoard,
  type BoardFilters,
  type BoardGroupBy,
  type BoardSortKey,
  type PmBoardTask,
  type PmDependency,
  type PmGroup,
  type PmMembership,
  type PmProject,
  type PmWorkspace,
  type ProjectAccess,
  type ProjectVisibility,
  type ScheduleMode,
  type SearchColumn,
  type WorkspaceRole,
} from "@/features/project-management/board/boardRules";
import type { Profile } from "@/types";

type BoardView = "table" | "kanban" | "gantt" | "calendar";
const ICONS = ["📋", "⭐", "🧪", "📁", "🚀", "🌿", "✨", "🎯", "💡", "🌸", "🐝", "📌", "🧩", "🌙", "🍀"];
const COLORS = ["#579bfc", "#00c875", "#fdab3d", "#a25ddc", "#e2445c", "#ff7b9c", "#66ccff", "#9cd326", "#ffcb00", "#7e5bef", "#00d2d3", "#ff6b6b", "#4ecdc4", "#f78fb3", "#546de5"];

let boardBootstrap: Promise<PmWorkspace[]> | null = null;

function loadWorkspaces(email: string): Promise<PmWorkspace[]> {
  if (!boardBootstrap) {
    boardBootstrap = (async () => {
      const spaces = await listMyWorkspaces();
      if (spaces.length > 0) return spaces;
      const created = await createWorkspace({
        name: "Main Workspace",
        description: "",
        icon: "📋",
        color: "#579bfc",
        userEmail: email,
      });
      await createProject({
        workspaceId: created.id,
        name: "Getting started",
        description: "",
        visibility: "workspace",
        userEmail: email,
        seedSamples: true,
      });
      return listMyWorkspaces();
    })().catch((error) => {
      boardBootstrap = null;
      throw error;
    });
  }
  return boardBootstrap;
}

export function BoardPage() {
  const { message, modal } = App.useApp();
  const { user, profile } = useAuth();
  const { promptBatchDateAdjustment } = useDateAdjustment();
  const email = profile?.email || user?.email || "";
  const [loading, setLoading] = useState(true);
  const [projectsReady, setProjectsReady] = useState(false);
  const [error, setError] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [workspaces, setWorkspaces] = useState<PmWorkspace[]>([]);
  const [projects, setProjects] = useState<PmProject[]>([]);
  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  const [groups, setGroups] = useState<PmGroup[]>([]);
  const [tasks, setTasks] = useState<PmBoardTask[]>([]);
  const [dependencies, setDependencies] = useState<PmDependency[]>([]);
  const [searchColumns, setSearchColumns] = useState<SearchColumn[]>(DEFAULT_SEARCH_COLUMNS);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectRole, setProjectRole] = useState<ProjectAccess | null>(null);
  const [view, setView] = useState<BoardView>("table");
  const [sortKey, setSortKey] = useState<BoardSortKey>("priority");
  const [filters, setFilters] = useState<BoardFilters>(EMPTY_BOARD_FILTERS);
  const [groupBy, setGroupBy] = useState<BoardGroupBy>("group");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [updatesTaskId, setUpdatesTaskId] = useState<string | null>(null);
  const [railClosed, setRailClosed] = useState(() => localStorage.getItem("project-tracker:pm-board-rail") === "closed");
  const [boardTheme, setBoardTheme] = useState<"light" | "dark">(() => (
    localStorage.getItem("project-tracker:pm-board-theme") === "dark" ? "dark" : "light"
  ));
  const [boardColumns, setBoardColumns] = useState<BoardColumn[]>([]);
  const [labels, setLabels] = useState<BoardLabel[]>(defaultBoardLabels);
  const [cells, setCells] = useState<Record<string, Record<string, unknown>>>({});
  const [columnCenterOpen, setColumnCenterOpen] = useState(false);
  const [configureColumnId, setConfigureColumnId] = useState<string | null>(null);
  const [columnSort, setColumnSort] = useState<{ id: string; direction: "asc" | "desc" } | null>(null);
  const [scrollColumn, setScrollColumn] = useState<{ key: string; tick: number } | null>(null);
  const [updateMarks, setUpdateMarks] = useState<UpdateMark[]>([]);
  const [updateCounts, setUpdateCounts] = useState<Record<string, number>>({});
  const [seenUpdates, setSeenUpdates] = useState<Record<string, string>>({});
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("project-tracker:pm-board-favorites");
      return raw ? JSON.parse(raw) as string[] : [];
    } catch {
      return [];
    }
  });
  const [savedViews, setSavedViews] = useState<{ name: string; view: BoardView; filters: BoardFilters; sortKey: BoardSortKey; groupBy: BoardGroupBy }[]>([]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [headerDraft, setHeaderDraft] = useState<string | null>(null);
  const [projectQuery, setProjectQuery] = useState("");
  const [workspaceDraft, setWorkspaceDraft] = useState<{ open: boolean; editing: boolean; name: string; description: string; icon: string; color: string } | null>(null);
  const [projectDraft, setProjectDraft] = useState<{
    name: string;
    description: string;
    visibility: ProjectVisibility;
    source: "spreadsheet" | "support" | "blank";
    sourceId: string;
  } | null>(null);
  const [sourceCatalog, setSourceCatalog] = useState<{ projects: ProjectRow[]; support: SupportActivity[]; loading: boolean }>({
    projects: [],
    support: [],
    loading: false,
  });
  const [sourceReload, setSourceReload] = useState(0);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveQuery, setArchiveQuery] = useState("");
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveSnapshot, setArchiveSnapshot] = useState<{
    workspaces: PmWorkspace[];
    projects: { project: PmProject; workspaceName: string; workspaceId: string; completed: boolean }[];
  }>({ workspaces: [], projects: [] });
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => new Set());
  const [manageWorkspace, setManageWorkspace] = useState(false);
  const [manageProject, setManageProject] = useState(false);
  const [members, setMembers] = useState<PmMembership[]>([]);

  const workspace = workspaces.find((item) => item.id === workspaceId) ?? null;
  const project = projects.find((item) => item.id === projectId) ?? null;
  const access = project && workspace
    ? resolveProjectAccess({ workspaceRole: workspace.role, visibility: project.visibility, projectRole })
    : null;
  const canEdit = canEditBoard(access);
  const canComment = canCommentOnBoard(access);
  const canManage = canManageWorkspace(workspace?.role ?? null, profile?.role);
  const assigneeKey = useMemo(
    () => [...new Set(tasks.map((task) => task.ownerId).filter((id): id is string => Boolean(id)))].sort().join(","),
    [tasks],
  );
  useEffect(() => {
    document.documentElement.dataset.pmbTheme = boardTheme;
    localStorage.setItem("project-tracker:pm-board-theme", boardTheme);
    return () => {
      delete document.documentElement.dataset.pmbTheme;
    };
  }, [boardTheme]);
  useEffect(() => {
    if (!projectId || !canEdit || !assigneeKey) return;
    for (const ownerId of assigneeKey.split(",")) {
      void shareProjectWithAssignee(projectId, ownerId).catch(() => undefined);
    }
  }, [assigneeKey, canEdit, projectId]);
  const projectKey = projects.map((item) => item.id).join(",");
  const unseenTaskIds = useMemo(() => {
    const ids = new Set<string>();
    for (const mark of updateMarks) {
      if (mark.authorId && mark.authorId === user?.id) continue;
      if ((seenUpdates[mark.taskId] || "") >= mark.createdAt) continue;
      ids.add(mark.taskId);
    }
    return ids;
  }, [seenUpdates, updateMarks, user?.id]);
  const unseenCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const mark of updateMarks) {
      if (!unseenTaskIds.has(mark.taskId)) continue;
      counts.set(mark.projectId, (counts.get(mark.projectId) ?? 0) + 1);
    }
    return counts;
  }, [unseenTaskIds, updateMarks]);
  useEffect(() => {
    const key = `project-tracker:pm-board-seen:${user?.id || "local"}`;
    try {
      setSeenUpdates(JSON.parse(localStorage.getItem(key) || "{}") as Record<string, string>);
    } catch {
      setSeenUpdates({});
    }
  }, [user?.id]);
  useEffect(() => {
    if (!projectKey) return;
    let cancel = false;
    const ids = projectKey.split(",");
    void Promise.all([listUpdateMarks(ids), listUpdateCounts(ids)]).then(([marks, counts]) => {
      if (cancel) return;
      setUpdateMarks(marks);
      setUpdateCounts(counts);
    }).catch(() => undefined);
    return () => { cancel = true; };
  }, [projectKey]);
  useEffect(() => {
    if (!projectId) return;
    let cancel = false;
    void listBoardLabels(projectId).then((next) => {
      if (!cancel) setLabels(next);
    }).catch(() => undefined);
    void listBoardColumns(projectId).then(async (columns) => {
      if (cancel) return;
      setBoardColumns(columns);
      const values = await listCellValues(columns.map((column) => column.id));
      if (cancel) return;
      const next: Record<string, Record<string, unknown>> = {};
      for (const item of values) {
        next[item.taskId] = { ...next[item.taskId], [item.columnId]: item.value };
      }
      setCells(next);
    }).catch(() => undefined);
    return () => { cancel = true; };
  }, [projectId]);
  const markUpdateSeen = (taskId: string) => {
    const mark = updateMarks.find((item) => item.taskId === taskId);
    if (!mark) return;
    setSeenUpdates((current) => {
      const next = { ...current, [taskId]: mark.createdAt };
      localStorage.setItem(`project-tracker:pm-board-seen:${user?.id || "local"}`, JSON.stringify(next));
      return next;
    });
  };
  const saveCell = (task: PmBoardTask, column: BoardColumn, value: unknown) => {
    setCells((current) => ({ ...current, [task.id]: { ...current[task.id], [column.id]: value } }));
    void saveCellValue(task.id, column.id, value).catch((err) => message.error(err instanceof Error ? err.message : "Could not save the cell."));
    if (column.type === "people" && Array.isArray(value)) {
      for (const ownerId of value) void shareProjectWithAssignee(task.projectId, String(ownerId)).catch(() => undefined);
    }
  };
  const visibleTasks = useMemo(() => {
    const filtered = filterBoardTasks(tasks, filters, {
      columns: searchColumns,
      ownerName: (ownerId) => personName(profiles, ownerId),
    });
    return [...filtered].sort((a, b) => compareBoardTasks(a, b, sortKey));
  }, [filters, profiles, searchColumns, sortKey, tasks]);
  const launchReport = useMemo(() => {
    if (!project) return null;
    return assessLaunch({
      nodes: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        start: task.startDate,
        finish: task.dueDate,
        baselineFinish: task.baselineFinish,
        qualityBlocker: task.qualityBlocker,
        isLaunch: task.isLaunch,
      })),
      edges: dependencies.map((link) => ({
        predecessorId: link.predecessorId,
        successorId: link.successorId,
        relation: link.relation,
        lagDays: link.lagDays,
      })),
      baselineLaunchDate: project.baselineLaunchDate,
      bufferWorkdays: project.riskBufferWorkdays,
      workingDays: project.workingDays,
      holidays: project.holidays,
      qualityRelease: project.qualityReleaseStatus,
    });
  }, [dependencies, project, tasks]);
  const priorityStamp = useRef("");
  useEffect(() => {
    if (!canEdit || !launchReport) return;
    const updates = tasks.flatMap((task) => {
      const priority = priorityFromLaunch(launchReport.tasks[task.id]?.impact ?? "NOT_ASSESSED", task.qualityBlocker);
      return task.priority === priority ? [] : [{ task, priority }];
    });
    const stamp = updates.map((item) => `${item.task.id}:${item.priority}`).sort().join("|");
    if (!stamp || priorityStamp.current === stamp) return;
    priorityStamp.current = stamp;
    void Promise.all(updates.map(({ task, priority }) => updateTask(task, { priority }, email))).then(() => {
      setTasks((current) => current.map((task) => {
        const match = updates.find((item) => item.task.id === task.id);
        return match && task.priority !== match.priority ? { ...task, priority: match.priority } : task;
      }));
    }).catch(() => {
      priorityStamp.current = "";
    });
  }, [canEdit, email, launchReport, tasks]);
  const spreadsheetChoices = useMemo(() => sourceCatalog.projects.flatMap((row) => {
    const projectId = row.project_id?.trim();
    if (!projectId || projectId === "N/A") return [];
    const value = row.record_id?.trim() || `${projectId}:${row.unique_batch}:${row.po_control_no}`;
    return [{ value, label: spreadsheetRowLabel(row), projectId }];
  }).sort((a, b) => a.label.localeCompare(b.label)), [sourceCatalog.projects]);
  const supportChoices = useMemo(
    () => sourceCatalog.support
      .map((row) => ({ value: row.activity_id, label: supportActivityLabel(row) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [sourceCatalog.support],
  );
  const openTask = tasks.find((task) => task.id === openTaskId) ?? null;
  const updatesTask = tasks.find((task) => task.id === updatesTaskId) ?? null;

  const refreshTasks = useCallback(async (id: string) => {
    setTasks(await listTasks(id));
  }, []);

  useEffect(() => {
    if (!archiveOpen) setArchiveQuery("");
  }, [archiveOpen]);

  useEffect(() => {
    if (!archiveOpen) return;
    let cancel = false;
    setArchiveLoading(true);
    void Promise.all(workspaces.map(async (space) => ({
      workspace: space,
      projects: await listProjects(space.id),
    }))).then(async (lists) => {
      if (cancel) return;
      const archivedProjects = lists.flatMap((item) => item.projects
        .filter((project) => project.archivedAt || item.workspace.archivedAt)
        .map((project) => ({ project, workspaceName: item.workspace.name, workspaceId: item.workspace.id })));
      const completed = await listCompletedProjectIds(archivedProjects.map((item) => item.project.id));
      if (cancel) return;
      setArchiveSnapshot({
        workspaces: lists.filter((item) => item.workspace.archivedAt).map((item) => item.workspace),
        projects: archivedProjects.map((item) => ({ ...item, completed: completed.has(item.project.id) })),
      });
    }).catch((err) => {
      if (!cancel) message.error(err instanceof Error ? err.message : "Could not load the archive.");
    }).finally(() => {
      if (!cancel) setArchiveLoading(false);
    });
    return () => {
      cancel = true;
    };
  }, [archiveOpen, message, workspaces]);

  useEffect(() => {
    const ids = projects.filter((item) => !item.archivedAt).map((item) => item.id);
    if (ids.length === 0) {
      setCompletedIds(new Set());
      return;
    }
    let cancel = false;
    void listCompletedProjectIds(ids).then((next) => {
      if (!cancel) setCompletedIds(next);
    }).catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, [projects, tasks]);

  useEffect(() => {
    if (!email || !user?.id) return;
    let cancel = false;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const [people, nextSpaces] = await Promise.all([listAssignableProfiles(), loadWorkspaces(email)]);
        if (cancel) return;
        setProfiles(people);
        setWorkspaces(nextSpaces);
        const last = readLastBoard();
        const restored = nextSpaces.find((item) => item.id === last?.workspaceId && !item.archivedAt)
          ?? nextSpaces.find((item) => !item.archivedAt)
          ?? nextSpaces[0];
        setWorkspaceId(restored?.id ?? null);
      } catch (err) {
        if (!cancel) setError(err instanceof Error ? err.message : "Could not open Project Management.");
      } finally {
        if (!cancel) setLoading(false);
      }
    };
    void run();
    return () => {
      cancel = true;
    };
  }, [email, user?.id]);

  useEffect(() => {
    if (!workspaceId || !user?.id) return;
    let cancel = false;
    setProjectsReady(false);
    void listProjects(workspaceId).then((rows) => {
      if (cancel) return;
      setProjects(rows);
      const last = readLastBoard();
      const open = rows.find((item) => item.id === last?.projectId && !item.archivedAt)
        ?? rows.find((item) => !item.archivedAt)
        ?? null;
      setProjectId(open?.id ?? null);
      if (workspaceId && open) writeLastBoard(workspaceId, open.id);
      setProjectsReady(true);
    }).catch((err) => {
      if (!cancel) setError(err instanceof Error ? err.message : "Could not load projects.");
    });
    return () => {
      cancel = true;
    };
  }, [user?.id, workspaceId]);

  useEffect(() => {
    if (!projectId || !user?.id || !workspaceId) return;
    let cancel = false;
    writeLastBoard(workspaceId, projectId);
    void Promise.all([listGroups(projectId), listTasks(projectId), myProjectRole(projectId, user.id), listDependencies(projectId)]).then(async ([nextGroups, nextTasks, role, nextLinks]) => {
      if (cancel) return;
      setGroups(nextGroups);
      setDependencies(nextLinks);
      setProjectRole(role);
      const current = projectsRef.current.find((item) => item.id === projectId);
      if (current) {
        try {
          const aligned = await alignBoardFromSource(current, nextTasks, nextGroups, email);
          if (cancel) return;
          if (aligned.project !== current) {
            setProjects((list) => list.map((item) => (item.id === aligned.project.id ? aligned.project : item)));
          }
          setTasks(aligned.tasks);
        } catch (err) {
          if (!cancel) setTasks(nextTasks);
          if (!cancel) setError(err instanceof Error ? err.message : "Could not sync this project.");
        }
      } else {
        setTasks(nextTasks);
      }
      const raw = localStorage.getItem(`project-tracker:pm-board-groups:${projectId}`);
      setCollapsed(raw ? JSON.parse(raw) as Record<string, boolean> : {});
    }).catch((err) => {
      if (!cancel) setError(err instanceof Error ? err.message : "Could not open this project.");
    });
    return () => {
      cancel = true;
    };
  }, [email, projectId, sourceReload, user?.id, workspaceId]);

  useEffect(() => {
    return subscribeProjectDataChanged((detail) => {
      if (boardOwnsSourceWriteNow()) return;
      const current = projectsRef.current.find((item) => item.sourceKind === "spreadsheet" && item.sourceId === detail.projectId);
      if (current && current.id === projectId) setSourceReload((value) => value + 1);
    });
  }, [projectId]);

  useEffect(() => {
    return subscribeSupportDataChanged((activityId) => {
      if (boardOwnsSourceWriteNow()) return;
      const current = projectsRef.current.find((item) => item.sourceKind === "support" && item.sourceId === activityId);
      if (current && current.id === projectId) setSourceReload((value) => value + 1);
    });
  }, [projectId]);

  useEffect(() => {
    localStorage.setItem("project-tracker:pm-board-rail", railClosed ? "closed" : "open");
  }, [railClosed]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.key === "[") setRailClosed((current) => !current);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!projectId) return;
    try {
      const raw = localStorage.getItem(`project-tracker:pm-board-views:${projectId}`);
      setSavedViews(raw ? JSON.parse(raw) as typeof savedViews : []);
    } catch {
      setSavedViews([]);
    }
  }, [projectId]);

  useEffect(() => {
    const title = project?.name || workspace?.name;
    if (!title) return;
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [project?.name, workspace?.name]);

  const placeKanban = async (task: PmBoardTask, columnId: string | null, orderedIds: string[]) => {
    const lane = groupBy === "priority" ? "priority" : "status";
    const fieldPatch = columnId ? columnPatch(lane, columnId) : {};
    if (fieldPatch.status && !task.parentTaskId) {
      const nextGroup = groupIdForStatus(semanticStatus(labels, fieldPatch.status), groups);
      if (nextGroup) fieldPatch.groupId = nextGroup;
    }
    const previous = tasks;
    setTasks(tasks.map((item) => {
      const index = orderedIds.indexOf(item.id);
      if (index < 0) return item;
      return { ...item, ...(item.id === task.id ? fieldPatch : {}), sortOrder: index, updatedAt: new Date().toISOString() };
    }));
    try {
      if (project && fieldPatch.status) {
        const roleLabel = profile?.role ? (ROLE_LABELS[profile.role] ?? profile.role) : "User";
        markBoardSourceWrite(true);
        await pushTaskToSource(project, { ...task, ...fieldPatch }, email, (changes) => promptBatchDateAdjustment(changes, roleLabel));
      }
      await Promise.all(orderedIds.map((id, index) => {
        const item = previous.find((row) => row.id === id);
        if (!item) return Promise.resolve();
        const patch: Partial<PmBoardTask> = { sortOrder: index };
        if (id === task.id) Object.assign(patch, fieldPatch);
        return updateTask(item, patch, email);
      }));
    } catch (err) {
      setTasks(previous);
      message.error(err instanceof Error ? err.message : "Could not move the task.");
    } finally {
      markBoardSourceWrite(false);
    }
  };

  const persistLaunch = async (nextTasks: PmBoardTask[], links: PmDependency[] = dependencies) => {
    if (!project || !canEdit) return;
    const report = assessLaunch({
      nodes: nextTasks.map((item) => ({
        id: item.id,
        title: item.title,
        start: item.startDate,
        finish: item.dueDate,
        baselineFinish: item.baselineFinish,
        qualityBlocker: item.qualityBlocker,
        isLaunch: item.isLaunch,
      })),
      edges: links.map((link) => ({
        predecessorId: link.predecessorId,
        successorId: link.successorId,
        relation: link.relation,
        lagDays: link.lagDays,
      })),
      baselineLaunchDate: project.baselineLaunchDate,
      bufferWorkdays: project.riskBufferWorkdays,
      workingDays: project.workingDays,
      holidays: project.holidays,
      qualityRelease: project.qualityReleaseStatus,
    });
    const reasons = report.reasons.join(" ");
    if (
      project.forecastLaunchDate === report.forecastLaunchDate
      && project.launchImpact === report.impact
      && project.launchImpactReasons === reasons
    ) return;
    const version = await saveLaunchPlan(project, {
      baselineLaunchDate: project.baselineLaunchDate,
      forecastLaunchDate: report.forecastLaunchDate,
      qualityReleaseStatus: project.qualityReleaseStatus,
      launchImpact: report.impact,
      launchImpactReasons: reasons,
      riskBufferWorkdays: project.riskBufferWorkdays,
      rebaseline: false,
    }, email);
    setProjects((current) => current.map((item) => (item.id === project.id ? {
      ...item,
      forecastLaunchDate: report.forecastLaunchDate,
      launchImpact: report.impact,
      launchImpactReasons: reasons,
      scheduleVersion: version,
    } : item)));
  };

  const patchTask = async (task: PmBoardTask, patch: Partial<PmBoardTask>) => {
    const nextPatch = { ...patch };
    if (patch.status && !task.parentTaskId) {
      const groupId = groupIdForStatus(semanticStatus(labels, patch.status), groups);
      if (groupId && groupId !== task.groupId) nextPatch.groupId = groupId;
    }
    if (patch.dueDate && !task.baselineFinish) nextPatch.baselineFinish = patch.dueDate;
    if (patch.status === "Done" && !task.actualFinish) {
      const finish = nextPatch.dueDate ?? task.dueDate;
      if (finish) nextPatch.actualFinish = finish;
    }
    const previous = tasks;
    const next = tasks.map((item) => (item.id === task.id ? { ...item, ...nextPatch, updatedAt: new Date().toISOString() } : item));
    setTasks(next);
    try {
      if (project && (patch.status || patch.dueDate !== undefined || patch.startDate !== undefined)) {
        const roleLabel = profile?.role ? (ROLE_LABELS[profile.role] ?? profile.role) : "User";
        markBoardSourceWrite(true);
        await pushTaskToSource(project, { ...task, ...nextPatch }, email, (changes) => promptBatchDateAdjustment(changes, roleLabel));
      }
      await updateTask(task, nextPatch, email);
      const scheduled = patch.startDate !== undefined || patch.dueDate !== undefined ? await applySchedule(next, task.id) : next;
      if (patch.startDate !== undefined || patch.dueDate !== undefined || patch.status || patch.qualityBlocker !== undefined) {
        await persistLaunch(scheduled);
      }
    } catch (err) {
      setTasks(previous);
      message.error(err instanceof Error ? err.message : "Could not update the task.");
    } finally {
      markBoardSourceWrite(false);
    }
  };

  const applySchedule = async (base: PmBoardTask[], originId: string, links: PmDependency[] = dependencies): Promise<PmBoardTask[]> => {
    if (!project) return base;
    const result = rescheduleFrom(base, links, originId, {
      mode: project.scheduleMode,
      workingDays: project.workingDays,
      holidays: project.holidays,
    });
    result.conflicts.forEach((conflict) => message.warning(conflict.message));
    if (result.datesRequired.length) message.info("Dates required");
    if (!result.updates.length) return base;
    const before = base
      .filter((item) => result.updates.some((update) => update.id === item.id))
      .map((item) => ({ ...item }));
    for (const update of result.updates) {
      const current = base.find((item) => item.id === update.id);
      if (current) await updateTask(current, { startDate: update.startDate, dueDate: update.dueDate }, email);
    }
    const scheduled = base.map((item) => {
      const update = result.updates.find((entry) => entry.id === item.id);
      return update ? { ...item, startDate: update.startDate, dueDate: update.dueDate } : item;
    });
    setTasks((current) => current.map((item) => scheduled.find((entry) => entry.id === item.id) ?? item));
    message.open({
      type: "info",
      key: "pm-schedule-undo",
      duration: 8,
      content: (
        <span>
          Dependent dates moved.{" "}
          <Button
            type="link"
            onClick={() => {
              void Promise.all(before.map((item) => updateTask(item, { startDate: item.startDate, dueDate: item.dueDate }, email))).then(() => {
                setTasks((current) => current.map((item) => before.find((saved) => saved.id === item.id) ?? item));
                message.destroy("pm-schedule-undo");
              });
            }}
          >
            Undo
          </Button>
        </span>
      ),
    });
    return scheduled;
  };

  const saveDependencies = async (
    task: PmBoardTask,
    links: { predecessorId: string; relation: PmDependency["relation"]; lagDays: number }[],
  ) => {
    const next = await replaceTaskDependencies(task, links, dependencies, email);
    setDependencies(next);
    const scheduled = await applySchedule(tasks, task.id, next);
    await persistLaunch(scheduled, next);
  };

  const addTask = async (sectionId: string, title: string, parent?: PmBoardTask) => {
    if (!project) return;
    const groupId = groupBy === "group" ? sectionId : parent?.groupId || groups[0]?.id;
    if (!groupId) return;
    try {
      const created = await createTask({
        projectId: project.id,
        groupId,
        parentTaskId: parent?.id,
        title,
        status: groupBy === "status" && !parent ? sectionId : parent?.status ?? "Not Started",
        priority: groupBy === "priority" && !parent ? sectionId : "Medium",
        userEmail: email,
      });
      setTasks((current) => [...current, created]);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Could not add the task.");
    }
  };

  const shownColumns = useMemo(
    () => [...boardColumns].filter((column) => column.settings.hidden !== true).sort((a, b) => a.position - b.position || a.title.localeCompare(b.title)),
    [boardColumns],
  );
  const revealColumn = (key: string) => {
    setView("table");
    setHidden((current) => {
      if (!current.has(key)) return current;
      const next = new Set(current);
      next.delete(key);
      return next;
    });
    setScrollColumn((current) => ({ key, tick: (current?.tick ?? 0) + 1 }));
  };
  const patchColumn = async (column: BoardColumn, patch: { title?: string; settings?: Record<string, unknown>; position?: number }) => {
    await updateBoardColumn(column.id, patch);
    setBoardColumns((current) => current.map((item) => (
      item.id === column.id ? { ...item, ...patch, settings: patch.settings ?? item.settings } : item
    )));
  };
  const onColumnAction = (column: BoardColumn, action: string) => {
    if (action === "rename") {
      const name = window.prompt("Column name", column.title);
      if (!name?.trim() || name.trim() === column.title) return;
      void patchColumn(column, { title: name.trim() }).catch((err) => message.error(err instanceof Error ? err.message : "Could not rename the column."));
      return;
    }
    if (action === "settings") {
      setConfigureColumnId(column.id);
      setColumnCenterOpen(true);
      return;
    }
    if (action === "hide") {
      void patchColumn(column, { settings: { ...column.settings, hidden: true } }).catch((err) => message.error(err instanceof Error ? err.message : "Could not hide the column."));
      return;
    }
    if (action === "delete") {
      if (!window.confirm(`Remove ${column.title}? Cell values for this column will be hidden.`)) return;
      void archiveBoardColumn(column.id).then(() => {
        setBoardColumns((current) => current.filter((item) => item.id !== column.id));
        setColumnSort((current) => (current?.id === column.id ? null : current));
      }).catch((err) => message.error(err instanceof Error ? err.message : "Could not delete the column."));
      return;
    }
    if (action === "asc" || action === "desc") {
      setColumnSort({ id: column.id, direction: action });
      return;
    }
    if (action !== "left" && action !== "right") return;
    const ordered = [...boardColumns].sort((a, b) => a.position - b.position || a.title.localeCompare(b.title));
    const index = ordered.findIndex((item) => item.id === column.id);
    const nextIndex = index + (action === "left" ? -1 : 1);
    if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return;
    const swapped = [...ordered];
    const [moved] = swapped.splice(index, 1);
    swapped.splice(nextIndex, 0, moved);
    const positioned = swapped.map((item, position) => ({ ...item, position }));
    setBoardColumns(positioned);
    void Promise.all(positioned.map((item) => updateBoardColumn(item.id, { position: item.position }))).catch((err) => message.error(err instanceof Error ? err.message : "Could not move the column."));
  };
  const sections = useMemo(() => {
    const direction = columnSort?.direction === "asc" ? 1 : -1;
    const sortColumn = boardColumns.find((column) => column.id === columnSort?.id);
    const orderTasks = (list: PmBoardTask[]) => {
      if (!sortColumn || !columnSort) return list;
      return [...list].sort((a, b) => {
        const left = columnSortKey(sortColumn.type, cells[a.id]?.[sortColumn.id]);
        const right = columnSortKey(sortColumn.type, cells[b.id]?.[sortColumn.id]);
        if (left === right) return 0;
        if (left === "") return 1;
        if (right === "") return -1;
        return left < right ? -direction : direction;
      });
    };
    const tops = orderTasks(topLevelTasks(visibleTasks));
    if (groupBy === "status" || groupBy === "priority") {
      const active = selectableLabels(labels, groupBy);
      const used = tops.map((task) => groupBy === "status" ? task.status : task.priority);
      const extra = [...new Set(used.filter((id) => !active.some((label) => label.id === id)))];
      return [...active, ...extra.map((id) => ({ id, name: labelName(labels, groupBy, id), color: labelColor(labels, groupBy, id, "#c4c4c4"), kind: groupBy, order: 0, active: false, retired: false, description: "", semantic: "" }))].map((label) => ({
        id: label.id,
        label: label.name,
        color: label.color,
        tasks: tops.filter((task) => (groupBy === "status" ? task.status : task.priority) === label.id),
      }));
    }
    return groups.map((group) => ({
      id: group.id,
      label: group.name,
      color: group.color,
      tasks: tops.filter((task) => task.groupId === group.id),
    }));
  }, [boardColumns, cells, columnSort, groupBy, groups, labels, visibleTasks]);

  const saveWorkspace = async () => {
    if (!workspaceDraft) return;
    try {
      if (workspaceDraft.editing && workspace) {
        await updateWorkspace({
          workspace,
          patch: workspaceDraft,
          userEmail: email,
        });
        setWorkspaces((current) => current.map((item) => (item.id === workspace.id ? { ...item, ...workspaceDraft } : item)));
      } else {
        const created = await createWorkspace({ ...workspaceDraft, userEmail: email });
        setWorkspaces((current) => [...current, created]);
        setWorkspaceId(created.id);
        setProjects([]);
        setProjectId(null);
      }
      setWorkspaceDraft(null);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Could not save the workspace.");
    }
  };

  const openNewProject = () => {
    setProjectDraft({ name: "", description: "", visibility: "workspace", source: "spreadsheet", sourceId: "" });
    setSourceCatalog((current) => ({ ...current, loading: true }));
    void Promise.all([listActiveProjects(), listActiveSupportActivities()])
      .then(([projects, support]) => setSourceCatalog({ projects, support, loading: false }))
      .catch((err) => {
        setSourceCatalog((current) => ({ ...current, loading: false }));
        message.error(err instanceof Error ? err.message : "Could not load spreadsheet and support records.");
      });
  };

  const saveProject = async () => {
    if (!projectDraft || !workspace || !projectDraft.name.trim()) return;
    try {
      let seeds: BoardTaskSeed[] = [];
      if (projectDraft.source === "spreadsheet") {
        const choice = spreadsheetChoices.find((item) => item.value === projectDraft.sourceId);
        const rows = sourceCatalog.projects.filter((row) => row.project_id === choice?.projectId);
        if (!rows.length) throw new Error("Choose a spreadsheet project.");
        seeds = planSpreadsheetTasks(rows);
      } else if (projectDraft.source === "support") {
        const row = sourceCatalog.support.find((item) => item.activity_id === projectDraft.sourceId);
        if (!row) throw new Error("Choose a support activity.");
        seeds = planSupportTasks(row);
      }
      const created = await createProject({
        workspaceId: workspace.id,
        name: projectDraft.name.trim(),
        description: projectDraft.description,
        visibility: projectDraft.visibility,
        userEmail: email,
      });
      let linked = created;
      if (projectDraft.source === "spreadsheet") {
        const choice = spreadsheetChoices.find((item) => item.value === projectDraft.sourceId);
        const record = sourceCatalog.projects.find((row) => row.project_id === choice?.projectId && (row.record_id || `${row.project_id}:${row.unique_batch}:${row.po_control_no}`) === projectDraft.sourceId);
        if (choice) {
          await linkProjectSource(created.id, { kind: "spreadsheet", id: choice.projectId, recordId: record?.record_id });
          linked = { ...created, sourceKind: "spreadsheet", sourceId: choice.projectId, sourceRecordId: record?.record_id ?? "" };
        }
      } else if (projectDraft.source === "support") {
        await linkProjectSource(created.id, { kind: "support", id: projectDraft.sourceId });
        linked = { ...created, sourceKind: "support", sourceId: projectDraft.sourceId, sourceRecordId: "" };
      }
      if (seeds.length) {
        const nextGroups = await listGroups(created.id);
        await seedSourceTasks(created.id, nextGroups, seeds, email);
      }
      setProjects((current) => [...current, linked]);
      setProjectId(linked.id);
      setProjectDraft(null);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Could not create the project.");
    }
  };

  const openMembers = async (kind: "workspace" | "project") => {
    if (!workspace) return;
    const rows = kind === "workspace"
      ? await listWorkspaceMembers(workspace.id)
      : project ? await listProjectMembers(project.id) : [];
    setMembers(rows);
    if (kind === "workspace") setManageWorkspace(true);
    else setManageProject(true);
  };

  const renameProject = (name: string) => {
    const trimmed = name.trim();
    if (!project || project.sourceKind || !trimmed || trimmed === project.name) return;
    const previous = project.name;
    setProjects((current) => current.map((item) => (item.id === project.id ? { ...item, name: trimmed } : item)));
    void updateProject(project, { name: trimmed }, email).catch((err) => {
      setProjects((current) => current.map((item) => (item.id === project.id ? { ...item, name: previous } : item)));
      message.error(err instanceof Error ? err.message : "Could not rename the project.");
    });
  };

  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      localStorage.setItem("project-tracker:pm-board-favorites", JSON.stringify(next));
      return next;
    });
  };

  const saveCurrentView = () => {
    if (!projectId) return;
    const name = window.prompt("View name");
    if (!name?.trim()) return;
    const next = [...savedViews.filter((item) => item.name !== name.trim()), {
      name: name.trim(),
      view,
      filters,
      sortKey,
      groupBy,
    }];
    setSavedViews(next);
    localStorage.setItem(`project-tracker:pm-board-views:${projectId}`, JSON.stringify(next));
  };

  const openSavedView = (name: string) => {
    const saved = savedViews.find((item) => item.name === name);
    if (!saved) return;
    setView(saved.view);
    setFilters(saved.filters);
    setSortKey(saved.sortKey);
    setGroupBy(saved.groupBy);
  };

  const archiveNeedle = archiveQuery.trim().toLowerCase();
  const archivedWorkspaces = archiveSnapshot.workspaces.filter((space) =>
    !archiveNeedle || `${space.icon} ${space.name} ${space.description}`.toLowerCase().includes(archiveNeedle),
  );
  const archivedProjects = archiveSnapshot.projects.filter(({ project: item, workspaceName }) =>
    !archiveNeedle || `${item.name} ${item.description} ${workspaceName}`.toLowerCase().includes(archiveNeedle),
  );
  const taskOrder = topLevelTasks(visibleTasks);
  const updatesIndex = taskOrder.findIndex((task) => task.id === updatesTaskId);

  return (
    <div className="pmb-shell">
      <div className={`pmb-rail-wrap${railClosed ? " is-closed" : ""}`}>
      <BoardRail
        workspaces={workspaces}
        workspace={workspace}
        projects={projects}
        projectId={projectId}
        query={projectQuery}
        canRename={access === "Owner" && !project?.sourceKind}
        favorites={favorites}
        unseenCounts={unseenCounts}
        completedIds={completedIds}
        onQuery={setProjectQuery}
        onSelectWorkspace={setWorkspaceId}
        onSelectProject={setProjectId}
        onRenameProject={renameProject}
        onToggleFavorite={toggleFavorite}
        onAddWorkspace={() => setWorkspaceDraft({ open: true, editing: false, name: "", description: "", icon: "📋", color: "#579bfc" })}
        onAddProject={openNewProject}
        onManage={() => void openMembers("workspace")}
        onEdit={() => workspace && setWorkspaceDraft({
          open: true,
          editing: true,
          name: workspace.name,
          description: workspace.description,
          icon: workspace.icon,
          color: workspace.color,
        })}
        onLeave={() => {
          if (!workspace || !user?.id) return;
          modal.confirm({
            title: `Leave ${workspace.name}?`,
            content: "You will no longer see this workspace. An owner can remove other people from Manage.",
            okText: "Leave",
            okButtonProps: { danger: true },
            onOk: () => removeWorkspaceMember(workspace.id, user.id, email, personName(profiles, user.id)).then(async () => {
              const next = await listMyWorkspaces();
              setWorkspaces(next);
              setWorkspaceId(next.find((item) => !item.archivedAt)?.id ?? null);
              setManageWorkspace(false);
              message.success(`Left ${workspace.name}`);
            }),
          });
        }}
        onArchive={() => {
          if (!workspace) return;
          modal.confirm({
            title: `Archive ${workspace.name}?`,
            content: "Archiving hides this workspace and its projects from the selector. The tasks stay saved, and the owner can restore them from Manage.",
            okText: "Archive",
            onOk: async () => {
              await setWorkspaceArchived(workspace, true, email);
              setWorkspaces((current) => current.map((item) => (item.id === workspace.id ? { ...item, archivedAt: new Date().toISOString() } : item)));
              setWorkspaceId(workspaces.find((item) => item.id !== workspace.id && !item.archivedAt)?.id ?? null);
            },
          });
        }}
      />
        <button
          type="button"
          className="pmb-rail-toggle"
          aria-label={railClosed ? "Open navigation" : "Close navigation"}
          title={railClosed ? "Open navigation" : "Close navigation"}
          onClick={() => setRailClosed((current) => !current)}
        >
          <LucideIcon className="pmb-rail-chevron" name={railClosed ? "chevron-right" : "chevron-left"} size={14} />
        </button>
      </div>
      <div className="pmb-main">
        {error ? <Alert type="error" showIcon message={error} /> : null}
        {loading || (workspaceId && !projectsReady) ? <Skeleton active /> : !project ? (
          <>
          <div className="pmb-window-bar">
            <button type="button" className="pmb-popup-window" aria-label="Archive" title="Archive" onClick={() => setArchiveOpen(true)}>
              <LucideIcon name="archive" size={14} />
            </button>
            <button
              type="button"
              className="pmb-popup-window"
              aria-label="Open in new window"
              title="Open in new window"
              onClick={() => {
                stageBoardSessionHandoff();
                const url = new URL(window.location.href);
                url.searchParams.set("board", String(Date.now()));
                url.hash = "/project-boards";
                if (window.open(url.toString(), BOARD_WINDOW_NAME)) window.dispatchEvent(new Event("pmb-close-popup"));
              }}
            >
              <LucideIcon name="external-link" size={14} />
            </button>
          </div>
          <section className="pmb-empty" aria-label="No project yet">
            <LucideIcon name="clipboard-list" size={28} />
            <h2>No project yet</h2>
            <p>Add a spreadsheet project or a support activity, or start with an empty board.</p>
            <div className="pmb-empty-actions">
              <Button type="primary" icon={<LucideIcon name="plus" size={14} />} onClick={openNewProject}>Create your first project</Button>
              <Button icon={<LucideIcon name="user" size={14} />} onClick={() => void openMembers("workspace")}>Invite members</Button>
            </div>
          </section>
          </>
        ) : (
          <>
            <header className="pmb-head">
              <div className="pmb-title-row">
                {headerDraft !== null ? (
                  <input
                    className="pmb-title-input"
                    aria-label="Project name"
                    value={headerDraft}
                    autoFocus
                    onChange={(event) => setHeaderDraft(event.target.value)}
                    onBlur={() => {
                      renameProject(headerDraft);
                      setHeaderDraft(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                      if (event.key === "Escape") setHeaderDraft(null);
                    }}
                  />
                ) : (
                  <h1
                    title={project.sourceKind ? "Name follows the record" : access === "Owner" ? "Double-click to rename" : undefined}
                    onDoubleClick={() => {
                      if (access === "Owner" && !project.sourceKind) setHeaderDraft(project.name);
                    }}
                  >
                    {project.name}
                  </h1>
                )}
                <button type="button" className="pmb-fav" aria-label="Favorite project" onClick={() => toggleFavorite(project.id)}>
                  {favorites.includes(project.id) ? "★" : "☆"}
                </button>
                <span className="pmb-title-actions">
                  <button type="button" className="pmb-popup-window" aria-label="Archive" title="Archive" onClick={() => setArchiveOpen(true)}>
                    <LucideIcon name="archive" size={14} />
                  </button>
                  <button
                    type="button"
                    className="pmb-popup-window"
                    aria-label="Open in new window"
                    title="Open in new window"
                    onClick={() => {
                      stageBoardSessionHandoff();
                      const url = new URL(window.location.href);
                      url.searchParams.set("board", String(Date.now()));
                      url.hash = "/project-boards";
                      if (window.open(url.toString(), BOARD_WINDOW_NAME)) window.dispatchEvent(new Event("pmb-close-popup"));
                    }}
                  >
                    <LucideIcon name="external-link" size={14} />
                  </button>
                  <button
                    type="button"
                    className={`pmb-theme-toggle is-${boardTheme}`}
                    aria-label={boardTheme === "dark" ? "Use light theme" : "Use dark theme"}
                    onClick={() => setBoardTheme(boardTheme === "dark" ? "light" : "dark")}
                  >
                    <span>{boardTheme === "dark" ? "☾" : "☀"}</span>
                  </button>
                </span>
              </div>
              <div>
                <div className="pmb-tabs" role="tablist" aria-label="Project views">
                  {(["table", "kanban", "gantt", "calendar"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      role="tab"
                      aria-selected={view === item}
                      className={view === item ? "is-active" : ""}
                      onClick={() => setView(item)}
                    >
                      {item === "table" ? "Main Table" : item === "kanban" ? "Kanban" : item === "gantt" ? "Gantt" : "Calendar"}
                    </button>
                  ))}
                </div>
              </div>
            </header>
            <BoardToolbar
              canEdit={canEdit}
              access={access}
              filters={filters}
              profiles={profiles}
              groups={groups}
              sortKey={sortKey}
              hidden={hidden}
              groupBy={groupBy}
              searchColumns={searchColumns}
              statusLabels={selectableLabels(labels, "status")}
              priorityLabels={selectableLabels(labels, "priority")}
              onFilters={(patch) => setFilters((current) => ({ ...current, ...patch }))}
              onSort={setSortKey}
              onToggleHidden={(key) => setHidden((current) => {
                const next = new Set(current);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
              })}
              onGroupBy={setGroupBy}
              onSearchColumns={setSearchColumns}
              onNewTask={(groupId) => {
                const group = groups.find((item) => item.id === groupId) ?? groups[0];
                if (!group) return;
                const title = window.prompt("Task name");
                if (title?.trim()) void addTask(group.id, title.trim());
              }}
              onMembers={() => void openMembers("project")}
              onExport={() => {
                if (!project) return;
                const rows = visibleTasks.map((task) => {
                  const group = groups.find((item) => item.id === task.groupId);
                  const depends = dependencies
                    .filter((link) => link.successorId === task.id)
                    .map((link) => {
                      const predecessor = tasks.find((item) => item.id === link.predecessorId)?.title ?? "Task";
                      const lag = link.lagDays ? ` ${link.lagDays > 0 ? "+" : ""}${link.lagDays}d` : "";
                      return `${predecessor} (${link.relation}${lag})`;
                    })
                    .join(", ");
                  return {
                    Group: group?.name ?? "",
                    Task: task.title,
                    Owner: personName(profiles, task.ownerId),
                    Status: task.status,
                    Timeline: [task.startDate, task.dueDate].filter(Boolean).join(" – "),
                    Priority: task.priority,
                    "Depends on": depends,
                    "Last Updated": task.updatedAt,
                  };
                });
                const safe = project.name.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") || "project-board";
                exportBoardTasksToExcel(rows, `${safe}.xlsx`);
              }}
              onArchive={() => {
                if (!project) return;
                modal.confirm({
                  title: `Archive ${project.name}?`,
                  content: "The project leaves this list. Its groups and tasks stay saved.",
                  okText: "Archive",
                  onOk: async () => {
                    await setProjectArchived(project, true, email);
                    setProjects((current) => current.map((item) => (item.id === project.id ? { ...item, archivedAt: new Date().toISOString() } : item)));
                    setProjectId(projects.find((item) => item.id !== project.id && !item.archivedAt)?.id ?? null);
                  },
                });
              }}
              onSchedule={() => setScheduleOpen(true)}
              currentUserId={user?.id ?? ""}
              savedViews={savedViews}
              onSaveView={saveCurrentView}
              onOpenView={openSavedView}
            />
            {filters.search || filters.ownerId !== "all" || filters.status !== "all" || filters.priority !== "all" || filters.groupId !== "all" ? (
              <div className="pmb-chips" aria-label="Active filters">
                <span>{visibleTasks.length} shown</span>
                {filters.search ? <button type="button" onClick={() => setFilters((current) => ({ ...current, search: "" }))}>Search: {filters.search}</button> : null}
                {filters.ownerId !== "all" ? <button type="button" onClick={() => setFilters((current) => ({ ...current, ownerId: "all" }))}>Person</button> : null}
                {filters.status !== "all" ? <button type="button" onClick={() => setFilters((current) => ({ ...current, status: "all" }))}>{labelName(labels, "status", filters.status)}</button> : null}
                {filters.priority !== "all" ? <button type="button" onClick={() => setFilters((current) => ({ ...current, priority: "all" }))}>{labelName(labels, "priority", filters.priority)}</button> : null}
                {filters.groupId !== "all" ? <button type="button" onClick={() => setFilters((current) => ({ ...current, groupId: "all" }))}>Group</button> : null}
                <button type="button" onClick={() => setFilters(EMPTY_BOARD_FILTERS)}>Clear all</button>
              </div>
            ) : null}
            {selected.size > 0 && canEdit ? (
              <div className="pmb-bulk" role="toolbar" aria-label="Bulk actions">
                <span>{selected.size} selected</span>
                <Select
                  aria-label="Move to group"
                  placeholder="Move to group"
                  style={{ width: 160 }}
                  options={groups.map((group) => ({ value: group.id, label: group.name }))}
                  onChange={(groupId) => void bulk({ groupId })}
                />
                <Select
                  aria-label="Set status"
                  placeholder="Set status"
                  style={{ width: 150 }}
                  options={selectableLabels(labels, "status").map((label) => ({ value: label.id, label: label.name }))}
                  onChange={(status) => void bulk({ status })}
                />
                <Select
                  aria-label="Set owner"
                  placeholder="Set owner"
                  style={{ width: 160 }}
                  options={profiles.map((person) => ({ value: person.id, label: personName(profiles, person.id) }))}
                  onChange={(ownerId) => void bulk({ ownerId })}
                />
                <Button danger onClick={() => void bulkDelete()}>Delete</Button>
                <Button onClick={() => setSelected(new Set())}>Clear</Button>
              </div>
            ) : null}
            {project && launchReport ? (
              <div className="pmb-launch" aria-label="Launch impact">
                <span className={`pmb-impact is-${launchReport.impact}`}>{IMPACT_LABEL[launchReport.impact]}</span>
                <label className="pmb-launch-field">
                  <LucideIcon name="calendar" size={14} />
                  <span>Target launch</span>
                  <input
                    type="date"
                    aria-label="Target launch date for the project"
                    value={project.baselineLaunchDate}
                    disabled={!canEdit}
                    onChange={(event) => {
                      const value = event.target.value;
                      const changing = Boolean(project.baselineLaunchDate) && value !== project.baselineLaunchDate;
                      const reason = changing ? window.prompt("Reason for the new launch baseline") ?? "" : "Approved launch baseline";
                      if (changing && !reason.trim()) return;
                      void saveLaunchPlan(project, {
                        baselineLaunchDate: value,
                        forecastLaunchDate: launchReport.forecastLaunchDate,
                        qualityReleaseStatus: project.qualityReleaseStatus,
                        launchImpact: launchReport.impact,
                        launchImpactReasons: [reason.trim(), ...launchReport.reasons].filter(Boolean).join(" "),
                        riskBufferWorkdays: project.riskBufferWorkdays,
                        rebaseline: changing,
                      }, email).then((version) => {
                        setProjects((current) => current.map((item) => (item.id === project.id ? {
                          ...item,
                          baselineLaunchDate: value,
                          launchImpactReasons: [reason.trim(), ...launchReport.reasons].filter(Boolean).join(" "),
                          scheduleVersion: version,
                        } : item)));
                      }).catch((err) => message.error(err instanceof Error ? err.message : "Could not save the launch baseline."));
                    }}
                  />
                </label>
                <span className="pmb-launch-stat">
                  <span>Forecast</span>
                  <strong>{launchReport.forecastLaunchDate ? formatMonthDayYear(launchReport.forecastLaunchDate) : "—"}</strong>
                </span>
                <span className="pmb-launch-stat">
                  <span>Variance</span>
                  <strong className={launchReport.varianceWorkdays == null ? "" : launchReport.varianceWorkdays > 0 ? "is-late" : launchReport.varianceWorkdays < 0 ? "is-early" : ""}>
                    {launchReport.varianceWorkdays === null
                      ? "—"
                      : `${launchReport.varianceWorkdays > 0 ? "+" : ""}${launchReport.varianceWorkdays} working days`}
                  </strong>
                </span>
                <label className="pmb-launch-field">
                  <span>Quality</span>
                  <select
                    aria-label="Quality release"
                    value={project.qualityReleaseStatus}
                    disabled={!canEdit}
                    onChange={(event) => {
                      const qualityReleaseStatus = event.target.value as PmProject["qualityReleaseStatus"];
                      void saveLaunchPlan(project, {
                        baselineLaunchDate: project.baselineLaunchDate,
                        forecastLaunchDate: launchReport.forecastLaunchDate,
                        qualityReleaseStatus,
                        launchImpact: launchReport.impact,
                        launchImpactReasons: launchReport.reasons.join(" "),
                        riskBufferWorkdays: project.riskBufferWorkdays,
                        rebaseline: false,
                      }, email).then((version) => {
                        setProjects((current) => current.map((item) => (item.id === project.id ? { ...item, qualityReleaseStatus, scheduleVersion: version } : item)));
                      }).catch((err) => message.error(err instanceof Error ? err.message : "Could not save the quality gate."));
                    }}
                  >
                    {(Object.keys(QUALITY_LABEL) as (keyof typeof QUALITY_LABEL)[]).map((key) => (
                      <option key={key} value={key}>{QUALITY_LABEL[key]}</option>
                    ))}
                  </select>
                </label>
                <Popover
                  content={(
                    <div className="pmb-impact-note">
                      <p>{launchReport.copy}</p>
                      {launchReport.reasons.filter((reason) => reason !== launchReport.copy).map((reason) => <p key={reason}>{reason}</p>)}
                      {project.qualityReleaseStatus !== "CLEAR" ? <p>Quality release is {QUALITY_LABEL[project.qualityReleaseStatus]}. Schedule impact does not clear a quality hold.</p> : null}
                    </div>
                  )}
                >
                  <button type="button" className="pmb-launch-why">
                    <LucideIcon name="info" size={14} />
                    Why this label?
                  </button>
                </Popover>
                {launchReport.error ? <span>{launchReport.error}</span> : null}
              </div>
            ) : null}
            {view === "table" ? (
              <>
                <BoardTable
                  sections={sections}
                  tasks={visibleTasks}
                  groups={groups}
                  profiles={profiles}
                  hidden={hidden}
                  collapsed={collapsed}
                  selected={selected}
                  canEdit={canEdit}
                  onToggleCollapse={(id) => setCollapsed((current) => {
                    const next = { ...current, [id]: !current[id] };
                    if (projectId) localStorage.setItem(`project-tracker:pm-board-groups:${projectId}`, JSON.stringify(next));
                    return next;
                  })}
                  onToggleSelected={(id) => setSelected((current) => {
                    const next = new Set(current);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  })}
                  onOpen={(task) => setOpenTaskId(task.id)}
                  launch={launchReport}
                  previewImpact={(task, start, due) => {
                    if (!project) return "";
                    const report = assessLaunch({
                      nodes: tasks.map((item) => ({
                        id: item.id,
                        title: item.title,
                        start: item.id === task.id ? start : item.startDate,
                        finish: item.id === task.id ? due : item.dueDate,
                        baselineFinish: item.baselineFinish,
                        qualityBlocker: item.qualityBlocker,
                        isLaunch: item.isLaunch,
                      })),
                      edges: dependencies.map((link) => ({
                        predecessorId: link.predecessorId,
                        successorId: link.successorId,
                        relation: link.relation,
                        lagDays: link.lagDays,
                      })),
                      baselineLaunchDate: project.baselineLaunchDate,
                      bufferWorkdays: project.riskBufferWorkdays,
                      workingDays: project.workingDays,
                      holidays: project.holidays,
                      qualityRelease: project.qualityReleaseStatus,
                    });
                    return report.error || `${IMPACT_LABEL[report.impact]}. ${report.copy}`;
                  }}
                  onPatch={(task, patch) => void patchTask(task, patch)}
                  onAddTask={(sectionId, title) => void addTask(sectionId, title)}
                  onAddSubtask={(task, title) => void addTask(task.groupId, title, task)}
                  onRenameGroup={(group, name) => void updateGroup(group, { name }, email).then(() => setGroups((current) => current.map((item) => (item.id === group.id ? { ...item, name } : item))))}
                  onDeleteGroup={(group) => {
                    const count = tasks.filter((task) => task.groupId === group.id).length;
                    void deleteGroup(group, count, email)
                      .then(() => setGroups((current) => current.filter((item) => item.id !== group.id)))
                      .catch((err) => message.error(err instanceof Error ? err.message : "Could not delete the group."));
                  }}
                  onMoveGroup={(group, direction) => {
                    const index = groups.findIndex((item) => item.id === group.id);
                    const swap = groups[index + direction];
                    if (!swap) return;
                    const next = [...groups];
                    next[index] = swap;
                    next[index + direction] = group;
                    setGroups(next.map((item, order) => ({ ...item, sortOrder: order })));
                    void Promise.all(next.map((item, order) => updateGroup(item, { sortOrder: order }, email)));
                  }}
                  dependencies={dependencies}
                  scheduleStrict={project.scheduleMode === "strict"}
                  onOpenUpdates={(task) => {
                    markUpdateSeen(task.id);
                    setUpdatesTaskId(task.id);
                  }}
                  columns={shownColumns}
                  cells={cells}
                  labels={labels}
                  onSaveLabels={async (kind, next) => {
                    if (!project) return;
                    const merged = [...labels.filter((label) => label.kind !== kind), ...next];
                    await saveBoardLabels(project.id, merged, email);
                    setLabels(merged);
                  }}
                  projects={projects}
                  userId={user?.id ?? ""}
                  userEmail={email}
                  unseenTaskIds={unseenTaskIds}
                  onSaveCell={saveCell}
                  onColumnAction={onColumnAction}
                  scrollKey={scrollColumn?.key ?? null}
                  scrollTick={scrollColumn?.tick ?? 0}
                  onSaveDependencies={saveDependencies}
                />
                {canEdit ? (
                  <button
                    type="button"
                    className="pmb-add-group"
                    onClick={() => {
                      if (!project) return;
                      const name = window.prompt("Group name");
                      if (!name?.trim()) return;
                      void createGroup({ projectId: project.id, name: name.trim(), color: "#579bfc", sortOrder: groups.length, userEmail: email })
                        .then((group) => setGroups((current) => [...current, group]))
                        .catch((err) => message.error(err instanceof Error ? err.message : "Could not add the group."));
                    }}
                  >
                    + Add new group
                  </button>
                ) : null}
              </>
            ) : null}
            {view === "kanban" ? (
              <BoardKanban
                groupBy={groupBy === "priority" ? "priority" : "status"}
                groups={groups}
                tasks={visibleTasks}
                labels={labels}
                canEdit={canEdit}
                updateCounts={updateCounts}
                onOpen={(task) => setOpenTaskId(task.id)}
                onUpdates={(task) => {
                  markUpdateSeen(task.id);
                  setUpdatesTaskId(task.id);
                }}
                onMove={(task, columnId, orderedIds) => void placeKanban(task, columnId, orderedIds)}
                onReorder={(task, orderedIds) => void placeKanban(task, null, orderedIds)}
                onRename={(task, title) => void patchTask(task, { title })}
                onDelete={(task) => {
                  modal.confirm({
                    title: `Delete ${task.title}?`,
                    okText: "Delete",
                    okButtonProps: { danger: true },
                    onOk: () => deleteTask(task, email).then(() => {
                      setTasks((current) => current.filter((item) => item.id !== task.id && item.parentTaskId !== task.id));
                    }),
                  });
                }}
                onAdd={(columnId, title) => {
                  const lane = groupBy === "priority" ? "priority" : "status";
                  if (!project || !groups[0]) return;
                  void createTask({
                    projectId: project.id,
                    groupId: groups[0].id,
                    title,
                    status: lane === "status" ? columnId : "Not Started",
                    priority: lane === "priority" ? columnId : "Medium",
                    userEmail: email,
                  }).then((created) => setTasks((current) => [...current, created]))
                    .catch((err) => message.error(err instanceof Error ? err.message : "Could not add the task."));
                }}
              />
            ) : null}
            {view === "gantt" ? (
              <BoardGantt
                groups={groups}
                tasks={visibleTasks}
                dependencies={dependencies}
                canEdit={canEdit}
                profiles={profiles}
                columns={shownColumns}
                cells={cells}
                onOpen={(task) => {
                  markUpdateSeen(task.id);
                  setUpdatesTaskId(task.id);
                }}
                onShift={(task, startDate, dueDate) => void patchTask(task, { startDate, dueDate })}
              />
            ) : null}
            {view === "calendar" ? (
              <BoardCalendar
                tasks={visibleTasks}
                canEdit={canEdit}
                columns={shownColumns}
                cells={cells}
                labels={labels}
                onOpen={(task) => setUpdatesTaskId(task.id)}
                onCreate={(date) => {
                  const group = groups[0];
                  if (!group) return;
                  const title = window.prompt("Task name");
                  if (!title?.trim()) return;
                  void createTask({
                    projectId: project.id,
                    groupId: group.id,
                    title: title.trim(),
                    dueDate: date,
                    startDate: date,
                    userEmail: email,
                  }).then((created) => setTasks((current) => [...current, created]));
                }}
                onReschedule={(task, startDate, dueDate) => void patchTask(task, { startDate, dueDate })}
              />
            ) : null}
          </>
        )}
      </div>
      <TaskDetailsDrawer
        task={openTask}
        tasks={tasks}
        groups={groups}
        profiles={profiles}
        labels={labels}
        canEdit={canEdit}
        autoPriority={openTask ? priorityFromLaunch(launchReport?.tasks[openTask.id]?.impact ?? "NOT_ASSESSED", openTask.qualityBlocker) : undefined}
        autoPriorityNote={openTask ? priorityReason(launchReport?.tasks[openTask.id]?.impact ?? "NOT_ASSESSED", openTask.qualityBlocker) : undefined}
        onClose={() => setOpenTaskId(null)}
        onOpen={(task) => setOpenTaskId(task.id)}
        onPatch={(task, patch) => void patchTask(task, patch)}
        onAddSubtask={(task, title) => void addTask(task.groupId, title, task)}
        onDelete={(task) => {
          void deleteTask(task, email).then(() => {
            setOpenTaskId(null);
            if (project) return refreshTasks(project.id);
            return undefined;
          }).catch((err) => message.error(err instanceof Error ? err.message : "Could not delete the task."));
        }}
      />
      <ColumnCenter
        open={columnCenterOpen}
        columns={boardColumns}
        configureId={configureColumnId}
        onClose={() => {
          setColumnCenterOpen(false);
          setConfigureColumnId(null);
        }}
        onFocusBuiltin={(type) => {
          const key = builtinColumnKey(type);
          if (!key) return;
          revealColumn(key);
          setColumnCenterOpen(false);
        }}
        onAdd={async (type, title, settings) => {
          if (!project) return;
          const builtin = builtinColumnKey(type);
          if (builtin) {
            revealColumn(builtin);
            setColumnCenterOpen(false);
            return;
          }
          try {
            const created = await addBoardColumn(project.id, type, title, settings, boardColumns.length);
            setBoardColumns((current) => [...current, created]);
            revealColumn(created.id);
          } catch (err) {
            message.error(err instanceof Error ? err.message : "Could not add the column.");
          }
        }}
        onUpdate={async (column, patch) => {
          await updateBoardColumn(column.id, patch);
          setBoardColumns((current) => current.map((item) => (item.id === column.id ? { ...item, ...patch, settings: patch.settings ?? item.settings } : item)));
        }}
        onDelete={async (column) => {
          await archiveBoardColumn(column.id);
          setBoardColumns((current) => current.filter((item) => item.id !== column.id));
        }}
      />
      {updatesTask && project ? (
        <TaskSidePanel
          task={updatesTask}
          profiles={profiles}
          canEdit={canComment}
          userEmail={email}
          onClose={() => setUpdatesTaskId(null)}
          onPosted={() => {
            if (!projectKey) return;
            const ids = projectKey.split(",");
            void Promise.all([listUpdateMarks(ids), listUpdateCounts(ids)]).then(([marks, counts]) => {
              setUpdateMarks(marks);
              setUpdateCounts(counts);
            }).catch(() => undefined);
          }}
          onPrevious={updatesIndex > 0 ? () => setUpdatesTaskId(taskOrder[updatesIndex - 1].id) : undefined}
          onNext={updatesIndex >= 0 && updatesIndex < taskOrder.length - 1 ? () => setUpdatesTaskId(taskOrder[updatesIndex + 1].id) : undefined}
        />
      ) : null}
      <ScheduleDialog
        open={scheduleOpen}
        mode={project?.scheduleMode ?? "flexible"}
        workingDays={project?.workingDays ?? [1, 2, 3, 4, 5]}
        holidays={project?.holidays ?? []}
        onCancel={() => setScheduleOpen(false)}
        onSave={(mode, workingDays, holidays) => {
          if (!project) return;
          void updateProjectSchedule(project, { mode, workingDays, holidays }, email).then(() => {
            setProjects((current) => current.map((item) => (item.id === project.id ? { ...item, scheduleMode: mode, workingDays, holidays } : item)));
            setScheduleOpen(false);
          }).catch((err) => message.error(err instanceof Error ? err.message : "Could not save scheduling."));
        }}
      />
      <Modal
        title={workspaceDraft?.editing ? "Edit workspace" : "New workspace"}
        open={Boolean(workspaceDraft)}
        onCancel={() => setWorkspaceDraft(null)}
        onOk={() => void saveWorkspace()}
        okText={workspaceDraft?.editing ? "Save" : "Create"}
      >
        {workspaceDraft ? (
          <div className="pmb-form">
            <Input aria-label="Workspace name" placeholder="Name" value={workspaceDraft.name} onChange={(event) => setWorkspaceDraft({ ...workspaceDraft, name: event.target.value })} />
            <Input.TextArea aria-label="Workspace description" placeholder="Description (optional)" value={workspaceDraft.description} onChange={(event) => setWorkspaceDraft({ ...workspaceDraft, description: event.target.value })} />
            <div className="pmb-swatches" role="group" aria-label="Icon">
              {ICONS.map((icon) => (
                <button key={icon} type="button" className={workspaceDraft.icon === icon ? "is-active" : ""} onClick={() => setWorkspaceDraft({ ...workspaceDraft, icon })}>{icon}</button>
              ))}
            </div>
            <div className="pmb-swatches" role="group" aria-label="Color">
              {COLORS.map((color) => (
                <button key={color} type="button" className={workspaceDraft.color === color ? "is-active" : ""} style={{ background: color }} aria-label={color} onClick={() => setWorkspaceDraft({ ...workspaceDraft, color })} />
              ))}
            </div>
          </div>
        ) : null}
      </Modal>
      <Modal className="pmb-archive-modal" title="Archive" width={880} open={archiveOpen} onCancel={() => setArchiveOpen(false)} footer={null}>
        <div className="pmb-archive-search">
          <Input
            allowClear
            prefix={<LucideIcon name="search" size={14} />}
            aria-label="Search archive"
            placeholder="Search"
            value={archiveQuery}
            onChange={(event) => setArchiveQuery(event.target.value)}
          />
        </div>
        {archiveLoading ? <Skeleton active /> : (
          <div className="pmb-archive">
            <section aria-label="Archived workspaces">
              <h3>Workspaces</h3>
              {archiveSnapshot.workspaces.length === 0 ? <p>No archived workspaces.</p> : archivedWorkspaces.length === 0 ? <p>No workspaces match that search.</p> : (
                <ul className="pmb-archive-grid">
                  {archivedWorkspaces.map((space) => (
                    <li key={space.id} className="pmb-archive-card">
                      <LucideIcon name="archive" size={16} />
                      <strong>{space.icon} {space.name}</strong>
                      <small>Workspace</small>
                      {space.role === "Owner" ? (
                        <Button
                          size="small"
                          icon={<LucideIcon name="refresh-cw" size={14} />}
                          onClick={() => {
                            void setWorkspaceArchived(space, false, email).then(() => {
                              setWorkspaces((current) => current.map((item) => (item.id === space.id ? { ...item, archivedAt: null } : item)));
                              setWorkspaceId(space.id);
                              setArchiveOpen(false);
                              message.success(`Restored ${space.name}`);
                            }).catch((err) => message.error(err instanceof Error ? err.message : "Could not restore the workspace."));
                          }}
                        >
                          Restore
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section aria-label="Archived projects">
              <h3>Projects</h3>
              {archiveSnapshot.projects.length === 0 ? <p>No archived projects.</p> : archivedProjects.length === 0 ? <p>No projects match that search.</p> : (
                <ul className="pmb-archive-grid">
                  {archivedProjects.map(({ project: item, workspaceName, workspaceId: itemWorkspaceId, completed }) => (
                    <li key={item.id} className={`pmb-archive-card${completed ? " is-complete" : ""}`}>
                      <LucideIcon name={completed ? "check-circle" : "clipboard-list"} size={16} />
                      <strong>{item.name}</strong>
                      <small>{completed ? `${workspaceName} · Completed` : workspaceName}</small>
                      <Button
                        size="small"
                        icon={<LucideIcon name="refresh-cw" size={14} />}
                        onClick={() => {
                          void setProjectArchived(item, false, email).then(() => {
                            writeLastBoard(itemWorkspaceId, item.id);
                            if (itemWorkspaceId === workspaceId) {
                              setProjects((current) => current.map((row) => (row.id === item.id ? { ...row, archivedAt: null } : row)));
                              setProjectId(item.id);
                            } else {
                              setWorkspaceId(itemWorkspaceId);
                            }
                            setArchiveOpen(false);
                            message.success(`Restored ${item.name}`);
                          }).catch((err) => message.error(err instanceof Error ? err.message : "Could not restore the project."));
                        }}
                      >
                        Restore
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </Modal>
      <Modal
        title="New project"
        open={Boolean(projectDraft)}
        onCancel={() => setProjectDraft(null)}
        onOk={() => void saveProject()}
        okText="Create"
        okButtonProps={{
          disabled: !projectDraft?.name.trim() || (projectDraft.source !== "blank" && !projectDraft.sourceId) || sourceCatalog.loading,
        }}
      >
        {projectDraft ? (
          <div className="pmb-form">
            <Select
              aria-label="Project source"
              value={projectDraft.source}
              options={[
                { value: "spreadsheet", label: "Spreadsheet" },
                { value: "support", label: "Support" },
                { value: "blank", label: "Empty project" },
              ]}
              onChange={(source: "spreadsheet" | "support" | "blank") => setProjectDraft({ ...projectDraft, source, sourceId: "", name: source === "blank" ? projectDraft.name : "" })}
            />
            {projectDraft.source === "spreadsheet" ? (
              <Select
                showSearch
                optionFilterProp="label"
                aria-label="Spreadsheet project"
                placeholder={sourceCatalog.loading ? "Loading spreadsheet projects" : "Choose a spreadsheet project"}
                loading={sourceCatalog.loading}
                value={projectDraft.sourceId || undefined}
                options={spreadsheetChoices}
                onChange={(sourceId: string) => {
                  const choice = spreadsheetChoices.find((item) => item.value === sourceId);
                  setProjectDraft({
                    ...projectDraft,
                    sourceId,
                    name: choice?.label ?? projectDraft.name,
                    description: choice ? `From Spreadsheet ${choice.label}` : projectDraft.description,
                  });
                }}
              />
            ) : null}
            {projectDraft.source === "support" ? (
              <Select
                showSearch
                optionFilterProp="label"
                aria-label="Support activity"
                placeholder={sourceCatalog.loading ? "Loading support activities" : "Choose a support activity"}
                loading={sourceCatalog.loading}
                value={projectDraft.sourceId || undefined}
                options={supportChoices}
                onChange={(sourceId: string) => {
                  const choice = supportChoices.find((item) => item.value === sourceId);
                  setProjectDraft({
                    ...projectDraft,
                    sourceId,
                    name: choice?.label ?? projectDraft.name,
                    description: `From Support ${sourceId}`,
                  });
                }}
              />
            ) : null}
            <Input aria-label="Project name" placeholder="Name" value={projectDraft.name} onChange={(event) => setProjectDraft({ ...projectDraft, name: event.target.value })} />
            <Input.TextArea aria-label="Project description" placeholder="Description (optional)" value={projectDraft.description} onChange={(event) => setProjectDraft({ ...projectDraft, description: event.target.value })} />
          </div>
        ) : null}
      </Modal>
      <MemberModal
        title="Manage workspace"
        open={manageWorkspace}
        members={members}
        profiles={profiles}
        roles={["Admin", "Owner", "Member"]}
        note="Admin manages people and roles. Owner can change the board and post updates. Member can post updates only."
        canManage={canManage}
        archived={workspace?.archivedAt}
        canRestore={workspace?.role === "Owner" || profile?.role === "admin"}
        onClose={() => setManageWorkspace(false)}
        onInvite={(userId, role) => workspace ? addWorkspaceMember(workspace.id, userId, role as WorkspaceRole, email, personName(profiles, userId)).then(() => openMembers("workspace")).catch((err) => {
          message.error(err instanceof Error ? err.message : "Could not invite that person.");
        }) : Promise.resolve()}
        onRole={(userId, role) => workspace ? updateWorkspaceMemberRole(workspace.id, userId, role as WorkspaceRole, email, personName(profiles, userId)).then(() => openMembers("workspace")).catch((err) => {
          message.error(err instanceof Error ? err.message : "Could not change that role.");
          return openMembers("workspace");
        }) : Promise.resolve()}
        onRemove={(userId) => {
          if (!workspace) return Promise.resolve();
          const leaving = userId === user?.id;
          return removeWorkspaceMember(workspace.id, userId, email, personName(profiles, userId)).then(async () => {
            if (!leaving) {
              await openMembers("workspace");
              return;
            }
            const next = await listMyWorkspaces();
            setWorkspaces(next);
            setWorkspaceId(next.find((item) => !item.archivedAt)?.id ?? null);
            setManageWorkspace(false);
          }).catch((err) => {
            message.error(err instanceof Error ? err.message : "Could not remove that person.");
          });
        }}
        onRestore={() => {
          if (!workspace) return Promise.resolve();
          return setWorkspaceArchived(workspace, false, email).then(() => {
            setWorkspaces((current) => current.map((item) => (item.id === workspace.id ? { ...item, archivedAt: null } : item)));
          });
        }}
      />
      <MemberModal
        title="Project members"
        open={manageProject}
        members={members}
        profiles={profiles}
        roles={["Owner", "Editor", "Commenter", "Viewer"]}
        note="A workspace member is not added to a private project until you invite them here."
        onClose={() => setManageProject(false)}
        onInvite={(userId, role) => project ? addProjectMember(project.id, userId, role as ProjectAccess, email, personName(profiles, userId)).then(() => openMembers("project")) : Promise.resolve()}
        onRole={(userId, role) => project ? updateProjectMemberRole(project.id, userId, role as ProjectAccess, email, personName(profiles, userId)).then(() => openMembers("project")) : Promise.resolve()}
        onRemove={(userId) => project ? removeProjectMember(project.id, userId, email, personName(profiles, userId)).then(() => openMembers("project")) : Promise.resolve()}
      />
    </div>
  );

  async function bulk(patch: Partial<PmBoardTask>) {
    const chosen = tasks.filter((task) => selected.has(task.id));
    for (const task of chosen) await patchTask(task, patch);
    setSelected(new Set());
  }

  async function bulkDelete() {
    const chosen = tasks.filter((task) => selected.has(task.id));
    for (const task of chosen) await deleteTask(task, email);
    setSelected(new Set());
    if (project) await refreshTasks(project.id);
  }
}

function MemberModal({
  title,
  open,
  members,
  profiles,
  roles,
  note,
  canManage = true,
  archived,
  canRestore,
  onClose,
  onInvite,
  onRole,
  onRemove,
  onRestore,
}: {
  title: string;
  open: boolean;
  members: PmMembership[];
  profiles: Profile[];
  roles: string[];
  note?: string;
  canManage?: boolean;
  archived?: string | null;
  canRestore?: boolean;
  onClose: () => void;
  onInvite: (userId: string, role: string) => Promise<void>;
  onRole: (userId: string, role: string) => Promise<void>;
  onRemove: (userId: string) => Promise<void>;
  onRestore?: () => Promise<void>;
}) {
  const [userId, setUserId] = useState<string>();
  const [role, setRole] = useState(roles[roles.length - 1] ?? "Member");
  const available = profiles.filter((person) => !members.some((member) => member.userId === person.id));
  return (
    <Modal title={title} open={open} onCancel={onClose} footer={null}>
      {note ? <p>{note}</p> : null}
      <div className="pmb-form">
        <Select
          showSearch
          optionFilterProp="label"
          aria-label="Invite a person"
          placeholder="Invite an existing user"
          value={userId}
          options={available.map((person) => ({ value: person.id, label: personName(profiles, person.id) }))}
          onChange={setUserId}
        />
        <Select aria-label="Role" value={role} disabled={!canManage} options={roles.map((item) => ({ value: item, label: item }))} onChange={setRole} />
        <Button
          type="primary"
          disabled={!userId || !canManage}
          onClick={() => {
            if (!userId) return;
            void onInvite(userId, role).then(() => setUserId(undefined));
          }}
        >
          Invite
        </Button>
        {members.map((member) => (
          <div key={member.userId} className="pmb-member">
            <span>{personName(profiles, member.userId)}</span>
            <Select aria-label={`Role for ${personName(profiles, member.userId)}`} value={member.role} disabled={!canManage} options={roles.map((item) => ({ value: item, label: item }))} onChange={(next) => void onRole(member.userId, next)} />
            <Button disabled={!canManage} onClick={() => void onRemove(member.userId)}>Remove</Button>
          </div>
        ))}
        {canRestore && archived ? <Button onClick={() => void onRestore?.()}>Restore workspace</Button> : null}
      </div>
    </Modal>
  );
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function ScheduleDialog({
  open,
  mode,
  workingDays,
  holidays,
  onCancel,
  onSave,
}: {
  open: boolean;
  mode: ScheduleMode;
  workingDays: number[];
  holidays: string[];
  onCancel: () => void;
  onSave: (mode: ScheduleMode, workingDays: number[], holidays: string[]) => void;
}) {
  const [draftMode, setDraftMode] = useState<ScheduleMode>(mode);
  const [days, setDays] = useState<number[]>(workingDays);
  const [offDays, setOffDays] = useState<string[]>(holidays);
  const [holidayDraft, setHolidayDraft] = useState("");
  useEffect(() => {
    if (!open) return;
    setDraftMode(mode);
    setDays(workingDays);
    setOffDays(holidays);
  }, [mode, open, workingDays, holidays]);
  return (
    <Modal
      title="Scheduling"
      open={open}
      onCancel={onCancel}
      okText="Save"
      okButtonProps={{ disabled: days.length === 0 }}
      onOk={() => onSave(draftMode, [...days].sort((a, b) => a - b), offDays)}
    >
      <div className="pmb-form">
        <label>
          Scheduling mode
          <select aria-label="Scheduling mode" value={draftMode} onChange={(event) => setDraftMode(event.target.value as ScheduleMode)}>
            <option value="flexible">Flexible — move dates only to resolve a conflict</option>
            <option value="strict">Strict — move dates with predecessor changes</option>
            <option value="none">No action — show links without moving dates</option>
          </select>
        </label>
        <fieldset>
          <legend>Working days</legend>
          <div className="pmb-swatches">
            {WEEKDAYS.map((label, index) => {
              const value = index + 1;
              return (
                <label key={label}>
                  <input
                    type="checkbox"
                    checked={days.includes(value)}
                    onChange={(event) => setDays((current) => (
                      event.target.checked ? [...current, value] : current.filter((day) => day !== value)
                    ))}
                  />
                  {label}
                </label>
              );
            })}
          </div>
        </fieldset>
        <label>
          Holiday
          <input aria-label="Holiday date" type="date" value={holidayDraft} onChange={(event) => setHolidayDraft(event.target.value)} />
        </label>
        <Button onClick={() => {
          if (!holidayDraft || offDays.includes(holidayDraft)) return;
          setOffDays((current) => [...current, holidayDraft].sort());
          setHolidayDraft("");
        }}>Add holiday</Button>
        {offDays.map((day) => (
          <button key={day} type="button" onClick={() => setOffDays((current) => current.filter((item) => item !== day))}>{day} remove</button>
        ))}
        <p>Dependencies move existing dates. Blank timelines stay blank and show Dates required. Holidays are skipped when dates move.</p>
      </div>
    </Modal>
  );
}
