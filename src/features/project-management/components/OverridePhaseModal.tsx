import { Form, Input, Modal, Select } from "antd";
import { useEffect } from "react";
import type { WorkflowGate } from "@/types";

interface OverridePhaseModalProps {
  open: boolean;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (input: { gate: WorkflowGate; justification: string }) => Promise<void>;
}

export function OverridePhaseModal({ open, loading, onCancel, onSubmit }: OverridePhaseModalProps) {
  const [form] = Form.useForm<{ gate: WorkflowGate; justification: string }>();

  useEffect(() => {
    if (open) form.resetFields();
  }, [form, open]);

  return (
    <Modal
      title="Documented phase override"
      open={open}
      onCancel={onCancel}
      onOk={() => void form.submit()}
      confirmLoading={loading}
      destroyOnClose
      okText="Save override"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ gate: "execution" }}
        onFinish={(values) => onSubmit({ gate: values.gate, justification: values.justification.trim() })}
      >
        <Form.Item
          name="gate"
          label="Allow entry to"
          rules={[{ required: true, message: "Select a gate" }]}
        >
          <Select
            options={[
              { value: "execution", label: "Execution (protocol incomplete)" },
              { value: "report", label: "Report/Endorsement (execution incomplete)" },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="justification"
          label="Justification"
          rules={[{ required: true, min: 8, message: "Enter a documented justification (at least 8 characters)" }]}
        >
          <Input.TextArea rows={4} maxLength={1000} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}
