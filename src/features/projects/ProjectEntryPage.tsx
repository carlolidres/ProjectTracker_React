import {
  ClearOutlined,
  CompressOutlined,
  DeleteOutlined,
  ExpandAltOutlined,
  PlusOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { Alert, App, Button, Input, Spin, Tooltip, Typography, message } from "antd";
import type { ButtonProps } from "antd";
import type { HookAPI } from "antd/es/modal/useModal";
import type { ReactNode } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  clearProjectEntryDraft,
  loadProjectEntryDraft,
  saveProjectEntryDraft,
  useDebouncedDraftPersist,
  useFlushOnPageHide,
} from "@/lib/formDraftStorage";
import { diagLog, useDiagLifecycle } from "@/lib/sessionDiagnostics";
import { useAuth } from "@/app/auth-provider";
import { useDateAdjustment } from "@/app/date-adjustment-provider";
import { useMeetingViewReadOnly } from "@/app/meeting-view-provider";
import { useRegistry } from "@/app/registry-provider";
import { AppShell } from "@/components/layout/app-shell";
import { FieldHelpIcon } from "@/components/common/field-help-icon";
import { ProjectFieldControl } from "@/features/projects/components/ProjectFieldControl";
import { CopyCnfFromProjectModal } from "@/features/projects/components/CopyCnfFromProjectModal";
import { CnfCreateModal } from "@/features/cnf-tracker/CnfCreateModal";
import { CnfTrackerSelectModal } from "@/features/cnf-tracker/CnfTrackerSelectModal";
import {
  collectAllCollapseKeys,
  ProjectHierarchyForm,
} from "@/features/projects/components/ProjectHierarchyForm";
import { ProjectRoleTabs } from "@/features/projects/components/ProjectRoleTabs";
import {
  applyNewProductFromCnf,
  applyTrackerToCnfEntry,
  cnfEntryHasExistingData,
  emptyCnfTrackerHeaderFields,
  type CnfTrackerHeaderFields,
} from "@/lib/cnfProjectIntegration";
import {
  getCnfTrackerById,
  listActiveCnfTrackerRecords,
  saveCnfTrackerRecord,
} from "@/services/cnfTrackerService";
import {
  listProjectIdsForTrackerRecord,
  upsertProjectCnfTrackerLink,
} from "@/services/cnfTrackerLinkService";
import { saveRegistryValue } from "@/services/registryService";
import { CnfDuplicateError, type CnfTrackerRecord } from "@/types/cnfTracker";
import { logAuditTrail } from "@/services/auditService";
import {
  detectDuplicateValues,
  filterDuplicatesByTab,
  focusDuplicateField,
  getLastOccurrence,
  type DuplicateGroup,
} from "@/lib/duplicateReview";
import { buildCollapseKeysForOccurrence } from "@/lib/projectCollapseKeys";
import {
  collectSavedFgMonths,
  findNewFgMonthAssignments,
} from "@/lib/fgMonthLock";
import { getNextProjectId } from "@/lib/idGeneration";
import {
  HEADER_FIELDS,
  type ProjectTab,
  tabToFieldGroup,
} from "@/lib/projectFormFields";
import { ROLE_LABELS } from "@/lib/constants";
import { collectProjectDateChanges } from "@/lib/dateAdjustmentReview";
import { canArchiveRecords, canCopyCnfFromProject, canEditCnfTracker, canEditProjectFields, isAdminRole, isViewerRole } from "@/lib/roleAccess";
import { projectBmrLockStatusLabel } from "@/lib/bmrLock";
import { getProfileFirstName } from "@/lib/profileName";
import {
  cloneBatchDefaults,
  copyPoFieldsFromFirstPo,
  getCanonicalCnfEntryCount,
  syncProjectCnfEntryCounts,
} from "@/lib/projectHierarchy";
import { formatServiceError, isMissingValue, toTitleCase, valueOrNA } from "@/lib/utils";
import { emitLogicViolation, isLogicViolationError } from "@/lib/logicViolationEvents";
import { emitProjectDataChanged } from "@/lib/projectDataEvents";
import { emitNotificationsRefreshed } from "@/lib/notificationEvents";
import { refreshAllNotificationsWithRetry } from "@/services/notificationService";
import {
  attachCnfLinkToProject,
  copyAndLinkCnfFromMother,
  listEligibleMotherProjectSummaries,
  logBlockedLinkedCnfEdit,
  logBlockedLinkedCnfNumberChange,
  unlinkChildFromMother,
} from "@/services/cnfLinkService";
import {
  archiveProject,
  getProjectById,
  saveProject,
  updateProject,
} from "@/services/projectService";
import type { BatchControl, CnfEntry, MoControl, PoControl, ProjectHierarchy, ProjectSummaryForCnfCopy, Profile } from "@/types";

function emptyCnfEntry(): CnfEntry {
  return {
    cnf_reference: "",
    qrmr_ref_no: "",
    qrmr_status: "",
    qrmr_target_date: "",
    risk_control: "",
    change_description: "",
    cnf_status: "",
    client_approval_target_date: "",
    remarks: "",
  };
}

