import { App, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/app/auth-provider";
import { useMeetingViewReadOnly } from "@/app/meeting-view-provider";
import { readReturnToPath } from "@/lib/dashboardReturnTo";
import {
  clearCnfTrackerDraft,
  loadCnfTrackerDraft,
  saveCnfTrackerDraft,
  useDebouncedDraftPersist,
  useFlushOnPageHide,
} from "@/lib/formDraftStorage";
import { AppShell } from "@/components/layout/app-shell";
import { DocumentNumberStatusCell } from "@/components/common/document-number-status-cell";
import { ProjectIdLink } from "@/components/common/project-id-link";
import { useRestorableViewState } from "@/hooks/use-restorable-view-state";
import { CnfReferencePickerModal } from "@/features/cnf-tracker/CnfReferencePickerModal";
import { CnfTrackerDetailModal, type CnfTrackerDetailFormState } from "@/features/cnf-tracker/CnfTrackerDetailModal";
import { CnfTrackerListTable } from "@/features/cnf-tracker/CnfTrackerListTable";
import { normalizeOptionalToNa } from "@/lib/cnfTrackerSync";
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
import { useMenuPermissions } from "@/app/menu-permission-provider";
import { canEditCnfTracker, canRemoveReusableOptions } from "@/lib/roleAccess";
import { isMissingValue, valueOrNA } from "@/lib/utils";
import {
  getCnfTrackerById,
  listActiveCnfTrackerRecords,
  saveCnfTrackerRecord,
} from "@/services/cnfTrackerService";
import { listProjectIdsForTrackerRecord } from "@/services/cnfTrackerLinkService";
import { listActiveProjects } from "@/services/projectService";
import {
  buildSupportTitleLookupByCnfRecordId,
  findNonProcessByCnfTrackerRecordId,
  getSupportActivityById,
  listNonProcessByCnfTrackerRecordId,
  syncNonProcessFieldsFromCnf,
} from "@/services/supportActivityService";
import {
  createReusableOption,
  listReusableOptions,
  softRemoveReusableOption,
} from "@/services/reusableOptionService";
import type { ReusableOption } from "@/types/endorsementTracker";
import { buildCnfTrackerListRows } from "@/lib/cnfTrackerList";
import type { CnfTrackerListRow } from "@/lib/cnfTrackerList";
import { subscribeProjectDataChanged } from "@/lib/projectDataEvents";
import { CnfDuplicateError, type CnfTrackerRecord, type CnfTrackerStatus } from "@/types/cnfTracker";
import type { SupportActivity } from "@/types";
import type { ProjectRow } from "@/types";
import "@/styles/cnf-tracker.css";

function emptyForm(): CnfTrackerDetailFormState {
  return {
    cnf_tracker_id: "N/A",
    cnf_reference: "",
    cnf_initiator: "",
    cnf_details: "",
    product_name: "",
    client_name: "",
    qrmr_no: "",
    unique_batch_no: "",
    change_description: "",
    tracker_status: "Open",
    record_id: "",
    title_activity_name: "",
    activity_type: "",
    details_tab: "process",
  };
}

function editableCnfReference(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text || text.toUpperCase() === "N/A" || text.toUpperCase() === "NA") return "";
  return text;
}

