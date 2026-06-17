import { CopyOutlined, DeleteOutlined, DisconnectOutlined, LinkOutlined, LockOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Collapse, Space, Tag, Tooltip, Typography } from "antd";
import { ProjectFieldControl } from "@/features/projects/components/ProjectFieldControl";
import {
  BATCH_FIELDS,
  CNF_FIELDS,
  MO_FIELDS,
  PO_FIELDS_BY_TAB,
  PO_ORDER_QUANTITY_UOM_KEYS,
  PROJECT_LEVEL_VAL_FIELDS,
  QA_CNF_FIELDS,
  type ProjectFieldDef,
  type ProjectTab,
  projectTabKey,
} from "@/lib/projectFormFields";
import { buildFieldDomId } from "@/lib/duplicateReview";
import { isCnfMotherLinked, isCnfMotherUnlinked, motherProjectUrl } from "@/lib/cnfMotherLink";
import { isFgMonthLocked } from "@/lib/fgMonthLock";
import { bmrLockReason, isBmrFieldKey, isBmrLockedForBatch, isProjectBmrLocked } from "@/lib/bmrLock";
import { applyQrmrTargetDatesFromFgMonth } from "@/lib/qrmrFgMonth";
import { endorsementDateFromValidationTarget, isPoFieldDisabledByValNotApplicable, isQaCnfFieldDisabledByNotApplicable } from "@/lib/valReportDates";
import {
  clonePoForAdd,
  emptyCnfEntry,
  getCanonicalCnfEntryCount,
  isCanonicalPo,
  syncProjectCnfEntryCounts,
} from "@/lib/projectHierarchy";
import type { CnfEntry, PoControl, ProjectCnfMotherLink, ProjectHierarchy } from "@/types";
import { generateHierarchyId, isMissingValue, valueOrNA } from "@/lib/utils";
import { useDiagLifecycle } from "@/lib/sessionDiagnostics";

import {
  batchKey,
  cnfKey,
  moKey,
  poKey,
} from "@/lib/projectCollapseKeys";

export { batchKey, cnfKey, moKey, poKey } from "@/lib/projectCollapseKeys";

export function collectHierarchyKeys(project: ProjectHierarchy): string[] {
  const keys: string[] = [];
  project.batches.forEach((batch, batchIndex) => {
    keys.push(batchKey(batch, batchIndex));
    batch.mo_controls.forEach((mo, moIndex) => {
      keys.push(moKey(mo, batchIndex, moIndex));
      mo.po_controls.forEach((po, poIndex) => {
        keys.push(poKey(po, batchIndex, moIndex, poIndex));
      });
    });
  });
  return keys;
}

export function collectAllCollapseKeys(project: ProjectHierarchy): string[] {
  const keys = collectHierarchyKeys(project);
  project.batches.forEach((batch, batchIndex) => {
    batch.mo_controls.forEach((mo, moIndex) => {
      mo.po_controls.forEach((po, poIndex) => {
        const poKeyValue = poKey(po, batchIndex, moIndex, poIndex);
        const entryCount = po.cnf_entries?.length ?? 1;
        for (let cnfIndex = 0; cnfIndex < entryCount; cnfIndex += 1) {
          keys.push(cnfKey(poKeyValue, cnfIndex));
        }
      });
    });
  });
  return keys;
}

function mergeOpenKeys(
  current: string[],
  scopeKeys: string[],
  nextScopeActive: string | string[],
): string[] {
  const active = Array.isArray(nextScopeActive) ? nextScopeActive : [String(nextScopeActive)];
  const scope = new Set(scopeKeys);
  const preserved = current.filter((key) => !scope.has(key));
  return [...preserved, ...active];
}

interface ProjectHierarchyFormProps {
  project: ProjectHierarchy;
  activeTab: ProjectTab;
  registry: Record<string, string[]>;
  canEdit: boolean;
  viewOnly?: boolean;
  openKeys: string[];
  onOpenKeysChange: (keys: string[]) => void;
  onChange: (project: ProjectHierarchy) => void;
  onCopyFromFirstPo: (batchIndex: number, moIndex: number, poIndex: number) => void;
  savedFgMonths?: Record<string, string>;
  cnfMotherLink?: ProjectCnfMotherLink;
  canCopyCnfFromProject?: boolean;
  onRequestCopyCnf?: () => void;
  onRequestUnlinkCnf?: () => void;
  onBlockedLinkedCnfEdit?: () => void;
  onBlockedLinkedCnfNumberChange?: () => void;
}

