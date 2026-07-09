import {
  CloseOutlined,
  CompressOutlined,
  DownloadOutlined,
  ExpandOutlined,
  FilterOutlined,
  RedoOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  UndoOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Alert, Button, Card, Col, Input, Row, Select, Space, Tooltip, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/app/auth-provider";
import { useDateAdjustment } from "@/app/date-adjustment-provider";
import { useRegistry } from "@/app/registry-provider";
import { AppShell } from "@/components/layout/app-shell";
import {
  ProjectsDatabaseGrid,
  loadStoredRowHeight,
  saveStoredRowHeight,
} from "@/features/projects/components/ProjectsDatabaseGrid";
import { DUE_WINDOW_FILTER_OPTIONS, PENDING_ROLE_FILTER_OPTIONS } from "@/lib/fgUrgency";
import { ROLE_LABELS } from "@/lib/constants";
import { PROJECTS_DB_ROW_HEIGHT_OPTIONS } from "@/lib/projectsDatabaseColumns";
import { subscribeProjectDataChanged } from "@/lib/projectDataEvents";
import { ROLE_COLORS, ROLE_LEGEND_ITEMS } from "@/lib/roleColors";
import { projectFiltersFromSearchParams } from "@/lib/urlDerivedFilters";
import { valueOrNA } from "@/lib/utils";
import { exportProjectsToExcel } from "@/services/exportService";
import { filterProjectRows, getProjectById, listActiveProjects } from "@/services/projectService";
import {
  applyLocalRowEdits,
  patchProjectFromSpreadsheetEdits,
  previewSpreadsheetDateChanges,
  type SpreadsheetCellEdit,
} from "@/services/projectsDatabaseService";
import type { ProjectFilters, ProjectRow } from "@/types";

const FULL_VIEW_STORAGE_KEY = "project-tracker:projects-db:full-view";
const COLUMN_FILTERS_STORAGE_KEY = "project-tracker:projects-db:column-filters";

function loadFullView(): boolean {
  try {
    return localStorage.getItem(FULL_VIEW_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveFullView(value: boolean) {
  try {
    localStorage.setItem(FULL_VIEW_STORAGE_KEY, value ? "1" : "0");
  } catch {
    // ignore
  }
}

function loadShowColumnFilters(): boolean {
  try {
    const raw = localStorage.getItem(COLUMN_FILTERS_STORAGE_KEY);
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return true;
  }
}

function saveShowColumnFilters(value: boolean) {
  try {
    localStorage.setItem(COLUMN_FILTERS_STORAGE_KEY, value ? "1" : "0");
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
  const [searchParams] = useSearchParams();
  const { registry } = useRegistry();
  const { user, profile } = useAuth();
  const { promptBatchDateAdjustment } = useDateAdjustment();
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [dirtyEdits, setDirtyEdits] = useState<SpreadsheetCellEdit[]>([]);
  const [rowHeight, setRowHeight] = useState(loadStoredRowHeight);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [undoRequestToken, setUndoRequestToken] = useState(0);
  const [redoRequestToken, setRedoRequestToken] = useState(0);
  const [fullView, setFullView] = useState(loadFullView);
  const [showColumnFilters, setShowColumnFilters] = useState(loadShowColumnFilters);

  const toggleFullView = useCallback(() => {
    setFullView((current) => {
      const next = !current;
      saveFullView(next);
      return next;
    });
  }, []);

  const toggleColumnFilters = useCallback(() => {
    setShowColumnFilters((current) => {
      const next = !current;
      saveShowColumnFilters(next);
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listActiveProjects());
      setDirtyEdits([]);
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

  const displayRows = useMemo(() => applyLocalRowEdits(rows, dirtyEdits), [rows, dirtyEdits]);
  const filtered = useMemo(() => filterProjectRows(displayRows, filters), [displayRows, filters]);

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
      });

      setDirtyEdits([]);
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
  }, [dirtyEdits, profile?.role, promptBatchDateAdjustment, user?.email]);

  const unsavedCount = dirtyEdits.length;

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
          disabled={!unsavedCount}
          aria-label="Save Changes"
          onClick={() => void handleSave()}
        />
      </Tooltip>
    </Space>
  );

  const actionButtons = (
    <Space wrap>
      <Button
        icon={<ReloadOutlined />}
        onClick={() => void load()}
        loading={loading}
        disabled={unsavedCount > 0}
      >
        Refresh
      </Button>
      <Button
        icon={<DownloadOutlined />}
        onClick={() => {
          exportProjectsToExcel(filtered);
          message.success("Export started");
        }}
        disabled={!filtered.length}
      >
        Export to Excel
      </Button>
      <Button
        icon={<FilterOutlined />}
        type={showColumnFilters ? "default" : "primary"}
        onClick={toggleColumnFilters}
      >
        {showColumnFilters ? "Hide Filters" : "Show Filters"}
      </Button>
      <Button
        icon={fullView ? <CompressOutlined /> : <ExpandOutlined />}
        onClick={toggleFullView}
      >
        {fullView ? "Exit Full View" : "Full View"}
      </Button>
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

        {!fullView ? (
          <>
            <div className="projects-db-legend">
              <span className="projects-db-legend-label">Role legend</span>
              {ROLE_LEGEND_ITEMS.map((item, index) => (
                <span key={`${item.label}-${index}`} className="projects-db-legend-item">
                  <span
                    className="projects-db-legend-swatch"
                    style={{ background: ROLE_COLORS[item.key].accent }}
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
                  <Select
                    allowClear
                    placeholder="Activity Type"
                    style={{ width: "100%" }}
                    value={filters.activity_type}
                    options={(registry.activity_type ?? []).map((v) => ({ label: v, value: v }))}
                    onChange={(activity_type) => setFilters((f) => ({ ...f, activity_type }))}
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
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Shift+click select · Ctrl+C/V · Del clear
                    </Typography.Text>
                  </Space>
                </Col>
              </Row>
            </Card>
          </>
        ) : null}

        <ProjectsDatabaseGrid
          rows={filtered}
          role={profile?.role}
          registry={registry}
          dirtyEdits={dirtyEdits}
          onCellEdited={handleCellEdited}
          rowHeight={rowHeight}
          showColumnFilters={showColumnFilters}
          loading={loading}
          onUndoRedoAvailabilityChange={({ canUndo: nextUndo, canRedo: nextRedo }) => {
            setCanUndo(nextUndo);
            setCanRedo(nextRedo);
          }}
          undoRequestToken={undoRequestToken}
          redoRequestToken={redoRequestToken}
        />
      </div>
    </AppShell>
  );
}
