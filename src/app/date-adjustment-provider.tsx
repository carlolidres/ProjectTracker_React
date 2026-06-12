import { Form, Input, Modal, Select, Table, Typography } from "antd";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/app/auth-provider";
import { useRegistry } from "@/app/registry-provider";
import { ROLE_LABELS } from "@/lib/constants";
import { formatAppDate, formatAppMonth } from "@/lib/date";
import type { DateFieldChange } from "@/lib/dateAdjustmentReview";
import { saveDateAdjustmentLessons } from "@/services/lessonsLearnedService";

interface DateAdjustmentContextValue {
  promptBatchDateAdjustment: (
    changes: DateFieldChange[],
    userRole: string,
  ) => Promise<boolean>;
}

const DateAdjustmentContext = createContext<DateAdjustmentContextValue | null>(null);

function formatDateDisplay(value: string, fieldName: string): string {
  if (fieldName === "fg_month") return formatAppMonth(value);
  return formatAppDate(value);
}

export function DateAdjustmentProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const { registry } = useRegistry();
  const [open, setOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<DateFieldChange[]>([]);
  const [pendingRole, setPendingRole] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<{ reason_category: string; description: string }>();
  const resolverRef = useRef<((approved: boolean) => void) | null>(null);

  const reasonOptions = (registry.date_adjustment_reason ?? []).map((value) => ({
    label: value,
    value,
  }));

  const promptBatchDateAdjustment = useCallback((changes: DateFieldChange[], userRole: string) => {
    if (!changes.length) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setPendingChanges(changes);
      setPendingRole(userRole);
      form.resetFields();
      setOpen(true);
    });
  }, [form]);

  const finish = useCallback((approved: boolean) => {
    setOpen(false);
    setPendingChanges([]);
    setPendingRole("");
    form.resetFields();
    resolverRef.current?.(approved);
    resolverRef.current = null;
  }, [form]);

  const handleSubmit = useCallback(async () => {
    if (!pendingChanges.length || !user?.id || !user.email) return;
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await saveDateAdjustmentLessons(
        pendingChanges,
        values.reason_category,
        values.description,
        pendingRole,
        user.id,
        user.email,
      );
      finish(true);
    } catch {
      // keep modal open for validation/save errors
    } finally {
      setSubmitting(false);
    }
  }, [finish, form, pendingChanges, pendingRole, user?.email, user?.id]);

  const value = useMemo(() => ({ promptBatchDateAdjustment }), [promptBatchDateAdjustment]);

  const roleLabel = profile?.role ? (ROLE_LABELS[profile.role] ?? profile.role) : pendingRole;

  return (
    <DateAdjustmentContext.Provider value={value}>
      {children}
      <Modal
        title="Reason for date adjustment"
        open={open}
        onCancel={() => finish(false)}
        onOk={() => void handleSubmit()}
        okText="Save reasons and continue"
        cancelText="Cancel save"
        confirmLoading={submitting}
        destroyOnClose
        width={720}
      >
        <Typography.Paragraph type="secondary">
          The following target dates were changed. Provide one reason category and description
          for this save. Each change will be logged in Lessons Learned.
        </Typography.Paragraph>
        <p><strong>User group:</strong> {roleLabel}</p>
        <Table
          size="small"
          pagination={false}
          rowKey={(row) => `${row.recordContext}-${row.fieldName}`}
          dataSource={pendingChanges}
          columns={[
            { title: "Location", dataIndex: "recordContext" },
            { title: "Field", dataIndex: "fieldLabel" },
            {
              title: "Old Date",
              render: (_: unknown, row: DateFieldChange) => formatDateDisplay(row.oldDate, row.fieldName),
            },
            {
              title: "New Date",
              render: (_: unknown, row: DateFieldChange) => formatDateDisplay(row.newDate, row.fieldName),
            },
          ]}
          style={{ marginBottom: 16 }}
        />
        <Form form={form} layout="vertical">
          <Form.Item
            name="reason_category"
            label="Reason category"
            rules={[{ required: true, message: "Select a reason category" }]}
          >
            <Select placeholder="Select reason" options={reasonOptions} showSearch />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            rules={[
              { required: true, message: "Enter a description" },
              { min: 10, message: "Please provide at least 10 characters" },
            ]}
          >
            <Input.TextArea
              rows={5}
              placeholder="Explain why the date adjustments were made..."
              maxLength={4000}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </DateAdjustmentContext.Provider>
  );
}

export function useDateAdjustment() {
  const context = useContext(DateAdjustmentContext);
  if (!context) {
    throw new Error("useDateAdjustment must be used within DateAdjustmentProvider");
  }
  return context;
}
