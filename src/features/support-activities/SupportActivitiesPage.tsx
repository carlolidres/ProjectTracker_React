import { Alert, Button, Card, Col, Input, Row, Select, Space, Spin, Table, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppDatePicker } from "@/components/common/app-date-picker";
import { CreatableNaSelect } from "@/components/common/creatable-na-select";
import { LucideIcon } from "@/components/common/lucide-icon";
import { NaClearingInput, NaClearingSelect } from "@/components/common/na-clearing-input";
import { useAuth } from "@/app/auth-provider";
import { useDateAdjustment } from "@/app/date-adjustment-provider";
import { useMeetingViewReadOnly } from "@/app/meeting-view-provider";
import { useMenuPermissions } from "@/app/menu-permission-provider";
import { useRegistry } from "@/app/registry-provider";
import { DashboardFilterBanner } from "@/components/common/dashboard-filter-banner";
import { AppShell } from "@/components/layout/app-shell";
import { CnfTrackerSelectModal } from "@/features/cnf-tracker/CnfTrackerSelectModal";
import { ROLE_LABELS } from "@/lib/constants";
import { collectSupportDateChanges } from "@/lib/dateAdjustmentReview";
import { SUPPORT_ACTIVITY_STATUS_OPTIONS, shouldOpenEndorsementTrackerFromSupportStatus } from "@/lib/endorsementSync";
import {
  clearSupportActivityDraft,
  loadSupportActivityDraft,
  saveSupportActivityDraft,
  useFlushOnPageHide,
} from "@/lib/formDraftStorage";
import { DUE_WINDOW_FILTER_OPTIONS } from "@/lib/fgUrgency";
import { formatAppDate } from "@/lib/date";
import {
  clearSupportUrlFilterParams,
  supportFilterBannerLabels,
  supportFiltersFromSearchParams,
} from "@/lib/urlDerivedFilters";
import { canArchiveRecords, canRemoveReusableOptions, isViewerRole } from "@/lib/roleAccess";
import { useDiagLifecycle } from "@/lib/sessionDiagnostics";
import { sanitizeAlphanumericInput, valueOrNA } from "@/lib/utils";
import { exportSupportToExcel } from "@/services/exportService";
import {
  archiveSupportActivity,
  filterSupportRows,
  findNonProcessByCnfTrackerRecordId,
  listActiveSupportActivities,
  saveSupportActivity,
} from "@/services/supportActivityService";
import { listActiveCnfTrackerRecords } from "@/services/cnfTrackerService";
import {
  createReusableOption,
  listReusableOptions,
  softRemoveReusableOption,
} from "@/services/reusableOptionService";
import type { ActivityKind, SupportActivity, SupportActivityFilters } from "@/types";
import type { CnfTrackerRecord } from "@/types/cnfTracker";
import type { ReusableOption } from "@/types/endorsementTracker";
import "@/styles/support-activities.css";

function SupportFormSection({
  id,
  icon,
  title,
  subtitle,
  children,
}: {
  id: string;
  icon: "layers" | "clipboard-list" | "calendar" | "file-text";
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const titleId = `${id}-title`;
  return (
    <section className="support-form-section" aria-labelledby={titleId}>
      <header className="support-form-section-header">
        <span className="support-form-section-icon" aria-hidden>
          <LucideIcon name={icon} size={16} />
        </span>
        <div>
          <h3 className="support-form-section-title" id={titleId}>
            {title}
          </h3>
          <p className="support-form-section-sub">{subtitle}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function SupportFormField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="support-form-field">
      <label className="support-form-field-label" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}

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
  status: "",
  status_date: "",
  cnf_tracker_record_id: null,
  cnf_link_state: "unset",
  cnf_number_display: "",
  non_process_description: "",
  activity_type: "",
  type_of_validation: "",
  protocol_number: "",
  protocol_status: "",
  report_number: "",
  report_status: "",
  endorsement_number: "",
  endorsement_status: "",
  endorsement_tracker_record_id: null,
});

type OptionCategory =
  | "type_of_validation"
  | "protocol_status"
  | "report_status"
  | "endorsement_status";

