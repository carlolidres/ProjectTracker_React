import { App, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/app/auth-provider";
import { useMeetingViewReadOnly } from "@/app/meeting-view-provider";
import { useRegistry } from "@/app/registry-provider";
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
import { CnfTrackerDetailModal, type CnfTrackerDetailFormState } from "@/features/cnf-tracker/CnfTrackerDetailModal";
import { CnfTrackerListTable } from "@/features/cnf-tracker/CnfTrackerListTable";
import { buildCreatableOptionsFromValues } from "@/lib/cnfTrackerSync";
import { normalizeOptionalToNa } from "@/lib/cnfTrackerSync";
import { saveRegistryValue, setRegistryStatus, listRegistryEntries } from "@/services/registryService";
import type { RegistryEntry } from "@/types";
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
import { isMissingValue, valueOrNA } from "@/lib/utils";
import {
  getCnfTrackerById,
  listActiveCnfTrackerRecords,
  saveCnfTrackerRecord,
} from "@/services/cnfTrackerService";
import { listProjectIdsForTrackerRecord } from "@/services/cnfTrackerLinkService";
import { listActiveProjects } from "@/services/projectService";
import { buildCnfTrackerListRows } from "@/lib/cnfTrackerList";
import type { CnfTrackerListRow } from "@/lib/cnfTrackerList";
import { subscribeProjectDataChanged } from "@/lib/projectDataEvents";
import { CnfDuplicateError, type CnfTrackerRecord, type CnfTrackerStatus } from "@/types/cnfTracker";
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
  };
}

