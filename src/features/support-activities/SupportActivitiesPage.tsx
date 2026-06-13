import { ClearOutlined, DownloadOutlined, ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Input, Row, Select, Space, Spin, Table, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppDatePicker } from "@/components/common/app-date-picker";
import { NaClearingInput } from "@/components/common/na-clearing-input";
import { useAuth } from "@/app/auth-provider";
import { useDateAdjustment } from "@/app/date-adjustment-provider";
import { useMeetingViewReadOnly } from "@/app/meeting-view-provider";
import { useRegistry } from "@/app/registry-provider";
import { AppShell } from "@/components/layout/app-shell";
import { ROLE_LABELS } from "@/lib/constants";
import { collectSupportDateChanges } from "@/lib/dateAdjustmentReview";
import {
  clearSupportActivityDraft,
  loadSupportActivityDraft,
  saveSupportActivityDraft,
  useFlushOnPageHide,
} from "@/lib/formDraftStorage";
import { DUE_WINDOW_FILTER_OPTIONS } from "@/lib/fgUrgency";
import { formatAppDate } from "@/lib/date";
import { canArchiveRecords } from "@/lib/roleAccess";
import { useDiagLifecycle } from "@/lib/sessionDiagnostics";
import { exportSupportToExcel } from "@/services/exportService";
import {
  archiveSupportActivity,
  filterSupportRows,
  listActiveSupportActivities,
  saveSupportActivity,
} from "@/services/supportActivityService";
import type { ActivityKind, SupportActivity, SupportActivityFilters } from "@/types";

const emptyActivity = (): Partial<SupportActivity> => ({
  activity_id: "N/A",
  activity_kind: "TSD",
  Department: "",
  Material: "",
  Line: "",
  Bulk: "",
  Machinability_Protocol: "",
  Machinability_Protocol_Status: "",
  Machinability_Report: "",
  Machinability_Report_Status: "",
  Product_User: "",
  Principal: "",
  Product: "",
  Target_Date: "",
  Planning_Schedule: "",
});