export function SupportActivitiesPage() {
  useDiagLifecycle("SupportActivitiesPage");
  const [searchParams, setSearchParams] = useSearchParams();
  const activityIdParam = searchParams.get("activityId");
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { registry } = useRegistry();
  const { promptBatchDateAdjustment } = useDateAdjustment();
  const meetingViewReadOnly = useMeetingViewReadOnly();
  const { can: canMenuAction } = useMenuPermissions();
  const canCreateSupport = canMenuAction("support_activities", "create");
  const canEditSupport = canMenuAction("support_activities", "edit");
  const canExportSupport = canMenuAction("support_activities", "export");
  const canArchive = canArchiveRecords(profile?.role);
  const canManageOptions = canRemoveReusableOptions(profile?.role);
  const [rows, setRows] = useState<SupportActivity[]>([]);
  const [filters, setFilters] = useState<SupportActivityFilters>({ activity_kind: "TSD" });
  const [form, setForm] = useState<Partial<SupportActivity>>(emptyActivity());
  const baselineFormRef = useRef<Partial<SupportActivity>>(emptyActivity());
  const isNewSupport = !form.activity_id || form.activity_id === "N/A";
  const readOnly =
    meetingViewReadOnly
    || isViewerRole(profile?.role)
    || (isNewSupport ? !canCreateSupport : !canEditSupport);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cnfOptions, setCnfOptions] = useState<CnfTrackerRecord[]>([]);
  const [cnfPickerOpen, setCnfPickerOpen] = useState(false);
  const [optionMaps, setOptionMaps] = useState<Record<OptionCategory, ReusableOption[]>>({
    type_of_validation: [],
    protocol_status: [],
    report_status: [],
    endorsement_status: [],
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [activities, cnfs, typeOpts, protocolOpts, reportOpts, endorsementOpts] = await Promise.all([
        listActiveSupportActivities(),
        listActiveCnfTrackerRecords(),
        listReusableOptions("type_of_validation").catch(() => [] as ReusableOption[]),
        listReusableOptions("protocol_status").catch(() => [] as ReusableOption[]),
        listReusableOptions("report_status").catch(() => [] as ReusableOption[]),
        listReusableOptions("endorsement_status").catch(() => [] as ReusableOption[]),
      ]);
      setRows(activities);
      setCnfOptions(cnfs);
      setOptionMaps({
        type_of_validation: typeOpts,
        protocol_status: protocolOpts,
        report_status: reportOpts,
        endorsement_status: endorsementOpts,
      });
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
    if (!user?.id || activityIdParam) return;
    const draft = loadSupportActivityDraft(user.id);
    if (draft) {
      baselineFormRef.current = structuredClone(draft);
      setForm(draft);
    }
  }, [user?.id, activityIdParam]);

  useEffect(() => {
    if (!user?.id) return;
    const timer = window.setTimeout(() => {
      persistSupportDraft();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [persistSupportDraft, user?.id]);

  useFlushOnPageHide(persistSupportDraft);

  useEffect(() => {
    setFilters((current) => supportFiltersFromSearchParams(searchParams, current));
  }, [searchParams]);

  // Form Kind (TSD / RnD / Non-Process) drives the list filter automatically.
  useEffect(() => {
    const kind = String(form.activity_kind ?? "").trim();
    if (!kind || kind === "N/A") return;
    setFilters((current) =>
      current.activity_kind === kind ? current : { ...current, activity_kind: kind },
    );
  }, [form.activity_kind]);

  useEffect(() => {
    if (!activityIdParam || loading) return;
    const match = rows.find((row) => row.activity_id === activityIdParam);
    if (match) {
      const next = { ...match };
      baselineFormRef.current = structuredClone(next);
      setForm(next);
      if (user?.id) saveSupportActivityDraft(user.id, next);
      setSearchParams(
        (current) => {
          const nextParams = new URLSearchParams(current);
          nextParams.delete("activityId");
          return nextParams;
        },
        { replace: true },
      );
      return;
    }
    if (rows.length) {
      setError(`Support activity ${activityIdParam} not found.`);
      setSearchParams(
        (current) => {
          const nextParams = new URLSearchParams(current);
          nextParams.delete("activityId");
          return nextParams;
        },
        { replace: true },
      );
    }
  }, [activityIdParam, loading, rows, setSearchParams, user?.id]);

  const filtered = useMemo(() => {
    const matched = filterSupportRows(rows, filters);
    const kind = filters.activity_kind;
    if (!kind) return matched;
    // Keep selected Kind first, then newest updates.
    return [...matched].sort((a, b) => {
      const kindDelta =
        (valueOrNA(a.activity_kind) === kind ? 0 : 1)
        - (valueOrNA(b.activity_kind) === kind ? 0 : 1);
      if (kindDelta !== 0) return kindDelta;
      return String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? ""));
    });
  }, [rows, filters]);
  const isTsd = form.activity_kind === "TSD";
  const isRnd = form.activity_kind === "RnD";
  const isNonProcess = form.activity_kind === "Non-Process";
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

  async function handleCreateOption(category: OptionCategory, value: string) {
    if (!user?.email) return;
    const created = await createReusableOption(category, value, user.email);
    setOptionMaps((current) => ({
      ...current,
      [category]: [...current[category].filter((item) => item.option_id !== created.option_id), created],
    }));
  }

  async function handleRemoveOption(category: OptionCategory, option: { id?: string; value: string }) {
    if (!user?.email || !option.id) return;
    await softRemoveReusableOption(option.id, user.email);
    setOptionMaps((current) => ({
      ...current,
      [category]: current[category].filter((item) => item.option_id !== option.id),
    }));
  }

  async function handleSave() {
    if (!user?.email || readOnly || saving) return;
    setSaving(true);
    setError(null);
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

      const result = await saveSupportActivity(form, user.email, {
        dateAdjustmentsConfirmed: dateChanges.length > 0,
      });
      message.success("Support activity saved");
      const savedActivityId = result.activity_id || form.activity_id;
      const endorsementStatus = form.endorsement_status;
      const isNonProcessKind = form.activity_kind === "Non-Process";
      clearForm();
      await load();
      if (result.pending_cnf_reference) {
        const params = new URLSearchParams({
          new: "1",
          ref: result.pending_cnf_reference,
        });
        if (savedActivityId) params.set("supportActivityId", savedActivityId);
        navigate(`/cnf-tracker?${params.toString()}`);
      } else if (result.endorsement_tracker_id) {
        navigate(`/endorsement-tracker?id=${encodeURIComponent(result.endorsement_tracker_id)}`);
      } else if (
        isNonProcessKind
        && savedActivityId
        && shouldOpenEndorsementTrackerFromSupportStatus(endorsementStatus)
      ) {
        const params = new URLSearchParams({
          new: "1",
          supportActivityId: savedActivityId,
        });
        navigate(`/endorsement-tracker?${params.toString()}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const cnfDisplayValue = useMemo(() => {
    if (form.cnf_link_state === "not_applicable") return "Not Applicable";
    if (form.cnf_tracker_record_id) {
      const match = cnfOptions.find((item) => item.record_id === form.cnf_tracker_record_id);
      if (match) return `${match.cnf_reference} (${match.cnf_tracker_id})`;
    }
    const display = String(form.cnf_number_display ?? "").trim();
    return display && display.toUpperCase() !== "N/A" ? display : "";
  }, [cnfOptions, form.cnf_link_state, form.cnf_number_display, form.cnf_tracker_record_id]);

  async function applySelectedCnf(record: CnfTrackerRecord) {
    let titleFromCnf = "";
    let typeFromCnf = "";
    if (record.record_id) {
      try {
        const linked = await findNonProcessByCnfTrackerRecordId(record.record_id);
        if (linked) {
          titleFromCnf = String(linked.non_process_description ?? "").slice(0, 50);
          typeFromCnf = String(linked.type_of_validation || linked.activity_type || "");
        }
      } catch {
        // keep local title / type of validation
      }
    }
    setForm((f) => ({
      ...f,
      cnf_link_state: "linked",
      cnf_tracker_record_id: record.record_id ?? null,
      cnf_number_display: record.cnf_reference || "",
      non_process_description: titleFromCnf || f.non_process_description || "",
      type_of_validation: typeFromCnf || f.type_of_validation || "",
      activity_type: typeFromCnf || f.activity_type || "",
    }));
    setCnfPickerOpen(false);
    message.success(`Linked CNF ${valueOrNA(record.cnf_reference)}`);
  }

  function applyCnfNotApplicable() {
    setForm((f) => ({
      ...f,
      cnf_link_state: "not_applicable",
      cnf_tracker_record_id: null,
      cnf_number_display: "Not Applicable",
    }));
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <Typography.Title level={3}>Support Activities</Typography.Title>
        </div>
        <Space>
          <Button icon={<LucideIcon name="refresh-cw" />} onClick={() => void load()} loading={loading}>
            Refresh
          </Button>
          {canExportSupport ? (
            <Button
              icon={<LucideIcon name="download" />}
              onClick={() => exportSupportToExcel(filtered)}
              disabled={!filtered.length}
            >
              Export Data to Excel
            </Button>
          ) : null}
        </Space>
      </div>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

      <DashboardFilterBanner
        labels={supportFilterBannerLabels(filters)}
        onClear={() => {
          setSearchParams(clearSupportUrlFilterParams(searchParams), { replace: true });
          setFilters((current) => {
            const next = { ...current };
            delete next.due_window;
            delete next.status;
            delete next.sort;
            delete next.order;
            return next;
          });
        }}
      />

      <Card
        className="support-activity-form-card"
        title={readOnly ? "Activity Details (read-only)" : "Add / Edit Activity"}
        extra={
          readOnly ? null : (
            <Space className="support-form-actions" wrap>
              <Button icon={<LucideIcon name="eraser" />} onClick={() => clearForm()}>
                Clear Form
              </Button>
              <Button
                type="primary"
                icon={<LucideIcon name="save" />}
                loading={saving}
                disabled={saving}
                onClick={() => void handleSave()}
              >
                Save
              </Button>
            </Space>
          )
        }
      >
        <div className="support-form" role="form" aria-label={readOnly ? "Activity details" : "Add or edit activity"}>
          <SupportFormSection
            id="support-identity"
            icon="layers"
            title="Identity"
            subtitle="Kind, title, and validation type for this activity."
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <SupportFormField id="support-activity-kind" label="Kind">
                  <Select
                    id="support-activity-kind"
                    style={{ width: "100%" }}
                    disabled={readOnly}
                    value={form.activity_kind as ActivityKind | undefined}
                    options={[
                      { label: "TSD", value: "TSD" },
                      { label: "RnD", value: "RnD" },
                      { label: "Non-Process", value: "Non-Process" },
                    ]}
                    onChange={(activity_kind) => {
                      const nextKind = activity_kind as ActivityKind;
                      setForm((f) => ({ ...f, activity_kind: nextKind }));
                      setFilters((f) => ({ ...f, activity_kind: nextKind }));
                    }}
                  />
                </SupportFormField>
              </Col>
              <Col xs={24} sm={12} md={isNonProcess ? 9 : 18}>
                <SupportFormField id="support-title-activity-name" label="Title / Activity Name">
                  <NaClearingInput
                    id="support-title-activity-name"
                    value={form.non_process_description ?? ""}
                    readOnly={readOnly}
                    sanitize={(value) => sanitizeAlphanumericInput(value).slice(0, 50)}
                    onChange={(non_process_description) => setForm((f) => ({ ...f, non_process_description }))}
                  />
                </SupportFormField>
              </Col>
              {isNonProcess ? (
                <Col xs={24} sm={12} md={9}>
                  <SupportFormField id="support-type-validation" label="Type of Validation">
                    <CreatableNaSelect
                      id="support-type-validation"
                      value={form.type_of_validation ?? ""}
                      readOnly={readOnly}
                      canManageOptions={canManageOptions}
                      options={optionMaps.type_of_validation.map((item) => ({
                        id: item.option_id,
                        value: item.option_value,
                      }))}
                      onChange={(type_of_validation) => setForm((f) => ({ ...f, type_of_validation }))}
                      onCreateOption={(value) => handleCreateOption("type_of_validation", value)}
                      onRemoveOption={(option) => handleRemoveOption("type_of_validation", option)}
                    />
                  </SupportFormField>
                </Col>
              ) : null}
            </Row>
          </SupportFormSection>

          <SupportFormSection
            id="support-status-ownership"
            icon="clipboard-list"
            title="Status & ownership"
            subtitle="Current status, ownership, and kind-specific details."
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <SupportFormField id="support-status" label="Status">
                  <NaClearingSelect
                    id="support-status"
                    placeholder="Status"
                    readOnly={readOnly}
                    value={form.status ?? ""}
                    options={SUPPORT_ACTIVITY_STATUS_OPTIONS.map((value) => ({ label: value, value }))}
                    onChange={(status) => setForm((f) => ({ ...f, status }))}
                  />
                </SupportFormField>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <SupportFormField id="support-status-date" label="Status Date">
                  <AppDatePicker
                    id="support-status-date"
                    value={form.status_date ?? ""}
                    readOnly={readOnly}
                    onChange={(status_date) => setForm((current) => ({ ...current, status_date }))}
                  />
                </SupportFormField>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <SupportFormField id="support-department" label="Department">
                  <NaClearingSelect
                    id="support-department"
                    placeholder="Department"
                    readOnly={readOnly}
                    value={form.Department ?? ""}
                    options={(registry.department ?? []).map((v) => ({ label: v, value: v }))}
                    onChange={(Department) => setForm((f) => ({ ...f, Department }))}
                  />
                </SupportFormField>
              </Col>
              {(isTsd || isNonProcess) ? (
                <Col xs={24} sm={12} md={6}>
                  <SupportFormField id="support-line" label="Line or Room">
                    <NaClearingInput
                      id="support-line"
                      placeholder="Line or Room"
                      value={form.Line ?? ""}
                      readOnly={readOnly}
                      onChange={(Line) => setForm((f) => ({ ...f, Line }))}
                    />
                  </SupportFormField>
                </Col>
              ) : null}
              {(isTsd || isNonProcess) ? (
                <Col xs={24} sm={12} md={6}>
                  <SupportFormField id="support-material" label="Material">
                    <NaClearingInput
                      id="support-material"
                      placeholder="Material"
                      value={form.Material ?? ""}
                      readOnly={readOnly}
                      onChange={(Material) => setForm((f) => ({ ...f, Material }))}
                    />
                  </SupportFormField>
                </Col>
              ) : null}
              {isTsd ? (
                <>
                  <Col xs={24} sm={12} md={6}>
                    <SupportFormField id="support-bulk" label="Bulk">
                      <NaClearingInput
                        id="support-bulk"
                        placeholder="Bulk"
                        value={form.Bulk ?? ""}
                        readOnly={readOnly}
                        onChange={(Bulk) => setForm((f) => ({ ...f, Bulk }))}
                      />
                    </SupportFormField>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <SupportFormField id="support-product-user" label="Product User">
                      <NaClearingInput
                        id="support-product-user"
                        placeholder="Product User"
                        value={form.Product_User ?? ""}
                        readOnly={readOnly}
                        onChange={(Product_User) => setForm((f) => ({ ...f, Product_User }))}
                      />
                    </SupportFormField>
                  </Col>
                </>
              ) : null}
              {isRnd ? (
                <>
                  <Col xs={24} sm={12} md={6}>
                    <SupportFormField id="support-principal" label="Principal">
                      <NaClearingInput
                        id="support-principal"
                        placeholder="Principal"
                        value={form.Principal ?? ""}
                        readOnly={readOnly}
                        onChange={(Principal) => setForm((f) => ({ ...f, Principal }))}
                      />
                    </SupportFormField>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <SupportFormField id="support-product" label="Product">
                      <NaClearingInput
                        id="support-product"
                        placeholder="Product"
                        value={form.Product ?? ""}
                        readOnly={readOnly}
                        onChange={(Product) => setForm((f) => ({ ...f, Product }))}
                      />
                    </SupportFormField>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <SupportFormField id="support-rnd-line" label="Line">
                      <NaClearingInput
                        id="support-rnd-line"
                        placeholder="Line"
                        value={form.Line ?? ""}
                        readOnly={readOnly}
                        onChange={(Line) => setForm((f) => ({ ...f, Line }))}
                      />
                    </SupportFormField>
                  </Col>
                </>
              ) : null}
            </Row>
          </SupportFormSection>

          <SupportFormSection
            id="support-schedule"
            icon="calendar"
            title="Schedule"
            subtitle="Target execution and planning dates."
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <SupportFormField id="support-target-date" label="Target Date to Execute">
                  <AppDatePicker
                    id="support-target-date"
                    value={form.Target_Date ?? ""}
                    readOnly={readOnly}
                    onChange={(Target_Date) => setForm((current) => ({ ...current, Target_Date }))}
                  />
                </SupportFormField>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <SupportFormField id="support-planning-schedule" label="Planning Schedule">
                  <AppDatePicker
                    id="support-planning-schedule"
                    value={form.Planning_Schedule ?? ""}
                    readOnly={readOnly}
                    onChange={(Planning_Schedule) => setForm((current) => ({ ...current, Planning_Schedule }))}
                  />
                </SupportFormField>
              </Col>
            </Row>
          </SupportFormSection>

          {isNonProcess ? (
            <SupportFormSection
              id="support-documents"
              icon="file-text"
              title="Documents & links"
              subtitle="CNF link, protocol, report, and endorsement details."
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <SupportFormField id="support-cnf-number" label="CNF Number">
                    <Space.Compact style={{ width: "100%" }}>
                      <Input
                        id="support-cnf-number"
                        readOnly
                        value={cnfDisplayValue}
                        placeholder="Select from CNF Tracker"
                        style={{ width: "100%" }}
                      />
                      <Button
                        icon={<LucideIcon name="search" />}
                        disabled={readOnly}
                        onClick={() => setCnfPickerOpen(true)}
                      >
                        Select
                      </Button>
                    </Space.Compact>
                    <div className="support-form-cnf-actions">
                      <Button
                        type="link"
                        size="small"
                        style={{ paddingInline: 0 }}
                        disabled={readOnly}
                        onClick={applyCnfNotApplicable}
                      >
                        Not Applicable
                      </Button>
                    </div>
                  </SupportFormField>
                </Col>
                <Col xs={24} md={8}>
                  <SupportFormField id="support-protocol-number" label="Protocol Number">
                    <NaClearingInput
                      id="support-protocol-number"
                      value={form.protocol_number ?? ""}
                      readOnly={readOnly}
                      sanitize={sanitizeAlphanumericInput}
                      onChange={(protocol_number) => setForm((f) => ({ ...f, protocol_number }))}
                    />
                  </SupportFormField>
                </Col>
                <Col xs={24} md={8}>
                  <SupportFormField id="support-protocol-status" label="Protocol Status">
                    <CreatableNaSelect
                      id="support-protocol-status"
                      value={form.protocol_status ?? ""}
                      readOnly={readOnly}
                      canManageOptions={canManageOptions}
                      options={optionMaps.protocol_status.map((item) => ({
                        id: item.option_id,
                        value: item.option_value,
                      }))}
                      onChange={(protocol_status) => setForm((f) => ({ ...f, protocol_status }))}
                      onCreateOption={(value) => handleCreateOption("protocol_status", value)}
                      onRemoveOption={(option) => handleRemoveOption("protocol_status", option)}
                    />
                  </SupportFormField>
                </Col>
                <Col xs={24} md={8}>
                  <SupportFormField id="support-report-number" label="Report Number">
                    <NaClearingInput
                      id="support-report-number"
                      value={form.report_number ?? ""}
                      readOnly={readOnly}
                      sanitize={sanitizeAlphanumericInput}
                      onChange={(report_number) => setForm((f) => ({ ...f, report_number }))}
                    />
                  </SupportFormField>
                </Col>
                <Col xs={24} md={8}>
                  <SupportFormField id="support-report-status" label="Report Status">
                    <CreatableNaSelect
                      id="support-report-status"
                      value={form.report_status ?? ""}
                      readOnly={readOnly}
                      canManageOptions={canManageOptions}
                      options={optionMaps.report_status.map((item) => ({
                        id: item.option_id,
                        value: item.option_value,
                      }))}
                      onChange={(report_status) => setForm((f) => ({ ...f, report_status }))}
                      onCreateOption={(value) => handleCreateOption("report_status", value)}
                      onRemoveOption={(option) => handleRemoveOption("report_status", option)}
                    />
                  </SupportFormField>
                </Col>
                <Col xs={24} md={8}>
                  <SupportFormField id="support-endorsement-number" label="Endorsement Number">
                    <NaClearingInput
                      id="support-endorsement-number"
                      value={form.endorsement_number ?? ""}
                      readOnly={readOnly}
                      sanitize={sanitizeAlphanumericInput}
                      onChange={(endorsement_number) => setForm((f) => ({ ...f, endorsement_number }))}
                    />
                  </SupportFormField>
                </Col>
                <Col xs={24} md={8}>
                  <SupportFormField id="support-endorsement-status" label="Endorsement Status">
                    <CreatableNaSelect
                      id="support-endorsement-status"
                      value={form.endorsement_status ?? ""}
                      readOnly={readOnly}
                      canManageOptions={canManageOptions}
                      options={optionMaps.endorsement_status.map((item) => ({
                        id: item.option_id,
                        value: item.option_value,
                      }))}
                      onChange={(endorsement_status) => setForm((f) => ({ ...f, endorsement_status }))}
                      onCreateOption={(value) => handleCreateOption("endorsement_status", value)}
                      onRemoveOption={(option) => handleRemoveOption("endorsement_status", option)}
                    />
                  </SupportFormField>
                </Col>
              </Row>
            </SupportFormSection>
          ) : null}
        </div>
      </Card>

      <Card className="support-activity-list-card">
        <Row gutter={[12, 12]} className="support-activity-list-filters">
          <Col xs={24} md={8}>
            <Input
              placeholder="Search"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              allowClear
              prefix={<LucideIcon name="search" size={14} />}
              aria-label="Search activities"
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              placeholder="Kind"
              style={{ width: "100%" }}
              value={filters.activity_kind}
              options={[
                { label: "TSD", value: "TSD" },
                { label: "RnD", value: "RnD" },
                { label: "Non-Process", value: "Non-Process" },
              ]}
              onChange={(activity_kind) => {
                const nextKind = activity_kind as ActivityKind;
                setFilters((f) => ({ ...f, activity_kind: nextKind }));
                setForm((f) => ({ ...f, activity_kind: nextKind }));
              }}
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              allowClear
              placeholder="Status"
              style={{ width: "100%" }}
              value={filters.status}
              options={SUPPORT_ACTIVITY_STATUS_OPTIONS.map((value) => ({ label: value, value }))}
              onChange={(status) => setFilters((f) => ({ ...f, status }))}
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
              {
                title: "Title / Activity Name",
                dataIndex: "non_process_description",
                render: (value: string) => valueOrNA(value),
              },
              { title: "Target Date to Execute", dataIndex: "Target_Date", render: (v) => formatAppDate(v) },
              {
                title: "Planning Schedule",
                dataIndex: "Planning_Schedule",
                render: (v: string) => formatAppDate(v),
              },
              {
                title: "Status",
                dataIndex: "status",
                render: (value: string) => valueOrNA(value),
              },
              {
                title: "Actions",
                render: (_: unknown, record: SupportActivity) => (
                  readOnly ? (
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

      <CnfTrackerSelectModal
        open={cnfPickerOpen}
        records={cnfOptions}
        loading={loading}
        canCreate={!readOnly}
        onCancel={() => setCnfPickerOpen(false)}
        onSelect={applySelectedCnf}
        onNewCnf={() => {
          setCnfPickerOpen(false);
          navigate("/cnf-tracker?new=1");
        }}
      />
    </AppShell>
  );
}
