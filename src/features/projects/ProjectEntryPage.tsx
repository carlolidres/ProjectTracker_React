import {
  ClearOutlined,
  CompressOutlined,
  DeleteOutlined,
  ExpandAltOutlined,
  PlusOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { Alert, App, Button, Spin, Tooltip, Typography, message } from "antd";
import type { ButtonProps } from "antd";
import type { HookAPI } from "antd/es/modal/useModal";
import type { ReactNode } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  clearProjectEntryDraft,
  loadProjectEntryDraft,
  saveProjectEntryDraft,
  useFlushOnPageHide,
} from "@/lib/formDraftStorage";
import { diagLog, useDiagLifecycle } from "@/lib/sessionDiagnostics";
import { useAuth } from "@/app/auth-provider";
import { useDateAdjustment } from "@/app/date-adjustment-provider";
import { useMeetingViewReadOnly } from "@/app/meeting-view-provider";
import { useRegistry } from "@/app/registry-provider";
import { AppShell } from "@/components/layout/app-shell";
import { ProjectFieldControl } from "@/features/projects/components/ProjectFieldControl";
import {
  collectAllCollapseKeys,
  ProjectHierarchyForm,
} from "@/features/projects/components/ProjectHierarchyForm";
import { ProjectRoleTabs } from "@/features/projects/components/ProjectRoleTabs";
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
import { canArchiveRecords, canEditProjectFields, isViewerRole } from "@/lib/roleAccess";
import {
  cloneBatchDefaults,
  getCanonicalCnfEntryCount,
  syncProjectCnfEntryCounts,
} from "@/lib/projectHierarchy";
import { isMissingValue } from "@/lib/utils";
import { refreshAllNotifications } from "@/services/notificationService";
import {
  archiveProject,
  getProjectById,
  saveProject,
  updateProject,
} from "@/services/projectService";
import type { BatchControl, CnfEntry, MoControl, PoControl, ProjectHierarchy } from "@/types";

function emptyCnfEntry(): CnfEntry {
  return {
    cnf_reference: "",
    qrmr_ref_no: "",
    change_description: "",
    cnf_status: "",
    client_approval_target_date: "",
    remarks: "",
  };
}

function emptyPo(): PoControl {
  return {
    po_control_no: "",
    fg_month: "",
    business_unit: "",
    updatedDocsVer: "",
    order_quantity: "",
    uom: "",
    prod_ver: "",
    cnf_reference: "",
    qrmr_ref_no: "",
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
    val_report_no: "",
    Report_Sub_Status: "",
    Report_target_Date: "",
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
    batches: [emptyBatch()],
  };
}

