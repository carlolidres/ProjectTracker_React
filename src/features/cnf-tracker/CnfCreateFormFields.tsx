import { Button, Form, Space, Typography } from "antd";
import { CreatableNaSelect } from "@/components/common/creatable-na-select";
import { NaClearingInput, NaClearingTextArea } from "@/components/common/na-clearing-input";
import {
  emptyCnfTrackerHeaderFields,
  isCnfTrackerCreateRequiredComplete,
  type CnfTrackerHeaderFields,
} from "@/lib/cnfProjectIntegration";
import { sanitizeAlphanumericInput } from "@/lib/utils";

interface CnfCreateFormFieldsProps {
  fields: CnfTrackerHeaderFields;
  disabled?: boolean;
  productOptions: { id?: string; value: string }[];
  clientOptions: { id?: string; value: string }[];
  canManageOptions?: boolean;
  onChange: (next: CnfTrackerHeaderFields) => void;
  onCreateProduct?: (value: string) => Promise<void> | void;
  onCreateClient?: (value: string) => Promise<void> | void;
  onRemoveProduct?: (option: { id?: string; value: string }) => Promise<void> | void;
  onRemoveClient?: (option: { id?: string; value: string }) => Promise<void> | void;
}

export function CnfCreateFormFields({
  fields,
  disabled,
  productOptions,
  clientOptions,
  canManageOptions,
  onChange,
  onCreateProduct,
  onCreateClient,
  onRemoveProduct,
  onRemoveClient,
}: CnfCreateFormFieldsProps) {
  function patch(partial: Partial<CnfTrackerHeaderFields>) {
    onChange({ ...fields, ...partial });
  }

  return (
    <Form layout="vertical" className="cnf-create-form" requiredMark>
      <Form.Item label="CNF Reference" required className="cnf-tracker-field">
        <NaClearingInput
          value={fields.cnf_reference}
          disabled={disabled}
          onChange={(value) => patch({ cnf_reference: sanitizeAlphanumericInput(value) })}
          sanitize={sanitizeAlphanumericInput}
        />
      </Form.Item>
      <Form.Item label="CNF Initiator" required className="cnf-tracker-field">
        <NaClearingInput
          value={fields.cnf_initiator}
          disabled={disabled}
          onChange={(value) => patch({ cnf_initiator: sanitizeAlphanumericInput(value) })}
          sanitize={sanitizeAlphanumericInput}
        />
      </Form.Item>
      <Form.Item label="Product" className="cnf-tracker-field">
        <CreatableNaSelect
          value={fields.product_name}
          options={productOptions}
          disabled={disabled}
          canManageOptions={canManageOptions}
          onChange={(value) => patch({ product_name: value })}
          onCreateOption={onCreateProduct}
          onRemoveOption={onRemoveProduct}
        />
      </Form.Item>
      <Form.Item label="Client" className="cnf-tracker-field">
        <CreatableNaSelect
          value={fields.client_name}
          options={clientOptions}
          disabled={disabled}
          canManageOptions={canManageOptions}
          onChange={(value) => patch({ client_name: value })}
          onCreateOption={onCreateClient}
          onRemoveOption={onRemoveClient}
        />
      </Form.Item>
      <Form.Item label="QRMR No." className="cnf-tracker-field">
        <NaClearingInput
          value={fields.qrmr_no}
          disabled={disabled}
          onChange={(value) => patch({ qrmr_no: sanitizeAlphanumericInput(value) })}
          sanitize={sanitizeAlphanumericInput}
        />
      </Form.Item>
      <Form.Item label="Unique Batch No." className="cnf-tracker-field">
        <NaClearingInput
          value={fields.unique_batch_no}
          disabled={disabled}
          onChange={(value) => patch({ unique_batch_no: sanitizeAlphanumericInput(value) })}
          sanitize={sanitizeAlphanumericInput}
        />
      </Form.Item>
      <Form.Item label="Description of Change" required className="cnf-tracker-field">
        <NaClearingTextArea
          rows={3}
          value={fields.change_description}
          disabled={disabled}
          onChange={(value) => patch({ change_description: value.replace(/[<>]/g, "") })}
        />
      </Form.Item>
    </Form>
  );
}

interface CnfCreateFormModalFooterProps {
  saving: boolean;
  canSave: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export function CnfCreateFormModalFooter({
  saving,
  canSave,
  onCancel,
  onSave,
}: CnfCreateFormModalFooterProps) {
  return (
    <Space style={{ width: "100%", justifyContent: "flex-end" }}>
      <Button onClick={onCancel} disabled={saving}>
        Cancel
      </Button>
      <Button type="primary" onClick={onSave} loading={saving} disabled={!canSave || saving}>
        Save CNF
      </Button>
    </Space>
  );
}

export function cnfCreateFormCanSave(fields: CnfTrackerHeaderFields): boolean {
  return isCnfTrackerCreateRequiredComplete(fields);
}

export { emptyCnfTrackerHeaderFields };

export function CnfCreateRequiredHint() {
  return (
    <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
      Required fields are marked. Values are kept if validation fails. Empty optional fields save as N/A.
    </Typography.Paragraph>
  );
}
