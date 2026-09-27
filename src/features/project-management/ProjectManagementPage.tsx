import { Alert, App, Button, Dropdown, Empty, Modal, Skeleton } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/app/auth-provider";
import { useMenuPermissions } from "@/app/menu-permission-provider";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardTaskComposer } from "@/features/dashboard/components/DashboardTaskComposer";
import { PortfolioCardGrid } from "@/features/project-management/components/PortfolioCardGrid";
import { PortfolioKanban } from "@/features/project-management/components/PortfolioKanban";
import { ProjectBoardTable, type PortfolioOptionalColumn } from "@/features/project-management/components/ProjectBoardTable";
import { ProjectWorkspaceDrawer } from "@/features/project-management/components/ProjectWorkspaceDrawer";
import { WorkBoardToolbar, NewProjectMenu } from "@/features/project-management/components/WorkBoardToolbar";
import { ProjectGantt } from "@/features/project-management/components/ProjectGantt";
import { MyTasksView, TaskCalendarView } from "@/features/project-management/components/TaskViews";
import { useChangeSummaries } from "@/hooks/use-change-summaries";
import { useRestorableViewState } from "@/hooks/use-restorable-view-state";
import { newSupportActivityPath } from "@/lib/urlDerivedFilters";
import { sourceOptionsFromPortfolio } from "@/lib/dashboardPmHub";
import { parseAppDateValue } from "@/lib/date";
import { canAssignPmTasks, canDeletePmTask } from "@/lib/projectManagementPermissions";
import { getProfileDisplayName } from "@/lib/profileName";
import {
  emptyPortfolioFilters,
  filterPortfolioItems,
  groupPortfolioItems,
  assigneesByPortfolioSource,
  parseProjectManagementView,
  portfolioFiltersAreActive,
  portfolioSourcePath,
  projectManagementViewParam,
  type PortfolioGroupBy,
} from "@/lib/projectManagementPortfolio";
import {
  mapUserTaskToBoardItem,
  taskPhaseFromWorkflowPhase,
  toProjectManagementTaskInput,
} from "@/lib/projectManagementWorkflow";
import {
  createProjectManagementTask,
  deleteProjectManagementTask,
  listAssignableProfiles,
  listProjectManagementPortfolio,
  listProjectManagementTasks,
  updateProjectManagementTask,
} from "@/services/projectManagementService";
import type {
  PortfolioBoardStatus,
  PortfolioFilters,
  PortfolioItem,
  PortfolioSortKey,
  ProjectManagementPageView,
  ProjectManagementTask,
  WorkflowBoardItem,
} from "@/types";

