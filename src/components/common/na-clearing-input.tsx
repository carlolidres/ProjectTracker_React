import { Input } from "antd";
import { useEffect, useState } from "react";
import { NA_VALUE } from "@/lib/constants";
import { isMissingValue } from "@/lib/utils";

interface NaClearingInputProps {
  id?: string;
  value: string;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  onChange: (value: string) => void;
  sanitize?: (value: string) => string;
  normalizeOnBlur?: (value: string) => string;
}

const naGuideClass = "na-guide";

export function NaClearingInput({
  id,
  value,
  disabled = false,
  readOnly = false,
  placeholder,
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
      classNames={{ input: showNaGuide ? naGuideClass : undefined }}
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
        const trimmed = event.target.value.trim();
        const next = normalizeOnBlur
          ? normalizeOnBlur(trimmed === NA_VALUE ? "" : trimmed)
          : trimmed === NA_VALUE ? "" : trimmed;
        onChange(next);
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
      classNames={{ textarea: showNaGuide ? naGuideClass : undefined }}
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
        const trimmed = event.target.value.trim();
        onChange(trimmed === NA_VALUE ? "" : trimmed);
      }}
      onChange={(event) => {
        if (readOnly) return;
        setDraftValue(event.target.value);
        onChange(event.target.value);
      }}
    />
  );
}
