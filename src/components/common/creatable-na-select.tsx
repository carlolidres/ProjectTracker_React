import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Divider, Modal, Select, Space, Typography, message } from "antd";
import { useMemo, useState } from "react";
import { NA_VALUE } from "@/lib/constants";
import { normalizeCnfTextKey } from "@/lib/cnfTrackerAggregation";
import { cn, isMissingValue, sanitizeAlphanumericInput } from "@/lib/utils";

export interface CreatableOption {
  id?: string;
  value: string;
  label?: string;
}

interface CreatableNaSelectProps {
  id?: string;
  value: string;
  options: CreatableOption[];
  disabled?: boolean;
  readOnly?: boolean;
  canManageOptions?: boolean;
  className?: string;
  placeholder?: string;
  allowClear?: boolean;
  /** When false, omit the built-in N/A option (fixed-status fields). */
  includeNaOption?: boolean;
  sanitize?: (value: string) => string;
  onChange: (value: string) => void;
  onCreateOption?: (value: string) => Promise<void> | void;
  onRemoveOption?: (option: CreatableOption) => Promise<void> | void;
}

function dedupeOptions(options: CreatableOption[], currentValue: string): CreatableOption[] {
  const byKey = new Map<string, CreatableOption>();
  for (const option of options) {
    const key = normalizeCnfTextKey(option.value);
    if (!key || key === "n/a") continue;
    if (!byKey.has(key)) byKey.set(key, option);
  }
  if (!isMissingValue(currentValue)) {
    const key = normalizeCnfTextKey(currentValue);
    if (key && key !== "n/a" && !byKey.has(key)) {
      byKey.set(key, { value: currentValue.trim() });
    }
  }
  return Array.from(byKey.values()).sort((a, b) => a.value.localeCompare(b.value));
}

/**
 * Searchable Select with NA guide styling and explicit new-option creation.
 * Failed option saves must not clear the current form input.
 */
export function CreatableNaSelect({
  id,
  value,
  options,
  disabled,
  readOnly,
  canManageOptions,
  className,
  placeholder = "Select or type to search",
  allowClear = true,
  includeNaOption = true,
  sanitize = sanitizeAlphanumericInput,
  onChange,
  onCreateOption,
  onRemoveOption,
}: CreatableNaSelectProps) {
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);

  const isNa = isMissingValue(value);
  const showNaGuide = isNa && !focused && !readOnly;
  const merged = useMemo(() => dedupeOptions(options, value), [options, value]);

  const searchKey = normalizeCnfTextKey(search);
  const hasExact = merged.some((option) => normalizeCnfTextKey(option.value) === searchKey);
  const canOfferCreate =
    Boolean(onCreateOption)
    && !readOnly
    && !disabled
    && !busy
    && Boolean(searchKey)
    && searchKey !== "n/a"
    && !hasExact;

  async function handleCreate() {
    if (!onCreateOption || !canOfferCreate || busy) return;
    const next = sanitize(search).trim().replace(/\s+/g, " ");
    if (!next) return;
    const previousSearch = search;
    setBusy(true);
    try {
      await onCreateOption(next);
      onChange(next);
      setSearch("");
    } catch (error) {
      setSearch(previousSearch);
      message.error(error instanceof Error ? error.message : "Failed to save option.");
    } finally {
      setBusy(false);
    }
  }

  function confirmRemove(option: CreatableOption) {
    if (!onRemoveOption || busy) return;
    Modal.confirm({
      title: "Remove saved option?",
      content: `"${option.value}" will no longer appear as a suggestion. Existing records that use this value are not changed.`,
      okText: "Remove",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: async () => {
        setBusy(true);
        try {
          await onRemoveOption(option);
        } catch (error) {
          message.error(error instanceof Error ? error.message : "Failed to remove option.");
          throw error;
        } finally {
          setBusy(false);
        }
      },
    });
  }

  return (
    <Select
      id={id}
      className={cn(
        "cnf-creatable-select",
        showNaGuide && "na-guide",
        readOnly && "cnf-creatable-select-readonly",
        className,
      )}
      style={{ width: "100%" }}
      showSearch
      allowClear={allowClear && !readOnly && !disabled}
      disabled={disabled || readOnly || busy}
      placeholder={placeholder}
      value={isNa ? (includeNaOption ? NA_VALUE : undefined) : value}
      searchValue={search}
      filterOption={(input, option) => {
        const label = String(option?.label ?? option?.value ?? "").toLowerCase();
        return label.includes(input.trim().toLowerCase());
      }}
      options={[
        ...(includeNaOption ? [{ label: NA_VALUE, value: NA_VALUE }] : []),
        ...merged.map((option) => ({
          label: option.label ?? option.value,
          value: option.value,
          option,
        })),
      ]}
      optionRender={(option) => {
        const raw = option.data as { option?: CreatableOption; value?: string };
        const item = raw.option;
        if (!item || raw.value === NA_VALUE) {
          return <span>{String(option.label)}</span>;
        }
        return (
          <div className="cnf-creatable-select-option">
            <span className="cnf-creatable-select-option-label">{item.label ?? item.value}</span>
            {canManageOptions && onRemoveOption ? (
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                aria-label={`Remove ${item.value}`}
                disabled={busy}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  confirmRemove(item);
                }}
              />
            ) : null}
          </div>
        );
      }}
      popupRender={(menu) => (
        <>
          {menu}
          {canOfferCreate ? (
            <>
              <Divider style={{ margin: "8px 0" }} />
              <Space style={{ padding: "0 8px 8px" }}>
                <Button
                  type="link"
                  icon={<PlusOutlined />}
                  loading={busy}
                  disabled={busy}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void handleCreate()}
                >
                  Add &quot;{sanitize(search).trim()}&quot;
                </Button>
              </Space>
            </>
          ) : null}
          {canManageOptions ? (
            <Typography.Paragraph type="secondary" style={{ margin: "0 12px 8px", fontSize: 12 }}>
              Use the delete icon to remove a saved option.
            </Typography.Paragraph>
          ) : null}
        </>
      )}
      onSearch={setSearch}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
      }}
      onClear={() => onChange("")}
      onChange={(next) => {
        if (readOnly || busy) return;
        onChange(next === NA_VALUE ? "" : String(next ?? ""));
        setSearch("");
      }}
      getPopupContainer={(node) => node.parentElement ?? document.body}
    />
  );
}
