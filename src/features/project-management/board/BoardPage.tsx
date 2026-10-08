import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, App, Button, Input, Modal, Select, Skeleton } from "antd";
import { useAuth } from "@/app/auth-provider";
import { useDateAdjustment } from "@/app/date-adjustment-provider";
import { ROLE_LABELS } from "@/lib/constants";
import { subscribeProjectDataChanged, subscribeSupportDataChanged } from "@/lib/projectDataEvents";
import { BOARD_WINDOW_NAME } from "@/lib/boardSessionHandoff";
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
  listTasks,
  seedSourceTasks,
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
  updateTask,
  updateWorkspace,
  updateWorkspaceMemberRole,
  addProjectMember,
  listAssignableProfiles,
} from "@/features/project-management/board/boardService";
import { personName } from "@/features/project-management/board/boardUi";
import {
  BOARD_PRIORITIES,
  BOARD_STATUSES,
  DEFAULT_SEARCH_COLUMNS,
  EMPTY_BOARD_FILTERS,
  PRIORITY_COLOR,
  STATUS_COLOR,
  canEditBoard,
  canCommentOnBoard,
  filterBoardTasks,
  compareBoardTasks,
  groupIdForStatus,
  readLastBoard,
  rescheduleFrom,
  resolveProjectAccess,
  topLevelTasks,
  writeLastBoard,
  type BoardFilters,
  type BoardGroupBy,
  type BoardSortKey,
  type BoardPriority,
  type BoardStatus,
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
const ICONS = ["📋", "⭐", "🧪", "📁", "🚀"];
const COLORS = ["#579bfc", "#00c875", "#fdab3d", "#a25ddc", "#e2445c"];

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
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveSnapshot, setArchiveSnapshot] = useState<{
    workspaces: PmWorkspace[];
    projects: { project: PmProject; workspaceName: string; workspaceId: string }[];
  }>({ workspaces: [], projects: [] });
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
  const visibleTasks = useMemo(() => {
    const filtered = filterBoardTasks(tasks, filters, {
      columns: searchColumns,
      ownerName: (ownerId) => personName(profiles, ownerId),
    });
    return [...filtered].sort((a, b) => compareBoardTasks(a, b, sortKey));
  }, [filters, profiles, searchColumns, sortKey, tasks]);
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
    const open = () => setArchiveOpen(true);
    window.addEventListener("pmb-open-archive", open);
    return () => window.removeEventListener("pmb-open-archive", open);
  }, []);

  useEffect(() => {
    if (!archiveOpen) return;
    let cancel = false;
    setArchiveLoading(true);
    void Promise.all(workspaces.map(async (space) => ({
      workspace: space,
      projects: await listProjects(space.id),
    }))).then((lists) => {
      if (cancel) return;
      setArchiveSnapshot({
        workspaces: lists.filter((item) => item.workspace.archivedAt).map((item) => item.workspace),
        projects: lists.flatMap((item) => item.projects
          .filter((project) => project.archivedAt || item.workspace.archivedAt)
          .map((project) => ({ project, workspaceName: item.workspace.name, workspaceId: item.workspace.id }))),
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

  const patchTask = async (task: PmBoardTask, patch: Partial<PmBoardTask>) => {
    const nextPatch = { ...patch };
    if (patch.status && !task.parentTaskId) {
      const groupId = groupIdForStatus(patch.status, groups);
      if (groupId && groupId !== task.groupId) nextPatch.groupId = groupId;
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
      if (patch.startDate !== undefined || patch.dueDate !== undefined) await applySchedule(next, task.id);
    } catch (err) {
      setTasks(previous);
      message.error(err instanceof Error ? err.message : "Could not update the task.");
    } finally {
      markBoardSourceWrite(false);
    }
  };

  const applySchedule = async (base: PmBoardTask[], originId: string, links: PmDependency[] = dependencies) => {
    if (!project) return;
    const result = rescheduleFrom(base, links, originId, {
      mode: project.scheduleMode,
      workingDays: project.workingDays,
      holidays: project.holidays,
    });
    result.conflicts.forEach((conflict) => message.warning(conflict.message));
    if (result.datesRequired.length) message.info("Dates required");
    if (!result.updates.length) return;
    const before = base
      .filter((item) => result.updates.some((update) => update.id === item.id))
      .map((item) => ({ ...item }));
    for (const update of result.updates) {
      const current = base.find((item) => item.id === update.id);
      if (current) await updateTask(current, { startDate: update.startDate, dueDate: update.dueDate }, email);
    }
    setTasks((current) => current.map((item) => {
      const update = result.updates.find((entry) => entry.id === item.id);
      return update ? { ...item, startDate: update.startDate, dueDate: update.dueDate } : item;
    }));
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
  };

  const saveDependencies = async (
    task: PmBoardTask,
    links: { predecessorId: string; relation: PmDependency["relation"]; lagDays: number }[],
  ) => {
    const next = await replaceTaskDependencies(task, links, dependencies, email);
    setDependencies(next);
    await applySchedule(tasks, task.id, next);
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
        status: groupBy === "status" && !parent ? sectionId as BoardStatus : parent?.status ?? "Not Started",
        priority: groupBy === "priority" && !parent ? sectionId as BoardPriority : "Medium",
        userEmail: email,
      });
      setTasks((current) => [...current, created]);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Could not add the task.");
    }
  };

  const sections = useMemo(() => {
    const tops = topLevelTasks(visibleTasks);
    if (groupBy === "status") {
      return BOARD_STATUSES.map((status) => ({
        id: status,
        label: status,
        color: STATUS_COLOR[status],
        tasks: tops.filter((task) => task.status === status),
      }));
    }
    if (groupBy === "priority") {
      return BOARD_PRIORITIES.map((priority) => ({
        id: priority,
        label: priority,
        color: PRIORITY_COLOR[priority],
        tasks: tops.filter((task) => task.priority === priority),
      }));
    }
    return groups.map((group) => ({
      id: group.id,
      label: group.name,
      color: group.color,
      tasks: tops.filter((task) => task.groupId === group.id),
    }));
  }, [groupBy, groups, visibleTasks]);

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
        onQuery={setProjectQuery}
        onSelectWorkspace={setWorkspaceId}
        onSelectProject={setProjectId}
        onRenameProject={renameProject}
        onToggleFavorite={toggleFavorite}
        onMyWork={() => {
          if (!user?.id) return;
          setFilters((current) => ({ ...current, ownerId: user.id }));
          setView("table");
        }}
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
          <LucideIcon name={railClosed ? "chevron-right" : "chevron-left"} size={14} />
        </button>
      </div>
      <div className="pmb-main">
        {window.name === BOARD_WINDOW_NAME ? (
          <div className="pmb-window-bar">
            <button type="button" className="pmb-popup-window" aria-label="Archive" title="Archive" onClick={() => setArchiveOpen(true)}>
              <LucideIcon name="archive" size={14} />
            </button>
          </div>
        ) : null}
        {error ? <Alert type="error" showIcon message={error} /> : null}
        {loading || (workspaceId && !projectsReady) ? <Skeleton active /> : !project ? (
          <section className="pmb-empty" aria-label="No project yet">
            <LucideIcon name="clipboard-list" size={28} />
            <h2>No project yet</h2>
            <p>Add a spreadsheet project or a support activity, or start with an empty board.</p>
            <div className="pmb-empty-actions">
              <Button type="primary" icon={<LucideIcon name="plus" size={14} />} onClick={openNewProject}>Create your first project</Button>
              <Button icon={<LucideIcon name="user" size={14} />} onClick={() => void openMembers("workspace")}>Invite members</Button>
            </div>
          </section>
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
                <Button disabled={access !== "Owner"} onClick={() => void openMembers("project")}>Invite</Button>
                <Button onClick={() => {
                  void navigator.clipboard.writeText(window.location.href).then(() => message.success("Link copied"));
                }}>Copy link</Button>
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
                {filters.status !== "all" ? <button type="button" onClick={() => setFilters((current) => ({ ...current, status: "all" }))}>{filters.status}</button> : null}
                {filters.priority !== "all" ? <button type="button" onClick={() => setFilters((current) => ({ ...current, priority: "all" }))}>{filters.priority}</button> : null}
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
                  options={BOARD_STATUSES.map((status) => ({ value: status, label: status }))}
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
                  onOpenUpdates={(task) => setUpdatesTaskId(task.id)}
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
                profiles={profiles}
                canEdit={canEdit}
                onOpen={(task) => setUpdatesTaskId(task.id)}
                onMove={(task, columnId) => void patchTask(task, columnPatch(groupBy === "priority" ? "priority" : "status", columnId))}
                onAdd={(columnId, title) => {
                  const lane = groupBy === "priority" ? "priority" : "status";
                  if (!project || !groups[0]) return;
                  void createTask({
                    projectId: project.id,
                    groupId: groups[0].id,
                    title,
                    status: lane === "status" ? columnId as BoardStatus : "Not Started",
                    priority: lane === "priority" ? columnId as BoardPriority : "Medium",
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
                onOpen={(task) => setUpdatesTaskId(task.id)}
                onShift={(task, startDate, dueDate) => void patchTask(task, { startDate, dueDate })}
              />
            ) : null}
            {view === "calendar" ? (
              <BoardCalendar
                tasks={visibleTasks}
                canEdit={canEdit}
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
        canEdit={canEdit}
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
      {updatesTask && project ? (
        <TaskSidePanel
          task={updatesTask}
          profiles={profiles}
          canEdit={canComment}
          userEmail={email}
          onClose={() => setUpdatesTaskId(null)}
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
      <Modal title="Archive" open={archiveOpen} onCancel={() => setArchiveOpen(false)} footer={null}>
        {archiveLoading ? <Skeleton active /> : (
          <div className="pmb-archive">
            <section aria-label="Archived workspaces">
              <h3>Workspaces</h3>
              {archiveSnapshot.workspaces.length === 0 ? <p>No archived workspaces.</p> : (
                <ul>
                  {archiveSnapshot.workspaces.map((space) => (
                    <li key={space.id}>
                      <span>{space.icon} {space.name}</span>
                      {space.role === "Owner" ? (
                        <Button
                          size="small"
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
              {archiveSnapshot.projects.length === 0 ? <p>No archived projects.</p> : (
                <ul>
                  {archiveSnapshot.projects.map(({ project: item, workspaceName, workspaceId: itemWorkspaceId }) => (
                    <li key={item.id}>
                      <span>
                        {item.name}
                        <small>{workspaceName}</small>
                      </span>
                      <Button
                        size="small"
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
            {projectDraft.source === "blank" ? null : (
              <p>Required steps are added as tasks. Finished steps go to Done, work in progress goes to On-going, and steps that have not started stay in Planned.</p>
            )}
            <Select
              aria-label="Project access"
              value={projectDraft.visibility}
              options={[
                { value: "workspace", label: "All workspace members" },
                { value: "invited", label: "Invited members only" },
              ]}
              onChange={(visibility) => setProjectDraft({ ...projectDraft, visibility })}
            />
            <p>All workspace members can open a shared project. Invited members only: belonging to the workspace does not open a private project.</p>
          </div>
        ) : null}
      </Modal>
      <MemberModal
        title="Manage workspace"
        open={manageWorkspace}
        members={members}
        profiles={profiles}
        roles={["Owner", "Admin", "Member"]}
        archived={workspace?.archivedAt}
        canRestore={workspace?.role === "Owner"}
        onClose={() => setManageWorkspace(false)}
        onInvite={(userId, role) => workspace ? addWorkspaceMember(workspace.id, userId, role as WorkspaceRole, email, personName(profiles, userId)).then(() => openMembers("workspace")) : Promise.resolve()}
        onRole={(userId, role) => workspace ? updateWorkspaceMemberRole(workspace.id, userId, role as WorkspaceRole, email, personName(profiles, userId)).then(() => openMembers("workspace")) : Promise.resolve()}
        onRemove={(userId) => workspace ? removeWorkspaceMember(workspace.id, userId, email, personName(profiles, userId)).then(() => openMembers("workspace")) : Promise.resolve()}
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
        <Select aria-label="Role" value={role} options={roles.map((item) => ({ value: item, label: item }))} onChange={setRole} />
        <Button
          type="primary"
          disabled={!userId}
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
            <Select aria-label={`Role for ${personName(profiles, member.userId)}`} value={member.role} options={roles.map((item) => ({ value: item, label: item }))} onChange={(next) => void onRole(member.userId, next)} />
            <Button onClick={() => void onRemove(member.userId)}>Remove</Button>
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
