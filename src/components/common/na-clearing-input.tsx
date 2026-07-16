import { Input, Select } from "antd";
import { useEffect, useState } from "react";
import { NA_VALUE } from "@/lib/constants";
import { cn, isMissingValue } from "@/lib/utils";

interface NaClearingInputProps {
  id?: string;
  value: string;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  onChange: (value: string) => void;
  sanitize?: (value: string) => string;
  normalizeOnBlur?: (value: string) => string;
}

const naGuideClass = "na-guide";

function clearNaSentinel(value: string): string {
  const trimmed = value.trim();
  return isMissingValue(trimmed) ? "" : trimmed;
}

export function NaClearingInput({
  id,
  value,
  disabled = false,
  readOnly = false,
  placeholder,
  className,
  inputMode,
  onChange,
  sanitize,
  normalizeOnBlur,
}: NaClearingInputProps) {
  const [focused, setFocused] = useState(false);
  const [draftValue, setDraftValue] = useState(value);
  const isNa = isMissingValue(value);
  const showNaGuide = isNa && !focused && !readOnly;

  useEffect(() => {
    if (!focused) setDraftValue(value);
  }, [value, focused]);

  return (
    <Input
      id={id}
      placeholder={placeholder}
      inputMode={inputMode}
      className={cn(showNaGuide && naGuideClass, className)}
      value={focused ? draftValue : showNaGuide ? NA_VALUE : value}
      disabled={disabled}
      readOnly={readOnly}
      onFocus={() => {
        if (readOnly) return;
        setFocused(true);
        setDraftValue(isNa ? "" : value);
      }}
      onBlur={(event) => {
        if (readOnly) return;
        setFocused(false);
        const cleared = clearNaSentinel(event.target.value);
        onChange(normalizeOnBlur ? normalizeOnBlur(cleared) : cleared);
      }}
      onChange={(event) => {
        if (readOnly) return;
        const next = sanitize ? sanitize(event.target.value) : event.target.value;
        setDraftValue(next);
        onChange(next);
      }}
    />
  );
}

interface NaClearingTextAreaProps {
  id?: string;
  value: string;
  disabled?: boolean;
  readOnly?: boolean;
  rows?: number;
  onChange: (value: string) => void;
}

export function NaClearingTextArea({
  id,
  value,
  disabled = false,
  readOnly = false,
  rows = 3,
  onChange,
}: NaClearingTextAreaProps) {
  const [focused, setFocused] = useState(false);
  const [draftValue, setDraftValue] = useState(value);
  const isNa = isMissingValue(value);
  const showNaGuide = isNa && !focused && !readOnly;

  useEffect(() => {
    if (!focused) setDraftValue(value);
  }, [value, focused]);

  return (
    <Input.TextArea
      id={id}
      rows={rows}
      className={showNaGuide ? naGuideClass : undefined}
      value={focused ? draftValue : showNaGuide ? NA_VALUE : value}
      disabled={disabled}
      readOnly={readOnly}
      onFocus={() => {
        if (readOnly) return;
        setFocused(true);
        setDraftValue(isNa ? "" : value);
      }}
      onBlur={(event) => {
        if (readOnly) return;
        setFocused(false);
        onChange(clearNaSentinel(event.target.value));
      }}
      onChange={(event) => {
        if (readOnly) return;
        const next = event.target.value;
        setDraftValue(next);
        onChange(next);
      }}
    />
  );
}

interface NaClearingSelectProps {
  id?: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
  showSearch?: boolean;
  includeNaOption?: boolean;
  onChange: (value: string) => void;
}

/** Select with gray N/A guide; empty/cleared values stay "" in form state until submit. */
export function NaClearingSelect({
  id,
  value,
  options,
  disabled = false,
  readOnly = false,
  placeholder,
  className,
  allowClear = true,
  showSearch = true,
  includeNaOption = true,
  onChange,
}: NaClearingSelectProps) {
  const [focused, setFocused] = useState(false);
  const isNa = isMissingValue(value);
  const showNaGuide = isNa && !focused && !readOnly;

  return (
    <Select
      id={id}
      className={cn(showNaGuide && naGuideClass, className)}
      style={{ width: "100%" }}
      allowClear={allowClear && !readOnly && !disabled}
      showSearch={showSearch}
      placeholder={placeholder}
      disabled={disabled || readOnly}
      value={isNa ? (includeNaOption ? NA_VALUE : undefined) : value}
      options={[
        ...(includeNaOption ? [{ label: NA_VALUE, value: NA_VALUE }] : []),
        ...options.filter((option) => !isMissingValue(option.value)),
      ]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onClear={() => onChange("")}
      onChange={(next) => {
        if (readOnly) return;
        onChange(next == null || isMissingValue(next) ? "" : String(next));
      }}
    />
  );
}
