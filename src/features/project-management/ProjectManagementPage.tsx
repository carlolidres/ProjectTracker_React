import { QuestionCircleOutlined } from "@ant-design/icons";
import { Alert, Button, Empty, Segmented, Space, Spin, Tooltip, Typography } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/app/auth-provider";
import { useMenuPermissions } from "@/app/menu-permission-provider";
import { LucideIcon } from "@/components/common/lucide-icon";
import { AppShell } from "@/components/layout/app-shell";
import { PortfolioCardGrid } from "@/features/project-management/components/PortfolioCardGrid";
import { PortfolioFiltersBar } from "@/features/project-management/components/PortfolioFilters";
import { PortfolioSummary } from "@/features/project-management/components/PortfolioSummary";
import { DashboardTaskComposer } from "@/features/dashboard/components/DashboardTaskComposer";
import { ProjectWorkspaceDrawer } from "@/features/project-management/components/ProjectWorkspaceDrawer";
import { sourceOptionsFromPortfolio } from "@/lib/dashboardPmHub";
import { MyTasksView, TaskCalendarView } from "@/features/project-management/components/TaskViews";
import { useRestorableViewState } from "@/hooks/use-restorable-view-state";
import { useChangeSummaries } from "@/hooks/use-change-summaries";
import { canAssignPmTasks } from "@/lib/projectManagementPermissions";
import {
  assigneesByPortfolioSource,
  emptyPortfolioFilters,
  filterPortfolioItems,
  groupPortfolioItems,
  summarizePortfolio,
} from "@/lib/projectManagementPortfolio";
import { mapUserTaskToBoardItem } from "@/lib/projectManagementWorkflow";
import {
  listAssignableProfiles,
  listProjectManagementPortfolio,
  listProjectManagementTasks,
} from "@/services/projectManagementService";
import type {
  PortfolioFilters,
  PortfolioItem,
  Profile,
  ProjectManagementPageView,
  ProjectManagementTask,
} from "@/types";

export function ProjectManagementPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { can } = useMenuPermissions();
  const { user, profile } = useAuth();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [tasks, setTasks] = useState<ProjectManagementTask[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filters, setFilters] = useState<PortfolioFilters>(emptyPortfolioFilters);
  const [pageView, setPageView] = useState<ProjectManagementPageView>("portfolio");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerDate, setComposerDate] = useState<string>("");
  const [composerAssigneeIds, setComposerAssigneeIds] = useState<string[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  useRestorableViewState("project-management.filters", filters, setFilters);
  useRestorableViewState("project-management.selectedId", selectedId, setSelectedId);
  useRestorableViewState("project-management.pageView", pageView, setPageView);

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
    const sourceId = params.get("sourceId") || params.get("projectId") || params.get("activityId");
    if (!sourceId || items.length === 0) return;
    const match = items.find((item) => item.sourceId === sourceId || item.identifier === sourceId);
    if (match) setSelectedId(match.id);
  }, [items, params]);

  const visibleItems = useMemo(() => filterPortfolioItems(items, filters), [filters, items]);
  const grouped = useMemo(() => groupPortfolioItems(visibleItems), [visibleItems]);
  const summary = useMemo(() => summarizePortfolio(items), [items]);
  const assigneesBySource = useMemo(() => assigneesByPortfolioSource(tasks, profiles), [profiles, tasks]);
  const changeSummaries = useChangeSummaries(visibleItems);
  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );
  const boardItems = useMemo(() => tasks.map(mapUserTaskToBoardItem), [tasks]);

  const openWorkspace = (item: PortfolioItem) => setSelectedId(item.id);
  const openTask = (boardItem: { sourceType: string; sourceId: string }) => {
    const match = items.find(
      (item) => item.sourceType === boardItem.sourceType && item.sourceId === boardItem.sourceId,
    );
    if (match) setSelectedId(match.id);
  };

  const canCreate = can("project_management", "create");
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

  return (
    <AppShell>
      <div className="project-management-page">
        <div className="page-header">
          <div>
            <div className="pm-title-row">
              <Typography.Title level={3} className="pm-page-title">My work</Typography.Title>
              <Tooltip
                placement="right"
                trigger={["hover", "focus"]}
                title={<PortfolioSummary summary={summary} variant="tooltip" />}
              >
                <button
                  type="button"
                  className="pm-title-help"
                  aria-label={showSummary ? "Hide portfolio summary" : "Show portfolio summary"}
                  aria-expanded={showSummary}
                  onClick={() => setShowSummary((value) => !value)}
                >
                  <QuestionCircleOutlined />
                </button>
              </Tooltip>
            </div>
            <Typography.Paragraph type="secondary" className="pm-page-subtitle">
              Browse live projects and support work. Click a calendar day or use My Tasks to add your own task.
            </Typography.Paragraph>
          </div>
          <Space>
            <Button icon={<LucideIcon name="refresh-cw" />} onClick={() => void load()} loading={loading}>
              Refresh
            </Button>
          </Space>
        </div>

        {error ? <Alert type="error" showIcon message={error} /> : null}

        {showSummary ? <PortfolioSummary summary={summary} /> : null}
        <div className="pm-view-bar" role="toolbar" aria-label="My work views">
          <Segmented
            aria-label="My work view"
            value={pageView}
            onChange={(value) => setPageView(value as ProjectManagementPageView)}
            options={[
              {
                label: (
                  <span className="pm-view-option">
                    <LucideIcon name="layout-grid" size={14} />
                    Portfolio
                  </span>
                ),
                value: "portfolio",
              },
              {
                label: (
                  <span className="pm-view-option">
                    <LucideIcon name="clipboard-list" size={14} />
                    My Tasks
                  </span>
                ),
                value: "my_tasks",
              },
              {
                label: (
                  <span className="pm-view-option">
                    <LucideIcon name="calendar" size={14} />
                    Calendar
                  </span>
                ),
                value: "calendar",
              },
            ]}
          />
        </div>
        {pageView === "portfolio" ? <PortfolioFiltersBar filters={filters} onChange={setFilters} /> : null}

        {loading ? (
          <div className="pm-loading" aria-live="polite">
            <Spin />
          </div>
        ) : items.length === 0 ? (
          <Empty description="No active projects or support activities." />
        ) : pageView === "my_tasks" ? (
          <MyTasksView
            items={boardItems}
            profiles={profiles}
            currentUserId={user?.id}
            onOpen={openTask}
            canCreate={canCreate}
            onCreate={() => openCreateTask(undefined, true)}
          />
        ) : pageView === "calendar" ? (
          <TaskCalendarView
            items={boardItems}
            profiles={profiles}
            currentUserId={user?.id}
            onOpen={openTask}
            canCreate={canCreate}
            onCreate={openCreateTask}
          />
        ) : (
          <PortfolioCardGrid grouped={grouped} changeSummaries={changeSummaries} assigneesBySource={assigneesBySource} onOpen={openWorkspace} />
        )}
      </div>

      <ProjectWorkspaceDrawer
        item={selected}
        open={Boolean(selected)}
        canOpenSource={canOpenSource}
        canCreate={canCreate}
        canEdit={can("project_management", "edit")}
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
