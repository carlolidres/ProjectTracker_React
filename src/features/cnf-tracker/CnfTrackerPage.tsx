import {
  ClearOutlined,
  PlusOutlined,
  SaveOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Alert, App, Button, Card, Input, Select, Space, Spin, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/app/auth-provider";
import { useMeetingViewReadOnly } from "@/app/meeting-view-provider";
import {
  clearCnfTrackerDraft,
  loadCnfTrackerDraft,
  saveCnfTrackerDraft,
  useDebouncedDraftPersist,
  useFlushOnPageHide,
} from "@/lib/formDraftStorage";
import { AppShell } from "@/components/layout/app-shell";
import { FieldHelpIcon } from "@/components/common/field-help-icon";
import { ProjectIdLink } from "@/components/common/project-id-link";
import { CnfReferencePickerModal } from "@/features/cnf-tracker/CnfReferencePickerModal";
import {
  aggregateCnfTrackerView,
  collectRegisteredCnfReferences,
  matchProjectLinesByCnfReference,
} from "@/lib/cnfTrackerAggregation";
import {
  formatCnfClosureBlockerMessage,
  validateCnfTrackerClosure,
} from "@/lib/cnfClosureValidation";
import { getNextCnfTrackerId } from "@/lib/idGeneration";
import { canEditCnfTracker } from "@/lib/roleAccess";
import { isMissingValue, valueOrNA, cn } from "@/lib/utils";
import { getCnfTrackerById, listActiveCnfTrackerRecords, saveCnfTrackerRecord } from "@/services/cnfTrackerService";
import { listActiveProjects } from "@/services/projectService";
import type { CnfTrackerRecord, CnfTrackerStatus } from "@/types/cnfTracker";
import type { ProjectRow } from "@/types";
import "@/styles/cnf-tracker.css";

const TRACKER_STATUS_OPTIONS: { label: string; value: CnfTrackerStatus }[] = [
  { label: "Open", value: "Open" },
  { label: "Closed", value: "Closed" },
];

interface CnfTrackerFormState {
  cnf_tracker_id: string;
  cnf_reference: string;
  cnf_initiator: string;
  tracker_status: CnfTrackerStatus;
}

function emptyForm(): CnfTrackerFormState {
  return {
    cnf_tracker_id: "N/A",
    cnf_reference: "",
    cnf_initiator: "N/A",
    tracker_status: "Open",
  };
}

function confirmCnfClosure(modal: ReturnType<typeof App.useApp>["modal"], detail: string): Promise<boolean> {
  return new Promise((resolve) => {
    modal.warning({
      title: "Cannot close CNF Tracker",
      width: 560,
      content: <pre className="cnf-tracker-closure-message">{detail}</pre>,
      okText: "Go back and edit",
      onOk: () => resolve(false),
      onCancel: () => resolve(false),
    });
  });
}

function blockViewOnlyInteraction(event: React.SyntheticEvent) {
  event.preventDefault();
  event.stopPropagation();
}

export function CnfTrackerPage() {
  const { modal } = App.useApp();
  const { user, profile } = useAuth();
  const meetingViewReadOnly = useMeetingViewReadOnly();
  const canEdit = canEditCnfTracker(profile?.role);
  const viewOnly = !canEdit || meetingViewReadOnly;
  const [searchParams, setSearchParams] = useSearchParams();
  const trackerIdParam = searchParams.get("id");

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [trackerRecords, setTrackerRecords] = useState<CnfTrackerRecord[]>([]);
  const [form, setForm] = useState<CnfTrackerFormState>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initiatorTouched, setInitiatorTouched] = useState(false);
  const [referencePickerOpen, setReferencePickerOpen] = useState(false);
  const draftFlushEnabledRef = useRef(true);

  const resumeDraftFlush = useCallback(() => {
    draftFlushEnabledRef.current = true;
  }, []);

  const suspendDraftFlush = useCallback(() => {
    draftFlushEnabledRef.current = false;
  }, []);

  const loadProjects = useCallback(async () => {
    return listActiveProjects();
  }, []);

  const loadRecord = useCallback(async (trackerId: string) => {
    const record = await getCnfTrackerById(trackerId);
    if (!record) return null;
    const next: CnfTrackerFormState = {
      cnf_tracker_id: record.cnf_tracker_id,
      cnf_reference: record.cnf_reference,
      cnf_initiator: record.cnf_initiator,
      tracker_status: record.tracker_status === "Closed" ? "Closed" : "Open",
    };
    setForm(next);
    setInitiatorTouched(true);
    return record;
  }, []);

  const prepareNew = useCallback(async () => {
    const nextId = await getNextCnfTrackerId();
    const next = { ...emptyForm(), cnf_tracker_id: nextId };
    setForm(next);
    setInitiatorTouched(false);
    setSearchParams({});
    if (user?.id) clearCnfTrackerDraft(user.id);
    suspendDraftFlush();
  }, [setSearchParams, suspendDraftFlush, user?.id]);

  const persistCnfDraft = useCallback(() => {
    if (!user?.id || loading || !draftFlushEnabledRef.current) return;
    saveCnfTrackerDraft(user.id, {
      form,
      initiatorTouched,
      trackerIdParam,
    });
  }, [form, initiatorTouched, trackerIdParam, user?.id, loading]);

  const shouldFlushCnfDraft = useCallback(() => draftFlushEnabledRef.current, []);

  useDebouncedDraftPersist(persistCnfDraft, Boolean(user?.id && !loading), 400, shouldFlushCnfDraft);
  useFlushOnPageHide(() => {
    if (draftFlushEnabledRef.current) persistCnfDraft();
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [rows, records] = await Promise.all([loadProjects(), listActiveCnfTrackerRecords()]);
        if (cancelled) return;
        setProjects(rows);
        setTrackerRecords(records);

        const draft = user?.id ? loadCnfTrackerDraft(user.id) : null;

        if (trackerIdParam) {
          if (draft?.trackerIdParam === trackerIdParam) {
            setForm(draft.form);
            setInitiatorTouched(draft.initiatorTouched);
            resumeDraftFlush();
          } else {
            const record = await loadRecord(trackerIdParam);
            if (!record && !cancelled) {
              setError(`CNF Tracker record ${trackerIdParam} not found.`);
            }
            resumeDraftFlush();
          }
        } else if (draft) {
          setForm(draft.form);
          setInitiatorTouched(draft.initiatorTouched);
          resumeDraftFlush();
        } else {
          await prepareNew();
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load CNF Tracker");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trackerIdParam, loadProjects, loadRecord, prepareNew, resumeDraftFlush, user?.id]);

  const registeredReferences = useMemo(
    () => collectRegisteredCnfReferences(projects, trackerRecords),
    [projects, trackerRecords],
  );

  const matches = useMemo(
    () => matchProjectLinesByCnfReference(projects, form.cnf_reference),
    [projects, form.cnf_reference],
  );

  const aggregation = useMemo(() => aggregateCnfTrackerView(matches), [matches]);

  useEffect(() => {
    if (initiatorTouched || isMissingValue(form.cnf_reference)) return;
    const owner = aggregation.cnfInitiator;
    if (!isMissingValue(owner) && owner !== "N/A") {
      setForm((current) => ({ ...current, cnf_initiator: owner }));
    }
  }, [aggregation.cnfInitiator, form.cnf_reference, initiatorTouched]);

  const hasReference = !isMissingValue(form.cnf_reference);
  const referenceTitle = hasReference ? form.cnf_reference.trim() : "Enter CNF Reference";

  function applyCnfReference(cnfReference: string) {
    resumeDraftFlush();
    setInitiatorTouched(false);
    setForm((current) => ({ ...current, cnf_reference: cnfReference }));
    setReferencePickerOpen(false);
  }

  async function validateClose(status: CnfTrackerStatus): Promise<boolean> {
    if (status !== "Closed") return true;
    const result = validateCnfTrackerClosure(projects, form.cnf_reference);
    if (result.canClose) return true;
    await confirmCnfClosure(modal, formatCnfClosureBlockerMessage(result));
    return false;
  }

  async function handleStatusChange(status: CnfTrackerStatus) {
    const allowed = await validateClose(status);
    if (!allowed) return;
    resumeDraftFlush();
    setForm((current) => ({ ...current, tracker_status: status }));
  }

  async function handleSave() {
    if (viewOnly || !user?.email) return;
    if (isMissingValue(form.cnf_reference)) {
      message.warning("CNF Reference is required.");
      return;
    }

    const allowed = await validateClose(form.tracker_status);
    if (!allowed) return;

    setSaving(true);
    setError(null);
    try {
      const saved = await saveCnfTrackerRecord(form, user.email);
      message.success(`CNF Tracker ${saved.cnf_tracker_id} saved`);
      setTrackerRecords((current) => {
        const without = current.filter((record) => record.cnf_tracker_id !== saved.cnf_tracker_id);
        return [saved, ...without];
      });
      if (user?.id) clearCnfTrackerDraft(user.id);
      suspendDraftFlush();
      if (trackerIdParam !== saved.cnf_tracker_id) {
        setSearchParams({ id: saved.cnf_tracker_id });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save CNF Tracker record");
    } finally {
      setSaving(false);
    }
  }

  function handleClear() {
    if (viewOnly) return;
    modal.confirm({
      title: "Clear CNF Tracker form?",
      content: "This will clear all unsaved inputs.",
      okText: "Clear",
      onOk: () => void prepareNew(),
    });
  }

  const poTableColumns: ColumnsType<(typeof aggregation.poLines)[number]> = [
    {
      title: "Product Name",
      dataIndex: "productName",
      key: "productName",
      fixed: "left",
      width: 180,
      render: (value: string) => valueOrNA(value),
    },
    {
      title: "PO Control No.",
      dataIndex: "poControlNo",
      key: "poControlNo",
      fixed: "left",
      width: 150,
      render: (value: string, row) => (
        <ProjectIdLink projectId={row.projectId} label={valueOrNA(value)} />
      ),
    },
    {
      title: "Protocol No.",
      dataIndex: "protocolNo",
      key: "protocolNo",
      width: 140,
      render: (value: string) => valueOrNA(value),
    },
    {
      title: "Validation Report No.",
      dataIndex: "validationReportNo",
      key: "validationReportNo",
      width: 180,
      render: (value: string) => valueOrNA(value),
    },
    {
      title: "Val Activity",
      dataIndex: "valActivity",
      key: "valActivity",
      width: 120,
      render: (value: string) => valueOrNA(value),
    },
    {
      title: "Val Stability",
      dataIndex: "valStability",
      key: "valStability",
      width: 120,
      render: (value: string) => valueOrNA(value),
    },
    {
      title: "Val Batch Seq No.",
      dataIndex: "valBatchSeqNo",
      key: "valBatchSeqNo",
      width: 140,
      render: (value: string) => valueOrNA(value),
    },
  ];

  if (loading) {
    return (
      <AppShell>
        <div className="page-loading"><Spin size="large" /></div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}
      {!canEdit && !meetingViewReadOnly ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="View only"
          description="Admin, QA, and VAL can update CNF Tracker records. Fields look active but cannot be changed in your role."
        />
      ) : null}

      <div className="cnf-tracker-panel project-panel">
        <div className="cnf-tracker-sticky-header project-sticky-header">
          <div className="cnf-tracker-sticky-header-text project-sticky-header-text">
            <h2>{referenceTitle}</h2>
            <p>{hasReference ? `Initiator: ${valueOrNA(form.cnf_initiator)}` : "CNF Reference drives aggregated project data"}</p>
          </div>
          <div className="cnf-tracker-sticky-header-actions project-sticky-header-actions">
            <Button
              className="project-sticky-action-btn"
              title="New CNF Tracker"
              icon={<PlusOutlined />}
              disabled={viewOnly}
              onClick={() => void prepareNew()}
            />
            <Button
              className="project-sticky-action-btn"
              title="Clear"
              icon={<ClearOutlined />}
              disabled={viewOnly}
              onClick={handleClear}
            />
            <Button
              className="project-sticky-action-btn"
              type="primary"
              title="Save CNF Tracker"
              icon={<SaveOutlined />}
              loading={saving}
              disabled={viewOnly}
              onClick={() => void handleSave()}
            />
          </div>
        </div>

        <div className="cnf-tracker-form-body project-form-body">
          <div className="cnf-tracker-header-section project-header-section">
            <div className="cnf-tracker-form-grid project-form-grid">
              <div className={cn("cnf-tracker-field project-field", viewOnly && "project-field-view-only")}>
                <label className="cnf-tracker-field-label project-field-label" htmlFor="cnf-tracker-reference">
                  <FieldHelpIcon title="Alphanumeric CNF reference used to aggregate matching project PO lines." />
                  <span className="project-field-label-text">CNF Reference</span>
                </label>
                <Input
                  id="cnf-tracker-reference"
                  value={form.cnf_reference}
                  readOnly={viewOnly}
                  suffix={
                    viewOnly ? null : (
                      <Button
                        type="text"
                        size="small"
                        className="cnf-reference-picker-trigger"
                        icon={<SearchOutlined />}
                        aria-label="Browse registered CNF references"
                        onClick={() => setReferencePickerOpen(true)}
                      />
                    )
                  }
                  onChange={(event) => {
                    if (viewOnly) return;
                    resumeDraftFlush();
                    setForm((current) => ({ ...current, cnf_reference: event.target.value }));
                  }}
                />
              </div>
              <div className={cn("cnf-tracker-field project-field", viewOnly && "project-field-view-only")}>
                <label className="cnf-tracker-field-label project-field-label" htmlFor="cnf-tracker-initiator">
                  <FieldHelpIcon title="Defaults from the first matching project owner when the reference loads." />
                  <span className="project-field-label-text">CNF Initiator</span>
                </label>
                <Input
                  id="cnf-tracker-initiator"
                  value={form.cnf_initiator}
                  readOnly={viewOnly}
                  onChange={(event) => {
                    if (viewOnly) return;
                    resumeDraftFlush();
                    setInitiatorTouched(true);
                    setForm((current) => ({ ...current, cnf_initiator: event.target.value }));
                  }}
                />
              </div>
              <div className={cn("cnf-tracker-field project-field", viewOnly && "project-field-view-only")}>
                <label className="cnf-tracker-field-label project-field-label" htmlFor="cnf-tracker-status">
                  <FieldHelpIcon title="Closed only when CNF closure validation rules are met." />
                  <span className="project-field-label-text">Tracker Status</span>
                </label>
                <Space wrap>
                  <Select
                    id="cnf-tracker-status"
                    className={cn(viewOnly && "project-field-view-only-select")}
                    style={{ minWidth: 160 }}
                    value={form.tracker_status}
                    options={TRACKER_STATUS_OPTIONS}
                    open={viewOnly ? false : undefined}
                    showSearch={!viewOnly}
                    tabIndex={viewOnly ? -1 : undefined}
                    onMouseDown={viewOnly ? blockViewOnlyInteraction : undefined}
                    onClick={viewOnly ? blockViewOnlyInteraction : undefined}
                    onKeyDown={viewOnly ? blockViewOnlyInteraction : undefined}
                    onChange={(value) => {
                      if (viewOnly) return;
                      void handleStatusChange(value);
                    }}
                  />
                  <Tag color={form.tracker_status === "Closed" ? "green" : "blue"} className="cnf-tracker-status-badge">
                    CNF Status: {form.tracker_status}
                  </Tag>
                </Space>
              </div>
            </div>
          </div>

          {hasReference ? (
            <>
              <Card title="CNF Details" className="cnf-tracker-section-card">
                <div className="cnf-tracker-form-grid project-form-grid">
                  <div className="cnf-tracker-field project-field">
                    <label className="cnf-tracker-field-label project-field-label">QRMR No.</label>
                    <div className="cnf-tracker-readonly-block">{valueOrNA(aggregation.qrmrRefNo)}</div>
                  </div>
                  <div className="cnf-tracker-field project-field">
                    <label className="cnf-tracker-field-label project-field-label">Unique Batch No.</label>
                    <div className="cnf-tracker-readonly-block">{valueOrNA(aggregation.uniqueBatch)}</div>
                  </div>
                  <div className="cnf-tracker-field project-field cnf-tracker-field-span-3">
                    <label className="cnf-tracker-field-label project-field-label">Description of Change</label>
                    <div className="cnf-tracker-readonly-block">{valueOrNA(aggregation.changeDescription)}</div>
                  </div>
                </div>
              </Card>

              <Card
                title="List of POs where CNF was implemented"
                className="cnf-tracker-section-card cnf-tracker-po-table"
              >
                {aggregation.poLines.length ? (
                  <div
                    className="cnf-tracker-po-table-scroll"
                    tabIndex={0}
                    role="region"
                    aria-label="PO implementation table. Use arrow keys to scroll when focused."
                  >
                    <Table
                      size="small"
                      rowKey={(row) => `${row.projectId}-${row.poControlNo}`}
                      pagination={false}
                      dataSource={aggregation.poLines}
                      columns={poTableColumns}
                      scroll={{ x: 1100, y: 320 }}
                    />
                  </div>
                ) : (
                  <Typography.Text type="secondary">
                    No active project PO lines match this CNF reference yet.
                  </Typography.Text>
                )}
              </Card>
            </>
          ) : (
            <Alert
              type="info"
              showIcon
              message="Enter a CNF Reference to load aggregated project data."
              style={{ marginTop: 8 }}
            />
          )}
        </div>
      </div>

      {!viewOnly ? (
        <CnfReferencePickerModal
          open={referencePickerOpen}
          references={registeredReferences}
          onCancel={() => setReferencePickerOpen(false)}
          onLoad={applyCnfReference}
        />
      ) : null}
    </AppShell>
  );
}

