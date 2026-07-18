import {
  ClearOutlined,
  FileTextOutlined,
  PlusOutlined,
  SaveOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Alert, Button, Card, Modal, Select, Space, Table, Tabs, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { CreatableNaSelect } from "@/components/common/creatable-na-select";
import { FieldHelpIcon } from "@/components/common/field-help-icon";
import { NaClearingInput, NaClearingTextArea } from "@/components/common/na-clearing-input";
import type { CnfTrackerAggregatedView } from "@/lib/cnfTrackerAggregation";
import { isCnfTrackerCreateRequiredComplete } from "@/lib/cnfProjectIntegration";
import { supportActivitiesRoute } from "@/lib/dashboardDrilldown";
import { isMissingValue, valueOrNA, cn, sanitizeAlphanumericInput } from "@/lib/utils";
import type { CnfTrackerStatus } from "@/types/cnfTracker";
import type { SupportActivity } from "@/types";

const TRACKER_STATUS_OPTIONS: { label: string; value: CnfTrackerStatus }[] = [
  { label: "Open", value: "Open" },
  { label: "Closed", value: "Closed" },
];

export type CnfDetailsTab = "process" | "non_process";

export interface CnfTrackerDetailFormState {
  cnf_tracker_id: string;
  cnf_reference: string;
  cnf_initiator: string;
  cnf_details: string;
  product_name: string;
  client_name: string;
  qrmr_no: string;
  unique_batch_no: string;
  change_description: string;
  tracker_status: CnfTrackerStatus;
  record_id?: string;
  /** UI-only: synced with Non-Process support `non_process_description`. */
  title_activity_name?: string;
  /** UI-only: synced with Non-Process support `type_of_validation` (and mirrored `activity_type`). */
  activity_type?: string;
  /** Active details tab; switching must not clear sibling tab values. */
  details_tab?: CnfDetailsTab;
}

interface CnfTrackerDetailModalProps {
  open: boolean;
  form: CnfTrackerDetailFormState;
  aggregation: CnfTrackerAggregatedView;
  poTableColumns: ColumnsType<CnfTrackerAggregatedView["poLines"][number]>;
  supportActivities?: SupportActivity[];
  isCreateMode: boolean;
  projectLinked: boolean;
  viewOnly: boolean;
  canEdit: boolean;
  meetingViewReadOnly: boolean;
  saving: boolean;
  formError: string | null;
  activityTypeOptions?: { id?: string; value: string }[];
  canManageOptions?: boolean;
  duplicateHint?: string | null;
  onOpenDuplicate?: () => void;
  onClose: () => void;
  onAfterOpenChange?: (open: boolean) => void;
  onNew: () => void;
  onClear: () => void;
  onSave: () => void;
  onFormChange: (patch: Partial<CnfTrackerDetailFormState>) => void;
  onStatusChange: (status: CnfTrackerStatus) => void;
  onOpenReferencePicker: () => void;
  onCreateActivityType?: (value: string) => Promise<void> | void;
  onRemoveActivityType?: (option: { id?: string; value: string }) => Promise<void> | void;
  blockViewOnlyInteraction: (event: React.SyntheticEvent) => void;
}

export function CnfTrackerDetailModal({
  open,
  form,
  aggregation,
  poTableColumns,
  supportActivities = [],
  isCreateMode,
  projectLinked,
  viewOnly,
  canEdit,
  meetingViewReadOnly,
  saving,
  formError,
  activityTypeOptions = [],
  canManageOptions,
  duplicateHint,
  onOpenDuplicate,
  onClose,
  onAfterOpenChange,
  onNew,
  onClear,
  onSave,
  onFormChange,
  onStatusChange,
  onOpenReferencePicker,
  onCreateActivityType,
  onRemoveActivityType,
  blockViewOnlyInteraction,
}: CnfTrackerDetailModalProps) {
  const navigate = useNavigate();
  const hasReference = !isMissingValue(form.cnf_reference);
  const referenceTitle = isCreateMode
    ? "New CNF"
    : hasReference
      ? form.cnf_reference.trim()
      : "Enter CNF Reference";

  const projectOwnedReadOnly = projectLinked && !isCreateMode;
  const fieldsReadOnly = viewOnly || projectOwnedReadOnly;

  const canSave =
    !viewOnly &&
    !saving &&
    (isCreateMode
      ? isCnfTrackerCreateRequiredComplete({
          ...form,
          cnf_details: form.cnf_details,
        })
      : !isMissingValue(form.cnf_reference));

  const qrmrDisplay = projectOwnedReadOnly && !isMissingValue(aggregation.qrmrRefNo)
    ? aggregation.qrmrRefNo
    : form.qrmr_no;
  const changeDisplay = projectOwnedReadOnly && !isMissingValue(aggregation.changeDescription)
    ? aggregation.changeDescription
    : form.change_description;

  const modalTitle = (
    <div className="cnf-tracker-detail-modal-title project-sticky-header">
      <div className="cnf-tracker-sticky-header-text project-sticky-header-text">
        <Typography.Title level={4} className="cnf-tracker-detail-modal-heading">
          {referenceTitle}
        </Typography.Title>
        <Typography.Paragraph type="secondary" className="cnf-tracker-detail-modal-subtitle">
          {isCreateMode
            ? "Create a CNF Tracker record"
            : hasReference
              ? `Initiator: ${valueOrNA(form.cnf_initiator)}`
              : "CNF Reference drives aggregated project data"}
        </Typography.Paragraph>
      </div>
      <div className="cnf-tracker-sticky-header-actions project-sticky-header-actions" role="toolbar" aria-label="CNF actions">
        <Button
          className="project-sticky-action-btn"
          title="New CNF"
          aria-label="New CNF"
          icon={<PlusOutlined />}
          disabled={viewOnly}
          onClick={onNew}
        />
        <Button
          className="project-sticky-action-btn"
          title="Clear"
          aria-label="Clear form"
          icon={<ClearOutlined />}
          disabled={viewOnly}
          onClick={onClear}
        />
        <Button
          className="project-sticky-action-btn"
          type="primary"
          title="Save CNF"
          aria-label="Save CNF"
          icon={<SaveOutlined />}
          loading={saving}
          disabled={!canSave}
          onClick={onSave}
        />
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      afterOpenChange={onAfterOpenChange}
      footer={
        isCreateMode ? (
          <div className="cnf-tracker-detail-modal-footer">
            <Button onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="primary" onClick={onSave} loading={saving} disabled={!canSave} icon={<SaveOutlined />}>
              Save CNF
            </Button>
          </div>
        ) : null
      }
      width={isCreateMode ? 840 : 1100}
      centered
      destroyOnHidden
      className={cn(
        "cnf-tracker-detail-modal",
        isCreateMode && "cnf-tracker-detail-modal--create",
      )}
      title={modalTitle}
      closable
    >
      <div className="cnf-tracker-detail-modal-scroll">
        {formError ? <Alert type="error" showIcon message={formError} style={{ marginBottom: 16 }} /> : null}
        {duplicateHint ? (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message={`Existing CNF: ${duplicateHint}`}
            action={
              onOpenDuplicate ? (
                <Typography.Link onClick={onOpenDuplicate}>Open existing</Typography.Link>
              ) : null
            }
          />
        ) : null}
        {!canEdit && !meetingViewReadOnly ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="View only"
            description="Admin, QA, and VAL can update CNF Tracker records."
          />
        ) : null}
        {projectOwnedReadOnly ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Linked to Project"
            description="QRMR No. and Description of Change are sourced from the linked Project form. Edit and save the Project to update these values."
          />
        ) : null}

        <div className="cnf-tracker-panel project-panel cnf-tracker-detail-modal-panel">
          <div className="cnf-tracker-form-body project-form-body">
            <div className="cnf-tracker-header-section project-header-section">
              <div className="cnf-tracker-form-grid project-form-grid cnf-tracker-header-grid">
                <div className={cn("cnf-tracker-field project-field", viewOnly && "project-field-view-only")}>
                  <label className="cnf-tracker-field-label project-field-label" htmlFor="cnf-tracker-reference">
                    <span className="project-field-label-text">
                      CNF Reference{isCreateMode ? " *" : ""}
                    </span>
                    <FieldHelpIcon title="Alphanumeric CNF reference used to aggregate matching project PO lines." />
                  </label>
                  <NaClearingInput
                    id="cnf-tracker-reference"
                    value={form.cnf_reference}
                    readOnly={viewOnly}
                    sanitize={sanitizeAlphanumericInput}
                    onChange={(value) => onFormChange({ cnf_reference: sanitizeAlphanumericInput(value) })}
                  />
                  {!viewOnly && !isCreateMode ? (
                    <Button
                      type="link"
                      size="small"
                      className="cnf-reference-picker-trigger"
                      icon={<SearchOutlined />}
                      aria-label="Browse registered CNF references"
                      onClick={onOpenReferencePicker}
                    >
                      Browse
                    </Button>
                  ) : null}
                </div>
                <div className={cn("cnf-tracker-field project-field", viewOnly && "project-field-view-only")}>
                  <label className="cnf-tracker-field-label project-field-label" htmlFor="cnf-tracker-initiator">
                    <span className="project-field-label-text">
                      CNF Initiator{isCreateMode ? " *" : ""}
                    </span>
                    <FieldHelpIcon title="Person or group that initiated the CNF." />
                  </label>
                  <NaClearingInput
                    id="cnf-tracker-initiator"
                    value={form.cnf_initiator}
                    readOnly={viewOnly}
                    sanitize={sanitizeAlphanumericInput}
                    onChange={(value) => onFormChange({ cnf_initiator: sanitizeAlphanumericInput(value) })}
                  />
                </div>
                {!isCreateMode ? (
                  <div className={cn("cnf-tracker-field project-field", viewOnly && "project-field-view-only")}>
                    <label className="cnf-tracker-field-label project-field-label" htmlFor="cnf-tracker-status">
                      <span className="project-field-label-text">Tracker Status</span>
                      <FieldHelpIcon title="Closed only when CNF closure validation rules are met." />
                    </label>
                    <Space wrap>
                      <Select
                        id="cnf-tracker-status"
                        className={cn("cnf-tracker-status-select", viewOnly && "project-field-view-only-select")}
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
                          onStatusChange(value);
                        }}
                      />
                      <Tag color={form.tracker_status === "Closed" ? "green" : "blue"} className="cnf-tracker-status-badge">
                        CNF Status: {valueOrNA(aggregation.cnfStatus)}
                      </Tag>
                    </Space>
                  </div>
                ) : null}
              </div>
            </div>

            {(isCreateMode || hasReference) ? (
              <>
                <Card
                  className="cnf-tracker-section-card"
                  title={
                    <Space size={8}>
                      <FileTextOutlined aria-hidden />
                      <span>CNF Details</span>
                    </Space>
                  }
                >
                  <Tabs
                    className="cnf-tracker-details-tabs"
                    activeKey={form.details_tab === "non_process" ? "non_process" : "process"}
                    onChange={(key) => {
                      if (viewOnly) return;
                      onFormChange({ details_tab: key === "non_process" ? "non_process" : "process" });
                    }}
                    items={[
                      {
                        key: "process",
                        label: "Process",
                        children: (
                          <div className="cnf-tracker-form-grid project-form-grid cnf-tracker-details-grid">
                            <div className={cn("cnf-tracker-field project-field cnf-tracker-field-span-2", viewOnly && "project-field-view-only")}>
                              <label className="cnf-tracker-field-label project-field-label">
                                <span className="project-field-label-text">Title / Activity Name</span>
                                <FieldHelpIcon title="Enter the product, procedure, system, or equipment affected by the CNF." />
                              </label>
                              <NaClearingInput
                                value={form.title_activity_name ?? ""}
                                readOnly={viewOnly}
                                sanitize={(value) => sanitizeAlphanumericInput(value).slice(0, 50)}
                                onChange={(value) =>
                                  onFormChange({
                                    title_activity_name: sanitizeAlphanumericInput(value).slice(0, 50),
                                  })
                                }
                              />
                            </div>
                            <div className={cn("cnf-tracker-field project-field cnf-tracker-field-span-2", fieldsReadOnly && "project-field-view-only")}>
                              <label className="cnf-tracker-field-label project-field-label">
                                Description of Change{isCreateMode ? " *" : ""}
                              </label>
                              <NaClearingTextArea
                                rows={3}
                                value={changeDisplay}
                                readOnly={fieldsReadOnly}
                                onChange={(value) => onFormChange({ change_description: value.replace(/[<>]/g, "") })}
                              />
                            </div>
                            <div className={cn("cnf-tracker-field project-field", fieldsReadOnly && "project-field-view-only")}>
                              <label className="cnf-tracker-field-label project-field-label">QRMR No.</label>
                              <NaClearingInput
                                value={qrmrDisplay}
                                readOnly={fieldsReadOnly}
                                sanitize={sanitizeAlphanumericInput}
                                onChange={(value) => onFormChange({ qrmr_no: sanitizeAlphanumericInput(value) })}
                              />
                            </div>
                          </div>
                        ),
                      },
                      {
                        key: "non_process",
                        label: "Non-Process",
                        children: (
                          <div className="cnf-tracker-form-grid project-form-grid cnf-tracker-details-grid">
                            <div className={cn("cnf-tracker-field project-field", viewOnly && "project-field-view-only")}>
                              <label className="cnf-tracker-field-label project-field-label">
                                <span className="project-field-label-text">Title / Activity Name</span>
                                <FieldHelpIcon title="Enter the product, procedure, system, or equipment affected by the CNF." />
                              </label>
                              <NaClearingInput
                                value={form.title_activity_name ?? ""}
                                readOnly={viewOnly}
                                sanitize={(value) => sanitizeAlphanumericInput(value).slice(0, 50)}
                                onChange={(value) =>
                                  onFormChange({
                                    title_activity_name: sanitizeAlphanumericInput(value).slice(0, 50),
                                  })
                                }
                              />
                            </div>
                            <div className={cn("cnf-tracker-field project-field", viewOnly && "project-field-view-only")}>
                              <label className="cnf-tracker-field-label project-field-label">Activity Type</label>
                              <CreatableNaSelect
                                value={form.activity_type ?? ""}
                                options={activityTypeOptions}
                                readOnly={viewOnly}
                                canManageOptions={canManageOptions}
                                placeholder="Select or type a new activity type"
                                onChange={(value) => onFormChange({ activity_type: value })}
                                onCreateOption={onCreateActivityType}
                                onRemoveOption={onRemoveActivityType}
                              />
                            </div>
                            <div className={cn("cnf-tracker-field project-field cnf-tracker-field-span-2", fieldsReadOnly && "project-field-view-only")}>
                              <label className="cnf-tracker-field-label project-field-label">
                                Description of Change{isCreateMode ? " *" : ""}
                              </label>
                              <NaClearingTextArea
                                rows={3}
                                value={changeDisplay}
                                readOnly={fieldsReadOnly}
                                onChange={(value) => onFormChange({ change_description: value.replace(/[<>]/g, "") })}
                              />
                            </div>
                            <div className={cn("cnf-tracker-field project-field", fieldsReadOnly && "project-field-view-only")}>
                              <label className="cnf-tracker-field-label project-field-label">QRMR No.</label>
                              <NaClearingInput
                                value={qrmrDisplay}
                                readOnly={fieldsReadOnly}
                                sanitize={sanitizeAlphanumericInput}
                                onChange={(value) => onFormChange({ qrmr_no: sanitizeAlphanumericInput(value) })}
                              />
                            </div>
                          </div>
                        ),
                      },
                    ]}
                  />
                </Card>

                {!isCreateMode ? (
                  form.details_tab === "non_process" ? (
                    <Card
                      title="List of Supporting Activities"
                      className="cnf-tracker-section-card cnf-tracker-po-table"
                    >
                      {supportActivities.length ? (
                        <div
                          className="cnf-tracker-po-table-scroll"
                          tabIndex={0}
                          role="region"
                          aria-label="Supporting activities table"
                        >
                          <Table
                            size="small"
                            rowKey={(row) => row.activity_id}
                            pagination={false}
                            dataSource={supportActivities}
                            scroll={{ x: 1100, y: 320 }}
                            columns={[
                              {
                                title: "Title / Activity Name",
                                dataIndex: "non_process_description",
                                key: "non_process_description",
                                width: 220,
                                render: (value: string, row: SupportActivity) => {
                                  const label = valueOrNA(value);
                                  if (isMissingValue(row.activity_id) || isMissingValue(value)) {
                                    return label;
                                  }
                                  return (
                                    <Typography.Link
                                      className="cnf-unique-batch-link"
                                      onClick={(event) => {
                                        event.preventDefault();
                                        navigate(
                                          supportActivitiesRoute({ activityId: row.activity_id }),
                                        );
                                      }}
                                      title="Open support activity"
                                      aria-label={`Open support activity ${label}`}
                                    >
                                      {label}
                                    </Typography.Link>
                                  );
                                },
                              },
                              {
                                title: "Type of Validation",
                                key: "type_of_validation",
                                width: 180,
                                render: (_: unknown, row: SupportActivity) =>
                                  valueOrNA(row.type_of_validation || row.activity_type),
                              },
                              {
                                title: "Protocol Number",
                                dataIndex: "protocol_number",
                                key: "protocol_number",
                                width: 160,
                                render: (value: string) => valueOrNA(value),
                              },
                              {
                                title: "Report Number",
                                dataIndex: "report_number",
                                key: "report_number",
                                width: 160,
                                render: (value: string) => valueOrNA(value),
                              },
                              {
                                title: "Endorsement Number",
                                dataIndex: "endorsement_number",
                                key: "endorsement_number",
                                width: 180,
                                render: (value: string) => valueOrNA(value),
                              },
                            ]}
                          />
                        </div>
                      ) : (
                        <Typography.Text type="secondary">
                          No Non-Process support activities are linked to this CNF yet.
                        </Typography.Text>
                      )}
                    </Card>
                  ) : (
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
                            scroll={{ x: 1400, y: 320 }}
                          />
                        </div>
                      ) : (
                        <Typography.Text type="secondary">
                          No active project PO lines match this CNF reference yet.
                        </Typography.Text>
                      )}
                    </Card>
                  )
                ) : null}
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
      </div>
    </Modal>
  );
}