function displayLabel(value: string, fallback: string) {
  const normalized = valueOrNA(value);
  return normalized === "N/A" ? fallback : normalized;
}

function poFieldValue(po: PoControl, key: string): string {
  return String((po as unknown as Record<string, string>)[key] ?? "");
}

function setPoFieldValue(po: PoControl, key: string, value: string) {
  (po as unknown as Record<string, string>)[key] = value;
}

function visiblePoFields(fields: ProjectFieldDef[], batchIndex: number): ProjectFieldDef[] {
  if (batchIndex === 0) return fields;
  return fields.filter((field) => !field.projectLevelVal);
}

function groupPoFieldsForRender(fields: ProjectFieldDef[]): ProjectFieldDef[][] {
  const groups: ProjectFieldDef[][] = [];
  let index = 0;
  while (index < fields.length) {
    const field = fields[index];
    const next = fields[index + 1];
    if (
      field.key === PO_ORDER_QUANTITY_UOM_KEYS[0] &&
      next?.key === PO_ORDER_QUANTITY_UOM_KEYS[1]
    ) {
      groups.push([field, next]);
      index += 2;
      continue;
    }
    groups.push([field]);
    index += 1;
  }
  return groups;
}

export function ProjectHierarchyForm({
  project,
  activeTab,
  registry,
  canEdit,
  viewOnly = false,
  openKeys,
  onOpenKeysChange,
  onChange,
  onCopyFromFirstPo,
  savedFgMonths = {},
  cnfMotherLink,
  canCopyCnfFromProject = false,
  onRequestCopyCnf,
  onRequestUnlinkCnf,
  onBlockedLinkedCnfEdit,
  onBlockedLinkedCnfNumberChange,
}: ProjectHierarchyFormProps) {
  useDiagLifecycle("ProjectHierarchyForm");
  const isAmTab = activeTab === "AM/BM/PL";
  const isQaTab = activeTab === "QA";
  const showCnfSection = isAmTab || isQaTab;
  const cnfFieldsForTab = isQaTab ? QA_CNF_FIELDS : CNF_FIELDS;
  const isTsdTab = activeTab === "TSD";
  const poFields = PO_FIELDS_BY_TAB(activeTab);
  const showTsdBmrLockBanner = isTsdTab && isProjectBmrLocked(project);
  const cnfLinked = isCnfMotherLinked(cnfMotherLink);
  const cnfUnlinked = isCnfMotherUnlinked(cnfMotherLink);
  const canModifyHierarchy = canEdit && !viewOnly;
  const canModifyCnf = canModifyHierarchy && !cnfLinked;
  const fieldLockProps = {
    readOnly: viewOnly,
    disabled: !canEdit && !viewOnly,
  };
  const allBatchKeys = project.batches.map((batch, batchIndex) => batchKey(batch, batchIndex));

  function updatePo(
    batchIndex: number,
    moIndex: number,
    poIndex: number,
    updater: (po: PoControl) => void,
  ) {
    const next = structuredClone(project);
    updater(next.batches[batchIndex].mo_controls[moIndex].po_controls[poIndex]);
    onChange(next);
  }

  function poFieldDisplayValue(
    fieldKey: string,
    po: PoControl,
    batchIndex: number,
    moIndex: number,
    poIndex: number,
  ): string {
    if (fieldKey === "so_no") {
      const poValue = poFieldValue(po, fieldKey);
      if (!isMissingValue(poValue)) return poValue;
      if (isCanonicalPo(batchIndex, moIndex, poIndex)) {
        return String(project.so_no ?? "");
      }
      return "";
    }
    if (PROJECT_LEVEL_VAL_FIELDS.has(fieldKey)) {
      const poValue = poFieldValue(po, fieldKey);
      if (!isMissingValue(poValue)) return poValue;
      if (isCanonicalPo(batchIndex, moIndex, poIndex)) {
        return String((project as unknown as Record<string, string>)[fieldKey] ?? "");
      }
      return "";
    }
    return poFieldValue(po, fieldKey);
  }

  function updateCnfEntry(
    batchIndex: number,
    moIndex: number,
    poIndex: number,
    cnfIndex: number,
    key: keyof CnfEntry,
    value: string,
  ) {
    if (cnfLinked) {
      if (key === "cnf_reference") {
        onBlockedLinkedCnfNumberChange?.();
      } else {
        onBlockedLinkedCnfEdit?.();
      }
      return;
    }
    updatePo(batchIndex, moIndex, poIndex, (po) => {
      const entries = po.cnf_entries?.length ? [...po.cnf_entries] : [emptyCnfEntry()];
      entries[cnfIndex] = { ...entries[cnfIndex], [key]: value };
      po.cnf_entries = entries;
      if (cnfIndex === 0) {
        setPoFieldValue(po, key, value);
      }
    });
  }

  const batchItems = project.batches.map((batch, batchIndex) => {
    const batchKeyValue = batchKey(batch, batchIndex);
    const batchLabel = displayLabel(batch.unique_batch, `Batch ${batchIndex + 1}`);
    const batchMoKeys = batch.mo_controls.map((mo, moIndex) => moKey(mo, batchIndex, moIndex));
    const bmrLocked = isTsdTab && isBmrLockedForBatch(project, batchIndex);

    const moItems = batch.mo_controls.map((mo, moIndex) => {
      const moKeyValue = moKey(mo, batchIndex, moIndex);
      const moLabel = displayLabel(mo.mo_control_no, `MO ${moIndex + 1}`);
      const moPoKeys = mo.po_controls.map((po, poIndex) => poKey(po, batchIndex, moIndex, poIndex));

      const poItems = mo.po_controls.map((po, poIndex) => {
        const poKeyValue = poKey(po, batchIndex, moIndex, poIndex);
        const poLabel = displayLabel(po.po_control_no, `PO ${poIndex + 1}`);
        const cnfEntries = po.cnf_entries?.length ? po.cnf_entries : [emptyCnfEntry()];

        const poCnfKeys = cnfEntries.map((_, cnfIndex) => cnfKey(poKeyValue, cnfIndex));

        return {
          key: poKeyValue,
          label: poLabel,
          className: "project-hierarchy-po",
          extra: isAmTab ? (
            <Space size={4} onClick={(e) => e.stopPropagation()}>
              {poIndex > 0 ? (
                <Button
                  size="small"
                  disabled={!canModifyHierarchy}
                  onClick={() => onCopyFromFirstPo(batchIndex, moIndex, poIndex)}
                >
                  Copy from 1st PO
                </Button>
              ) : null}
              {mo.po_controls.length > 1 ? (
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={!canModifyHierarchy}
                  onClick={() => {
                    const next = structuredClone(project);
                    next.batches[batchIndex].mo_controls[moIndex].po_controls.splice(poIndex, 1);
                    onChange(next);
                  }}
                >
                  Remove
                </Button>
              ) : null}
            </Space>
          ) : null,
          children: (
            <div className="project-form-grid project-po-form-grid">
              {groupPoFieldsForRender(visiblePoFields(poFields, batchIndex)).map(
                (group) => {
                  const renderField = (field: ProjectFieldDef) => {
                    const fgMonthLocked =
                      field.key === "fg_month" &&
                      isFgMonthLocked(savedFgMonths, batchIndex, moIndex, poIndex);
                    const bmrFieldLocked = bmrLocked && isBmrFieldKey(field.key);
                    const valNaDisabled = isPoFieldDisabledByValNotApplicable(po, field.key);

                    return (
                    <ProjectFieldControl
                      key={field.key}
                      field={field}
                      domId={buildFieldDomId({
                        level: "po",
                        batchIndex,
                        moIndex,
                        poIndex,
                        fieldKey: field.key,
                      })}
                      value={poFieldDisplayValue(field.key, po, batchIndex, moIndex, poIndex)}
                      readOnly={fieldLockProps.readOnly || fgMonthLocked || bmrFieldLocked || valNaDisabled}
                      disabled={fieldLockProps.disabled || valNaDisabled}
                      registry={registry}
                      onChange={(value) => {
                        const next = structuredClone(project);
                        const target = next.batches[batchIndex].mo_controls[moIndex].po_controls[poIndex];
                        setPoFieldValue(target, field.key, value);
                        if (field.key === "fg_month") {
                          applyQrmrTargetDatesFromFgMonth(target);
                        }
                        if (field.key === "so_no" && isCanonicalPo(batchIndex, moIndex, poIndex)) {
                          next.so_no = value;
                        }
                        if (PROJECT_LEVEL_VAL_FIELDS.has(field.key) && isCanonicalPo(batchIndex, moIndex, poIndex)) {
                          (next as unknown as Record<string, string>)[field.key] = value;
                        }
                        if (
                          field.key === "validation_report_target_date" &&
                          isCanonicalPo(batchIndex, moIndex, poIndex)
                        ) {
                          const endorsementDate = endorsementDateFromValidationTarget(value);
                          if (endorsementDate) {
                            target.endorsement_acceptance_target_date = endorsementDate;
                          }
                        }
                        onChange(next);
                      }}
                    />
                  );
                  };

                  if (group.length === 2) {
                    return (
                      <div
                        key="order-quantity-uom"
                        className="project-field-order-qty-group project-field-span-2"
                      >
                        {group.map((field) => renderField(field))}
                      </div>
                    );
                  }

                  return renderField(group[0]);
                },
              )}
              {showCnfSection ? (
                <div className="project-cnf-list project-field-span-3">
                  <div className="project-cnf-heading">
                    <h4>{isQaTab ? "QRMR Entries" : "CNF Entries"}</h4>
                    {isAmTab && isCanonicalPo(batchIndex, moIndex, poIndex) ? (
                      <Space size={4}>
                        {cnfLinked ? (
                          <Tag color="blue">Linked to Mother Project</Tag>
                        ) : null}
                        {cnfUnlinked ? (
                          <Tag color="gold">Unlinked — assign new unique CNF number(s)</Tag>
                        ) : null}
                        {canCopyCnfFromProject && !cnfLinked && !cnfMotherLink ? (
                          <Tooltip title="Copy from another Project">
                            <Button
                              size="small"
                              icon={<CopyOutlined />}
                              disabled={!canModifyHierarchy}
                              onClick={() => onRequestCopyCnf?.()}
                            />
                          </Tooltip>
                        ) : null}
                        {canCopyCnfFromProject && cnfLinked ? (
                          <Tooltip title="Unlink from Mother Project">
                            <Button
                              size="small"
                              icon={<DisconnectOutlined />}
                              disabled={!canModifyHierarchy}
                              onClick={() => onRequestUnlinkCnf?.()}
                            />
                          </Tooltip>
                        ) : null}
                        {canModifyCnf ? (
                          <Button
                            size="small"
                            icon={<PlusOutlined />}
                            disabled={!canModifyCnf}
                            onClick={() => {
                              const next = structuredClone(project);
                              const canonicalPo = next.batches[0].mo_controls[0].po_controls[0];
                              const entries = [...(canonicalPo.cnf_entries ?? [emptyCnfEntry()])];
                              entries.push(emptyCnfEntry());
                              canonicalPo.cnf_entries = entries;
                              syncProjectCnfEntryCounts(next);
                              onChange(next);
                            }}
                          >
                            CNF Entry
                          </Button>
                        ) : null}
                      </Space>
                    ) : null}
                  </div>
                  {cnfMotherLink?.mother_project_id ? (
                    <div className="project-cnf-mother-banner">
                      <Typography.Text type="secondary">Mother Project: </Typography.Text>
                      <a
                        href={motherProjectUrl(cnfMotherLink.mother_project_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {cnfMotherLink.mother_project_id}
                      </a>
                      {cnfLinked ? (
                        <Typography.Text type="secondary"> — copied CNF entries are read-only while linked.</Typography.Text>
                      ) : (
                        <Typography.Text type="secondary"> — historical reference after unlinking.</Typography.Text>
                      )}
                    </div>
                  ) : null}
                  {cnfEntries.map((entry, cnfIndex) => (
                    <Collapse
                      key={`${poKeyValue}-cnf-${cnfIndex}`}
                      size="small"
                      className="project-cnf-card"
                      activeKey={openKeys}
                      onChange={(keys) =>
                        onOpenKeysChange(mergeOpenKeys(openKeys, poCnfKeys, keys))
                      }
                      items={[
                        {
                          key: cnfKey(poKeyValue, cnfIndex),
                          label: isQaTab
                            ? `CNF Entry ${cnfIndex + 1}${entry.cnf_reference ? `: ${valueOrNA(entry.cnf_reference)}` : ""}`
                            : `CNF Entry ${cnfIndex + 1}`,
                          extra:
                            isAmTab && isCanonicalPo(batchIndex, moIndex, poIndex) && cnfIndex === 0 ? (
                              <Space size={4} onClick={(e) => e.stopPropagation()}>
                                {canCopyCnfFromProject && !cnfLinked && !cnfMotherLink ? (
                                  <Tooltip title="Copy from another Project">
                                    <Button
                                      size="small"
                                      type="text"
                                      icon={<LinkOutlined />}
                                      disabled={!canModifyHierarchy}
                                      onClick={() => onRequestCopyCnf?.()}
                                    />
                                  </Tooltip>
                                ) : null}
                                {canCopyCnfFromProject && cnfLinked ? (
                                  <Tooltip title="Unlink from Mother Project">
                                    <Button
                                      size="small"
                                      type="text"
                                      icon={<DisconnectOutlined />}
                                      disabled={!canModifyHierarchy}
                                      onClick={() => onRequestUnlinkCnf?.()}
                                    />
                                  </Tooltip>
                                ) : null}
                                {canModifyCnf && cnfEntries.length > 1 ? (
                                  <Button
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                    disabled={!canModifyCnf}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const next = structuredClone(project);
                                      const canonicalPo = next.batches[0].mo_controls[0].po_controls[0];
                                      const entries = [...(canonicalPo.cnf_entries ?? [emptyCnfEntry()])];
                                      if (entries.length <= 1) return;
                                      entries.splice(cnfIndex, 1);
                                      canonicalPo.cnf_entries = entries;
                                      syncProjectCnfEntryCounts(next);
                                      onChange(next);
                                    }}
                                  >
                                    Remove
                                  </Button>
                                ) : null}
                              </Space>
                            ) : isAmTab && isCanonicalPo(batchIndex, moIndex, poIndex) && canModifyCnf && cnfEntries.length > 1 ? (
                              <Button
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                disabled={!canModifyCnf}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const next = structuredClone(project);
                                  const canonicalPo = next.batches[0].mo_controls[0].po_controls[0];
                                  const entries = [...(canonicalPo.cnf_entries ?? [emptyCnfEntry()])];
                                  if (entries.length <= 1) return;
                                  entries.splice(cnfIndex, 1);
                                  canonicalPo.cnf_entries = entries;
                                  syncProjectCnfEntryCounts(next);
                                  onChange(next);
                                }}
                              >
                                Remove
                              </Button>
                            ) : null,
                          children: (
                            <div className="project-form-grid">
                              {cnfFieldsForTab.map((field) => {
                                const qaNaDisabled = isQaCnfFieldDisabledByNotApplicable(entry, field.key);
                                const cnfReadOnly =
                                  fieldLockProps.readOnly
                                  || cnfLinked
                                  || (isQaTab && (field.key === "cnf_reference" || field.key === "change_description"));
                                return (
                                <ProjectFieldControl
                                  key={field.key}
                                  field={field}
                                  domId={buildFieldDomId({
                                    level: "cnf",
                                    batchIndex,
                                    moIndex,
                                    poIndex,
                                    cnfIndex,
                                    fieldKey: field.key,
                                  })}
                                  value={String(entry[field.key as keyof CnfEntry] ?? "")}
                                  readOnly={cnfReadOnly}
                                  disabled={fieldLockProps.disabled || cnfLinked || qaNaDisabled}
                                  registry={registry}
                                  onChange={(value) =>
                                    updateCnfEntry(
                                      batchIndex,
                                      moIndex,
                                      poIndex,
                                      cnfIndex,
                                      field.key as keyof CnfEntry,
                                      value,
                                    )
                                  }
                                />
                              );
                              })}
                            </div>
                          ),
                        },
                      ]}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ),
        };
      });

      return {
        key: moKeyValue,
        label: `MO ${moIndex + 1}: ${moLabel}`,
        className: "project-hierarchy-mo",
        extra: isAmTab ? (
          <Space size={4} onClick={(e) => e.stopPropagation()}>
            <Button
              size="small"
              icon={<PlusOutlined />}
              disabled={!canModifyHierarchy}
              onClick={() => {
                const next = structuredClone(project);
                const mo = next.batches[batchIndex].mo_controls[moIndex];
                const referencePo = mo.po_controls[0];
                if (!referencePo) return;
                const cnfCount = getCanonicalCnfEntryCount(next);
                mo.po_controls.push(clonePoForAdd(referencePo, cnfCount));
                syncProjectCnfEntryCounts(next);
                onChange(next);
              }}
            >
              PO
            </Button>
            {batch.mo_controls.length > 1 ? (
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={!canModifyHierarchy}
                onClick={() => {
                  const next = structuredClone(project);
                  next.batches[batchIndex].mo_controls.splice(moIndex, 1);
                  onChange(next);
                }}
              >
                Remove
              </Button>
            ) : null}
          </Space>
        ) : null,
        children: (
          <Space direction="vertical" style={{ width: "100%" }} size={12}>
            {isAmTab ? (
              <div className="project-hierarchy-key-field">
                <ProjectFieldControl
                  field={MO_FIELDS[0]}
                  domId={buildFieldDomId({
                    level: "mo",
                    batchIndex,
                    moIndex,
                    fieldKey: MO_FIELDS[0].key,
                  })}
                  value={mo.mo_control_no}
                  {...fieldLockProps}
                  registry={registry}
                  onChange={(value) => {
                    const next = structuredClone(project);
                    next.batches[batchIndex].mo_controls[moIndex].mo_control_no = value;
                    onChange(next);
                  }}
                />
              </div>
            ) : null}
            <Collapse
              items={poItems}
              activeKey={openKeys}
              onChange={(keys) => onOpenKeysChange(mergeOpenKeys(openKeys, moPoKeys, keys))}
            />
          </Space>
        ),
      };
    });

    return {
      key: batchKeyValue,
      label: `Batch ${batchIndex + 1}: ${batchLabel}`,
      className: "project-hierarchy-batch",
      extra: isAmTab ? (
        <Space size={4} onClick={(e) => e.stopPropagation()}>
          <Button
            size="small"
            icon={<PlusOutlined />}
            disabled={!canModifyHierarchy}
            onClick={() => {
              const next = structuredClone(project);
              const referencePo = next.batches[batchIndex].mo_controls[0]?.po_controls[0];
              const cnfCount = getCanonicalCnfEntryCount(next);
              const templatePo = referencePo ? clonePoForAdd(referencePo, cnfCount) : structuredClone({
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
                change_description: "",
                cnf_status: "",
                client_approval_target_date: "",
                remarks: "",
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
                cnf_entries: [emptyCnfEntry()],
              } as PoControl);
              if (!referencePo) {
                templatePo.po_instance_id = generateHierarchyId("PO");
                templatePo.po_control_no = "";
              }
              next.batches[batchIndex].mo_controls.push({
                mo_instance_id: generateHierarchyId("MO"),
                mo_control_no: "",
                po_controls: [templatePo],
              });
              syncProjectCnfEntryCounts(next);
              onChange(next);
            }}
          >
            MO
          </Button>
          {project.batches.length > 1 ? (
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={!canModifyHierarchy}
              onClick={() => {
                const next = structuredClone(project);
                next.batches.splice(batchIndex, 1);
                onChange(next);
              }}
            >
              Remove
            </Button>
          ) : null}
        </Space>
      ) : null,
      children: (
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          {isAmTab ? (
            <div className="project-hierarchy-key-field">
              <ProjectFieldControl
                field={BATCH_FIELDS[0]}
                domId={buildFieldDomId({
                  level: "batch",
                  batchIndex,
                  fieldKey: BATCH_FIELDS[0].key,
                })}
                value={batch.unique_batch}
                {...fieldLockProps}
                registry={registry}
                onChange={(value) => {
                  const next = structuredClone(project);
                  next.batches[batchIndex].unique_batch = value;
                  onChange(next);
                }}
              />
            </div>
          ) : null}
          <Collapse
            items={moItems}
            activeKey={openKeys}
            onChange={(keys) => onOpenKeysChange(mergeOpenKeys(openKeys, batchMoKeys, keys))}
          />
        </Space>
      ),
    };
  });

  return (
    <div className={`project-tab-layer project-tab-layer-${projectTabKey(activeTab)}`}>
      {showTsdBmrLockBanner ? (
        <div className="project-bmr-lock-banner project-bmr-lock-banner-tab">
          <LockOutlined aria-hidden />
          <Typography.Text>{bmrLockReason(project)}</Typography.Text>
        </div>
      ) : null}
      <Collapse
        items={batchItems}
        activeKey={openKeys}
        onChange={(keys) => onOpenKeysChange(mergeOpenKeys(openKeys, allBatchKeys, keys))}
      />
    </div>
  );
}