function emptyPo(): PoControl {
  return {
    so_no: "",
    po_control_no: "",
    fg_month: "",
    business_unit: "",
    updatedDocsVer: "",
    order_quantity: "",
    uom: "",
    prod_ver: "",
    cnf_reference: "",
    qrmr_ref_no: "",
    qrmr_status: "",
    qrmr_target_date: "",
    risk_control: "",
    change_description: "",
    cnf_status: "",
    client_approval_target_date: "",
    remarks: "",
    cnf_entries: [emptyCnfEntry()],
    manufacturing_start_week: "",
    mo_bmr_po_submission_status: "",
    mo_bmr_po_target_date: "",
    mo_bmr_po_activation_status: "",
    mo_bmr_po_activation_date: "",
    protocol_no: "",
    protocol_Status: "",
    protocol_target_date: "",
    Val_Activity: "",
    Val_Stability: "",
    Val_Batch_Seq_No: "",
    Val_Strategy: "",
    Val_Strategy_remarks: "",
    val_interim_report_no: "",
    val_interim_report_status: "",
    val_interim_report_target_date: "",
    validation_report_no: "",
    validation_report_status: "",
    validation_report_target_date: "",
    endorsement_report_no: "",
    endorsement_report_status: "",
    endorsement_acceptance_target_date: "",
    ar_availability_date: "",
    packaging_schedule: "",
    final_status: "OPEN",
    final_status_other: "",
  };
}

function emptyMo(): MoControl {
  return { mo_control_no: "", po_controls: [emptyPo()] };
}

function emptyBatch(): BatchControl {
  return { unique_batch: "", mo_controls: [emptyMo()] };
}

