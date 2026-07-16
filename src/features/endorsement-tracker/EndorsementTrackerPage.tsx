import {
  ClearOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/app/auth-provider";
import { useMeetingViewReadOnly } from "@/app/meeting-view-provider";
import { AppDatePicker } from "@/components/common/app-date-picker";
import { CreatableNaSelect } from "@/components/common/creatable-na-select";
import { NaClearingInput, NaClearingTextArea } from "@/components/common/na-clearing-input";
import { WorkflowStatusBadge } from "@/components/common/workflow-status-badge";
import { AppShell } from "@/components/layout/app-shell";
import { formatAppDate } from "@/lib/date";
import { toEditableNaField } from "@/lib/naField";
import { renumberEndorsementItems } from "@/lib/endorsementMappers";
import { ENDORSEMENT_STATUS_OPTIONS, canonicalizeEndorsementStatus } from "@/lib/endorsementSync";
import { getNextEndorsementTrackerId } from "@/lib/idGeneration";
import {
  canEditEndorsementQaOnly,
  canManageEndorsementTracker,
  canRemoveReusableOptions,
  isViewerRole,
} from "@/lib/roleAccess";
import { sanitizeAlphanumericInput, valueOrNA } from "@/lib/utils";
import { listTrackerRecordIdsForProject } from "@/services/cnfTrackerLinkService";
import { listActiveCnfTrackerRecords } from "@/services/cnfTrackerService";
import {
  emptyEndorsementItem,
  filterEndorsementRows,
  getEndorsementByNumber,
  getEndorsementByProjectId,
  getEndorsementBySource,
  getEndorsementByTrackerId,
  listActiveEndorsements,
  listEndorsementItems,
  saveEndorsementItems,
  saveIndependentEndorsement,
  softDeleteEndorsementItem,
} from "@/services/endorsementTrackerService";
import { listActiveProjects } from "@/services/projectService";
import {
  createReusableOption,
  listReusableOptions,
  softRemoveReusableOption,
} from "@/services/reusableOptionService";
import { listActiveSupportActivities } from "@/services/supportActivityService";
import type { CnfTrackerRecord } from "@/types/cnfTracker";
import type {
  EndorsementTrackerFilters,
  EndorsementTrackerItem,
  EndorsementTrackerRecord,
  ProcessClassification,
  ReusableOption,
} from "@/types/endorsementTracker";
import type { ProjectRow } from "@/types";
import type { SupportActivity } from "@/types/supportActivity";
import "@/styles/endorsement-tracker.css";

type HeaderForm = Partial<EndorsementTrackerRecord> & {
  /** UI field mirrored from linked Support Activity; not a header DB column yet. */
  type_of_validation?: string;
};

const CLASSIFICATION_OPTIONS: { label: string; value: ProcessClassification }[] = [
  { label: "Unset", value: "unset" },
  { label: "Process", value: "process" },
  { label: "Non-Process", value: "non_process" },
];

function emptyHeader(): HeaderForm {
  return {
    record_id: "",
    endorsement_tracker_id: "",
    endorsement_number: "",
    endorsement_status: "In Process",
    process_classification: "unset",
    source_type: "independent",
    source_record_id: null,
    project_id: null,
    project_record_id: null,
    cnf_tracker_record_id: null,
    support_activity_id: null,
    cnf_number_display: "",
    project_name: "",
    product_name: "",
    product_code: "",
    non_process_description: "",
    type_of_validation: "",
    sync_version: 1,
  };
}

function headerFromRecord(record: EndorsementTrackerRecord, supportRows: SupportActivity[] = []): HeaderForm {
  const linked = record.support_activity_id
    ? supportRows.find((row) => row.activity_id === record.support_activity_id)
    : undefined;
  return {
    ...record,
    non_process_description: toEditableNaField(record.non_process_description),
    product_name: toEditableNaField(record.product_name),
    product_code: toEditableNaField(record.product_code),
    type_of_validation: linked ? toEditableNaField(linked.type_of_validation) : "",
  };
}

function classificationLabel(value: string): string {
  if (value === "process") return "Process";
  if (value === "non_process") return "Non-Process";
  if (value === "unset") return "Unset";
  return valueOrNA(value);
}

export function EndorsementTrackerPage() {
  const { modal } = App.useApp();
  const { user, profile } = useAuth();
  const meetingViewReadOnly = useMeetingViewReadOnly();
  const [searchParams, setSearchParams] = useSearchParams();
  const trackerIdParam = searchParams.get("id");
  const createNewParam = searchParams.get("new");
  const createProjectIdParam = searchParams.get("projectId");
  const createSupportActivityIdParam = searchParams.get("supportActivityId");

  const canManage = canManageEndorsementTracker(profile?.role);
  const qaOnly = canEditEndorsementQaOnly(profile?.role);
  const canRemoveOptions = canRemoveReusableOptions(profile?.role);
  const viewOnlyBase = isViewerRole(profile?.role) || meetingViewReadOnly;
  const fullEdit = canManage && !viewOnlyBase;
  const qaEdit = qaOnly && !viewOnlyBase && !canManage;
  const readOnly = !fullEdit && !qaEdit;
  const canSave = (fullEdit || qaEdit) && Boolean(user?.email);

  const [rows, setRows] = useState<EndorsementTrackerRecord[]>([]);
  const [filters, setFilters] = useState<EndorsementTrackerFilters>({});
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [form, setForm] = useState<HeaderForm>(emptyHeader());
  const [items, setItems] = useState<Partial<EndorsementTrackerItem>[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [cnfRecords, setCnfRecords] = useState<CnfTrackerRecord[]>([]);
  const [supportRows, setSupportRows] = useState<SupportActivity[]>([]);
  const [implementedByOptions, setImplementedByOptions] = useState<ReusableOption[]>([]);
  const [typeOfValidationOptions, setTypeOfValidationOptions] = useState<ReusableOption[]>([]);

  const filtered = useMemo(() => filterEndorsementRows(rows, filters), [rows, filters]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const [endorsements, projectRows, cnfRows, support] = await Promise.all([
        listActiveEndorsements(),
        listActiveProjects().catch(() => [] as ProjectRow[]),
        listActiveCnfTrackerRecords().catch(() => [] as CnfTrackerRecord[]),
        listActiveSupportActivities().catch(() => [] as SupportActivity[]),
      ]);
      setRows(endorsements);
      setProjects(projectRows);
      setCnfRecords(cnfRows);
      setSupportRows(support);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load endorsement tracker");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadImplementedBy = useCallback(async () => {
    try {
      setImplementedByOptions(await listReusableOptions("implemented_by"));
    } catch {
      setImplementedByOptions([]);
    }
  }, []);

  const loadTypeOfValidation = useCallback(async () => {
    try {
      setTypeOfValidationOptions(await listReusableOptions("type_of_validation"));
    } catch {
      setTypeOfValidationOptions([]);
    }
  }, []);

  const resolveCnfFromProject = useCallback(
    async (projectId: string): Promise<{ cnf_tracker_record_id: string | null; cnf_number_display: string }> => {
      try {
        const linkedIds = await listTrackerRecordIdsForProject(projectId);
        const linkedId = linkedIds[0];
        if (linkedId) {
          const cnf = cnfRecords.find((row) => String(row.record_id) === linkedId);
          return {
            cnf_tracker_record_id: linkedId,
            cnf_number_display: cnf?.cnf_reference || cnf?.cnf_tracker_id || "",
          };
        }
      } catch {
        // Fall through to project PO CNF reference match.
      }
      const project = projects.find((row) => row.project_id === projectId);
      const reference = String(project?.cnf_reference ?? "").trim();
      if (!reference || reference.toUpperCase() === "N/A") {
        return { cnf_tracker_record_id: null, cnf_number_display: "" };
      }
      const cnf = cnfRecords.find(
        (row) =>
          String(row.cnf_reference ?? "").trim() === reference
          || String(row.cnf_tracker_id ?? "").trim() === reference,
      );
      if (!cnf?.record_id) {
        return { cnf_tracker_record_id: null, cnf_number_display: reference };
      }
      return {
        cnf_tracker_record_id: String(cnf.record_id),
        cnf_number_display: cnf.cnf_reference || cnf.cnf_tracker_id || reference,
      };
    },
    [cnfRecords, projects],
  );

  const loadRecord = useCallback(
    async (trackerId: string) => {
      const record = await getEndorsementByTrackerId(trackerId);
      if (!record) return null;
      let next = headerFromRecord(record, supportRows);
      if (record.project_id && !record.cnf_tracker_record_id) {
        const linkedCnf = await resolveCnfFromProject(record.project_id);
        if (linkedCnf.cnf_tracker_record_id || linkedCnf.cnf_number_display) {
          next = { ...next, ...linkedCnf };
        }
      }
      setForm(next);
      setIsCreateMode(false);
      const itemRows = await listEndorsementItems(record.record_id);
      setItems(itemRows.length ? itemRows : [emptyEndorsementItem(record.record_id)]);
      return record;
    },
    [resolveCnfFromProject, supportRows],
  );

  const prepareNew = useCallback(async () => {
    const nextId = await getNextEndorsementTrackerId();
    setForm({ ...emptyHeader(), endorsement_tracker_id: nextId, source_type: "independent" });
    setItems([emptyEndorsementItem()]);
    setIsCreateMode(true);
    setFormError(null);
    setSearchParams({});
  }, [setSearchParams]);

  useEffect(() => {
    void loadList();
    void loadImplementedBy();
    void loadTypeOfValidation();
  }, [loadList, loadImplementedBy, loadTypeOfValidation]);

  useEffect(() => {
    if (!trackerIdParam && createNewParam !== "1" && createNewParam !== "true") return;
    // Wait for projects / CNF / support lists before opening (prefill + linked CNF).
    if (loading) return;

    let cancelled = false;
    (async () => {
      setFormError(null);
      try {
        if (trackerIdParam) {
          const record = await loadRecord(trackerIdParam);
          if (cancelled) return;
          if (!record) {
            setFormError(`Endorsement Tracker record ${trackerIdParam} not found.`);
            setForm(emptyHeader());
            setItems([]);
            setIsCreateMode(false);
          } else {
            setHighlightedId(trackerIdParam);
          }
          setDetailOpen(true);
          setSearchParams({});
          return;
        }

        // Deep-link: New Endorsement with optional project or support prefill.
        // Prefer loading an existing tracker when number/source already matches.
        const projectId = (createProjectIdParam ?? "").trim();
        const supportActivityId = (createSupportActivityIdParam ?? "").trim();
        const project = projectId
          ? projects.find((row) => row.project_id === projectId)
          : undefined;
        const support = supportActivityId
          ? supportRows.find((row) => row.activity_id === supportActivityId)
          : undefined;

        const existingByNumber = support
          ? await getEndorsementByNumber(support.endorsement_number || "")
          : project
            ? await getEndorsementByNumber(project.endorsement_report_no || "")
            : null;
        const existingBySource = support
          ? await getEndorsementBySource("non_process_support_activity", support.activity_id)
          : project?.record_id
            ? await getEndorsementBySource("process_validation_project", project.record_id)
            : null;
        const existingByProject = projectId
          ? await getEndorsementByProjectId(projectId)
          : null;
        const existing = existingByNumber ?? existingBySource ?? existingByProject;
        if (cancelled) return;
        if (existing) {
          await loadRecord(existing.endorsement_tracker_id);
          if (cancelled) return;
          setHighlightedId(existing.endorsement_tracker_id);
          setDetailOpen(true);
          setSearchParams({});
          return;
        }

        const nextId = await getNextEndorsementTrackerId();
        if (cancelled) return;
        const linkedCnf = projectId ? await resolveCnfFromProject(projectId) : null;
        if (cancelled) return;

        if (support) {
          setForm({
            ...emptyHeader(),
            endorsement_tracker_id: nextId,
            source_type: "non_process_support_activity",
            process_classification: "non_process",
            support_activity_id: support.activity_id,
            cnf_tracker_record_id: support.cnf_tracker_record_id,
            cnf_number_display: support.cnf_number_display || "",
            non_process_description: support.non_process_description || "",
            type_of_validation: support.type_of_validation || support.activity_type || "",
            endorsement_number: support.endorsement_number || "",
            endorsement_status:
              canonicalizeEndorsementStatus(support.endorsement_status) || "In Process",
            product_name: support.Product || "",
          });
        } else {
          setForm({
            ...emptyHeader(),
            endorsement_tracker_id: nextId,
            source_type: project ? "process_validation_project" : "independent",
            process_classification: project ? "process" : "unset",
            project_id: project?.project_id ?? (projectId || null),
            project_record_id: project?.record_id ?? null,
            product_name: project?.product_name || "",
            product_code: project?.fg_code || "",
            project_name: project?.product_name || project?.project_id || "",
            endorsement_number: project?.endorsement_report_no || "",
            endorsement_status:
              canonicalizeEndorsementStatus(project?.endorsement_report_status) || "In Process",
            cnf_tracker_record_id: linkedCnf?.cnf_tracker_record_id ?? null,
            cnf_number_display: linkedCnf?.cnf_number_display ?? "",
            support_activity_id: supportActivityId || null,
          });
        }
        setItems([emptyEndorsementItem()]);
        setIsCreateMode(true);
        setHighlightedId(null);
        setDetailOpen(true);
        setSearchParams({});
      } catch (err) {
        if (!cancelled) {
          setFormError(err instanceof Error ? err.message : "Failed to open endorsement record");
          setDetailOpen(true);
          setSearchParams({});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    trackerIdParam,
    createNewParam,
    createProjectIdParam,
    createSupportActivityIdParam,
    loading,
    projects,
    supportRows,
    loadRecord,
    resolveCnfFromProject,
    setSearchParams,
  ]);

  const projectOptions = useMemo(
    () =>
      projects.map((row) => ({
        value: row.project_id,
        label: `${row.project_id} — ${valueOrNA(row.product_name)}`,
      })),
    [projects],
  );

  const supportOptions = useMemo(
    () =>
      supportRows.map((row) => ({
        value: row.activity_id,
        label: `${row.activity_id} — ${valueOrNA(row.Product || row.non_process_description)}`,
      })),
    [supportRows],
  );

  const implementedBySelectOptions = useMemo(
    () =>
      implementedByOptions.map((option) => ({
        id: option.option_id,
        value: option.option_value,
      })),
    [implementedByOptions],
  );

  const typeOfValidationSelectOptions = useMemo(
    () =>
      typeOfValidationOptions.map((option) => ({
        id: option.option_id,
        value: option.option_value,
      })),
    [typeOfValidationOptions],
  );

  const isProcess = form.process_classification === "process";
  const isNonProcess = form.process_classification === "non_process";

  function patchForm(patch: Partial<HeaderForm>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function applyProjectLink(projectId: string | null) {
    if (!projectId) {
      patchForm({
        project_id: null,
        project_record_id: null,
        cnf_tracker_record_id: null,
        cnf_number_display: "",
        product_name: "",
        product_code: "",
        project_name: "",
      });
      return;
    }
    const project = projects.find((row) => row.project_id === projectId);
    if (!project) {
      patchForm({ project_id: projectId });
      return;
    }
    const linkedCnf = await resolveCnfFromProject(projectId);
    patchForm({
      project_id: project.project_id,
      project_record_id: project.record_id,
      product_name: project.product_name || "",
      product_code: project.fg_code || "",
      project_name: project.product_name || project.project_id,
      process_classification:
        form.process_classification === "unset" ? "process" : form.process_classification,
      endorsement_number: form.endorsement_number || project.endorsement_report_no || "",
      endorsement_status:
        form.endorsement_status
        || canonicalizeEndorsementStatus(project.endorsement_report_status)
        || "In Process",
      cnf_tracker_record_id: linkedCnf.cnf_tracker_record_id,
      cnf_number_display: linkedCnf.cnf_number_display,
    });
  }

  function applySupportLink(activityId: string | null) {
    if (!activityId) {
      patchForm({ support_activity_id: null, type_of_validation: "" });
      return;
    }
    const activity = supportRows.find((row) => row.activity_id === activityId);
    if (!activity) {
      patchForm({ support_activity_id: activityId });
      return;
    }
    patchForm({
      support_activity_id: activity.activity_id,
      non_process_description:
        activity.non_process_description || activity.Product || form.non_process_description || "",
      type_of_validation: activity.type_of_validation || form.type_of_validation || "",
      product_name: form.product_name || activity.Product || "",
      cnf_tracker_record_id: form.cnf_tracker_record_id || activity.cnf_tracker_record_id,
      cnf_number_display: form.cnf_number_display || activity.cnf_number_display || "",
      process_classification:
        form.process_classification === "unset" ? "non_process" : form.process_classification,
      endorsement_number: form.endorsement_number || activity.endorsement_number || "",
      endorsement_status: form.endorsement_status || activity.endorsement_status || "In Process",
    });
  }

  function patchItem(itemId: string, patch: Partial<EndorsementTrackerItem>) {
    setItems((current) =>
      current.map((item) => (item.item_id === itemId ? { ...item, ...patch } : item)),
    );
  }

  function withStableItemIds(
    rows: Partial<EndorsementTrackerItem>[],
  ): Array<Partial<EndorsementTrackerItem> & { item_id: string }> {
    return rows.map((item) => ({
      ...item,
      item_id: item.item_id || crypto.randomUUID(),
    }));
  }

  function handleAddItem() {
    if (!fullEdit) return;
    setItems((current) =>
      renumberEndorsementItems(
        withStableItemIds([...current, emptyEndorsementItem(form.record_id || "")]),
      ),
    );
  }

  function handleRemoveItem(item: Partial<EndorsementTrackerItem>) {
    if (!fullEdit || !item.item_id) return;
    modal.confirm({
      title: "Remove endorsement item?",
      content: `Remove item ${item.item_number ?? ""}? This soft-deletes a saved item.`,
      okText: "Remove",
      okButtonProps: { danger: true },
      onOk: async () => {
        const itemId = item.item_id!;
        const isPersisted = Boolean(form.record_id) && !isCreateMode;
        if (isPersisted && user?.email) {
          try {
            await softDeleteEndorsementItem(itemId, user.email);
            const remaining = await listEndorsementItems(form.record_id!);
            setItems(remaining.length ? remaining : [emptyEndorsementItem(form.record_id)]);
            message.success("Item removed");
          } catch (err) {
            message.error(err instanceof Error ? err.message : "Failed to remove item");
            throw err;
          }
          return;
        }
        setItems((current) => {
          const next = current.filter((row) => row.item_id !== itemId);
          return next.length
            ? renumberEndorsementItems(withStableItemIds(next))
            : [emptyEndorsementItem(form.record_id || "")];
        });
      },
    });
  }

  async function handleOpenRow(record: EndorsementTrackerRecord) {
    setFormError(null);
    setSearchParams({ id: record.endorsement_tracker_id });
    setHighlightedId(record.endorsement_tracker_id);
  }

  async function handleNew() {
    if (!fullEdit) return;
    await prepareNew();
    setDetailOpen(true);
  }

  function handleCloseDetail() {
    setDetailOpen(false);
    setIsCreateMode(false);
    setFormError(null);
    setSearchParams({});
  }

  async function handleSave() {
    if (!canSave || !user?.email || saving) return;
    setSaving(true);
    setFormError(null);
    try {
      let saved: EndorsementTrackerRecord;
      if (fullEdit) {
        saved = await saveIndependentEndorsement(
          {
            ...form,
            source_type: form.source_type || "independent",
          },
          user.email,
        );
      } else {
        if (!form.record_id) {
          throw new Error("Record must exist before QA verification updates.");
        }
        const existing = await getEndorsementByTrackerId(String(form.endorsement_tracker_id));
        if (!existing) throw new Error("Endorsement record not found.");
        saved = existing;
      }

      const numbered = renumberEndorsementItems(
        withStableItemIds(items).map((item, index) => ({
          ...item,
          endorsement_tracker_record_id: saved.record_id,
          item_number: index + 1,
          sort_order: index,
        })),
      );

      let itemsToSave: Partial<EndorsementTrackerItem>[] = numbered;
      if (qaEdit) {
        const previous = await listEndorsementItems(saved.record_id);
        const editedById = new Map(
          numbered.map((item) => [String(item.item_id), item] as const),
        );
        itemsToSave = previous.map((prior) => {
          const edited = editedById.get(prior.item_id);
          return {
            ...prior,
            verified_by_qa: edited?.verified_by_qa ?? prior.verified_by_qa,
            qa_verification_date: edited?.qa_verification_date ?? prior.qa_verification_date,
          };
        });
      }

      const savedItems = await saveEndorsementItems(saved.record_id, itemsToSave, user.email);
      setForm(headerFromRecord(saved, supportRows));
      setItems(savedItems.length ? savedItems : [emptyEndorsementItem(saved.record_id)]);
      setIsCreateMode(false);
      setHighlightedId(saved.endorsement_tracker_id);
      message.success(`Endorsement ${saved.endorsement_tracker_id} saved`);
      await loadList();
      setDetailOpen(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save endorsement");
    } finally {
      setSaving(false);
    }
  }

  function handleClear() {
    if (!fullEdit) return;
    modal.confirm({
      title: "Clear endorsement form?",
      content: "This clears unsaved inputs and starts a new independent endorsement.",
      okText: "Clear",
      onOk: () => void prepareNew(),
    });
  }

  async function handleCreateImplementedBy(value: string) {
    if (!user?.email) return;
    await createReusableOption("implemented_by", value, user.email);
    await loadImplementedBy();
  }

  async function handleRemoveImplementedBy(option: { id?: string; value: string }) {
    if (!user?.email || !canRemoveOptions) return;
    const match =
      implementedByOptions.find((row) => row.option_id === option.id)
      ?? implementedByOptions.find(
        (row) => row.option_value.trim().toLowerCase() === option.value.trim().toLowerCase(),
      );
    if (!match) {
      message.warning("Option is not stored and cannot be removed.");
      return;
    }
    await softRemoveReusableOption(match.option_id, user.email);
    await loadImplementedBy();
    message.success(`Removed ${match.option_value}`);
  }

  async function handleCreateTypeOfValidation(value: string) {
    if (!user?.email) return;
    await createReusableOption("type_of_validation", value, user.email);
    await loadTypeOfValidation();
  }

  async function handleRemoveTypeOfValidation(option: { id?: string; value: string }) {
    if (!user?.email || !canRemoveOptions) return;
    const match =
      typeOfValidationOptions.find((row) => row.option_id === option.id)
      ?? typeOfValidationOptions.find(
        (row) => row.option_value.trim().toLowerCase() === option.value.trim().toLowerCase(),
      );
    if (!match) {
      message.warning("Option is not stored and cannot be removed.");
      return;
    }
    await softRemoveReusableOption(match.option_id, user.email);
    await loadTypeOfValidation();
    message.success(`Removed ${match.option_value}`);
  }

  const listColumns: ColumnsType<EndorsementTrackerRecord> = [
    {
      title: "Tracker ID",
      dataIndex: "endorsement_tracker_id",
      key: "endorsement_tracker_id",
      width: 140,
      fixed: "left",
    },
    {
      title: "Endorsement No.",
      dataIndex: "endorsement_number",
      key: "endorsement_number",
      width: 160,
      render: (value: string) => valueOrNA(value),
    },
    {
      title: "Status",
      dataIndex: "endorsement_status",
      key: "endorsement_status",
      width: 130,
      render: (value: string) => <WorkflowStatusBadge status={value} />,
    },
    {
      title: "Classification",
      dataIndex: "process_classification",
      key: "process_classification",
      width: 130,
      render: (value: string) => classificationLabel(value),
    },
    {
      title: "Product / Description",
      key: "product_desc",
      width: 220,
      ellipsis: true,
      render: (_: unknown, row) =>
        row.process_classification === "non_process"
          ? valueOrNA(row.non_process_description)
          : valueOrNA(row.product_name),
    },
    {
      title: "CNF",
      dataIndex: "cnf_number_display",
      key: "cnf_number_display",
      width: 140,
      render: (value: string) => valueOrNA(value),
    },
    {
      title: "Project",
      dataIndex: "project_id",
      key: "project_id",
      width: 130,
      render: (value: string | null) => valueOrNA(value),
    },
    {
      title: "Updated",
      dataIndex: "updated_at",
      key: "updated_at",
      width: 130,
      render: (value: string) => formatAppDate(value),
    },
    {
      title: "",
      key: "open",
      width: 90,
      fixed: "right",
      render: (_: unknown, row) => (
        <Button type="link" onClick={() => void handleOpenRow(row)}>
          Open
        </Button>
      ),
    },
  ];

  const headerFieldsReadOnly = !fullEdit;
  const itemCoreReadOnly = !fullEdit;
  const itemQaReadOnly = !(fullEdit || qaEdit);
  // New Endorsement (independent): Classification + Project selectable.
  // From Project Entry / existing process-linked records: those stay display-only.
  const independentCreate =
    fullEdit && isCreateMode && form.source_type === "independent";
  const identityFieldsReadOnly = !independentCreate;
  // Product Name / Code come from the linked Project — never manually edit when Project is set.
  const productFieldsReadOnly = !fullEdit || Boolean(form.project_id);

  return (
    <AppShell>
      <div className="endorsement-tracker-page">
        <div className="page-header">
          <div>
            <Typography.Title level={3}>Endorsement Tracker</Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Track endorsement items for process validation and non-process activities.
            </Typography.Paragraph>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void loadList()} loading={loading}>
              Refresh
            </Button>
            {fullEdit ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => void handleNew()}>
                New Endorsement
              </Button>
            ) : null}
          </Space>
        </div>

        {listError ? (
          <Alert type="error" showIcon message={listError} style={{ marginBottom: 16 }} />
        ) : null}

        <Card className="endorsement-tracker-filters" style={{ marginBottom: 16 }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={10}>
              <Input
                prefix={<SearchOutlined />}
                placeholder="Search endorsements"
                allowClear
                value={filters.search}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, search: event.target.value }))
                }
              />
            </Col>
            <Col xs={24} md={7}>
              <Select
                allowClear
                placeholder="Status"
                style={{ width: "100%" }}
                value={filters.endorsement_status}
                options={ENDORSEMENT_STATUS_OPTIONS.map((value) => ({ label: value, value }))}
                onChange={(endorsement_status) =>
                  setFilters((current) => ({ ...current, endorsement_status }))
                }
              />
            </Col>
            <Col xs={24} md={7}>
              <Select
                allowClear
                placeholder="Classification"
                style={{ width: "100%" }}
                value={filters.process_classification}
                options={CLASSIFICATION_OPTIONS}
                onChange={(process_classification) =>
                  setFilters((current) => ({ ...current, process_classification }))
                }
              />
            </Col>
          </Row>
        </Card>

        {loading ? (
          <div className="page-loading">
            <Spin size="large" />
          </div>
        ) : (
          <Table
            className="endorsement-tracker-table"
            rowKey="endorsement_tracker_id"
            dataSource={filtered}
            columns={listColumns}
            scroll={{ x: 1200 }}
            pagination={{ pageSize: 25, showSizeChanger: true }}
            rowClassName={(row) =>
              row.endorsement_tracker_id === highlightedId
                ? "endorsement-tracker-row-highlight"
                : ""
            }
          />
        )}

        <Modal
          open={detailOpen}
          onCancel={handleCloseDetail}
          width={960}
          destroyOnHidden
          title={
            isCreateMode
              ? "New Endorsement"
              : form.endorsement_tracker_id
                ? `Endorsement ${form.endorsement_tracker_id}`
                : "Endorsement Details"
          }
          footer={
            <Space>
              <Button onClick={handleCloseDetail}>Close</Button>
              {fullEdit ? (
                <>
                  <Button icon={<ClearOutlined />} onClick={handleClear} disabled={saving}>
                    Clear
                  </Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => void handleSave()}
                    loading={saving}
                    disabled={!canSave || saving}
                  >
                    Save
                  </Button>
                </>
              ) : qaEdit ? (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={() => void handleSave()}
                  loading={saving}
                  disabled={!canSave || saving}
                >
                  Save QA Verification
                </Button>
              ) : null}
            </Space>
          }
        >
          {formError ? (
            <Alert type="error" showIcon message={formError} style={{ marginBottom: 16 }} />
          ) : null}
          {readOnly ? (
            <Alert
              type="info"
              showIcon
              message={
                meetingViewReadOnly
                  ? "Meeting view is read-only."
                  : qaOnly
                    ? "QA role: only QA verification fields are editable."
                    : "This page is view-only for your role."
              }
              style={{ marginBottom: 16 }}
            />
          ) : qaEdit ? (
            <Alert
              type="info"
              showIcon
              message="QA role: only QA verification name and date can be edited."
              style={{ marginBottom: 16 }}
            />
          ) : null}

          <Card size="small" title="Header" style={{ marginBottom: 16 }}>
            <Row gutter={[12, 12]}>
              <Col xs={24} md={8}>
                <Typography.Text type="secondary">Tracker ID</Typography.Text>
                <NaClearingInput
                  value={String(form.endorsement_tracker_id ?? "")}
                  readOnly
                  onChange={() => undefined}
                />
              </Col>
              <Col xs={24} md={8}>
                <Typography.Text type="secondary">Endorsement Number</Typography.Text>
                <NaClearingInput
                  value={String(form.endorsement_number ?? "")}
                  readOnly={headerFieldsReadOnly}
                  onChange={(endorsement_number) => patchForm({ endorsement_number })}
                />
              </Col>
              <Col xs={24} md={8}>
                <Typography.Text type="secondary">Status</Typography.Text>
                <Select
                  style={{ width: "100%" }}
                  disabled={headerFieldsReadOnly}
                  value={form.endorsement_status || undefined}
                  options={ENDORSEMENT_STATUS_OPTIONS.map((value) => ({ label: value, value }))}
                  onChange={(endorsement_status) => patchForm({ endorsement_status })}
                />
              </Col>
              <Col xs={24} md={8}>
                <Typography.Text type="secondary">Classification</Typography.Text>
                <Select
                  style={{ width: "100%" }}
                  disabled={identityFieldsReadOnly}
                  value={(form.process_classification as ProcessClassification) || "unset"}
                  options={CLASSIFICATION_OPTIONS}
                  onChange={(process_classification) => patchForm({ process_classification })}
                />
              </Col>

              {isProcess ? (
                <>
                  <Col xs={24} md={8}>
                    <Typography.Text type="secondary">
                      {identityFieldsReadOnly ? "Project" : "Project (optional)"}
                    </Typography.Text>
                    <Select
                      allowClear={!identityFieldsReadOnly}
                      showSearch
                      optionFilterProp="label"
                      style={{ width: "100%" }}
                      disabled={identityFieldsReadOnly}
                      placeholder={identityFieldsReadOnly ? "Linked from project" : "Link project"}
                      value={form.project_id || undefined}
                      options={projectOptions}
                      onChange={
                        identityFieldsReadOnly
                          ? undefined
                          : (value) => void applyProjectLink(value ?? null)
                      }
                    />
                  </Col>
                  <Col xs={24} md={8}>
                    <Typography.Text type="secondary">Product Name</Typography.Text>
                    <NaClearingInput
                      value={String(form.product_name ?? "")}
                      readOnly={productFieldsReadOnly}
                      onChange={
                        productFieldsReadOnly
                          ? () => undefined
                          : (product_name) => patchForm({ product_name })
                      }
                    />
                  </Col>
                  <Col xs={24} md={8}>
                    <Typography.Text type="secondary">Product Code</Typography.Text>
                    <NaClearingInput
                      value={String(form.product_code ?? "")}
                      readOnly={productFieldsReadOnly}
                      onChange={
                        productFieldsReadOnly
                          ? () => undefined
                          : (product_code) => patchForm({ product_code })
                      }
                    />
                  </Col>
                </>
              ) : null}

              {isNonProcess ? (
                <>
                  <Col xs={24} md={8}>
                    <Typography.Text type="secondary">Support Activity (optional)</Typography.Text>
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      style={{ width: "100%" }}
                      disabled={headerFieldsReadOnly}
                      placeholder="Link support activity"
                      value={form.support_activity_id || undefined}
                      options={supportOptions}
                      onChange={(value) => applySupportLink(value ?? null)}
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <Typography.Text type="secondary">Title / Activity Name</Typography.Text>
                    <NaClearingInput
                      value={String(form.non_process_description ?? "")}
                      readOnly={headerFieldsReadOnly}
                      sanitize={(value) => sanitizeAlphanumericInput(value).slice(0, 50)}
                      onChange={(non_process_description) =>
                        patchForm({
                          non_process_description: sanitizeAlphanumericInput(non_process_description).slice(
                            0,
                            50,
                          ),
                        })
                      }
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <Typography.Text type="secondary">Type of Validation</Typography.Text>
                    <CreatableNaSelect
                      value={String(form.type_of_validation ?? "")}
                      readOnly={headerFieldsReadOnly}
                      canManageOptions={canRemoveOptions}
                      options={typeOfValidationSelectOptions}
                      onChange={(type_of_validation) => patchForm({ type_of_validation })}
                      onCreateOption={fullEdit ? handleCreateTypeOfValidation : undefined}
                      onRemoveOption={
                        fullEdit && canRemoveOptions ? handleRemoveTypeOfValidation : undefined
                      }
                    />
                  </Col>
                </>
              ) : null}
            </Row>
          </Card>

          <Card
            size="small"
            title="Endorsement Items"
            extra={
              fullEdit ? (
                <Button size="small" icon={<PlusOutlined />} onClick={handleAddItem} disabled={saving}>
                  Add Item
                </Button>
              ) : null
            }
          >
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              {items.map((item) => {
                const itemId = String(item.item_id);
                return (
                  <Card
                    key={itemId}
                    size="small"
                    type="inner"
                    title={`Item ${item.item_number ?? ""}`}
                    extra={
                      fullEdit ? (
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          disabled={saving}
                          onClick={() => handleRemoveItem(item)}
                        >
                          Remove
                        </Button>
                      ) : null
                    }
                  >
                    <Row gutter={[12, 12]}>
                      <Col xs={24}>
                        <Typography.Text type="secondary">Endorsement Entry</Typography.Text>
                        <NaClearingTextArea
                          value={String(item.endorsement_entry ?? "")}
                          readOnly={itemCoreReadOnly}
                          onChange={(endorsement_entry) => patchItem(itemId, { endorsement_entry })}
                        />
                      </Col>
                      <Col xs={24} md={8}>
                        <Typography.Text type="secondary">Target Implementation Date</Typography.Text>
                        <AppDatePicker
                          value={String(item.target_implementation_date ?? "")}
                          readOnly={itemCoreReadOnly}
                          onChange={(target_implementation_date) =>
                            patchItem(itemId, { target_implementation_date })
                          }
                        />
                      </Col>
                      <Col xs={24} md={8}>
                        <Typography.Text type="secondary">Implemented By</Typography.Text>
                        <CreatableNaSelect
                          value={String(item.implemented_by ?? "")}
                          options={implementedBySelectOptions}
                          readOnly={itemCoreReadOnly}
                          canManageOptions={fullEdit && canRemoveOptions}
                          onChange={(implemented_by) => patchItem(itemId, { implemented_by })}
                          onCreateOption={fullEdit ? handleCreateImplementedBy : undefined}
                          onRemoveOption={
                            fullEdit && canRemoveOptions ? handleRemoveImplementedBy : undefined
                          }
                        />
                      </Col>
                      <Col xs={24} md={8}>
                        <Typography.Text type="secondary">Implementation Date</Typography.Text>
                        <AppDatePicker
                          value={String(item.implementation_date ?? "")}
                          readOnly={itemCoreReadOnly}
                          onChange={(implementation_date) =>
                            patchItem(itemId, { implementation_date })
                          }
                        />
                      </Col>
                      <Col xs={24} md={12}>
                        <Typography.Text type="secondary">Verified by Validation</Typography.Text>
                        <NaClearingInput
                          value={String(item.verified_by_validation ?? "")}
                          readOnly={itemCoreReadOnly}
                          onChange={(verified_by_validation) =>
                            patchItem(itemId, { verified_by_validation })
                          }
                        />
                      </Col>
                      <Col xs={24} md={12}>
                        <Typography.Text type="secondary">Validation Verification Date</Typography.Text>
                        <AppDatePicker
                          value={String(item.validation_verification_date ?? "")}
                          readOnly={itemCoreReadOnly}
                          onChange={(validation_verification_date) =>
                            patchItem(itemId, { validation_verification_date })
                          }
                        />
                      </Col>
                      <Col xs={24} md={12}>
                        <Typography.Text type="secondary">Verified by QA</Typography.Text>
                        <NaClearingInput
                          value={String(item.verified_by_qa ?? "")}
                          readOnly={itemQaReadOnly}
                          onChange={(verified_by_qa) => patchItem(itemId, { verified_by_qa })}
                        />
                      </Col>
                      <Col xs={24} md={12}>
                        <Typography.Text type="secondary">QA Verification Date</Typography.Text>
                        <AppDatePicker
                          value={String(item.qa_verification_date ?? "")}
                          readOnly={itemQaReadOnly}
                          onChange={(qa_verification_date) =>
                            patchItem(itemId, { qa_verification_date })
                          }
                        />
                      </Col>
                    </Row>
                  </Card>
                );
              })}
            </Space>
          </Card>
        </Modal>
      </div>
    </AppShell>
  );
}
