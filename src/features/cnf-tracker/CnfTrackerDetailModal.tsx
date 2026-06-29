import {
  ClearOutlined,
  PlusOutlined,
  SaveOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Alert, Button, Card, Input, Modal, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FieldHelpIcon } from "@/components/common/field-help-icon";
import type { CnfTrackerAggregatedView } from "@/lib/cnfTrackerAggregation";
import { isMissingValue, valueOrNA, cn } from "@/lib/utils";
import type { CnfTrackerStatus } from "@/types/cnfTracker";

const TRACKER_STATUS_OPTIONS: { label: string; value: CnfTrackerStatus }[] = [
  { label: "Open", value: "Open" },
  { label: "Closed", value: "Closed" },
];

export interface CnfTrackerDetailFormState {
  cnf_tracker_id: string;
  cnf_reference: string;
  cnf_initiator: string;
  tracker_status: CnfTrackerStatus;
}

interface CnfTrackerDetailModalProps {
  open: boolean;
  form: CnfTrackerDetailFormState;
  aggregation: CnfTrackerAggregatedView;
  poTableColumns: ColumnsType<CnfTrackerAggregatedView["poLines"][number]>;
  viewOnly: boolean;
  canEdit: boolean;
  meetingViewReadOnly: boolean;
  saving: boolean;
  formError: string | null;
  onClose: () => void;
  onNew: () => void;
  onClear: () => void;
  onSave: () => void;
  onReferenceChange: (value: string) => void;
  onInitiatorChange: (value: string) => void;
  onStatusChange: (status: CnfTrackerStatus) => void;
  onOpenReferencePicker: () => void;
  blockViewOnlyInteraction: (event: React.SyntheticEvent) => void;
}

export function CnfTrackerDetailModal({
  open,
  form,
  aggregation,
  poTableColumns,
  viewOnly,
  canEdit,
  meetingViewReadOnly,
  saving,
  formError,
  onClose,
  onNew,
  onClear,
  onSave,
  onReferenceChange,
  onInitiatorChange,
  onStatusChange,
  onOpenReferencePicker,
  blockViewOnlyInteraction,
}: CnfTrackerDetailModalProps) {
  const hasReference = !isMissingValue(form.cnf_reference);
  const referenceTitle = hasReference ? form.cnf_reference.trim() : "Enter CNF Reference";

  const modalTitle = (
    <div className="cnf-tracker-detail-modal-title project-sticky-header">
      <div className="cnf-tracker-sticky-header-text project-sticky-header-text">
        <h2>{referenceTitle}</h2>
        <p>
          {hasReference
            ? `Initiator: ${valueOrNA(form.cnf_initiator)}`
            : "CNF Reference drives aggregated project data"}
        </p>
      </div>
      <div className="cnf-tracker-sticky-header-actions project-sticky-header-actions">
        <Button
          className="project-sticky-action-btn"
          title="New CNF Tracker"
          icon={<PlusOutlined />}
          disabled={viewOnly}
          onClick={onNew}
        />
        <Button
          className="project-sticky-action-btn"
          title="Clear"
          icon={<ClearOutlined />}
          disabled={viewOnly}
          onClick={onClear}
        />
        <Button
          className="project-sticky-action-btn"
          type="primary"
          title="Save CNF Tracker"
          icon={<SaveOutlined />}
          loading={saving}
          disabled={viewOnly}
          onClick={onSave}
        />
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="min(96vw, 1200px)"
      centered
      destroyOnHidden
      className="cnf-tracker-detail-modal"
      title={modalTitle}
      closable
    >
      {formError ? <Alert type="error" showIcon message={formError} style={{ marginBottom: 16 }} /> : null}
      {!canEdit && !meetingViewReadOnly ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="View only"
          description="Admin, QA, and VAL can update CNF Tracker records. Fields look active but cannot be changed in your role."
        />
      ) : null}

      <div className="cnf-tracker-panel project-panel cnf-tracker-detail-modal-panel">
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
                        onClick={onOpenReferencePicker}
                      />
                    )
                  }
                  onChange={(event) => {
                    if (viewOnly) return;
                    onReferenceChange(event.target.value);
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
                    onInitiatorChange(event.target.value);
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
                      onStatusChange(value);
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
                      scroll={{ x: 1100, y: 280 }}
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
    </Modal>
  );
}
