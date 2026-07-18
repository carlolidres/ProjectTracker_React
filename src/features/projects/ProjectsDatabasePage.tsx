import {
  CloseOutlined,
  CompressOutlined,
  DownloadOutlined,
  ExpandOutlined,
  PlusOutlined,
  RedoOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  UndoOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Alert, App as AntApp, Button, Card, Col, Input, Row, Select, Space, Tooltip, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/app/auth-provider";
import { useDateAdjustment } from "@/app/date-adjustment-provider";
import { useMenuPermissions } from "@/app/menu-permission-provider";
import { useRegistry } from "@/app/registry-provider";
import { AppMonthPicker } from "@/components/common/app-date-picker";
import { DashboardFilterBanner } from "@/components/common/dashboard-filter-banner";
import { AppShell } from "@/components/layout/app-shell";
import { readReturnToPath } from "@/lib/dashboardReturnTo";
import {
  ProjectsDatabaseGrid,
  loadStoredRowHeight,
  saveStoredRowHeight,
} from "@/features/projects/components/ProjectsDatabaseGrid";
import { DUE_WINDOW_FILTER_OPTIONS, PENDING_ROLE_FILTER_OPTIONS } from "@/lib/fgUrgency";
import { ROLE_LABELS } from "@/lib/constants";
import { getProfileFirstName } from "@/lib/profileName";
import {
  PROJECTS_DB_ROW_HEIGHT_OPTIONS,
  spreadsheetFieldGroupForPendingRole,
  type SpreadsheetColumnFocus,
} from "@/lib/projectsDatabaseColumns";
import { subscribeProjectDataChanged } from "@/lib/projectDataEvents";
import { ROLE_COLORS, ROLE_LEGEND_ITEMS } from "@/lib/roleColors";
import { canFocusProjectsDbRoleColumns, isAdminRole } from "@/lib/roleAccess";
import {
  clearProjectUrlFilterParams,
  projectFilterBannerLabels,
  projectFiltersFromSearchParams,
} from "@/lib/urlDerivedFilters";
import { valueOrNA } from "@/lib/utils";
import { exportProjectsToExcel } from "@/services/exportService";
import {
  createBlankProject,
  filterProjectRows,
  getProjectById,
  listActiveProjects,
} from "@/services/projectService";
import {
  applyLocalRowEdits,
  patchProjectFromSpreadsheetEdits,
  previewSpreadsheetDateChanges,
  type SpreadsheetCellEdit,
} from "@/services/projectsDatabaseService";
import type { ProjectFilters, ProjectRow } from "@/types";

const FULL_VIEW_STORAGE_KEY = "project-tracker:projects-db:full-view";

function loadFullView(): boolean {
  try {
    const stored = localStorage.getItem(FULL_VIEW_STORAGE_KEY);
    if (stored === null) return true;
    return stored === "1";
  } catch {
    return true;
  }
}

function saveFullView(value: boolean) {
  try {
    localStorage.setItem(FULL_VIEW_STORAGE_KEY, value ? "1" : "0");
  } catch {
    // ignore
  }
}

function editKey(edit: SpreadsheetCellEdit) {
  return `${edit.recordId}:${edit.field}`;
}

function mergeEdits(existing: SpreadsheetCellEdit[], next: SpreadsheetCellEdit): SpreadsheetCellEdit[] {
  const map = new Map(existing.map((e) => [editKey(e), e]));
  const prior = map.get(editKey(next));
  if (prior) {
    const merged = { ...prior, newValue: next.newValue };
    if (merged.oldValue === merged.newValue) {
      map.delete(editKey(next));
    } else {
      map.set(editKey(next), merged);
    }
  } else if (next.oldValue !== next.newValue) {
    map.set(editKey(next), next);
  }
  return [...map.values()];
}

export function ProjectsDatabasePage() {
  const navigate = useNavigate();
  const { modal } = AntApp.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const returnToPath = readReturnToPath(searchParams);
  const { registry } = useRegistry();
  const { user, profile } = useAuth();
  const { can: canMenuAction } = useMenuPermissions();
  const canEditDatabase = canMenuAction("projects_database", "edit");
  const canExportDatabase = canMenuAction("projects_database", "export");
  const canCreateProject = canMenuAction("projects_entry", "create");
  const gridRole = canEditDatabase ? profile?.role : "view";
  const { promptBatchDateAdjustment } = useDateAdjustment();
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [dirtyEdits, setDirtyEdits] = useState<SpreadsheetCellEdit[]>([]);
  const [cellErrors, setCellErrors] = useState<Record<string, string>>({});
  const [rowHeight, setRowHeight] = useState(loadStoredRowHeight);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [undoRequestToken, setUndoRequestToken] = useState(0);
  const [redoRequestToken, setRedoRequestToken] = useState(0);
  const [fullView, setFullView] = useState(loadFullView);
  /** Column visibility only — independent of row filters and edit rights. */
  const [columnFocus, setColumnFocus] = useState<SpreadsheetColumnFocus>({ mode: "all" });

  const authorizedLegendItems = useMemo(
    () =>
      ROLE_LEGEND_ITEMS.filter((item) =>
        canFocusProjectsDbRoleColumns(profile?.role, item.fieldGroup),
      ),
    [profile?.role],
  );

  useEffect(() => {
    const group = spreadsheetFieldGroupForPendingRole(filters.pending_role);
    if (!group) return;
    setColumnFocus({ mode: "fieldGroup", group });
  }, [filters.pending_role]);

  const toggleFullView = useCallback(() => {
    setFullView((current) => {
      const next = !current;
      saveFullView(next);
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listActiveProjects());
      setDirtyEdits([]);
      setCellErrors({});
      setSaveStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(
    () =>
      subscribeProjectDataChanged(() => {
        if (dirtyEdits.length) return;
        void load();
      }),
    [load, dirtyEdits.length],
  );

  useEffect(() => {
    setFilters((current) => projectFiltersFromSearchParams(searchParams, current));
  }, [searchParams]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyEdits.length) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirtyEdits.length]);

  const displayRows = useMemo(() => applyLocalRowEdits(rows, dirtyEdits), [rows, dirtyEdits]);
  const filtered = useMemo(() => filterProjectRows(displayRows, filters), [displayRows, filters]);
  const cellErrorCount = Object.keys(cellErrors).length;

  const ownerOptions = useMemo(() => {
    const owners = new Set<string>();
    for (const row of rows) {
      const owner = valueOrNA(row.project_owner);
      if (owner !== "N/A") owners.add(owner);
    }
    return [...owners].sort((a, b) => a.localeCompare(b)).map((value) => ({ label: value, value }));
  }, [rows]);

  const handleCellEdited = useCallback((edit: SpreadsheetCellEdit) => {
    setDirtyEdits((current) => mergeEdits(current, edit));
    setSaveStatus("idle");
  }, []);

  const handleSave = useCallback(async () => {
    if (!user?.email) {
      message.error("Sign in again to save changes.");
      return;
    }
    if (!dirtyEdits.length) return;
    if (cellErrorCount > 0) {
      message.error(`Fix ${cellErrorCount} invalid cell${cellErrorCount === 1 ? "" : "s"} before saving.`);
      return;
    }

    const confirmed = await new Promise<boolean>((resolve) => {
      modal.confirm({
        title: "Save spreadsheet changes?",
        content: `Save ${dirtyEdits.length} unsaved change${dirtyEdits.length === 1 ? "" : "s"}? Valid cells will be written; role and field rules still apply on the server.`,
        okText: "Save",
        cancelText: "Cancel",
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    try {
      const byProject = new Map<string, SpreadsheetCellEdit[]>();
      for (const edit of dirtyEdits) {
        const list = byProject.get(edit.projectId) ?? [];
        list.push(edit);
        byProject.set(edit.projectId, list);
      }

      const allDateChanges = [];
      for (const [projectId, projectEdits] of byProject) {
        const hierarchy = await getProjectById(projectId);
        if (!hierarchy) throw new Error(`Project ${projectId} not found.`);
        allDateChanges.push(...previewSpreadsheetDateChanges(hierarchy, projectEdits));
      }

      if (allDateChanges.length) {
        const roleLabel = profile?.role ? (ROLE_LABELS[profile.role] ?? profile.role) : "User";
        const approved = await promptBatchDateAdjustment(allDateChanges, roleLabel);
        if (!approved) {
          setSaving(false);
          return;
        }
      }

      await patchProjectFromSpreadsheetEdits(dirtyEdits, user.email, {
        dateAdjustmentsConfirmed: true,
        role: gridRole,
        registry,
      });

      setDirtyEdits([]);
      setCellErrors({});
      setSaveStatus("saved");
      message.success("Changes saved");
      setRows(await listActiveProjects());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save spreadsheet changes.";
      setError(msg);
      setSaveStatus("error");
      message.error(msg);
    } finally {
      setSaving(false);
    }
  }, [
    cellErrorCount,
    dirtyEdits,
    gridRole,
    modal,
    profile?.role,
    promptBatchDateAdjustment,
    registry,
    user?.email,
  ]);

  const unsavedCount = dirtyEdits.length;

  const handleAddProjectRow = useCallback(async () => {
    if (!user?.email) {
      message.error("Sign in again to create a project.");
      return;
    }
    if (unsavedCount > 0) {
      message.warning("Save or discard unsaved edits before adding a project.");
      return;
    }
    setCreating(true);
    try {
      const owner = isAdminRole(profile?.role) ? "" : getProfileFirstName(profile);
      const result = await createBlankProject(user.email, owner);
      message.success(`Project ${result.project_id} created`);
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }, [load, profile, unsavedCount, user?.email]);

  const discardSaveButtons = (
    <Space size={4}>
      <Tooltip title="Discard">
        <Button
          icon={<CloseOutlined />}
          disabled={!unsavedCount || saving}
          aria-label="Discard"
          onClick={() => {
            void load();
          }}
        />
      </Tooltip>
      <Tooltip title="Save Changes">
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          disabled={!unsavedCount || cellErrorCount > 0}
          aria-label="Save Changes"
          onClick={() => void handleSave()}
        />
      </Tooltip>
    </Space>
  );

  const actionButtons = (
    <Space wrap>
      <Tooltip title={fullView ? "Refresh" : undefined}>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => void load()}
          loading={loading}
          disabled={unsavedCount > 0}
          aria-label="Refresh"
        >
          {fullView ? null : "Refresh"}
        </Button>
      </Tooltip>
      {canExportDatabase ? (
        <Tooltip title={fullView ? "Export to Excel" : undefined}>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => {
              exportProjectsToExcel(filtered);
              message.success("Export started");
            }}
            disabled={!filtered.length}
            aria-label="Export to Excel"
          >
            {fullView ? null : "Export to Excel"}
          </Button>
        </Tooltip>
      ) : null}
      <Tooltip title={fullView ? "Exit Full View" : undefined}>
        <Button
          icon={fullView ? <CompressOutlined /> : <ExpandOutlined />}
          onClick={toggleFullView}
          aria-label={fullView ? "Exit Full View" : "Full View"}
        >
          {fullView ? null : "Full View"}
        </Button>
      </Tooltip>
    </Space>
  );

  return (
    <AppShell>
      <div className={`projects-db-page${fullView ? " projects-db-page-full" : ""}`}>
        {!fullView ? (
          <div className="page-header">
            <div>
              <Typography.Title level={3} style={{ marginBottom: 4 }}>
                Projects Database
              </Typography.Title>
              <Typography.Text type="secondary">
                View, edit and manage all projects in the system.
              </Typography.Text>
              {unsavedCount > 0 ? (
                <div className="projects-db-unsaved" style={{ marginTop: 4 }}>
                  <WarningOutlined /> Unsaved changes ({unsavedCount}) · {filtered.length} rows
                </div>
              ) : (
                <Typography.Text type="secondary" style={{ display: "block", marginTop: 4, fontSize: 12 }}>
                  {filtered.length} rows
                  {saveStatus === "saved" ? " · All changes saved" : ""}
                </Typography.Text>
              )}
            </div>
            <Space wrap>
              {actionButtons}
              {discardSaveButtons}
            </Space>
          </div>
        ) : (
          <div className="projects-db-full-chrome">
            <Space size={8} wrap>
              <Typography.Text strong>Projects Database</Typography.Text>
              {unsavedCount > 0 ? (
                <span className="projects-db-unsaved">
                  <WarningOutlined /> Unsaved ({unsavedCount})
                </span>
              ) : (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {filtered.length} rows
                </Typography.Text>
              )}
            </Space>
            <div className="projects-db-full-chrome-actions">
              <Space wrap>
                <Button
                  size="small"
                  icon={<UndoOutlined />}
                  disabled={!canUndo}
                  onClick={() => setUndoRequestToken((n) => n + 1)}
                >
                  Undo
                </Button>
                <Button
                  size="small"
                  icon={<RedoOutlined />}
                  disabled={!canRedo}
                  onClick={() => setRedoRequestToken((n) => n + 1)}
                >
                  Redo
                </Button>
                {actionButtons}
              </Space>
              {discardSaveButtons}
            </div>
          </div>
        )}

        {error ? <Alert type="error" showIcon message={error} /> : null}
        {cellErrorCount > 0 ? (
          <Alert
            type="warning"
            showIcon
            message={`${cellErrorCount} invalid cell${cellErrorCount === 1 ? "" : "s"} — hover red cells for details. Valid edits are kept.`}
            style={{ marginBottom: 12 }}
          />
        ) : null}

        <DashboardFilterBanner
          labels={projectFilterBannerLabels(filters)}
          onBackToDashboard={returnToPath ? () => navigate(returnToPath) : undefined}
          onClear={() => {
            setSearchParams(clearProjectUrlFilterParams(searchParams), { replace: true });
            setFilters((current) => {
              const next = { ...current };
              for (const key of [
                "cnf_status",
                "final_status",
                "due_window",
                "pending_role",
                "drill",
                "fg_month",
                "fg_year",
                "delivery_status",
                "sort",
                "order",
              ] as const) {
                delete next[key];
              }
              return next;
            });
          }}
        />

        {!fullView ? (
          <>
            <div className="projects-db-legend" role="toolbar" aria-label="Column role focus">
              <span className="projects-db-legend-label">Role legend</span>
              <button
                type="button"
                className={`projects-db-legend-chip${columnFocus.mode === "all" ? " is-active" : ""}`}
                aria-pressed={columnFocus.mode === "all"}
                onClick={() => setColumnFocus({ mode: "all" })}
              >
                All Permitted Columns
              </button>
              {authorizedLegendItems.map((item) => {
                const labelKey = item.columnLabels.join("|");
                const active =
                  (columnFocus.mode === "roleLabels"
                    && columnFocus.labels.join("|") === labelKey)
                  || (columnFocus.mode === "fieldGroup"
                    && columnFocus.group === item.fieldGroup);
                return (
                  <button
                    type="button"
                    key={item.label}
                    className={`projects-db-legend-chip${active ? " is-active" : ""}`}
                    aria-pressed={active}
                    title={`Show ${item.label} columns only`}
                    onClick={() => {
                      setColumnFocus({ mode: "roleLabels", labels: item.columnLabels });
                    }}
                  >
                    <span
                      className="projects-db-legend-swatch"
                      style={{ background: ROLE_COLORS[item.key].accent }}
                      aria-hidden
                    />
                    {item.label}
                  </button>
                );
              })}
              {ROLE_LEGEND_ITEMS.filter(
                (item) => !canFocusProjectsDbRoleColumns(profile?.role, item.fieldGroup),
              ).map((item) => (
                <span
                  key={`locked-${item.label}`}
                  className="projects-db-legend-item is-locked"
                  title="Not authorized for this role’s column focus"
                >
                  <span
                    className="projects-db-legend-swatch"
                    style={{ background: ROLE_COLORS[item.key].accent, opacity: 0.45 }}
                    aria-hidden
                  />
                  {item.label}
                </span>
              ))}
            </div>

            <Card size="small" className="projects-db-toolbar">
              <Row gutter={[12, 12]} align="middle">
                <Col xs={24} md={8}>
                  <Input
                    prefix={<SearchOutlined />}
                    placeholder="Search projects"
                    value={filters.search}
                    onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                    allowClear
                  />
                </Col>
                <Col xs={24} md={4}>
                  <Select
                    allowClear
                    placeholder="Owner"
                    style={{ width: "100%" }}
                    value={filters.owner}
                    options={ownerOptions}
                    onChange={(owner) => setFilters((f) => ({ ...f, owner }))}
                  />
                </Col>
                <Col xs={24} md={4}>
                  <AppMonthPicker
                    placeholder="FG Month"
                    value={filters.fg_month ?? ""}
                    onChange={(fg_month) =>
                      setFilters((f) => ({
                        ...f,
                        fg_month: fg_month || undefined,
                        // Month picker is the full filter; clear year-only drill remnant
                        fg_year: fg_month ? undefined : f.fg_year,
                      }))
                    }
                  />
                </Col>
                <Col xs={24} md={4}>
                  <Select
                    allowClear
                    placeholder="CNF Status"
                    style={{ width: "100%" }}
                    value={filters.cnf_status}
                    options={(registry.cnf_status ?? []).map((v) => ({ label: v, value: v }))}
                    onChange={(cnf_status) => setFilters((f) => ({ ...f, cnf_status }))}
                  />
                </Col>
                <Col xs={24} md={4}>
                  <Select
                    allowClear
                    placeholder="Final Status"
                    style={{ width: "100%" }}
                    value={filters.final_status}
                    options={(registry.final_status ?? []).map((v) => ({ label: v, value: v }))}
                    onChange={(final_status) => setFilters((f) => ({ ...f, final_status }))}
                  />
                </Col>
                <Col xs={24} md={4}>
                  <Select
                    allowClear
                    placeholder="FG Delivery Window"
                    style={{ width: "100%" }}
                    value={filters.due_window}
                    options={DUE_WINDOW_FILTER_OPTIONS.map((option) => ({
                      label: option.label,
                      value: option.value,
                    }))}
                    onChange={(due_window) => setFilters((f) => ({ ...f, due_window }))}
                  />
                </Col>
                <Col xs={24} md={4}>
                  <Select
                    allowClear
                    placeholder="Pending Role"
                    style={{ width: "100%" }}
                    value={filters.pending_role}
                    options={PENDING_ROLE_FILTER_OPTIONS.map((option) => ({
                      label: option.label,
                      value: option.value,
                    }))}
                    onChange={(pending_role) => setFilters((f) => ({ ...f, pending_role }))}
                  />
                </Col>
                <Col xs={24} md={4}>
                  <Select
                    style={{ width: "100%" }}
                    value={rowHeight}
                    options={PROJECTS_DB_ROW_HEIGHT_OPTIONS.map((option) => ({
                      label: `Row: ${option.label}`,
                      value: option.value,
                    }))}
                    onChange={(value: number) => {
                      setRowHeight(value);
                      saveStoredRowHeight(value);
                    }}
                  />
                </Col>
                <Col xs={24} md={8}>
                  <Space>
                    <Button
                      icon={<UndoOutlined />}
                      disabled={!canUndo}
                      onClick={() => setUndoRequestToken((n) => n + 1)}
                    >
                      Undo
                    </Button>
                    <Button
                      icon={<RedoOutlined />}
                      disabled={!canRedo}
                      onClick={() => setRedoRequestToken((n) => n + 1)}
                    >
                      Redo
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Card>
          </>
        ) : null}

        <ProjectsDatabaseGrid
          rows={filtered}
          role={gridRole}
          registry={registry}
          dirtyEdits={dirtyEdits}
          onCellEdited={handleCellEdited}
          rowHeight={rowHeight}
          showColumnFilters={false}
          columnFocus={columnFocus}
          loading={loading}
          onCellErrorsChange={setCellErrors}
          onUndoRedoAvailabilityChange={({ canUndo: nextUndo, canRedo: nextRedo }) => {
            setCanUndo(nextUndo);
            setCanRedo(nextRedo);
          }}
          undoRequestToken={undoRequestToken}
          redoRequestToken={redoRequestToken}
        />
        {canCreateProject ? (
          <div className="projects-db-add-row-bar">
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              loading={creating}
              disabled={loading || creating || unsavedCount > 0}
              onClick={() => void handleAddProjectRow()}
            >
              Add project
            </Button>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