function formFromRecord(record: CnfTrackerRecord): CnfTrackerDetailFormState {
  return {
    cnf_tracker_id: record.cnf_tracker_id,
    cnf_reference: record.cnf_reference,
    cnf_initiator: record.cnf_initiator,
    cnf_details: String(record.cnf_details ?? ""),
    product_name: String(record.product_name ?? ""),
    client_name: String(record.client_name ?? ""),
    qrmr_no: String(record.qrmr_no ?? ""),
    unique_batch_no: String(record.unique_batch_no ?? ""),
    change_description: String(record.change_description ?? ""),
    tracker_status: record.tracker_status === "Closed" ? "Closed" : "Open",
    record_id: record.record_id,
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
  const { registry, refreshRegistry } = useRegistry();
  const meetingViewReadOnly = useMeetingViewReadOnly();
  const canEdit = canEditCnfTracker(profile?.role);
  const viewOnly = !canEdit || meetingViewReadOnly;
  const [searchParams, setSearchParams] = useSearchParams();
  const trackerIdParam = searchParams.get("id");

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
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [linkedProjectIds, setLinkedProjectIds] = useState<string[]>([]);
  const [highlightedTrackerId, setHighlightedTrackerId] = useState<string | null>(null);
  const [registryEntries, setRegistryEntries] = useState<RegistryEntry[]>([]);
  const draftFlushEnabledRef = useRef(true);

  const productOptions = useMemo(() => {
    const fromRegistry = registry.cnf_product ?? [];
    const fromProjects = projects.map((row) => row.product_name);
    const fromTrackers = trackerRecords.map((row) => String(row.product_name ?? ""));
    return buildCreatableOptionsFromValues([...fromRegistry, ...fromProjects, ...fromTrackers]);
  }, [registry.cnf_product, projects, trackerRecords]);

  const clientOptions = useMemo(() => {
    const fromRegistry = registry.cnf_client ?? [];
    const fromProjects = projects.map((row) => row.client_name);
    const fromTrackers = trackerRecords.map((row) => String(row.client_name ?? ""));
    return buildCreatableOptionsFromValues([...fromRegistry, ...fromProjects, ...fromTrackers]);
  }, [registry.cnf_client, projects, trackerRecords]);

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
    setForm(formFromRecord(record));
    setInitiatorTouched(true);
    setIsCreateMode(false);
    if (record.record_id) {
      try {
        setLinkedProjectIds(await listProjectIdsForTrackerRecord(record.record_id));
      } catch {
        setLinkedProjectIds([]);
      }
    } else {
      setLinkedProjectIds([]);
    }
    return record;
  }, []);

  const prepareNew = useCallback(async () => {
    const nextId = await getNextCnfTrackerId();
    setForm({ ...emptyForm(), cnf_tracker_id: nextId });
    setInitiatorTouched(false);
    setIsCreateMode(true);
    setLinkedProjectIds([]);
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
      const [rows, records, entries] = await Promise.all([
        loadProjects(),
        listActiveCnfTrackerRecords(),
        listRegistryEntries().catch(() => [] as RegistryEntry[]),
      ]);
      setProjects(rows);
      setTrackerRecords(records);
      setRegistryEntries(entries);
      return { rows, records };
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load CNF Tracker list");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadProjects]);

  async function createRegistryOption(type: "cnf_product" | "cnf_client", value: string) {
    if (!user?.email) return;
    await saveRegistryValue(type, value, value, user.email);
    await refreshRegistry();
    const entries = await listRegistryEntries();
    setRegistryEntries(entries);
  }

  async function removeRegistryOption(type: "cnf_product" | "cnf_client", option: { id?: string; value: string }) {
    if (!user?.email) return;
    const entry =
      registryEntries.find(
        (row) =>
          row.registry_type === type &&
          row.registry_value.trim().toLowerCase() === option.value.trim().toLowerCase(),
      ) ??
      (option.id
        ? registryEntries.find((row) => String(row.id) === String(option.id))
        : undefined);
    if (!entry) {
      message.warning("Option is not in the registry and cannot be removed.");
      return;
    }
    await setRegistryStatus(entry, "Inactive", user.email);
    await refreshRegistry();
    setRegistryEntries(await listRegistryEntries());
    message.success(`Removed ${option.value}`);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFormError(null);
      try {
        await loadData();
        if (cancelled) return;

        const draft = user?.id ? loadCnfTrackerDraft(user.id) : null;

        if (trackerIdParam) {
          if (draft?.trackerIdParam === trackerIdParam && draft.form) {
            setForm({ ...emptyForm(), ...draft.form });
            setInitiatorTouched(draft.initiatorTouched);
            setIsCreateMode(false);
            resumeDraftFlush();
          } else {
            const record = await loadRecord(trackerIdParam);
            if (!record && !cancelled) {
              setFormError(`CNF Tracker record ${trackerIdParam} not found.`);
            }
            resumeDraftFlush();
          }
          if (!cancelled) {
            setDetailModalOpen(true);
            setHighlightedTrackerId(trackerIdParam);
            setSearchParams({});
          }
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
  }, [trackerIdParam, loadData, loadRecord, resumeDraftFlush, user?.id, setSearchParams]);

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
    if (row.trackerId) {
      setSearchParams({ id: row.trackerId });
      void loadRecord(row.trackerId);
      setHighlightedTrackerId(row.trackerId);
    } else {
      setSearchParams({});
      setForm((current) => ({
        ...emptyForm(),
        ...current,
        cnf_tracker_id: "N/A",
        record_id: "",
        cnf_reference: row.cnfNo,
      }));
      setLinkedProjectIds(row.projectId && row.projectId !== "N/A" ? [row.projectId] : []);
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
    setIsCreateMode(false);
    setSearchParams({});
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
          allowProbableDuplicate,
        },
        user.email,
      );
      message.success(`CNF ${saved.cnf_tracker_id} saved`);
      setForm(formFromRecord(saved));
      setIsCreateMode(false);
      setHighlightedTrackerId(saved.cnf_tracker_id);
      setTrackerRecords((current) => {
        const without = current.filter((record) => record.cnf_tracker_id !== saved.cnf_tracker_id);
        return [saved, ...without];
      });
      await loadData();
      if (user?.id) clearCnfTrackerDraft(user.id);
      suspendDraftFlush();
      setDetailModalOpen(true);
      if (saved.record_id) {
        try {
          setLinkedProjectIds(await listProjectIdsForTrackerRecord(saved.record_id));
        } catch {
          setLinkedProjectIds([]);
        }
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
      width: 140,
      render: (value: string) => valueOrNA(value),
    },
    {
      title: "Interim Report No.",
      dataIndex: "interimReportNo",
      key: "interimReportNo",
      width: 160,
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
      title: "Endorsement No.",
      dataIndex: "endorsementNo",
      key: "endorsementNo",
      width: 160,
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

  return (
    <AppShell>
      <div className="cnf-tracker-page">
        <CnfTrackerListTable
          rows={listRows}
          loading={loading}
          error={listError}
          canCreate={canEdit && !meetingViewReadOnly}
          highlightedTrackerId={highlightedTrackerId}
          onRetry={() => void loadData()}
          onLoad={handleLoadFromList}
          onNew={() => void handleNew()}
        />

        <CnfTrackerDetailModal
          open={detailModalOpen}
          form={form}
          aggregation={aggregation}
          poTableColumns={poTableColumns}
          linkedProjectIds={linkedProjectIds}
          isCreateMode={isCreateMode}
          projectLinked={projectLinked}
          viewOnly={viewOnly}
          canEdit={canEdit}
          meetingViewReadOnly={meetingViewReadOnly}
          saving={saving}
          formError={formError}
          productOptions={productOptions}
          clientOptions={clientOptions}
          canManageOptions={canEdit && !meetingViewReadOnly}
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
          onCreateProduct={(value) => createRegistryOption("cnf_product", value)}
          onCreateClient={(value) => createRegistryOption("cnf_client", value)}
          onRemoveProduct={(option) => removeRegistryOption("cnf_product", option)}
          onRemoveClient={(option) => removeRegistryOption("cnf_client", option)}
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