function formFromRecord(record: CnfTrackerRecord): CnfTrackerDetailFormState {
  const classification =
    String(record.cnf_classification ?? "process").trim().toLowerCase() === "non_process"
      ? "non_process"
      : "process";
  return {
    cnf_tracker_id: record.cnf_tracker_id,
    cnf_reference: editableCnfReference(record.cnf_reference),
    cnf_initiator: record.cnf_initiator,
    cnf_details: String(record.cnf_details ?? ""),
    product_name: String(record.product_name ?? ""),
    client_name: String(record.client_name ?? ""),
    qrmr_no: String(record.qrmr_no ?? ""),
    unique_batch_no: String(record.unique_batch_no ?? ""),
    change_description: String(record.change_description ?? ""),
    tracker_status: record.tracker_status === "Closed" ? "Closed" : "Open",
    record_id: record.record_id,
    title_activity_name: "",
    activity_type: "",
    details_tab: classification,
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
  const { can: canMenuAction } = useMenuPermissions();
  const canEdit =
    canEditCnfTracker(profile?.role)
    && (canMenuAction("cnf_tracker", "edit") || canMenuAction("cnf_tracker", "create"));
  const canManageOptions = canRemoveReusableOptions(profile?.role);
  const viewOnly = !canEdit || meetingViewReadOnly;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const trackerIdParam = searchParams.get("id");
  const createNewParam = searchParams.get("new");
  const createRefParam = searchParams.get("ref");
  const createSupportActivityIdParam = searchParams.get("supportActivityId");
  const returnProjectIdParam = searchParams.get("returnProjectId");
  const returnToPathParam = readReturnToPath(searchParams);

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [trackerRecords, setTrackerRecords] = useState<CnfTrackerRecord[]>([]);
  const [form, setForm] = useState<CnfTrackerDetailFormState>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateHint, setDuplicateHint] = useState<string | null>(null);
  const [duplicateTrackerId, setDuplicateTrackerId] = useState<string | null>(null);
  const [initiatorTouched, setInitiatorTouched] = useState(false);
  const [referencePickerOpen, setReferencePickerOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  useRestorableViewState("cnf-tracker.detailModalOpen", detailModalOpen, setDetailModalOpen);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [returnProjectId, setReturnProjectId] = useState<string | null>(null);
  const [returnToPath, setReturnToPath] = useState<string | null>(null);
  const [linkedProjectIds, setLinkedProjectIds] = useState<string[]>([]);
  const [linkedSupportActivityId, setLinkedSupportActivityId] = useState<string | null>(null);
  const [activityTypeOptions, setActivityTypeOptions] = useState<ReusableOption[]>([]);
  const [initiatorOptions, setInitiatorOptions] = useState<ReusableOption[]>([]);
  const [highlightedTrackerId, setHighlightedTrackerId] = useState<string | null>(null);
  const [supportTitleLookup, setSupportTitleLookup] = useState<
    Map<string, { titleActivityName: string; activityType: string }>
  >(new Map());
  const [linkedSupportRows, setLinkedSupportRows] = useState<SupportActivity[]>([]);
  const [listTab, setListTab] = useState<"process" | "non_process">("process");
  useRestorableViewState("cnf-tracker.listTab", listTab, setListTab);
  const draftFlushEnabledRef = useRef(true);

  const projectLinked = linkedProjectIds.length > 0;

  const resumeDraftFlush = useCallback(() => {
    draftFlushEnabledRef.current = true;
  }, []);

  const suspendDraftFlush = useCallback(() => {
    draftFlushEnabledRef.current = false;
  }, []);

  const loadProjects = useCallback(async () => listActiveProjects(), []);

  const loadRecord = useCallback(async (trackerId: string) => {
    const record = await getCnfTrackerById(trackerId);
    if (!record) return null;
    const nextForm = formFromRecord(record);
    if (record.record_id) {
      try {
        const linked = await findNonProcessByCnfTrackerRecordId(record.record_id);
        if (linked) {
          setLinkedSupportActivityId(linked.activity_id);
          // Keep details_tab from cnf_classification; only prefill Non-Process fields on that tab.
          if (nextForm.details_tab === "non_process") {
            nextForm.title_activity_name = String(linked.non_process_description ?? "").slice(0, 50);
            nextForm.activity_type = String(
              linked.type_of_validation || linked.activity_type || "",
            );
          }
        } else {
          setLinkedSupportActivityId(null);
        }
      } catch {
        setLinkedSupportActivityId(null);
      }
      try {
        setLinkedSupportRows(await listNonProcessByCnfTrackerRecordId(record.record_id));
      } catch {
        setLinkedSupportRows([]);
      }
      try {
        setLinkedProjectIds(await listProjectIdsForTrackerRecord(record.record_id));
      } catch {
        setLinkedProjectIds([]);
      }
    } else {
      setLinkedSupportActivityId(null);
      setLinkedSupportRows([]);
      setLinkedProjectIds([]);
    }
    setForm(nextForm);
    setInitiatorTouched(true);
    setIsCreateMode(false);
    return record;
  }, []);

  const prepareNew = useCallback(async () => {
    const nextId = await getNextCnfTrackerId();
    setForm({ ...emptyForm(), cnf_tracker_id: nextId });
    setInitiatorTouched(false);
    setIsCreateMode(true);
    setLinkedProjectIds([]);
    setLinkedSupportActivityId(null);
    setDuplicateHint(null);
    setDuplicateTrackerId(null);
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
      const [rows, records, activityTypes, initiators, supportLookup] = await Promise.all([
        loadProjects(),
        listActiveCnfTrackerRecords(),
        listReusableOptions("type_of_validation").catch(() => [] as ReusableOption[]),
        listReusableOptions("cnf_initiator").catch(() => [] as ReusableOption[]),
        buildSupportTitleLookupByCnfRecordId().catch(
          () => new Map<string, { titleActivityName: string; activityType: string }>(),
        ),
      ]);
      setProjects(rows);
      setTrackerRecords(records);
      setActivityTypeOptions(activityTypes);
      setInitiatorOptions(initiators);
      setSupportTitleLookup(supportLookup);
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
        const wantsCreate = createNewParam === "1" || createNewParam === "true";

        if (trackerIdParam) {
          // Always load DB first so CNF Reference is not blanked by a partial draft.
          const record = await loadRecord(trackerIdParam);
          if (!record && !cancelled) {
            setFormError(`CNF Tracker record ${trackerIdParam} not found.`);
          } else if (!cancelled && draft?.trackerIdParam === trackerIdParam && draft.form) {
            setForm((current) => ({
              ...current,
              cnf_tracker_id: draft.form.cnf_tracker_id || current.cnf_tracker_id,
              cnf_reference: !isMissingValue(draft.form.cnf_reference)
                ? draft.form.cnf_reference
                : current.cnf_reference,
              cnf_initiator: draft.form.cnf_initiator || current.cnf_initiator,
              tracker_status: draft.form.tracker_status ?? current.tracker_status,
            }));
            setInitiatorTouched(draft.initiatorTouched);
          }
          if (!cancelled) {
            setIsCreateMode(false);
            resumeDraftFlush();
            setDetailModalOpen(true);
            setHighlightedTrackerId(trackerIdParam);
            setSearchParams({});
          }
        } else if (wantsCreate) {
          const nextId = await getNextCnfTrackerId();
          if (cancelled) return;
          const supportActivityId = (createSupportActivityIdParam ?? "").trim() || null;
          let titlePrefill = "";
          let activityTypePrefill = "";
          if (supportActivityId) {
            try {
              const linkedSupport = await getSupportActivityById(supportActivityId);
              titlePrefill = String(linkedSupport?.non_process_description ?? "").slice(0, 50);
              activityTypePrefill = String(
                linkedSupport?.type_of_validation || linkedSupport?.activity_type || "",
              );
            } catch {
              // keep empty prefills
            }
          }
          setForm({
            ...emptyForm(),
            cnf_tracker_id: nextId,
            cnf_reference: (createRefParam ?? "").trim(),
            title_activity_name: titlePrefill,
            activity_type: activityTypePrefill,
            details_tab: supportActivityId ? "non_process" : "process",
          });
          setInitiatorTouched(false);
          setIsCreateMode(true);
          setReturnProjectId((returnProjectIdParam ?? "").trim() || null);
          setReturnToPath(returnToPathParam);
          setLinkedProjectIds([]);
          setLinkedSupportActivityId(supportActivityId);
          setDuplicateHint(null);
          setDuplicateTrackerId(null);
          setDetailModalOpen(true);
          setHighlightedTrackerId(null);
          setSearchParams({});
          if (user?.id) clearCnfTrackerDraft(user.id);
          suspendDraftFlush();
        } else if (draft?.form) {
          setForm({ ...emptyForm(), ...draft.form });
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
  }, [
    trackerIdParam,
    createNewParam,
    createRefParam,
    createSupportActivityIdParam,
    returnProjectIdParam,
    returnToPathParam,
    loadData,
    loadRecord,
    resumeDraftFlush,
    suspendDraftFlush,
    user?.id,
    setSearchParams,
  ]);

  const listRows = useMemo(
    () => buildCnfTrackerListRows(projects, trackerRecords, supportTitleLookup),
    [projects, trackerRecords, supportTitleLookup],
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
    if (isCreateMode || initiatorTouched || isMissingValue(form.cnf_reference)) return;
    const owner = aggregation.cnfInitiator;
    if (!isMissingValue(owner) && owner !== "N/A") {
      setForm((current) => ({ ...current, cnf_initiator: owner }));
    }
  }, [aggregation.cnfInitiator, form.cnf_reference, initiatorTouched, isCreateMode]);

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
    setDuplicateHint(null);
    setIsCreateMode(false);
    setDetailModalOpen(true);
    const listReference = editableCnfReference(row.cnfNo);

    if (row.trackerId) {
      // Load directly — do not set ?id= (avoids draft/searchParam race that cleared CNF Reference).
      setHighlightedTrackerId(row.trackerId);
      void (async () => {
        const record = await loadRecord(row.trackerId);
        if (!record) {
          setFormError(`CNF Tracker record ${row.trackerId} not found.`);
          return;
        }
        setForm((current) => ({
          ...current,
          cnf_reference: isMissingValue(current.cnf_reference)
            ? listReference
            : current.cnf_reference,
          details_tab:
            row.cnfClassification === "non_process" ? "non_process" : current.details_tab,
        }));
        if (row.trackerRecordId) {
          try {
            setLinkedSupportRows(await listNonProcessByCnfTrackerRecordId(row.trackerRecordId));
          } catch {
            setLinkedSupportRows([]);
          }
        } else {
          setLinkedSupportRows([]);
        }
      })();
    } else {
      setLinkedSupportRows([]);
      setForm({
        ...emptyForm(),
        cnf_tracker_id: "N/A",
        record_id: "",
        cnf_reference: listReference,
        details_tab: row.cnfClassification === "non_process" ? "non_process" : "process",
      });
      setLinkedProjectIds(row.projectId && row.projectId !== "N/A" ? [row.projectId] : []);
      setHighlightedTrackerId(null);
    }
  }

  async function handleNew() {
    await prepareNew();
    setLinkedSupportRows([]);
    setForm((current) => ({
      ...current,
      details_tab: listTab,
    }));
    setFormError(null);
    setDetailModalOpen(true);
  }

  function handleCloseDetailModal() {
    setDetailModalOpen(false);
    setSearchParams({});
    // ponytail: keep isCreateMode until leave animation ends so width does not jump 840→1100
  }

  function handleDetailModalAfterOpenChange(visible: boolean) {
    if (!visible) {
      setIsCreateMode(false);
      setReturnProjectId(null);
    }
  }

  async function persistSave(allowProbableDuplicate: boolean) {
    if (viewOnly || !user?.email) return;
    if (isCreateMode) {
      if (isMissingValue(form.cnf_reference) || isMissingValue(form.cnf_initiator) || isMissingValue(form.change_description)) {
        message.warning("CNF Reference, Initiator, and Description of Change are required.");
        return;
      }
    } else if (isMissingValue(form.cnf_reference)) {
      message.warning("CNF Reference is required.");
      return;
    }

    const allowed = await validateClose(form.tracker_status);
    if (!allowed) return;

    setSaving(true);
    setFormError(null);
    setDuplicateHint(null);
    try {
      const saved = await saveCnfTrackerRecord(
        {
          ...form,
          product_name: normalizeOptionalToNa(form.product_name),
          client_name: normalizeOptionalToNa(form.client_name),
          qrmr_no: normalizeOptionalToNa(form.qrmr_no),
          unique_batch_no: normalizeOptionalToNa(form.unique_batch_no),
          change_description: normalizeOptionalToNa(form.change_description),
          cnf_details: normalizeOptionalToNa(form.cnf_details),
          cnf_classification: form.details_tab === "non_process" ? "non_process" : "process",
          allowProbableDuplicate,
        },
        user.email,
      );
      message.success(`CNF ${saved.cnf_tracker_id} saved`);
      const titleToSync = String(form.title_activity_name ?? "").trim();
      const activityTypeToSync = String(form.activity_type ?? "").trim();
      const detailsTab = form.details_tab === "non_process" ? "non_process" : "process";
      // Only sync support fields when saving as Non-Process — never from Process tab.
      if (
        detailsTab === "non_process"
        && user.email
        && (titleToSync || activityTypeToSync || linkedSupportActivityId || isCreateMode)
      ) {
        try {
          const synced = await syncNonProcessFieldsFromCnf({
            activityId: linkedSupportActivityId,
            cnfTrackerRecordId: saved.record_id ?? null,
            cnfReference: saved.cnf_reference,
            titleActivityName: titleToSync,
            activityType: activityTypeToSync,
            userEmail: user.email,
          });
          if (synced) {
            setLinkedSupportActivityId(synced.activity_id);
            setForm({
              ...formFromRecord(saved),
              title_activity_name: String(synced.non_process_description ?? titleToSync).slice(0, 50),
              activity_type: String(
                synced.type_of_validation || synced.activity_type || activityTypeToSync,
              ),
              details_tab: detailsTab,
            });
          } else {
            setForm({
              ...formFromRecord(saved),
              title_activity_name: titleToSync,
              activity_type: activityTypeToSync,
              details_tab: detailsTab,
            });
          }
        } catch {
          setForm({
            ...formFromRecord(saved),
            title_activity_name: titleToSync,
            activity_type: activityTypeToSync,
            details_tab: detailsTab,
          });
        }
      } else {
        setForm({
          ...formFromRecord(saved),
          title_activity_name: titleToSync,
          activity_type: activityTypeToSync,
          details_tab: detailsTab,
        });
      }
      setHighlightedTrackerId(saved.cnf_tracker_id);
      setTrackerRecords((current) => {
        const without = current.filter((record) => record.cnf_tracker_id !== saved.cnf_tracker_id);
        return [saved, ...without];
      });
      await loadData();
      if (user?.id) clearCnfTrackerDraft(user.id);
      suspendDraftFlush();

      const returnToProject = returnProjectId?.trim();
      if (returnToProject) {
        const params = new URLSearchParams({
          projectId: returnToProject,
          cnfTrackerId: saved.cnf_tracker_id,
        });
        setReturnProjectId(null);
        setReturnToPath(null);
        setDetailModalOpen(false);
        setIsCreateMode(false);
        navigate(`/projects?${params.toString()}`);
        return;
      }

      if (returnToPath) {
        const destination = returnToPath;
        setReturnToPath(null);
        setDetailModalOpen(false);
        setIsCreateMode(false);
        navigate(destination);
        return;
      }

      setIsCreateMode(false);
      setDetailModalOpen(true);
      if (saved.record_id) {
        try {
          setLinkedProjectIds(await listProjectIdsForTrackerRecord(saved.record_id));
        } catch {
          setLinkedProjectIds([]);
        }
        try {
          setLinkedSupportRows(await listNonProcessByCnfTrackerRecordId(saved.record_id));
        } catch {
          setLinkedSupportRows([]);
        }
      } else {
        setLinkedSupportRows([]);
      }
    } catch (err) {
      if (err instanceof CnfDuplicateError) {
        setDuplicateHint(err.existing.cnf_reference);
        setDuplicateTrackerId(err.existing.cnf_tracker_id);
        setFormError(err.message);
        if (err.reason === "probable") {
          modal.confirm({
            title: "Related CNF found",
            content: `${err.message} Save anyway, or open the existing record?`,
            okText: "Save anyway",
            cancelText: "Open existing",
            onOk: () => void persistSave(true),
            onCancel: () => {
              void loadRecord(err.existing.cnf_tracker_id);
              setIsCreateMode(false);
              setDetailModalOpen(true);
            },
          });
        }
        return;
      }
      setFormError(err instanceof Error ? err.message : "Failed to save CNF Tracker record");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    await persistSave(false);
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
      width: 168,
      sorter: (a, b) => a.protocolNo.localeCompare(b.protocolNo),
      render: (value: string, row) => (
        <DocumentNumberStatusCell number={value} status={row.protocolStatus} />
      ),
    },
    {
      title: "Interim Report No.",
      dataIndex: "interimReportNo",
      key: "interimReportNo",
      width: 188,
      sorter: (a, b) => a.interimReportNo.localeCompare(b.interimReportNo),
      render: (value: string, row) => (
        <DocumentNumberStatusCell number={value} status={row.interimReportStatus} />
      ),
    },
    {
      title: "Validation Report No.",
      dataIndex: "validationReportNo",
      key: "validationReportNo",
      width: 208,
      sorter: (a, b) => a.validationReportNo.localeCompare(b.validationReportNo),
      render: (value: string, row) => (
        <DocumentNumberStatusCell number={value} status={row.validationReportStatus} />
      ),
    },
    {
      title: "Endorsement No.",
      dataIndex: "endorsementNo",
      key: "endorsementNo",
      width: 188,
      sorter: (a, b) => a.endorsementNo.localeCompare(b.endorsementNo),
      render: (value: string, row) => (
        <DocumentNumberStatusCell number={value} status={row.endorsementReportStatus} />
      ),
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

  return (
    <AppShell>
      <div className="cnf-tracker-page">
        <CnfTrackerListTable
          rows={listRows}
          loading={loading}
          error={listError}
          canCreate={canEdit && !meetingViewReadOnly}
          highlightedTrackerId={highlightedTrackerId}
          listTab={listTab}
          onListTabChange={setListTab}
          onRetry={() => void loadData()}
          onLoad={handleLoadFromList}
          onNew={() => void handleNew()}
        />

        <CnfTrackerDetailModal
          open={detailModalOpen}
          form={form}
          aggregation={aggregation}
          poTableColumns={poTableColumns}
          supportActivities={linkedSupportRows}
          isCreateMode={isCreateMode}
          projectLinked={projectLinked}
          viewOnly={viewOnly}
          canEdit={canEdit}
          meetingViewReadOnly={meetingViewReadOnly}
          saving={saving}
          formError={formError}
          activityTypeOptions={activityTypeOptions.map((item) => ({
            id: item.option_id,
            value: item.option_value,
          }))}
          initiatorOptions={initiatorOptions.map((item) => ({
            id: item.option_id,
            value: item.option_value,
          }))}
          canManageOptions={canManageOptions && !meetingViewReadOnly}
          duplicateHint={duplicateHint}
          onOpenDuplicate={
            duplicateTrackerId
              ? () => {
                  void loadRecord(duplicateTrackerId);
                  setIsCreateMode(false);
                  setDuplicateHint(null);
                }
              : undefined
          }
          onClose={handleCloseDetailModal}
          onAfterOpenChange={handleDetailModalAfterOpenChange}
          onNew={() => void handleNew()}
          onClear={handleClear}
          onSave={() => void handleSave()}
          onFormChange={(patch) => {
            resumeDraftFlush();
            if (patch.cnf_initiator !== undefined) setInitiatorTouched(true);
            setForm((current) => ({ ...current, ...patch }));
          }}
          onStatusChange={(status) => void handleStatusChange(status)}
          onOpenReferencePicker={() => setReferencePickerOpen(true)}
          onCreateActivityType={async (value) => {
            if (!user?.email) {
              throw new Error("You must be signed in to add a new activity type.");
            }
            const created = await createReusableOption("type_of_validation", value, user.email);
            setActivityTypeOptions((current) => [
              ...current.filter((item) => item.option_id !== created.option_id),
              created,
            ]);
          }}
          onRemoveActivityType={async (option) => {
            if (!user?.email || !option.id) return;
            await softRemoveReusableOption(option.id, user.email);
            setActivityTypeOptions((current) => current.filter((item) => item.option_id !== option.id));
          }}
          onCreateInitiator={async (value) => {
            if (!user?.email) {
              throw new Error("You must be signed in to add a new initiator.");
            }
            const created = await createReusableOption("cnf_initiator", value, user.email);
            setInitiatorOptions((current) => [
              ...current.filter((item) => item.option_id !== created.option_id),
              created,
            ]);
          }}
          onRemoveInitiator={async (option) => {
            if (!user?.email || !option.id) return;
            await softRemoveReusableOption(option.id, user.email);
            setInitiatorOptions((current) => current.filter((item) => item.option_id !== option.id));
          }}
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