export function SupportActivitiesPage() {
  useDiagLifecycle("SupportActivitiesPage");
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const { registry } = useRegistry();
  const { promptBatchDateAdjustment } = useDateAdjustment();
  const meetingViewReadOnly = useMeetingViewReadOnly();
  const canArchive = canArchiveRecords(profile?.role);
  const [rows, setRows] = useState<SupportActivity[]>([]);
  const [filters, setFilters] = useState<SupportActivityFilters>({});
  const [form, setForm] = useState<Partial<SupportActivity>>(emptyActivity());
  const baselineFormRef = useRef<Partial<SupportActivity>>(emptyActivity());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listActiveSupportActivities());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load support activities");
    } finally {
      setLoading(false);
    }
  }, []);

  const persistSupportDraft = useCallback(() => {
    if (!user?.id) return;
    saveSupportActivityDraft(user.id, form);
  }, [form, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user?.id) return;
    const draft = loadSupportActivityDraft(user.id);
    if (draft) {
      baselineFormRef.current = structuredClone(draft);
      setForm(draft);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const timer = window.setTimeout(() => {
      persistSupportDraft();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [persistSupportDraft, user?.id]);

  useFlushOnPageHide(persistSupportDraft);

  useEffect(() => {
    const dueWindow = searchParams.get("due_window") ?? undefined;
    if (dueWindow) {
      setFilters((current) => ({ ...current, due_window: dueWindow }));
    }
  }, [searchParams]);

  const filtered = useMemo(() => filterSupportRows(rows, filters), [rows, filters]);
  const isTsd = form.activity_kind === "TSD";
  const userRoleLabel = profile?.role ? (ROLE_LABELS[profile.role] ?? profile.role) : "Support Activities";

  function loadForm(record: Partial<SupportActivity>) {
    const next = { ...record };
    baselineFormRef.current = structuredClone(next);
    setForm(next);
    if (user?.id) saveSupportActivityDraft(user.id, next);
  }

  function clearForm() {
    const cleared = emptyActivity();
    baselineFormRef.current = cleared;
    setForm(cleared);
    if (user?.id) clearSupportActivityDraft(user.id);
  }

  async function handleSave() {
    if (!user?.email) return;
    setSaving(true);
    try {
      const dateChanges = collectSupportDateChanges(
        baselineFormRef.current as Record<string, string | undefined>,
        form as Record<string, string | undefined>,
        { projectId: form.project_id, activityId: form.activity_id },
      );
      if (dateChanges.length) {
        const approved = await promptBatchDateAdjustment(dateChanges, userRoleLabel);
        if (!approved) return;
      }

      await saveSupportActivity(form, user.email, { dateAdjustmentsConfirmed: dateChanges.length > 0 });
      message.success("Support activity saved");
      clearForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <Typography.Title level={3}>Support Activities</Typography.Title>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>Refresh</Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportSupportToExcel(filtered)} disabled={!filtered.length}>
            Export Data to Excel
          </Button>
        </Space>
      </div>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

      <Card
        title={meetingViewReadOnly ? "Activity Details (read-only)" : "Add / Edit Activity"}
        style={{ marginBottom: 16 }}
        extra={
          meetingViewReadOnly ? null : (
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => void handleSave()}>
              Save
            </Button>
          )
        }
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} md={6}>
            <Select
              style={{ width: "100%" }}
              disabled={meetingViewReadOnly}
              value={form.activity_kind as ActivityKind | undefined}
              options={[{ label: "TSD", value: "TSD" }, { label: "RnD", value: "RnD" }]}
              onChange={(activity_kind) => setForm((f) => ({ ...f, activity_kind: activity_kind as ActivityKind }))}
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              allowClear
              placeholder="Department"
              style={{ width: "100%" }}
              disabled={meetingViewReadOnly}
              value={form.Department || undefined}
              options={(registry.department ?? []).map((v) => ({ label: v, value: v }))}
              onChange={(Department) => setForm((f) => ({ ...f, Department }))}
            />
          </Col>
          {isTsd ? (
            <>
              <Col xs={24} md={6}><NaClearingInput placeholder="Material" value={form.Material ?? ""} readOnly={meetingViewReadOnly} onChange={(Material) => setForm((f) => ({ ...f, Material }))} /></Col>
              <Col xs={24} md={6}><NaClearingInput placeholder="Line" value={form.Line ?? ""} readOnly={meetingViewReadOnly} onChange={(Line) => setForm((f) => ({ ...f, Line }))} /></Col>
              <Col xs={24} md={6}><NaClearingInput placeholder="Bulk" value={form.Bulk ?? ""} readOnly={meetingViewReadOnly} onChange={(Bulk) => setForm((f) => ({ ...f, Bulk }))} /></Col>
              <Col xs={24} md={6}><NaClearingInput placeholder="Product User" value={form.Product_User ?? ""} readOnly={meetingViewReadOnly} onChange={(Product_User) => setForm((f) => ({ ...f, Product_User }))} /></Col>
            </>
          ) : (
            <>
              <Col xs={24} md={6}><NaClearingInput placeholder="Principal" value={form.Principal ?? ""} readOnly={meetingViewReadOnly} onChange={(Principal) => setForm((f) => ({ ...f, Principal }))} /></Col>
              <Col xs={24} md={6}><NaClearingInput placeholder="Product" value={form.Product ?? ""} readOnly={meetingViewReadOnly} onChange={(Product) => setForm((f) => ({ ...f, Product }))} /></Col>
              <Col xs={24} md={6}><NaClearingInput placeholder="Line" value={form.Line ?? ""} readOnly={meetingViewReadOnly} onChange={(Line) => setForm((f) => ({ ...f, Line }))} /></Col>
            </>
          )}
          <Col xs={24} md={6}>
            <label className="support-form-field-label" htmlFor="support-target-date">Target Date to Execute</label>
            <AppDatePicker
              id="support-target-date"
              value={form.Target_Date ?? ""}
              readOnly={meetingViewReadOnly}
              onChange={(Target_Date) => setForm((current) => ({ ...current, Target_Date }))}
            />
          </Col>
          <Col xs={24} md={6}>
            <label className="support-form-field-label" htmlFor="support-planning-schedule">Planning Schedule</label>
            <AppDatePicker
              id="support-planning-schedule"
              value={form.Planning_Schedule ?? ""}
              readOnly={meetingViewReadOnly}
              onChange={(Planning_Schedule) => setForm((current) => ({ ...current, Planning_Schedule }))}
            />
          </Col>
        </Row>
        {meetingViewReadOnly ? null : (
          <Button icon={<ClearOutlined />} style={{ marginTop: 12 }} onClick={() => clearForm()}>
            Clear Form
          </Button>
        )}
      </Card>

      <Card>
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={8}>
            <Input placeholder="Search" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} allowClear />
          </Col>
          <Col xs={24} md={4}>
            <Select allowClear placeholder="Kind" style={{ width: "100%" }} value={filters.activity_kind}
              options={[{ label: "TSD", value: "TSD" }, { label: "RnD", value: "RnD" }]}
              onChange={(activity_kind) => setFilters((f) => ({ ...f, activity_kind }))}
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              allowClear
              placeholder="Target Date Window"
              style={{ width: "100%" }}
              value={filters.due_window}
              options={DUE_WINDOW_FILTER_OPTIONS.map((option) => ({ label: option.label, value: option.value }))}
              onChange={(due_window) => setFilters((f) => ({ ...f, due_window }))}
            />
          </Col>
        </Row>
        {loading ? <Spin /> : (
          <Table
            rowKey="activity_id"
            dataSource={filtered}
            pagination={{ pageSize: 20 }}
            columns={[
              { title: "Project ID", dataIndex: "project_id" },
              { title: "Kind", dataIndex: "activity_kind" },
              { title: "Department", dataIndex: "Department" },
              { title: "Target Date to Execute", dataIndex: "Target_Date", render: (v) => formatAppDate(v) },
              { title: "Updated", dataIndex: "updated_at", render: (v) => formatAppDate(v) },
              {
                title: "Actions",
                render: (_: unknown, record: SupportActivity) => (
                  meetingViewReadOnly ? (
                    <Button type="link" onClick={() => loadForm(record)}>View</Button>
                  ) : (
                    <Space>
                      <Button type="link" onClick={() => loadForm(record)}>Edit</Button>
                      {canArchive ? (
                        <Button
                          type="link"
                          danger
                          onClick={() => user?.email && archiveSupportActivity(record.activity_id, user.email).then(() => load())}
                        >
                          Archive
                        </Button>
                      ) : null}
                    </Space>
                  )
                ),
              },
            ]}
          />
        )}
      </Card>
    </AppShell>
  );
}