function confirmDuplicateReview(
  modal: HookAPI,
  duplicates: DuplicateGroup[],
  activeTab: ProjectTab,
  onNavigate: (group: DuplicateGroup) => void,
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const navigateToGroup = (group: DuplicateGroup) => {
      instance.destroy();
      settle(false);
      onNavigate(group);
    };

    const instance = modal.confirm({
      title: "Duplicate values detected",
      width: 620,
      content: (
        <div className="duplicate-review-modal">
          <p>
            Duplicate values were detected in <strong>{activeTab}</strong> fields. Click a field or
            location to jump to the last duplicate, then edit or save again.
          </p>
          {duplicates.slice(0, 8).map((group) => (
            <section key={`${group.fieldKey}-${group.value}`}>
              <button
                type="button"
                className="duplicate-review-field-link"
                onClick={() => navigateToGroup(group)}
              >
                <Typography.Text strong>{group.fieldLabel}: </Typography.Text>
                <Typography.Text code>{group.value}</Typography.Text>
              </button>
              <ul>
                {group.occurrences.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="duplicate-review-location"
                      onClick={() => navigateToGroup(group)}
                    >
                      {item.location}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {duplicates.length > 8 ? (
            <Typography.Text type="secondary">
              {duplicates.length - 8} more duplicate group(s) not shown.
            </Typography.Text>
          ) : null}
        </div>
      ),
      okText: "Accept and save",
      cancelText: "Go back and edit",
      onOk: () => settle(true),
      onCancel: () => settle(false),
    });
  });
}

function emptyProject(): ProjectHierarchy {
  return {
    project_id: "N/A",
    project_owner: "",
    activity_type: "",
    client_name: "",
    so_no: "",
    fg_code: "",
    product_name: "",
    validation_report_no: "",
    validation_report_status: "",
    validation_report_target_date: "",
    batches: [emptyBatch()],
  };
}

function withDefaultProjectOwner(project: ProjectHierarchy, profile: Profile | null | undefined): ProjectHierarchy {
  if (isAdminRole(profile?.role) || !isMissingValue(project.project_owner)) {
    return project;
  }
  const firstName = getProfileFirstName(profile);
  return firstName ? { ...project, project_owner: firstName } : project;
}

function applyProjectOwnerSavePolicy(
  project: ProjectHierarchy,
  profile: Profile | null | undefined,
  isNew: boolean,
  baseline: ProjectHierarchy,
): ProjectHierarchy {
  const withOwner = (() => {
    if (isAdminRole(profile?.role)) return project;
    if (isNew) {
      const firstName = getProfileFirstName(profile);
      return firstName ? { ...project, project_owner: firstName } : project;
    }
    return { ...project, project_owner: baseline.project_owner };
  })();

  return {
    ...withOwner,
    client_name: toTitleCase(withOwner.client_name),
    product_name: toTitleCase(withOwner.product_name),
  };
}

const PROJECT_SAVE_MESSAGE_KEY = "project-save";

export function ProjectEntryPage() {
  const { modal, message: messageApi } = App.useApp();
  const { user, profile } = useAuth();
  useDiagLifecycle("ProjectEntryPage");
  const [searchParams, setSearchParams] = useSearchParams();
  const projectIdParam = searchParams.get("projectId");
  const { registry } = useRegistry();
  const { promptBatchDateAdjustment } = useDateAdjustment();
  const [project, setProject] = useState<ProjectHierarchy>(emptyProject());
  const baselineProjectRef = useRef<ProjectHierarchy>(emptyProject());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProjectTab>("AM/BM/PL");
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [savedFgMonths, setSavedFgMonths] = useState<Record<string, string>>({});
  const [copyCnfModalOpen, setCopyCnfModalOpen] = useState(false);
  const [copyCnfModalLoading, setCopyCnfModalLoading] = useState(false);
  const [copyCnfActionLoading, setCopyCnfActionLoading] = useState(false);
  const [eligibleMotherProjects, setEligibleMotherProjects] = useState<ProjectSummaryForCnfCopy[]>([]);
  const [cnfTrackerRecords, setCnfTrackerRecords] = useState<CnfTrackerRecord[]>([]);
  const [insertCnfOpen, setInsertCnfOpen] = useState(false);
  const [createCnfOpen, setCreateCnfOpen] = useState(false);
  const [createCnfFields, setCreateCnfFields] = useState<CnfTrackerHeaderFields>(emptyCnfTrackerHeaderFields());
  const [createCnfSaving, setCreateCnfSaving] = useState(false);
  const [createCnfError, setCreateCnfError] = useState<string | null>(null);
  const [createCnfDuplicateHint, setCreateCnfDuplicateHint] = useState<string | null>(null);
  const [pendingTrackerRecordId, setPendingTrackerRecordId] = useState<string | null>(null);
  const [siblingProjectIds, setSiblingProjectIds] = useState<string[]>([]);
  const stickyHeaderRef = useRef<HTMLDivElement>(null);
  const skipNextLoadRef = useRef(false);

  const meetingViewReadOnly = useMeetingViewReadOnly();
  const canArchive = canArchiveRecords(profile?.role);
  const viewOnly = isViewerRole(profile?.role) || meetingViewReadOnly;
  const userRoleLabel = profile?.role ? (ROLE_LABELS[profile.role] ?? profile.role) : activeTab;
  const canEditActiveTab = useMemo(
    () => canEditProjectFields(profile?.role ?? "view", tabToFieldGroup(activeTab)),
    [profile?.role, activeTab],
  );
  const canEditHeaderFields = canEditProjectFields(profile?.role ?? "view", "am");
  const canUseCnfCopy = canCopyCnfFromProject(profile?.role) && !viewOnly;
  const canCreateCnfTracker = canEditCnfTracker(profile?.role) && !viewOnly;
  const canEditProjectOwner = isAdminRole(profile?.role) && canEditHeaderFields && !viewOnly;
  const cnfTrackerIdParam = searchParams.get("cnfTrackerId");
  const isProjectDirty = JSON.stringify(project) !== JSON.stringify(baselineProjectRef.current);

  const allCollapseKeys = useMemo(() => collectAllCollapseKeys(project), [project]);
  const bmrLockStatus = useMemo(() => projectBmrLockStatusLabel(project), [project]);
  const bmrLockTooltip =
    "Locked when a VAL/VER/CHAR study exists and Endorsement Report Status is not yet Approved or Not Applicable. Unlocked after endorsement is Approved or Not Applicable. Not Applicable when no validation study applies.";

  async function prepareNewProject() {
    const nextId = await getNextProjectId();
    const next = withDefaultProjectOwner({ ...emptyProject(), project_id: nextId }, profile);
    baselineProjectRef.current = structuredClone(next);
    setProject(next);
    setSavedFgMonths({});
    setOpenKeys([]);
    setPendingTrackerRecordId(null);
    setSiblingProjectIds([]);
    if (user?.id) clearProjectEntryDraft(user.id);
    if (projectIdParam || cnfTrackerIdParam) {
      skipNextLoadRef.current = true;
      setSearchParams({}, { replace: true });
    }
  }

  function applyTrackerIntoProject(tracker: CnfTrackerRecord, cnfIndex = 0, confirmOverwrite = true) {
    setProject((current) => {
      const next = structuredClone(current);
      const po = next.batches[0]?.mo_controls[0]?.po_controls[0];
      if (!po) return current;
      const entries = [...(po.cnf_entries ?? [emptyCnfEntry()])];
      while (entries.length <= cnfIndex) entries.push(emptyCnfEntry());
      const existing = entries[cnfIndex];
      if (confirmOverwrite && cnfEntryHasExistingData(existing) && existing.cnf_tracker_record_id !== tracker.record_id) {
        // Confirm is handled by caller; if we reach here with confirmOverwrite true and data exists, still apply after caller confirmed.
      }
      entries[cnfIndex] = applyTrackerToCnfEntry(existing, tracker);
      po.cnf_entries = entries;
      if (cnfIndex === 0) {
        po.cnf_reference = entries[0].cnf_reference;
        po.change_description = entries[0].change_description;
        po.qrmr_ref_no = entries[0].qrmr_ref_no;
      }
      if (next.batches[0] && !isMissingValue(tracker.unique_batch_no)) {
        next.batches[0].unique_batch = valueOrNA(tracker.unique_batch_no);
      }
      syncProjectCnfEntryCounts(next);
      return next;
    });
    if (tracker.record_id) setPendingTrackerRecordId(tracker.record_id);
  }

  async function confirmOverwriteCnfIfNeeded(entry: CnfEntry | undefined): Promise<boolean> {
    if (!cnfEntryHasExistingData(entry)) return true;
    return new Promise((resolve) => {
      modal.confirm({
        title: "Replace existing CNF data?",
        content: "This project already has CNF fields filled. Selecting another CNF will overwrite them.",
        okText: "Replace",
        cancelText: "Cancel",
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  }

  async function handleSelectCnfTracker(record: CnfTrackerRecord, cnfIndex = 0) {
    const entry = project.batches[0]?.mo_controls[0]?.po_controls[0]?.cnf_entries?.[cnfIndex];
    const allowed = await confirmOverwriteCnfIfNeeded(entry);
    if (!allowed) return;
    if (entry?.cnf_tracker_record_id && entry.cnf_tracker_record_id === record.record_id) {
      message.info("This CNF is already linked to the project.");
      return;
    }
    applyTrackerIntoProject(record, cnfIndex, false);
    setInsertCnfOpen(false);
    if (user?.email) {
      void logAuditTrail({
        module: "Projects",
        action: "CNF_SELECT",
        recordId: String(record.record_id ?? record.cnf_tracker_id),
        projectId: project.project_id,
        fieldName: "cnf_tracker_record_id",
        oldValue: entry?.cnf_tracker_record_id ?? "",
        newValue: record.record_id ?? "",
        remarks: `Selected CNF ${record.cnf_reference}`,
        userEmail: user.email,
      });
    }
    if (record.record_id) {
      try {
        setSiblingProjectIds(await listProjectIdsForTrackerRecord(record.record_id));
      } catch {
        setSiblingProjectIds([]);
      }
    }
    message.success(`Inserted CNF ${record.cnf_reference}`);
  }

  async function handleCreateCnfFromProject(allowProbable = false) {
    if (!user?.email || !canCreateCnfTracker) return;
    setCreateCnfSaving(true);
    setCreateCnfError(null);
    setCreateCnfDuplicateHint(null);
    try {
      const saved = await saveCnfTrackerRecord(
        {
          cnf_tracker_id: "N/A",
          cnf_reference: createCnfFields.cnf_reference,
          cnf_initiator: createCnfFields.cnf_initiator,
          cnf_details: createCnfFields.cnf_details,
          product_name: createCnfFields.product_name,
          client_name: createCnfFields.client_name,
          qrmr_no: createCnfFields.qrmr_no,
          unique_batch_no: createCnfFields.unique_batch_no,
          change_description: createCnfFields.change_description,
          tracker_status: "Open",
          allowProbableDuplicate: allowProbable,
        },
        user.email,
      );
      setCnfTrackerRecords((current) => [saved, ...current.filter((r) => r.cnf_tracker_id !== saved.cnf_tracker_id)]);
      applyTrackerIntoProject(saved, 0, false);
      setCreateCnfOpen(false);
      setCreateCnfFields(emptyCnfTrackerHeaderFields());
      message.success(`CNF ${saved.cnf_tracker_id} created and inserted`);
    } catch (err) {
      if (err instanceof CnfDuplicateError) {
        setCreateCnfDuplicateHint(err.existing.cnf_reference);
        setCreateCnfError(err.message);
        if (err.reason === "probable") {
          modal.confirm({
            title: "Related CNF found",
            content: err.message,
            okText: "Save anyway",
            cancelText: "Cancel",
            onOk: () => void handleCreateCnfFromProject(true),
          });
        }
        return;
      }
      setCreateCnfError(err instanceof Error ? err.message : "Failed to create CNF");
    } finally {
      setCreateCnfSaving(false);
    }
  }

  async function handleNewProduct() {
    if (viewOnly || !canEditHeaderFields) return;
    if (isProjectDirty) {
      const leave = await new Promise<boolean>((resolve) => {
        modal.confirm({
          title: "Unsaved changes",
          content: "The current project has unsaved changes. Continue to create a new product under this CNF?",
          okText: "Continue",
          cancelText: "Stay",
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
      if (!leave) return;
    }

    const source = structuredClone(project);
    const trackerId = pendingTrackerRecordId
      ?? source.batches[0]?.mo_controls[0]?.po_controls[0]?.cnf_entries?.[0]?.cnf_tracker_record_id;
    let tracker: CnfTrackerRecord | null = null;
    if (trackerId) {
      tracker = cnfTrackerRecords.find((r) => r.record_id === trackerId) ?? null;
      if (!tracker) {
        try {
          const byId = await listActiveCnfTrackerRecords();
          tracker = byId.find((r) => r.record_id === trackerId) ?? null;
        } catch {
          tracker = null;
        }
      }
    }

    await prepareNewProject();
    setProject((blank) => applyNewProductFromCnf(blank, source, tracker));
    if (tracker?.record_id) {
      setPendingTrackerRecordId(tracker.record_id);
      try {
        setSiblingProjectIds(await listProjectIdsForTrackerRecord(tracker.record_id));
      } catch {
        setSiblingProjectIds([]);
      }
    }
    if (user?.email) {
      void logAuditTrail({
        module: "Projects",
        action: "NEW_PRODUCT",
        recordId: tracker?.record_id ?? "",
        projectId: "pending",
        fieldName: "cnf_tracker_record_id",
        oldValue: source.project_id,
        newValue: tracker?.cnf_reference ?? "",
        remarks: "Started new product under shared CNF",
        userEmail: user.email,
      });
    }
    message.success("New product form ready under the same CNF");
  }

  function focusFirstProjectField() {
    window.requestAnimationFrame(() => {
      const node = document.getElementById("project-first-field-control");
      if (node instanceof HTMLElement) {
        node.focus();
      }
    });
  }

  function restoreProjectDraft(draft: ReturnType<typeof loadProjectEntryDraft>) {
    if (!draft) return;
    diagLog("form", "restored project entry draft from localStorage", {
      openKeys: draft.openKeys.length,
      activeTab: draft.activeTab,
      projectIdParam: draft.projectIdParam,
    });
    syncProjectCnfEntryCounts(draft.project);
    const restored = withDefaultProjectOwner(draft.project, profile);
    baselineProjectRef.current = structuredClone(restored);
    setProject(restored);
    setSavedFgMonths(draft.savedFgMonths);
    setOpenKeys(draft.openKeys);
    setActiveTab(draft.activeTab);
  }

  const load = useCallback(async () => {
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false;
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const draft = user?.id ? loadProjectEntryDraft(user.id) : null;
      let trackers: CnfTrackerRecord[] = [];
      try {
        trackers = await listActiveCnfTrackerRecords();
        setCnfTrackerRecords(trackers);
      } catch {
        setCnfTrackerRecords([]);
      }

      if (projectIdParam) {
        const requestedId = projectIdParam.trim();
        const existing = await getProjectById(requestedId);
        if (existing) {
          syncProjectCnfEntryCounts(existing);
          const withLink = await attachCnfLinkToProject(existing);
          baselineProjectRef.current = structuredClone(withLink);
          setProject(withLink);
          setSavedFgMonths(collectSavedFgMonths(withLink));
          setOpenKeys([]);
          if (user?.id) clearProjectEntryDraft(user.id);
          const entryTrackerId = withLink.batches[0]?.mo_controls[0]?.po_controls[0]?.cnf_entries?.[0]?.cnf_tracker_record_id;
          if (entryTrackerId) {
            try {
              setSiblingProjectIds(await listProjectIdsForTrackerRecord(entryTrackerId));
              setPendingTrackerRecordId(entryTrackerId);
            } catch {
              setSiblingProjectIds([]);
            }
          } else {
            setSiblingProjectIds([]);
            setPendingTrackerRecordId(null);
          }
        } else {
          setError(`Project "${requestedId}" was not found in the Project Database.`);
          const empty = emptyProject();
          baselineProjectRef.current = structuredClone(empty);
          setProject(empty);
          setSavedFgMonths({});
          setOpenKeys([]);
          if (user?.id) clearProjectEntryDraft(user.id);
        }
      } else if (cnfTrackerIdParam) {
        await prepareNewProject();
        const tracker = await getCnfTrackerById(cnfTrackerIdParam);
        if (tracker) {
          applyTrackerIntoProject(tracker);
          if (tracker.record_id) {
            setPendingTrackerRecordId(tracker.record_id);
            try {
              setSiblingProjectIds(await listProjectIdsForTrackerRecord(tracker.record_id));
            } catch {
              setSiblingProjectIds([]);
            }
          }
        } else {
          setError(`CNF Tracker "${cnfTrackerIdParam}" was not found.`);
        }
      } else if (draft) {
        restoreProjectDraft(draft);
      } else {
        await prepareNewProject();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectIdParam, cnfTrackerIdParam, setSearchParams, user?.id, profile]);

  const persistProjectDraft = useCallback(() => {
    if (!user?.id || loading) return;
    saveProjectEntryDraft(user.id, {
      project,
      openKeys,
      activeTab,
      projectIdParam,
      savedFgMonths,
    });
  }, [project, openKeys, activeTab, projectIdParam, savedFgMonths, user?.id, loading]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (projectIdParam || loading || isAdminRole(profile?.role)) return;
    setProject((current) => {
      const next = withDefaultProjectOwner(current, profile);
      return next.project_owner === current.project_owner ? current : next;
    });
  }, [profile?.first_name, profile?.role, projectIdParam, loading, profile]);

  useDebouncedDraftPersist(persistProjectDraft, Boolean(user?.id && !loading));

  useFlushOnPageHide(persistProjectDraft);

  useLayoutEffect(() => {
    if (loading) return;

    const node = stickyHeaderRef.current;
    if (!node) return;

    const panel = node.closest(".project-panel") as HTMLElement | null;
    const syncStickyHeaderHeight = () => {
      if (!panel) return;
      const height = node.getBoundingClientRect().height;
      panel.style.setProperty("--project-sticky-header-height", `${height}px`);
    };

    syncStickyHeaderHeight();
    const observer = new ResizeObserver(syncStickyHeaderHeight);
    observer.observe(node);
    window.addEventListener("resize", syncStickyHeaderHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncStickyHeaderHeight);
    };
  }, [loading, project.product_name, project.client_name, project.project_id, meetingViewReadOnly]);

  function updateProjectHead(field: keyof ProjectHierarchy, value: string) {
    setProject((current) => ({ ...current, [field]: value }));
  }

  function navigateToDuplicateGroup(group: DuplicateGroup) {
    const target = getLastOccurrence(group);
    setActiveTab(target.tab);
    const keysToOpen = buildCollapseKeysForOccurrence(project, target);
    setOpenKeys((current) => Array.from(new Set([...current, ...keysToOpen])));
    window.requestAnimationFrame(() => {
      window.setTimeout(() => focusDuplicateField(target.fieldDomId), 120);
    });
    message.info(`Opened ${target.location} for review.`);
  }

  async function openCopyCnfModal() {
    if (!canUseCnfCopy || project.project_id === "N/A") {
      message.warning("Save this project before copying CNF entries from another project.");
      return;
    }
    setCopyCnfModalOpen(true);
    setCopyCnfModalLoading(true);
    try {
      const projects = await listEligibleMotherProjectSummaries(project.project_id);
      setEligibleMotherProjects(projects);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to load projects");
      setCopyCnfModalOpen(false);
    } finally {
      setCopyCnfModalLoading(false);
    }
  }

  async function handleCopyCnfFromMother(motherProjectId: string) {
    if (!user?.email) return;
    setCopyCnfActionLoading(true);
    setError(null);
    try {
      const { project: linkedProject } = await copyAndLinkCnfFromMother(project, motherProjectId, user.email);
      syncProjectCnfEntryCounts(linkedProject);
      baselineProjectRef.current = structuredClone(linkedProject);
      setProject(linkedProject);
      setCopyCnfModalOpen(false);
      message.success(`Copied CNF entries from ${motherProjectId} and linked as read-only.`);
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "Failed to copy CNF entries";
      setError(messageText);
      message.error(messageText);
    } finally {
      setCopyCnfActionLoading(false);
    }
  }

  function requestUnlinkCnf() {
    if (!user?.email || !project.cnf_mother_link?.mother_project_id) return;
    const motherId = project.cnf_mother_link.mother_project_id;
    const childId = project.project_id;
    modal.confirm({
      title: "Unlink from Mother Project",
      content: (
        <div>
          <p>Unlinking will make the copied CNF entries independent in this child project.</p>
          <ul>
            <li>Future updates from Mother Project {motherId} will no longer apply.</li>
            <li>CNF entries will become editable in this project.</li>
            <li>You must assign a new unique CNF number before saving.</li>
            <li>The Mother Project CNF number cannot be reused after unlinking.</li>
          </ul>
        </div>
      ),
      okText: "Unlink",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          const link = await unlinkChildFromMother(childId, user.email!);
          setProject((current) => ({ ...current, cnf_mother_link: link }));
          message.info("CNF entries are now independent. Assign new unique CNF number(s) before saving.");
        } catch (err) {
          message.error(err instanceof Error ? err.message : "Failed to unlink from mother project");
        }
      },
    });
  }

  function handleBlockedLinkedCnfEdit() {
    const motherId = project.cnf_mother_link?.mother_project_id ?? "the mother project";
    message.warning(
      `Linked CNF entries are read-only and controlled by Mother Project ${motherId}. Edit them in the mother project.`,
    );
    const childId = project.project_id;
    if (!user?.email || !project.cnf_mother_link?.mother_project_id || childId === "N/A") return;
    void logBlockedLinkedCnfEdit(childId, project.cnf_mother_link.mother_project_id, user.email);
  }

  function handleBlockedLinkedCnfNumberChange() {
    handleBlockedLinkedCnfEdit();
    const childId = project.project_id;
    const motherId = project.cnf_mother_link?.mother_project_id;
    if (!user?.email || !motherId || childId === "N/A") return;
    void logBlockedLinkedCnfNumberChange(childId, motherId, user.email);
  }

  async function confirmFgMonthAssignments() {
    const assignments = findNewFgMonthAssignments(project, savedFgMonths);
    if (!assignments.length) return true;

    return new Promise<boolean>((resolve) => {
      modal.confirm({
        title: "Confirm FG Month",
        content: (
          <div>
            <p>
              Please confirm you are sure about the following FG Month
              value{assignments.length > 1 ? "s" : ""}. After save, only Admin and
              AM/BM/PL can change FG Month, and a reason will be required for Lessons
              Learned.
            </p>
            <ul>
              {assignments.map((item) => (
                <li key={item.path}>
                  <strong>{item.label}:</strong> {item.displayValue}
                </li>
              ))}
            </ul>
          </div>
        ),
        okText: "Yes, save FG Month",
        cancelText: "Review again",
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  }

  async function handleSave(skipDuplicateReview = false) {
    if (!user?.email) {
      const sessionMessage = user
        ? "Your account email is missing. Contact an administrator before saving."
        : "Your session has expired. Sign in again to save this project.";
      setError(sessionMessage);
      message.error(sessionMessage);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (!skipDuplicateReview) {
        const roleDuplicates = filterDuplicatesByTab(detectDuplicateValues(project), activeTab);
        if (roleDuplicates.length) {
          const confirmed = await confirmDuplicateReview(
            modal,
            roleDuplicates,
            activeTab,
            navigateToDuplicateGroup,
          );
          if (!confirmed) {
            return;
          }
        }
      }

      const fgMonthConfirmed = await confirmFgMonthAssignments();
      if (!fgMonthConfirmed) {
        return;
      }

      const dateChanges = collectProjectDateChanges(baselineProjectRef.current, project);
      if (dateChanges.length) {
        const approved = await promptBatchDateAdjustment(dateChanges, userRoleLabel);
        if (!approved) return;
      }

      const isNew = !projectIdParam;
      const payload = applyProjectOwnerSavePolicy(project, profile, isNew, baselineProjectRef.current);
      let savedProjectId = payload.project_id;

      messageApi.open({
        type: "loading",
        content: (
          <span role="status" aria-live="polite">
            Saving project...
          </span>
        ),
        key: PROJECT_SAVE_MESSAGE_KEY,
        duration: 0,
      });

      if (isNew) {
        const result = await saveProject(payload, user.email);
        savedProjectId = result.project_id;
      } else {
        await updateProject(payload.project_id, payload, user.email, {
          dateAdjustmentsConfirmed: dateChanges.length > 0,
        });
      }

      const trackerRecordId =
        pendingTrackerRecordId
        ?? payload.batches[0]?.mo_controls[0]?.po_controls[0]?.cnf_entries?.[0]?.cnf_tracker_record_id;
      if (trackerRecordId && savedProjectId && savedProjectId !== "N/A") {
        try {
          await upsertProjectCnfTrackerLink(trackerRecordId, savedProjectId, user.email, {
            actionLabel: isNew ? "CNF linked on project create" : "CNF linked on project save",
          });
        } catch (linkError) {
          console.error("CNF tracker link failed after project save:", linkError);
          messageApi.warning("Project saved, but CNF link could not be stored. Retry save if needed.");
        }
      }

      messageApi.open({
        type: "loading",
        content: (
          <span role="status" aria-live="polite">
            Processing related updates...
          </span>
        ),
        key: PROJECT_SAVE_MESSAGE_KEY,
        duration: 0,
      });

      try {
        await refreshAllNotificationsWithRetry();
        emitNotificationsRefreshed();
      } catch (notificationError) {
        console.error(
          "Notification refresh failed after project save:",
          formatServiceError(notificationError, "Unknown notification refresh error"),
        );
      }

      emitProjectDataChanged({
        projectId: savedProjectId,
        action: isNew ? "create" : "update",
      });
      if (user?.id) clearProjectEntryDraft(user.id);
      await prepareNewProject();
      focusFirstProjectField();

      messageApi.success({
        content: (
          <span role="status" aria-live="polite">
            Successfully save!
          </span>
        ),
        key: PROJECT_SAVE_MESSAGE_KEY,
        duration: 5,
      });
    } catch (err) {
      messageApi.destroy(PROJECT_SAVE_MESSAGE_KEY);
      const errorMessage = formatServiceError(err, "Failed to save project.");
      if (isLogicViolationError(errorMessage)) {
        emitLogicViolation({ message: errorMessage, projectId: project.project_id });
      }
      setError(errorMessage);
      messageApi.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!user?.email || project.project_id === "N/A") return;
    modal.confirm({
      title: "Archive project?",
      content: "This will mark all PO lines as inactive.",
      okText: "Archive",
      okButtonProps: { danger: true },
      onOk: async () => {
        await archiveProject(project.project_id, user.email!);
        message.success("Project archived");
        setProject(emptyProject());
      },
    });
  }

  function clearUnsavedChanges() {
    const baseline = structuredClone(baselineProjectRef.current);
    syncProjectCnfEntryCounts(baseline);
    setProject(baseline);
    setSavedFgMonths(collectSavedFgMonths(baseline));
    setOpenKeys((current) => {
      const valid = new Set(collectAllCollapseKeys(baseline));
      return current.filter((key) => valid.has(key));
    });
    if (user?.id) {
      saveProjectEntryDraft(user.id, {
        project: baseline,
        openKeys,
        activeTab,
        projectIdParam,
        savedFgMonths: collectSavedFgMonths(baseline),
      });
    }
  }

  function handleClear() {
    modal.confirm({
      title: "Clear project form?",
      content: "This will clear all unsaved inputs.",
      okText: "Clear",
      onOk: () => clearUnsavedChanges(),
    });
  }

  function copyFromFirstPo(batchIndex: number, moIndex: number, poIndex: number) {
    if (poIndex === 0) return;
    setProject((current) => {
      const next = structuredClone(current);
      const source = next.batches[batchIndex]?.mo_controls[moIndex]?.po_controls[0];
      const target = next.batches[batchIndex]?.mo_controls[moIndex]?.po_controls[poIndex];
      if (!source || !target) return current;
      copyPoFieldsFromFirstPo(target, source);
      return next;
    });
    message.info("Copied fields from first PO");
  }

  function addBatch() {
    if (viewOnly) return;
    const next = structuredClone(project);
    const cnfCount = getCanonicalCnfEntryCount(next);
    next.batches.push(cloneBatchDefaults(next.batches[0] ?? emptyBatch(), cnfCount));
    syncProjectCnfEntryCounts(next);
    setProject(next);
    setOpenKeys((keys) => {
      const valid = new Set(collectAllCollapseKeys(next));
      return keys.filter((key) => valid.has(key));
    });
    message.success("Batch 1 values copied as editable defaults.");
  }

  const productTitle = isMissingValue(project.product_name) ? "New Project" : project.product_name.trim();
  const clientSubtitle = isMissingValue(project.client_name) ? "N/A" : project.client_name.trim();
  const projectIdLabel = project.project_id !== "N/A" ? project.project_id : "New Project";

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

      <div className="project-panel">
        <div className="project-sticky-header" ref={stickyHeaderRef}>
          <div className="project-sticky-header-text">
            <span className="project-header-label">
              {projectIdLabel}
            </span>
            <h2>{productTitle}</h2>
            <p className={isMissingValue(project.client_name) ? "project-header-client-na" : undefined}>
              {clientSubtitle}
            </p>
          </div>
          <div className="project-sticky-header-actions">
            <ProjectStickyActionButton
              title="Expand All"
              icon={<ExpandAltOutlined />}
              onClick={() => setOpenKeys(allCollapseKeys)}
            />
            <ProjectStickyActionButton
              title="Collapse All"
              icon={<CompressOutlined />}
              onClick={() => setOpenKeys([])}
            />
            <ProjectStickyActionButton
              title="New Project"
              icon={<PlusOutlined />}
              disabled={viewOnly}
              onClick={() => void prepareNewProject()}
            />
            {project.project_id !== "N/A" && canArchive ? (
              <ProjectStickyActionButton
                title="Archive Project"
                icon={<DeleteOutlined />}
                danger
                disabled={viewOnly}
                onClick={() => void handleArchive()}
              />
            ) : null}
            <ProjectStickyActionButton
              title="Clear"
              icon={<ClearOutlined />}
              disabled={viewOnly}
              onClick={handleClear}
            />
            <ProjectStickyActionButton
              title={saving ? "Saving project" : "Save Project"}
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              disabled={viewOnly || saving}
              onClick={() => void handleSave()}
            />
          </div>
        </div>

        <div className="project-form-body">
          <div className="project-header-section">
            <div className="project-form-grid">
              {HEADER_FIELDS.map((field) => {
                const isProjectOwnerField = field.key === "project_owner";
                const headerReadOnly = viewOnly && field.type !== "readonly";
                const headerDisabled =
                  field.type === "readonly" ||
                  (!viewOnly && (
                    (isProjectOwnerField && !canEditProjectOwner) ||
                    (!isProjectOwnerField && !canEditHeaderFields)
                  ));
                return (
                  <ProjectFieldControl
                    key={field.key}
                    field={field}
                    domId={field.key === "project_owner" ? "project-first-field" : undefined}
                    value={String(project[field.key as keyof ProjectHierarchy] ?? "")}
                    readOnly={headerReadOnly}
                    disabled={headerDisabled}
                    registry={registry}
                    onChange={(value) => updateProjectHead(field.key as keyof ProjectHierarchy, value)}
                  />
                );
              }).flatMap((control, index) => {
                const field = HEADER_FIELDS[index];
                if (field?.key !== "fg_code") return [control];
                return [
                  control,
                  <div key="bmr-lock-status" className="project-field project-field-bmr-lock">
                    <label className="project-field-label" htmlFor="project-bmr-lock-status">
                      <FieldHelpIcon title={bmrLockTooltip} />
                      <span className="project-field-label-text">BMR Lock Status</span>
                    </label>
                    <Input id="project-bmr-lock-status" value={bmrLockStatus} readOnly disabled />
                  </div>,
                ];
              })}
            </div>
          </div>

          <ProjectRoleTabs activeTab={activeTab} onChange={setActiveTab} />

          <ProjectHierarchyForm
            project={project}
            activeTab={activeTab}
            registry={registry}
            canEdit={canEditActiveTab}
            viewOnly={viewOnly}
            openKeys={openKeys}
            onOpenKeysChange={setOpenKeys}
            onChange={(next) => {
              setProject(next);
              setOpenKeys((current) => {
                const valid = new Set(collectAllCollapseKeys(next));
                return current.filter((key) => valid.has(key));
              });
            }}
            onCopyFromFirstPo={copyFromFirstPo}
            savedFgMonths={savedFgMonths}
            userRole={profile?.role}
            cnfMotherLink={project.cnf_mother_link}
            canCopyCnfFromProject={canUseCnfCopy}
            onRequestCopyCnf={() => void openCopyCnfModal()}
            onRequestUnlinkCnf={requestUnlinkCnf}
            onBlockedLinkedCnfEdit={handleBlockedLinkedCnfEdit}
            onBlockedLinkedCnfNumberChange={handleBlockedLinkedCnfNumberChange}
            cnfTrackerRecords={cnfTrackerRecords}
            canCreateCnfTracker={canCreateCnfTracker}
            onRequestInsertCnf={() => setInsertCnfOpen(true)}
            onRequestNewCnf={() => {
              setCreateCnfFields(emptyCnfTrackerHeaderFields());
              setCreateCnfError(null);
              setCreateCnfDuplicateHint(null);
              setCreateCnfOpen(true);
            }}
            onSelectCnfTracker={(record, cnfIndex) => void handleSelectCnfTracker(record, cnfIndex)}
          />

          <CopyCnfFromProjectModal
            open={copyCnfModalOpen}
            loading={copyCnfModalLoading || copyCnfActionLoading}
            projects={eligibleMotherProjects}
            onCancel={() => setCopyCnfModalOpen(false)}
            onConfirm={(motherProjectId) => void handleCopyCnfFromMother(motherProjectId)}
          />

          <CnfTrackerSelectModal
            open={insertCnfOpen}
            records={cnfTrackerRecords}
            canCreate={canCreateCnfTracker}
            onCancel={() => setInsertCnfOpen(false)}
            onSelect={(record) => void handleSelectCnfTracker(record, 0)}
            onNewCnf={() => {
              setInsertCnfOpen(false);
              setCreateCnfFields(emptyCnfTrackerHeaderFields());
              setCreateCnfError(null);
              setCreateCnfDuplicateHint(null);
              setCreateCnfOpen(true);
            }}
          />

          <CnfCreateModal
            open={createCnfOpen}
            fields={createCnfFields}
            saving={createCnfSaving}
            error={createCnfError}
            productOptions={(registry.cnf_product ?? []).map((value) => ({ value }))}
            clientOptions={(registry.cnf_client ?? []).map((value) => ({ value }))}
            canManageOptions={canCreateCnfTracker}
            existingReferenceHint={createCnfDuplicateHint}
            onChange={setCreateCnfFields}
            onCancel={() => setCreateCnfOpen(false)}
            onSave={() => void handleCreateCnfFromProject(false)}
            onCreateProduct={async (value) => {
              if (!user?.email) return;
              await saveRegistryValue("cnf_product", value, value, user.email);
            }}
            onCreateClient={async (value) => {
              if (!user?.email) return;
              await saveRegistryValue("cnf_client", value, value, user.email);
            }}
          />

          {activeTab === "AM/BM/PL" ? (
            <div className="project-form-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <Button
                icon={<PlusOutlined />}
                disabled={!canEditActiveTab || viewOnly}
                onClick={addBatch}
              >
                Add Batch
              </Button>
              <Tooltip title="Add another product under this CNF">
                <Button
                  disabled={!canEditHeaderFields || viewOnly}
                  onClick={() => void handleNewProduct()}
                >
                  New Product
                </Button>
              </Tooltip>
              {siblingProjectIds.length > 1 ? (
                <Typography.Text type="secondary">
                  Products under CNF:{" "}
                  {siblingProjectIds.map((id, index) => (
                    <span key={id}>
                      {index > 0 ? ", " : ""}
                      <Typography.Link
                        onClick={() => {
                          skipNextLoadRef.current = false;
                          setSearchParams({ projectId: id });
                        }}
                      >
                        {id}
                      </Typography.Link>
                    </span>
                  ))}
                </Typography.Text>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

interface ProjectStickyActionButtonProps extends ButtonProps {
  title: string;
  icon: ReactNode;
}

function ProjectStickyActionButton({
  title,
  icon,
  disabled,
  ...buttonProps
}: ProjectStickyActionButtonProps) {
  const button = (
    <Button
      {...buttonProps}
      className="project-sticky-action-btn"
      icon={icon}
      disabled={disabled}
      aria-label={title}
    />
  );

  if (disabled) {
    return (
      <Tooltip title={title}>
        <span className="project-sticky-action-btn-wrap">{button}</span>
      </Tooltip>
    );
  }

  return <Tooltip title={title}>{button}</Tooltip>;
}
