import { Collapse, Form, Input, InputNumber, Modal, Select, Typography } from "antd";
import { useEffect, useMemo } from "react";
import { AppDatePicker } from "@/components/common/app-date-picker";
import { groupedSourceSelectOptions, parseSourceKey, shouldExpandTaskFormDetails, sourceKey } from "@/lib/dashboardPmHub";
import { getProfileDisplayName } from "@/lib/profileName";
import { PM_TASK_STATUSES } from "@/lib/projectManagementWorkflow";
import type {
  PmTaskCategory,
  PmTaskPhase,
  Profile,
  ProjectManagementTask,
  ProjectManagementTaskInput,
  WorkflowBoardItem,
} from "@/types";
import type { TaskSourceOption } from "@/lib/dashboardPmHub";

interface TaskFormModalProps {
  open: boolean;
  loading?: boolean;
  canAssign: boolean;
  canReopen: boolean;
  profiles: Profile[];
  parentOptions: WorkflowBoardItem[];
  dependencyOptions: WorkflowBoardItem[];
  initial: Partial<ProjectManagementTaskInput> | null;
  existing: ProjectManagementTask | null;
  sourceOptions?: TaskSourceOption[];
  onLoadSourceDefaults?: (
    sourceType: ProjectManagementTaskInput["sourceType"],
    sourceId: string,
  ) => Promise<Partial<ProjectManagementTaskInput> | null>;
  onCancel: () => void;
  onSubmit: (input: ProjectManagementTaskInput, options?: { reopenReason?: string }) => Promise<void>;
}

const PHASE_OPTIONS: Array<{ value: PmTaskPhase; label: string }> = [
  { value: "protocol", label: "Protocol" },
  { value: "execution", label: "Execution" },
  { value: "report", label: "Report" },
  { value: "endorsement", label: "Endorsement" },
  { value: "other", label: "Other" },
];

const CATEGORY_OPTIONS: Array<{ value: PmTaskCategory; label: string }> = [
  { value: "Validation", label: "Validation" },
  { value: "Characterization", label: "Characterization" },
  { value: "Verification", label: "Verification" },
  { value: "Other", label: "Other" },
];

function DateField({ value, onChange }: { value?: string; onChange?: (next: string) => void }) {
  return <AppDatePicker value={value ?? ""} onChange={(next) => onChange?.(next)} />;
}

function HighlightedSourceLabel({ label, uniqueBatch }: { label: string; uniqueBatch?: string }) {
  const batch = String(uniqueBatch ?? "").trim();
  if (!batch) return <span>{label}</span>;
  const suffix = label.startsWith(batch) ? label.slice(batch.length).replace(/^\s*·\s*/, "") : "";
  return (
    <span className="pm-source-option">
      <mark className="pm-source-option-batch">{batch}</mark>
      {suffix ? <span className="pm-source-option-name"> · {suffix}</span> : null}
    </span>
  );
}

