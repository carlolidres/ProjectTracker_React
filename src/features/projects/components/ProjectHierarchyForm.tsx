import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Collapse, Space } from "antd";
import { ProjectFieldControl } from "@/features/projects/components/ProjectFieldControl";
import {
  BATCH_FIELDS,
  CNF_FIELDS,
  MO_FIELDS,
  PO_FIELDS_BY_TAB,
  PO_ORDER_QUANTITY_UOM_KEYS,
  PROJECT_LEVEL_PO_FIELDS,
  type ProjectFieldDef,
  type ProjectTab,
  projectTabKey,
} from "@/lib/projectFormFields";
import { buildFieldDomId } from "@/lib/duplicateReview";
import { isFgMonthLocked } from "@/lib/fgMonthLock";
import {
  clonePoForAdd,
  emptyCnfEntry,
  getCanonicalCnfEntryCount,
  isCanonicalPo,
  syncProjectCnfEntryCounts,
} from "@/lib/projectHierarchy";
import type { CnfEntry, PoControl, ProjectHierarchy } from "@/types";
import { generateHierarchyId, valueOrNA } from "@/lib/utils";

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
}: ProjectHierarchyFormProps) {
  const isAmTab = activeTab === "AM/BM/PL";
  const poFields = PO_FIELDS_BY_TAB(activeTab);
  const canModifyHierarchy = canEdit && !viewOnly;
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

  function updateProjectSoNo(value: string) {
    const next = structuredClone(project);
    next.so_no = value;
    onChange(next);
  }

  function shouldShowPoField(fieldKey: string) {
    return !PROJECT_LEVEL_PO_FIELDS.has(fieldKey) || fieldKey === "so_no";
  }

  function poFieldDisplayValue(fieldKey: string, po: PoControl): string {
    if (PROJECT_LEVEL_PO_FIELDS.has(fieldKey)) {
      return String(project[fieldKey as keyof ProjectHierarchy] ?? "");
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
              {groupPoFieldsForRender(poFields.filter((field) => shouldShowPoField(field.key))).map(
                (group) => {
                  const renderField = (field: ProjectFieldDef) => {
                    const fgMonthLocked =
                      field.key === "fg_month" &&
                      isFgMonthLocked(savedFgMonths, batchIndex, moIndex, poIndex);

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
                      value={poFieldDisplayValue(field.key, po)}
                      readOnly={fieldLockProps.readOnly || fgMonthLocked}
                      disabled={fieldLockProps.disabled}
                      registry={registry}
                      onChange={(value) => {
                        if (field.key === "so_no") {
                          updateProjectSoNo(value);
                          return;
                        }
                        updatePo(batchIndex, moIndex, poIndex, (target) => {
                          setPoFieldValue(target, field.key, value);
                        });
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
              {isAmTab ? (
                <div className="project-cnf-list project-field-span-3">
                  <div className="project-cnf-heading">
                    <h4>CNF Entries</h4>
                    {isCanonicalPo(batchIndex, moIndex, poIndex) ? (
                      <Button
                        size="small"
                        icon={<PlusOutlined />}
                        disabled={!canModifyHierarchy}
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
                  </div>
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
                          label: `CNF Entry ${cnfIndex + 1}`,
                          extra:
                            isCanonicalPo(batchIndex, moIndex, poIndex) && cnfEntries.length > 1 ? (
                              <Button
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                disabled={!canModifyHierarchy}
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
                              {CNF_FIELDS.map((field) => (
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
                                  {...fieldLockProps}
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
                              ))}
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
      <Collapse
        items={batchItems}
        activeKey={openKeys}
        onChange={(keys) => onOpenKeysChange(mergeOpenKeys(openKeys, allBatchKeys, keys))}
      />
    </div>
  );
}
