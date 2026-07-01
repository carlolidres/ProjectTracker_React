import { App, message } from "antd";
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
import { ProjectIdLink } from "@/components/common/project-id-link";
import { CnfReferencePickerModal } from "@/features/cnf-tracker/CnfReferencePickerModal";
import { CnfTrackerDetailModal } from "@/features/cnf-tracker/CnfTrackerDetailModal";
import { CnfTrackerListTable } from "@/features/cnf-tracker/CnfTrackerListTable";import {
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
import { isMissingValue, valueOrNA } from "@/lib/utils";
import { getCnfTrackerById, listActiveCnfTrackerRecords, saveCnfTrackerRecord } from "@/services/cnfTrackerService";
import { listActiveProjects } from "@/services/projectService";
import { buildCnfTrackerListRows } from "@/lib/cnfTrackerList";
import type { CnfTrackerListRow } from "@/lib/cnfTrackerList";
import { subscribeProjectDataChanged } from "@/lib/projectDataEvents";
import type { CnfTrackerRecord, CnfTrackerStatus } from "@/types/cnfTracker";
import type { ProjectRow } from "@/types";
import "@/styles/cnf-tracker.css";

interface CnfTrackerFormState {  cnf_tracker_id: string;
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
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [initiatorTouched, setInitiatorTouched] = useState(false);
  const [referencePickerOpen, setReferencePickerOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
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

  const loadData = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const [rows, records] = await Promise.all([loadProjects(), listActiveCnfTrackerRecords()]);
      setProjects(rows);
      setTrackerRecords(records);
      return { rows, records };
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load CNF Tracker list");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadProjects]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFormError(null);
      try {
        await loadData();
        if (cancelled) return;

        const draft = user?.id ? loadCnfTrackerDraft(user.id) : null;

        if (trackerIdParam) {
          if (draft?.trackerIdParam === trackerIdParam) {
            setForm(draft.form);
            setInitiatorTouched(draft.initiatorTouched);
            resumeDraftFlush();
          } else {
            const record = await loadRecord(trackerIdParam);
            if (!record && !cancelled) {
              setFormError(`CNF Tracker record ${trackerIdParam} not found.`);
            }
            resumeDraftFlush();
          }
          if (!cancelled) setSearchParams({});
        } else if (draft) {
          setForm(draft.form);
          setInitiatorTouched(draft.initiatorTouched);
          resumeDraftFlush();
        } else {
          resumeDraftFlush();
        }
      } catch {
        // listError already set in loadData
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trackerIdParam, loadData, loadRecord, prepareNew, resumeDraftFlush, user?.id]);

  const listRows = useMemo(
    () => buildCnfTrackerListRows(projects, trackerRecords),
    [projects, trackerRecords],
  );

  useEffect(() => subscribeProjectDataChanged(() => {
    void loadData();
  }), [loadData]);

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

  function handleLoadFromList(row: CnfTrackerListRow) {
    resumeDraftFlush();
    setInitiatorTouched(false);
    setFormError(null);
    if (row.trackerId) {
      setSearchParams({ id: row.trackerId });
      void loadRecord(row.trackerId);
    } else {
      setSearchParams({});
      setForm((current) => ({ ...current, cnf_reference: row.cnfNo }));
    }
    setDetailModalOpen(true);
  }

  async function handleNew() {
    await prepareNew();
    setFormError(null);
    setDetailModalOpen(true);
  }

  function handleCloseDetailModal() {
    setDetailModalOpen(false);
    setSearchParams({});
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
    setFormError(null);
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
      setFormError(err instanceof Error ? err.message : "Failed to save CNF Tracker record");
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

  if (loading && !projects.length && !trackerRecords.length) {
    return (
      <AppShell>
        <div className="cnf-tracker-page">
          <CnfTrackerListTable
            rows={[]}
            loading
            error={listError}
            onRetry={() => void loadData()}
            onLoad={handleLoadFromList}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="cnf-tracker-page">
        <CnfTrackerListTable
          rows={listRows}
          loading={loading}
          error={listError}
          onRetry={() => void loadData()}
          onLoad={handleLoadFromList}
        />

        <CnfTrackerDetailModal
          open={detailModalOpen}
          form={form}
          aggregation={aggregation}
          poTableColumns={poTableColumns}
          viewOnly={viewOnly}
          canEdit={canEdit}
          meetingViewReadOnly={meetingViewReadOnly}
          saving={saving}
          formError={formError}
          onClose={handleCloseDetailModal}
          onNew={() => void handleNew()}
          onClear={handleClear}
          onSave={() => void handleSave()}
          onReferenceChange={(value) => {
            resumeDraftFlush();
            setForm((current) => ({ ...current, cnf_reference: value }));
          }}
          onInitiatorChange={(value) => {
            resumeDraftFlush();
            setInitiatorTouched(true);
            setForm((current) => ({ ...current, cnf_initiator: value }));
          }}
          onStatusChange={(status) => void handleStatusChange(status)}
          onOpenReferencePicker={() => setReferencePickerOpen(true)}
          blockViewOnlyInteraction={blockViewOnlyInteraction}
        />

        {!viewOnly ? (
          <CnfReferencePickerModal
            open={referencePickerOpen}
            references={registeredReferences}
            onCancel={() => setReferencePickerOpen(false)}
            onLoad={applyCnfReference}
          />
        ) : null}
      </div>
    </AppShell>
  );
}