export function TaskFormModal({
  open,
  loading,
  canAssign,
  canReopen,
  profiles,
  parentOptions,
  dependencyOptions,
  initial,
  existing,
  sourceOptions,
  onLoadSourceDefaults,
  onCancel,
  onSubmit,
}: TaskFormModalProps) {
  const [form] = Form.useForm<ProjectManagementTaskInput & { reopenReason?: string; sourceKey?: string }>();
  const status = Form.useWatch("status", form);
  const needsReopenReason = Boolean(existing && existing.status === "Done" && status && status !== "Done");
  const needsSource = sourceOptions !== undefined && !existing;
  const expandDetails = useMemo(
    () => shouldExpandTaskFormDetails(existing ?? initial),
    [existing, initial],
  );
  const sourceSelectGroups = useMemo(
    () => groupedSourceSelectOptions(sourceOptions ?? []),
    [sourceOptions],
  );
  const uniqueBatchByValue = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of sourceSelectGroups) {
      for (const option of group.options) {
        if (option.uniqueBatch) map.set(option.value, option.uniqueBatch);
      }
    }
    return map;
  }, [sourceSelectGroups]);

  useEffect(() => {
    if (!open) return;
    const sourceType = existing?.sourceType ?? initial?.sourceType;
    const sourceId = existing?.sourceId ?? initial?.sourceId;
    form.setFieldsValue({
      title: initial?.title ?? existing?.title ?? "",
      instructions: initial?.instructions ?? existing?.instructions ?? "",
      phase: initial?.phase ?? existing?.phase ?? "execution",
      status: initial?.status ?? existing?.status ?? "Planned",
      priority: initial?.priority ?? existing?.priority ?? "Medium",
      percentComplete: initial?.percentComplete ?? existing?.percentComplete ?? 0,
      startDate: initial?.startDate ?? existing?.startDate ?? "",
      targetDate: initial?.targetDate ?? existing?.targetDate ?? "",
      actualDate: initial?.actualDate ?? existing?.actualDate ?? "",
      category: initial?.category ?? existing?.category ?? "Other",
      parentTaskId: initial?.parentTaskId ?? existing?.parentTaskId ?? null,
      dependsOnTaskId: initial?.dependsOnTaskId ?? existing?.dependsOnTaskId ?? null,
      attachmentUrl: initial?.attachmentUrl ?? existing?.attachmentUrl ?? "",
      assigneeIds: initial?.assigneeIds ?? existing?.assigneeIds ?? [],
      sourceKey: sourceType && sourceId ? sourceKey(sourceType, sourceId) : undefined,
      reopenReason: "",
    });
  }, [existing, form, initial, open]);

  return (
    <Modal
      title={existing ? "Edit task" : "Create task"}
      open={open}
      onCancel={onCancel}
      onOk={() => void form.submit()}
      confirmLoading={loading}
      destroyOnClose
      width={560}
      okText="Save"
    >
      <Form
        form={form}
        layout="vertical"
        onValuesChange={(changed) => {
          if (!needsSource || !onLoadSourceDefaults || !changed.sourceKey) return;
          const parsed = parseSourceKey(String(changed.sourceKey));
          if (!parsed) return;
          void onLoadSourceDefaults(parsed.sourceType, parsed.sourceId).then((defaults) => {
            if (!defaults) return;
            const current = form.getFieldsValue();
            form.setFieldsValue({
              ...defaults,
              title: String(current.title ?? "").trim() ? current.title : defaults.title,
              assigneeIds: current.assigneeIds?.length ? current.assigneeIds : defaults.assigneeIds,
              targetDate: current.targetDate || defaults.targetDate,
              startDate: current.startDate || defaults.startDate,
              sourceKey: changed.sourceKey,
            });
          });
        }}
        onFinish={(values) => {
          const parsed = needsSource ? parseSourceKey(String(values.sourceKey ?? "")) : null;
          const sourceType = existing?.sourceType ?? initial?.sourceType ?? parsed?.sourceType ?? "process";
          const sourceId = existing?.sourceId ?? initial?.sourceId ?? parsed?.sourceId ?? "";
          const payload: ProjectManagementTaskInput = {
            sourceType,
            sourceId,
            parentTaskId: values.parentTaskId || null,
            title: values.title.trim(),
            instructions: values.instructions?.trim() ?? "",
            phase: values.phase,
            status: values.status,
            priority: values.priority ?? "Medium",
            percentComplete: values.status === "Done" ? 100 : Number(values.percentComplete ?? 0),
            startDate: values.startDate ?? "",
            targetDate: values.targetDate ?? "",
            actualDate: values.actualDate ?? "",
            category: values.category ?? "Other",
            dependsOnTaskId: values.dependsOnTaskId || null,
            attachmentUrl: values.attachmentUrl?.trim() ?? "",
            assigneeIds: values.assigneeIds ?? [],
          };
          return onSubmit(payload, needsReopenReason ? { reopenReason: values.reopenReason?.trim() } : undefined);
        }}
      >
        {needsSource ? (
          <Form.Item name="sourceKey" label="Project" rules={[{ required: true, message: "Select a project" }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Select by unique batch and product or project name"
              notFoundContent="No ongoing Projects Database or Support Activities records"
              options={sourceSelectGroups}
              optionRender={(option) => (
                <HighlightedSourceLabel
                  label={String(option.label ?? "")}
                  uniqueBatch={uniqueBatchByValue.get(String(option.value ?? "")) ?? ""}
                />
              )}
              labelRender={(item) => (
                <HighlightedSourceLabel
                  label={String(item.label ?? "")}
                  uniqueBatch={uniqueBatchByValue.get(String(item.value ?? "")) ?? ""}
                />
              )}
            />
          </Form.Item>
        ) : null}
        <Form.Item name="title" label="Title" rules={[{ required: true, message: "Enter a title" }]}>
          <Input maxLength={200} />
        </Form.Item>
        <div className="pm-form-grid">
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select options={PM_TASK_STATUSES.map((value) => ({ value, label: value }))} />
          </Form.Item>
          <Form.Item name="targetDate" label="Target date">
            <DateField />
          </Form.Item>
        </div>
        <Form.Item
          name="assigneeIds"
          label="Assignees"
          extra={!canAssign ? "You can update this task, but only VAL, Admin, or users with PM tasks On can assign others." : "VAL users are always listed. Other users need PM tasks On in User Management."}
        >
          <Select
            mode="multiple"
            disabled={!canAssign}
            optionFilterProp="label"
            options={profiles.map((profile) => ({
              value: profile.id,
              label: getProfileDisplayName(profile) || profile.email,
            }))}
          />
        </Form.Item>
        {needsReopenReason ? (
          <Form.Item
            name="reopenReason"
            label="Reason for reopening"
            rules={[{ required: true, min: 4, message: "Document why this completed task is reopening" }]}
          >
            <Input.TextArea rows={2} disabled={!canReopen} />
          </Form.Item>
        ) : null}

        <Collapse
          ghost
          defaultActiveKey={expandDetails ? ["more"] : []}
          items={[{
            key: "more",
            label: "More details",
            children: (
              <>
                <Form.Item name="instructions" label="Instructions">
                  <Input.TextArea rows={3} maxLength={2000} />
                </Form.Item>
                <div className="pm-form-grid">
                  <Form.Item name="phase" label="Phase" rules={[{ required: true }]}>
                    <Select options={PHASE_OPTIONS} />
                  </Form.Item>
                  <Form.Item name="priority" label="Priority">
                    <Select options={["Low", "Medium", "High"].map((value) => ({ value, label: value }))} />
                  </Form.Item>
                  <Form.Item name="category" label="Category">
                    <Select options={CATEGORY_OPTIONS} />
                  </Form.Item>
                  <Form.Item name="percentComplete" label="Percent complete">
                    <InputNumber min={0} max={100} style={{ width: "100%" }} />
                  </Form.Item>
                </div>
                <div className="pm-form-grid">
                  <Form.Item name="startDate" label="Start date">
                    <DateField />
                  </Form.Item>
                  <Form.Item name="actualDate" label="Actual date">
                    <DateField />
                  </Form.Item>
                </div>
                <Form.Item name="parentTaskId" label="Parent task">
                  <Select
                    allowClear
                    options={parentOptions
                      .filter((item) => item.origin === "user" && item.id !== existing?.id)
                      .map((item) => ({ value: item.id, label: item.title }))}
                  />
                </Form.Item>
                <Form.Item name="dependsOnTaskId" label="Depends on">
                  <Select
                    allowClear
                    options={dependencyOptions
                      .filter((item) => item.origin === "user" && item.id !== existing?.id)
                      .map((item) => ({ value: item.id, label: item.title }))}
                  />
                </Form.Item>
                <Form.Item name="attachmentUrl" label="Supporting document URL">
                  <Input placeholder="https://" />
                </Form.Item>
              </>
            ),
          }]}
        />
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12 }}>
          {needsSource
            ? "Select a Projects Database or Support Activities record. Title, phase, and category fill from its current step; a calendar date stays unless you change it."
            : "Title, phase, category, and dates come from the current workspace step. Open More details to change them."}
        </Typography.Paragraph>
      </Form>
    </Modal>
  );
}