export function ProjectEntryPage() {
  const { modal } = App.useApp();
  const { user, profile } = useAuth();
  useDiagLifecycle("ProjectEntryPage");
  const [searchParams] = useSearchParams();
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
  const stickyHeaderRef = useRef<HTMLDivElement>(null);

  const meetingViewReadOnly = useMeetingViewReadOnly();
  const canArchive = canArchiveRecords(profile?.role);
  const viewOnly = isViewerRole(profile?.role) || meetingViewReadOnly;
  const userRoleLabel = profile?.role ? (ROLE_LABELS[profile.role] ?? profile.role) : activeTab;
  const canEditActiveTab = useMemo(
    () => canEditProjectFields(profile?.role ?? "view", tabToFieldGroup(activeTab)),
    [profile?.role, activeTab],
  );
  const canEditHeaderFields = canEditProjectFields(profile?.role ?? "view", "am");

  const allCollapseKeys = useMemo(() => collectAllCollapseKeys(project), [project]);

  async function prepareNewProject() {
    const nextId = await getNextProjectId();
    const next = { ...emptyProject(), project_id: nextId };
    baselineProjectRef.current = structuredClone(next);
    setProject(next);
    setSavedFgMonths({});
    setOpenKeys([]);
    if (user?.id) clearProjectEntryDraft(user.id);
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (projectIdParam) {
        const existing = await getProjectById(projectIdParam);
        if (existing) {
          syncProjectCnfEntryCounts(existing);
          baselineProjectRef.current = structuredClone(existing);
          setProject(existing);
          setSavedFgMonths(collectSavedFgMonths(existing));
          setOpenKeys([]);
        }
      } else if (user?.id) {
        const draft = loadProjectEntryDraft(user.id);
        if (draft) {
          diagLog("form", "restored project entry draft from localStorage", {
            openKeys: draft.openKeys.length,
            activeTab: draft.activeTab,
          });
          syncProjectCnfEntryCounts(draft.project);
          baselineProjectRef.current = structuredClone(draft.project);
          setProject(draft.project);
          setSavedFgMonths(collectSavedFgMonths(draft.project));
          setOpenKeys(draft.openKeys);
          setActiveTab(draft.activeTab);
        } else {
          await prepareNewProject();
        }
      } else {
        await prepareNewProject();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectIdParam, user?.id]);

  const persistProjectDraft = useCallback(() => {
    if (projectIdParam || !user?.id || loading) return;
    saveProjectEntryDraft(user.id, { project, openKeys, activeTab });
  }, [project, openKeys, activeTab, projectIdParam, user?.id, loading]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (projectIdParam || !user?.id || loading) return;
    const timer = window.setTimeout(() => {
      persistProjectDraft();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [persistProjectDraft, projectIdParam, user?.id, loading]);

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

  async function confirmFgMonthAssignments() {
    const assignments = findNewFgMonthAssignments(project, savedFgMonths);
    if (!assignments.length) return true;

    return new Promise<boolean>((resolve) => {
      modal.confirm({
        title: "Confirm FG Month",
        content: (
          <div>
            <p>
              FG Month cannot be changed after it is saved. Please confirm you are sure about the
              following value{assignments.length > 1 ? "s" : ""}:
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
    if (!user?.email) return;
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
      if (isNew) {
        const result = await saveProject(project, user.email);
        message.success(`Project ${result.project_id} created`);
      } else {
        await updateProject(project.project_id, project, user.email, {
          dateAdjustmentsConfirmed: dateChanges.length > 0,
        });
        message.success("Project updated");
      }
      await refreshAllNotifications();
      if (user?.id) clearProjectEntryDraft(user.id);
      await prepareNewProject();
      message.info("Form cleared for next entry");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save project");
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

  function handleClear() {
    modal.confirm({
      title: "Clear project form?",
      content: "This will reset the current draft to a new empty project.",
      okText: "Clear",
      onOk: () => void prepareNewProject(),
    });
  }

  function copyFromFirstPo(batchIndex: number, moIndex: number, poIndex: number) {
    const firstPo = project.batches[0]?.mo_controls[0]?.po_controls[0];
    if (!firstPo || (batchIndex === 0 && moIndex === 0 && poIndex === 0)) return;
    setProject((current) => {
      const next = structuredClone(current);
      const target = next.batches[batchIndex].mo_controls[moIndex].po_controls[poIndex];
      target.cnf_reference = firstPo.cnf_reference;
      target.protocol_no = firstPo.protocol_no;
      target.protocol_Status = firstPo.protocol_Status;
      target.protocol_target_date = firstPo.protocol_target_date;
      target.Val_Strategy = firstPo.Val_Strategy;
      if (firstPo.cnf_entries?.length) {
        target.cnf_entries = structuredClone(firstPo.cnf_entries);
        const firstCnf = firstPo.cnf_entries[0];
        target.cnf_reference = firstCnf.cnf_reference;
        target.qrmr_ref_no = firstCnf.qrmr_ref_no;
        target.change_description = firstCnf.change_description;
        target.cnf_status = firstCnf.cnf_status;
        target.client_approval_target_date = firstCnf.client_approval_target_date;
        target.remarks = firstCnf.remarks;
      }
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
              title="Save Project"
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              disabled={viewOnly}
              onClick={() => void handleSave()}
            />
          </div>
        </div>

        <div className="project-form-body">
          <div className="project-header-section">
            <div className="project-form-grid">
              {HEADER_FIELDS.map((field) => (
                <ProjectFieldControl
                  key={field.key}
                  field={field}
                  value={String(project[field.key as keyof ProjectHierarchy] ?? "")}
                  readOnly={viewOnly && field.type !== "readonly"}
                  disabled={field.type === "readonly" || (!canEditHeaderFields && !viewOnly)}
                  registry={registry}
                  onChange={(value) => updateProjectHead(field.key as keyof ProjectHierarchy, value)}
                />
              ))}
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
          />

          {activeTab === "AM/BM/PL" ? (
            <div className="project-form-actions">
              <Button
                icon={<PlusOutlined />}
                disabled={!canEditActiveTab || viewOnly}
                onClick={addBatch}
              >
                Add Batch
              </Button>
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