export function ProjectManagementPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { message } = App.useApp();
  const { can } = useMenuPermissions();
  const { user, profile } = useAuth();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [tasks, setTasks] = useState<ProjectManagementTask[]>([]);
  const [profiles, setProfiles] = useState<import("@/types").Profile[]>([]);
  const [filters, setFilters] = useState<PortfolioFilters>(emptyPortfolioFilters);
  const [pageView, setPageView] = useState<ProjectManagementPageView>(() => parseProjectManagementView(params.get("view")));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerDate, setComposerDate] = useState<string>("");
  const [composerStart, setComposerStart] = useState<string>("");
  const [composerSource, setComposerSource] = useState<Pick<PortfolioItem, "sourceType" | "sourceId"> | null>(null);
  const [composerAssigneeIds, setComposerAssigneeIds] = useState<string[]>([]);
  const [composerTitle, setComposerTitle] = useState("");
  const [sortKey, setSortKey] = useState<PortfolioSortKey>("updated");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [hiddenColumns, setHiddenColumns] = useState<PortfolioOptionalColumn[]>(["date", "source", "phase", "client", "progress"]);
  const [groupBy, setGroupBy] = useState<PortfolioGroupBy>("status");

  useRestorableViewState("project-management.filters", filters, setFilters);
  useRestorableViewState("project-management.selectedId", selectedId, setSelectedId);
  useRestorableViewState("project-management.pageView", pageView, setPageView);
  useRestorableViewState("project-management.sortKey", sortKey, setSortKey);
  useRestorableViewState("project-management.hiddenColumns", hiddenColumns, setHiddenColumns);
  useRestorableViewState("project-management.groupBy", groupBy, setGroupBy);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [portfolio, nextTasks, nextProfiles] = await Promise.all([
        listProjectManagementPortfolio(),
        listProjectManagementTasks(),
        listAssignableProfiles().catch(() => []),
      ]);
      setItems(portfolio);
      setTasks(nextTasks);
      setProfiles(nextProfiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project management portfolio");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const fromUrl = parseProjectManagementView(params.get("view"));
    if (fromUrl !== pageView && params.get("view")) setPageView(fromUrl);
  }, [params, pageView]);

  useEffect(() => {
    const sourceId = params.get("sourceId") || params.get("projectId") || params.get("activityId");
    if (!sourceId || items.length === 0) return;
    const match = items.find((item) => item.sourceId === sourceId || item.identifier === sourceId);
    if (match) setSelectedId(match.id);
  }, [items, params]);

  const changeView = (view: ProjectManagementPageView) => {
    setPageView(view);
    const next = new URLSearchParams(params);
    const encoded = projectManagementViewParam(view);
    if (encoded) next.set("view", encoded);
    else next.delete("view");
    setParams(next, { replace: true });
  };

  const visibleItems = useMemo(() => filterPortfolioItems(items, {
    ...emptyPortfolioFilters(),
    ...filters,
  }), [filters, items]);
  const focusedItem = useMemo(
    () => (focusId ? items.find((item) => item.id === focusId) ?? null : null),
    [focusId, items],
  );
  const scopedItems = focusedItem && (pageView === "board" || pageView === "gantt") ? [focusedItem] : visibleItems;
  const grouped = useMemo(() => groupPortfolioItems(visibleItems), [visibleItems]);
  const assigneesBySource = useMemo(() => assigneesByPortfolioSource(tasks, profiles), [profiles, tasks]);
  const changeSummaries = useChangeSummaries(visibleItems);
  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );
  const boardItems = useMemo(() => tasks.map(mapUserTaskToBoardItem), [tasks]);
  const projectTitles = useMemo(() => {
    const next: Record<string, string> = {};
    for (const item of items) next[`${item.sourceType}:${item.sourceId}`] = item.title;
    return next;
  }, [items]);
  const owners = useMemo(
    () => [...new Set(items.map((item) => item.owner).filter((owner) => owner && owner !== "N/A"))].sort(),
    [items],
  );
  const ownerDefaulted = useRef(false);
  useEffect(() => {
    if (ownerDefaulted.current || items.length === 0 || !profile || filters.owner !== "all") return;
    const names = new Set(
      [getProfileDisplayName(profile), profile.full_name, profile.email]
        .map((value) => value?.trim().toLowerCase())
        .filter((value): value is string => Boolean(value)),
    );
    const owned = items.find((item) => names.has(item.owner.trim().toLowerCase()));
    ownerDefaulted.current = true;
    if (owned) setFilters((current) => (current.owner === "all" ? { ...current, owner: owned.owner } : current));
  }, [filters.owner, items, profile]);
  const milestones = useMemo(
    () => items.flatMap((item) => {
      const date = parseAppDateValue(item.targetDate);
      if (!date) return [];
      return [{
        id: `due:${item.id}`,
        title: item.title,
        date: date.format("YYYY-MM-DD"),
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        kind: "project" as const,
      }];
    }),
    [items],
  );

  const openWorkspace = (item: PortfolioItem) => setSelectedId(item.id);
  const openTask = (boardItem: { sourceType: string; sourceId: string }) => {
    const match = items.find(
      (item) => item.sourceType === boardItem.sourceType && item.sourceId === boardItem.sourceId,
    );
    if (match) setSelectedId(match.id);
  };

  const canCreate = can("project_management", "create");
  const canEdit = can("project_management", "edit");
  const canCreateProject = can("projects_entry", "create");
  const canCreateSupport = can("support_activities", "create");
  const canAssignTasks = canCreate && canAssignPmTasks(profile?.role, profile?.pm_task_eligible);
  const canDeleteTask = canDeletePmTask(profile?.role);
  const sourceOptions = useMemo(() => sourceOptionsFromPortfolio(items), [items]);

  const openCreateTask = (date?: string, assignSelf = false) => {
    setComposerSource(null);
    setComposerStart("");
    setComposerDate(date ?? "");
    setComposerTitle("");
    setComposerAssigneeIds(assignSelf && user?.id ? [user.id] : []);
    setComposerOpen(true);
  };

  const openSubtask = (item: PortfolioItem, start = "", end = "") => {
    setComposerSource({ sourceType: item.sourceType, sourceId: item.sourceId });
    setComposerStart(start);
    setComposerDate(end);
    setComposerTitle("");
    setComposerAssigneeIds(user?.id ? [user.id] : []);
    setComposerOpen(true);
  };

  const deleteSubtask = (task: ProjectManagementTask) => {
    Modal.confirm({
      title: `Delete "${task.title}"?`,
      content: "This removes the subtask. Protocol, report, and execution status stay on the project record.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteProjectManagementTask(task);
          setTasks((current) => current.filter((row) => row.id !== task.id));
          message.success("Subtask deleted.");
        } catch (err) {
          message.error(err instanceof Error ? err.message : "Could not delete the subtask.");
        }
      },
    });
  };

  const openExecutionSubtask = (item: PortfolioItem, title: string) => {
    setComposerSource({ sourceType: item.sourceType, sourceId: item.sourceId });
    setComposerStart("");
    setComposerDate("");
    setComposerTitle(title);
    setComposerAssigneeIds(user?.id ? [user.id] : []);
    setComposerOpen(true);
  };

  const canOpenSource = selected
    ? selected.sourceType === "process"
      ? can("projects_entry", "view")
      : can("support_activities", "view")
    : false;

  const openSource = (item: PortfolioItem) => {
    const canView = item.sourceType === "process" ? can("projects_entry", "view") : can("support_activities", "view");
    if (!canView) return;
    navigate(portfolioSourcePath(item));
  };

  const handleSortChange = (key: PortfolioSortKey) => {
    if (key === sortKey) setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDirection(key === "project" || key === "owner" || key === "phase" ? "asc" : "desc");
    }
  };

  const patchTaskRecord = async (
    task: ProjectManagementTask,
    patch: Partial<Pick<ProjectManagementTask, "status" | "priority" | "targetDate" | "startDate" | "percentComplete" | "title" | "assigneeIds">>,
  ) => {
    const previous = tasks;
    setTasks((current) => current.map((row) => (row.id === task.id ? { ...row, ...patch } : row)));
    try {
      await updateProjectManagementTask(task.id, { ...toProjectManagementTaskInput(task), ...patch });
    } catch (err) {
      setTasks(previous);
      message.error(err instanceof Error ? err.message : "Could not update the task. Your previous value has been restored.");
    }
  };

  const handlePatchTask = async (
    item: WorkflowBoardItem,
    patch: Partial<Pick<WorkflowBoardItem, "status" | "priority" | "targetDate" | "startDate" | "percentComplete">>,
  ) => {
    const task = tasks.find((row) => row.id === item.id);
    if (!task) return;
    await patchTaskRecord(task, patch);
  };

  const handleSetTimeline = async (item: PortfolioItem, start: string, end: string) => {
    const linked = tasks.filter((task) => task.sourceType === item.sourceType && task.sourceId === item.sourceId);
    if (linked.length > 1) {
      message.info("This project has several subitems. Set the due date on a subitem.");
      return;
    }
    if (linked.length === 1) {
      const task = linked[0];
      if (!task) return;
      await patchTaskRecord(task, { startDate: start, targetDate: end || start });
      return;
    }
    if (!start && !end) return;
    if (!canCreate) {
      message.info("You can't add a subitem on this project.");
      return;
    }
    try {
      const created = await createProjectManagementTask({
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        parentTaskId: null,
        title: "Timeline",
        instructions: "",
        phase: taskPhaseFromWorkflowPhase(item.phase),
        status: "Planned",
        priority: "Medium",
        percentComplete: 0,
        startDate: start,
        targetDate: end || start,
        actualDate: "",
        category: item.category,
        dependsOnTaskId: null,
        attachmentUrl: "",
        assigneeIds: user?.id ? [user.id] : [],
      });
      setTasks((current) => [...current, created]);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Could not save the timeline.");
    }
  };

  const handleBoardMove = (item: PortfolioItem, nextStatus: PortfolioBoardStatus) => {
    if (item.boardStatus === nextStatus) return;
    if (nextStatus === "Completed" || nextStatus === "Cancelled" || item.boardStatus === "Completed") {
      Modal.confirm({
        title: `Move "${item.title}" to ${nextStatus}?`,
        content: "Official project status lives on the source record. Open the project to change it.",
        okText: "Open project record",
        onOk: () => openSource(item),
      });
      return;
    }
    message.info(`${nextStatus} is derived from tasks and source completeness. Open the workspace to change those fields.`);
    openWorkspace(item);
  };

  const handleStatusIntent = (item: PortfolioItem) => {
    const canView = item.sourceType === "process" ? can("projects_entry", "view") : can("support_activities", "view");
    if (!canView) {
      message.info("This status is derived from the project record.");
      return;
    }
    Modal.confirm({
      title: `${item.boardStatus} is derived`,
      content: "Official protocol, report, and final status stay on the source record.",
      okText: item.sourceType === "process" ? "Open project record" : "Open support activity",
      onOk: () => openSource(item),
    });
  };

  const moreViews: Array<{ value: ProjectManagementPageView; label: string }> = [
    { value: "board", label: "Kanban" },
    { value: "calendar", label: "Calendar" },
    { value: "my_tasks", label: "My Tasks" },
    { value: "gantt", label: "Gantt" },
  ];
  const activeMoreView = moreViews.find((view) => view.value === pageView);

  return (
    <AppShell>
      <div className="project-management-page">
        <div className="pm-board-shell">
          <div className="pm-board-head">
            <div>
              <h1 className="pm-page-title">My work</h1>
              <div className="pm-view-tabs" role="tablist" aria-label="My work views">
                <button
                  type="button"
                  role="tab"
                  aria-selected={pageView === "portfolio"}
                  className={`pm-view-tab${pageView === "portfolio" ? " is-active" : ""}`}
                  onClick={() => changeView("portfolio")}
                >
                  Main table
                </button>
                <Dropdown
                  trigger={["click"]}
                  menu={{
                    selectable: true,
                    selectedKeys: activeMoreView ? [activeMoreView.value] : [],
                    items: moreViews.map((view) => ({ key: view.value, label: view.label })),
                    onClick: ({ key }) => changeView(key as ProjectManagementPageView),
                  }}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={Boolean(activeMoreView)}
                    className={`pm-view-tab${activeMoreView ? " is-active" : ""}`}
                  >
                    {activeMoreView ? activeMoreView.label : "More views"}
                  </button>
                </Dropdown>
              </div>
            </div>
          </div>
          {pageView === "gantt" ? null : (
          <WorkBoardToolbar
            filters={{ ...emptyPortfolioFilters(), ...filters }}
            owners={owners}
            sortKey={sortKey}
            hiddenColumns={hiddenColumns}
            groupBy={groupBy}
            showTableTools={pageView === "portfolio" || pageView === "board"}
            showColumnTools={pageView === "portfolio"}
            canCreate={canCreate}
            canCreateProject={canCreateProject}
            canCreateSupport={canCreateSupport}
            loading={loading}
            onFiltersChange={setFilters}
            onSortChange={handleSortChange}
            onHiddenChange={setHiddenColumns}
            onGroupByChange={setGroupBy}
            onNewTask={() => openCreateTask(undefined, true)}
            onNewProject={() => navigate("/projects?return_to=/project-management")}
            onNewSupport={(kind) => navigate(newSupportActivityPath(kind))}
            onRefresh={() => void load()}
          />
          )}
        </div>

        {error ? <Alert type="error" showIcon message={error} /> : null}

        {loading ? (
          <div className="pm-loading" aria-live="polite">
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        ) : items.length === 0 ? (
          <Empty
            description="Create a validation project or a TSD, RnD, or Non-Process support activity."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <NewProjectMenu
              type="primary"
              canCreateProject={canCreateProject}
              canCreateSupport={canCreateSupport}
              onNewProject={() => navigate("/projects?return_to=/project-management")}
              onNewSupport={(kind) => navigate(newSupportActivityPath(kind))}
            />
          </Empty>
        ) : visibleItems.length === 0 && portfolioFiltersAreActive({ ...emptyPortfolioFilters(), ...filters }) && (pageView === "portfolio" || pageView === "board" || pageView === "gantt") ? (
          <Empty description="No projects match the selected filters.">
            <Button onClick={() => setFilters(emptyPortfolioFilters())}>Clear filters</Button>
          </Empty>
        ) : pageView === "my_tasks" ? (
          <MyTasksView
            items={boardItems}
            profiles={profiles}
            currentUserId={user?.id}
            onOpen={openTask}
            canCreate={canCreate}
            onCreate={() => openCreateTask(undefined, true)}
            projectTitles={projectTitles}
            canEditTasks={canCreate || canEdit}
            onPatchTask={(item, patch) => void handlePatchTask(item, patch)}
            onBackToTable={() => changeView("portfolio")}
          />
        ) : pageView === "calendar" ? (
          <TaskCalendarView
            items={focusedItem ? boardItems.filter((item) => item.sourceType === focusedItem.sourceType && item.sourceId === focusedItem.sourceId) : boardItems}
            profiles={profiles}
            currentUserId={user?.id}
            onOpen={openTask}
            canCreate={canCreate}
            onCreate={openCreateTask}
            milestones={focusedItem ? milestones.filter((item) => item.sourceType === focusedItem.sourceType && item.sourceId === focusedItem.sourceId) : milestones}
            onOpenMilestone={(milestone) => {
              const match = items.find((item) => item.sourceType === milestone.sourceType && item.sourceId === milestone.sourceId);
              if (match) openWorkspace(match);
            }}
          />
        ) : pageView === "gantt" ? (
          <ProjectGantt
            items={scopedItems}
            tasks={tasks}
            onOpen={openWorkspace}
            canAddSubtask={canCreate}
            onAddExecutionSubtask={openExecutionSubtask}
            canDeleteSubtask={canDeleteTask}
            onDeleteSubtask={deleteSubtask}
            canSchedule={canCreate || canEdit}
            onScheduleChange={(task, start, end) => void patchTaskRecord(task, { startDate: start, targetDate: end })}
          />
        ) : pageView === "board" ? (
          <PortfolioKanban items={scopedItems} onOpen={openWorkspace} onMove={handleBoardMove} />
        ) : (
          <>
            <ProjectBoardTable
              items={visibleItems}
              tasks={tasks}
              profiles={profiles}
              sortKey={sortKey}
              sortDirection={sortDirection}
              hiddenColumns={hiddenColumns}
              groupBy={groupBy}
              canEditTasks={canCreate || canEdit}
              canCreate={canCreate}
              onSortChange={handleSortChange}
              onHiddenChange={setHiddenColumns}
              onOpen={openWorkspace}
              onOpenSource={openSource}
              onStatusIntent={handleStatusIntent}
              onSetTimeline={(item, start, end) => void handleSetTimeline(item, start, end)}
              onPatchTask={(task, patch) => void patchTaskRecord(task, patch)}
              onAddSubtask={(item) => openSubtask(item)}
              canOpenSource={can("projects_entry", "view") || can("support_activities", "view")}
              selectedId={focusId}
              onSelectedChange={setFocusId}
            />
            <div className="pm-mobile-cards">
              <PortfolioCardGrid grouped={grouped} changeSummaries={changeSummaries} assigneesBySource={assigneesBySource} onOpen={openWorkspace} />
            </div>
          </>
        )}
      </div>

      <ProjectWorkspaceDrawer
        item={selected}
        open={Boolean(selected)}
        canOpenSource={canOpenSource}
        canCreate={canCreate}
        canEdit={canEdit}
        canAssignTasks={canAssignTasks}
        assignmentEligible={Boolean(profile?.pm_task_eligible)}
        role={profile?.role}
        userId={user?.id}
        profiles={profiles}
        onClose={() => setSelectedId(null)}
        onOpenSource={(path) => {
          setSelectedId(null);
          navigate(path);
        }}
        onChanged={() => void load()}
      />
      {canCreate ? (
        <DashboardTaskComposer
          open={composerOpen}
          sourceOptions={sourceOptions}
          profiles={profiles}
          canAssign={canAssignTasks}
          role={profile?.role}
          initialTargetDate={composerDate}
          initialStartDate={composerStart}
          initialSource={composerSource}
          initialTitle={composerTitle}
          initialAssigneeIds={composerAssigneeIds}
          onClose={() => {
            setComposerOpen(false);
            setComposerDate("");
            setComposerStart("");
            setComposerSource(null);
            setComposerTitle("");
            setComposerAssigneeIds([]);
          }}
          onSaved={() => void load()}
        />
      ) : null}
    </AppShell>
  );
}
