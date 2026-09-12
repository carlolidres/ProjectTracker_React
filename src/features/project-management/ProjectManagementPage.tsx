import { Alert, App, Button, Empty, Modal, Segmented, Skeleton, Space, Typography } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/app/auth-provider";
import { useMenuPermissions } from "@/app/menu-permission-provider";
import { LucideIcon } from "@/components/common/lucide-icon";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardTaskComposer } from "@/features/dashboard/components/DashboardTaskComposer";
import { PortfolioCardGrid } from "@/features/project-management/components/PortfolioCardGrid";
import { PortfolioKanban } from "@/features/project-management/components/PortfolioKanban";
import { PortfolioFiltersBar } from "@/features/project-management/components/PortfolioFilters";
import { PortfolioSummary } from "@/features/project-management/components/PortfolioSummary";
import { ProjectBoardTable } from "@/features/project-management/components/ProjectBoardTable";
import { ProjectWorkspaceDrawer } from "@/features/project-management/components/ProjectWorkspaceDrawer";
import { MyTasksView, TaskCalendarView } from "@/features/project-management/components/TaskViews";
import { useChangeSummaries } from "@/hooks/use-change-summaries";
import { useRestorableViewState } from "@/hooks/use-restorable-view-state";
import { sourceOptionsFromPortfolio } from "@/lib/dashboardPmHub";
import { parseAppDateValue } from "@/lib/date";
import { canAssignPmTasks } from "@/lib/projectManagementPermissions";
import {
  assigneesByPortfolioSource,
  emptyPortfolioFilters,
  filterPortfolioItems,
  groupPortfolioItems,
  parseProjectManagementView,
  portfolioFiltersAreActive,
  portfolioSourcePath,
  projectManagementViewParam,
  summarizePortfolio,
} from "@/lib/projectManagementPortfolio";
import {
  mapUserTaskToBoardItem,
  toProjectManagementTaskInput,
} from "@/lib/projectManagementWorkflow";
import {
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
  PortfolioSummary as PortfolioSummaryModel,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerDate, setComposerDate] = useState<string>("");
  const [composerAssigneeIds, setComposerAssigneeIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<PortfolioSortKey>("updated");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useRestorableViewState("project-management.filters", filters, setFilters);
  useRestorableViewState("project-management.selectedId", selectedId, setSelectedId);
  useRestorableViewState("project-management.pageView", pageView, setPageView);
  useRestorableViewState("project-management.sortKey", sortKey, setSortKey);

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
  const grouped = useMemo(() => groupPortfolioItems(visibleItems), [visibleItems]);
  const myTaskCount = useMemo(
    () => tasks.filter((task) => user?.id && task.assigneeIds.includes(user.id)).length,
    [tasks, user?.id],
  );
  const summary = useMemo(() => summarizePortfolio(items, myTaskCount), [items, myTaskCount]);
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
  const canAssignTasks = canCreate && canAssignPmTasks(profile?.role, profile?.pm_task_eligible);
  const sourceOptions = useMemo(() => sourceOptionsFromPortfolio(items), [items]);

  const openCreateTask = (date?: string, assignSelf = false) => {
    setComposerDate(date ?? "");
    setComposerAssigneeIds(assignSelf && user?.id ? [user.id] : []);
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

  const handlePatchTask = async (
    item: WorkflowBoardItem,
    patch: Partial<Pick<WorkflowBoardItem, "status" | "priority" | "targetDate" | "percentComplete">>,
  ) => {
    const task = tasks.find((row) => row.id === item.id);
    if (!task) return;
    const previous = tasks;
    setTasks((current) => current.map((row) => (row.id === task.id ? { ...row, ...patch } : row)));
    try {
      await updateProjectManagementTask(task.id, { ...toProjectManagementTaskInput(task), ...patch });
    } catch (err) {
      setTasks(previous);
      message.error(err instanceof Error ? err.message : "Could not update the task. Your previous value has been restored.");
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

  const handleSummarySelect = (key: keyof PortfolioSummaryModel) => {
    if (key === "ongoing") setFilters((current) => ({ ...current, statusGroup: "Ongoing", boardStatus: "all" }));
    if (key === "forReview") setFilters((current) => ({ ...current, boardStatus: "For Review", statusGroup: "all" }));
    if (key === "atRisk") setFilters((current) => ({ ...current, boardStatus: "At Risk", statusGroup: "all" }));
    if (key === "completed") setFilters((current) => ({ ...current, statusGroup: "Completed", boardStatus: "all" }));
    if (key === "cancelled") setFilters((current) => ({ ...current, statusGroup: "Cancelled", boardStatus: "all" }));
    if (key === "myTasks") changeView("my_tasks");
  };

  return (
    <AppShell>
      <div className="project-management-page">
        <div className="page-header">
          <div className="pm-header-copy">
            <Typography.Title level={3} className="pm-page-title">My work</Typography.Title>
            <Typography.Paragraph type="secondary" className="pm-page-subtitle">
              Manage validation projects, support work, milestones, responsibilities, due dates, and project status.
            </Typography.Paragraph>
          </div>
          <Space wrap className="pm-header-actions">
            <Button icon={<LucideIcon name="refresh-cw" />} onClick={() => void load()} loading={loading}>
              Refresh
            </Button>
            {canCreate ? (
              <Button icon={<LucideIcon name="plus" />} onClick={() => openCreateTask(undefined, true)}>
                New task
              </Button>
            ) : null}
            {canCreateProject ? (
              <Button type="primary" icon={<LucideIcon name="plus" />} onClick={() => navigate("/projects?return_to=/project-management")}>
                New Project
              </Button>
            ) : null}
          </Space>
        </div>

        {error ? <Alert type="error" showIcon message={error} /> : null}

        <PortfolioSummary summary={summary} onSelect={handleSummarySelect} />
        <div className="pm-view-bar" role="toolbar" aria-label="My work views">
          <Segmented
            block
            aria-label="My work view"
            value={pageView}
            onChange={(value) => changeView(value as ProjectManagementPageView)}
            options={[
              { label: <span className="pm-view-option"><LucideIcon name="layout-grid" size={14} />Portfolio</span>, value: "portfolio" },
              { label: <span className="pm-view-option"><LucideIcon name="clipboard-list" size={14} />My Tasks</span>, value: "my_tasks" },
              { label: <span className="pm-view-option"><LucideIcon name="columns" size={14} />Board</span>, value: "board" },
              { label: <span className="pm-view-option"><LucideIcon name="calendar" size={14} />Calendar</span>, value: "calendar" },
            ]}
          />
        </div>
        {pageView === "portfolio" || pageView === "board" ? (
          <PortfolioFiltersBar filters={{ ...emptyPortfolioFilters(), ...filters }} owners={owners} onChange={setFilters} />
        ) : null}

        {loading ? (
          <div className="pm-loading" aria-live="polite">
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        ) : items.length === 0 ? (
          <Empty
            description="Create your first project or change the current filters."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            {canCreateProject ? (
              <Button type="primary" onClick={() => navigate("/projects?return_to=/project-management")}>
                New Project
              </Button>
            ) : null}
          </Empty>
        ) : visibleItems.length === 0 && portfolioFiltersAreActive({ ...emptyPortfolioFilters(), ...filters }) && (pageView === "portfolio" || pageView === "board") ? (
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
          />
        ) : pageView === "calendar" ? (
          <TaskCalendarView
            items={boardItems}
            profiles={profiles}
            currentUserId={user?.id}
            onOpen={openTask}
            canCreate={canCreate}
            onCreate={openCreateTask}
            milestones={milestones}
            onOpenMilestone={(milestone) => {
              const match = items.find((item) => item.sourceType === milestone.sourceType && item.sourceId === milestone.sourceId);
              if (match) openWorkspace(match);
            }}
          />
        ) : pageView === "board" ? (
          <PortfolioKanban items={visibleItems} onOpen={openWorkspace} onMove={handleBoardMove} />
        ) : (
          <>
            <ProjectBoardTable
              items={visibleItems}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
              onOpen={openWorkspace}
              onOpenSource={openSource}
              canOpenSource={can("projects_entry", "view") || can("support_activities", "view")}
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
          initialAssigneeIds={composerAssigneeIds}
          onClose={() => {
            setComposerOpen(false);
            setComposerDate("");
            setComposerAssigneeIds([]);
          }}
          onSaved={() => void load()}
        />
      ) : null}
    </AppShell>
  );
}
