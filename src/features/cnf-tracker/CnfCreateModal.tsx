import { Alert, Modal, Typography } from "antd";
import {
  CnfCreateFormFields,
  CnfCreateFormModalFooter,
  CnfCreateRequiredHint,
  cnfCreateFormCanSave,
} from "@/features/cnf-tracker/CnfCreateFormFields";
import type { CnfTrackerHeaderFields } from "@/lib/cnfProjectIntegration";

interface CnfCreateModalProps {
  open: boolean;
  fields: CnfTrackerHeaderFields;
  saving: boolean;
  error: string | null;
  productOptions: { id?: string; value: string }[];
  clientOptions: { id?: string; value: string }[];
  canManageOptions?: boolean;
  onChange: (fields: CnfTrackerHeaderFields) => void;
  onCancel: () => void;
  onSave: () => void;
  onCreateProduct?: (value: string) => Promise<void> | void;
  onCreateClient?: (value: string) => Promise<void> | void;
  onRemoveProduct?: (option: { id?: string; value: string }) => Promise<void> | void;
  onRemoveClient?: (option: { id?: string; value: string }) => Promise<void> | void;
  existingReferenceHint?: string | null;
  onOpenExisting?: () => void;
}

export function CnfCreateModal({
  open,
  fields,
  saving,
  error,
  productOptions,
  clientOptions,
  canManageOptions,
  onChange,
  onCancel,
  onSave,
  onCreateProduct,
  onCreateClient,
  onRemoveProduct,
  onRemoveClient,
  existingReferenceHint,
  onOpenExisting,
}: CnfCreateModalProps) {
  return (
    <Modal
      open={open}
      title="New CNF"
      onCancel={onCancel}
      footer={
        <CnfCreateFormModalFooter
          saving={saving}
          canSave={cnfCreateFormCanSave(fields)}
          onCancel={onCancel}
          onSave={onSave}
        />
      }
      width="min(96vw, 720px)"
      centered
      destroyOnHidden
      className="cnf-create-modal"
      maskClosable={!saving}
      closable={!saving}
    >
      <div className="cnf-create-modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
        <CnfCreateRequiredHint />
        {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} /> : null}
        {existingReferenceHint ? (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message={`Existing CNF: ${existingReferenceHint}`}
            action={
              onOpenExisting ? (
                <Typography.Link onClick={onOpenExisting}>Open existing</Typography.Link>
              ) : null
            }
          />
        ) : null}
        <CnfCreateFormFields
          fields={fields}
          disabled={saving}
          productOptions={productOptions}
          clientOptions={clientOptions}
          canManageOptions={canManageOptions}
          onChange={onChange}
          onCreateProduct={onCreateProduct}
          onCreateClient={onCreateClient}
          onRemoveProduct={onRemoveProduct}
          onRemoveClient={onRemoveClient}
        />
      </div>
    </Modal>
  );
}
