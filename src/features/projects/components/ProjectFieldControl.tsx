import { Input, Select } from "antd";
import { useState } from "react";
import { AppDatePicker, AppMonthPicker } from "@/components/common/app-date-picker";
import { FieldHelpIcon } from "@/components/common/field-help-icon";
import { NaClearingInput, NaClearingTextArea } from "@/components/common/na-clearing-input";
import { NA_VALUE } from "@/lib/constants";
import type { ProjectFieldDef } from "@/lib/projectFormFields";
import {
  normalizeOrderQuantityOnBlur,
  sanitizeNumericDigits,
  sanitizeOrderQuantityInput,
} from "@/lib/orderQuantity";
import {
  cn,
  isMissingValue,
  sanitizeAlphanumericInput,
  sanitizePoControlNoInput,
  toTitleCase,
} from "@/lib/utils";

interface ProjectFieldControlProps {
  field: ProjectFieldDef;
  value: string;
  disabled?: boolean;
  readOnly?: boolean;
  registry: Record<string, string[]>;
  domId?: string;
  onChange: (value: string) => void;
}

function registryOptions(
  registry: Record<string, string[]>,
  key?: string,
  currentValue?: string,
) {
  const values = key ? registry[key] ?? [] : [];
  const seen = new Set(values);
  const legacyValues =
    currentValue && currentValue !== NA_VALUE && !seen.has(currentValue) ? [currentValue] : [];

  return [
    { label: NA_VALUE, value: NA_VALUE },
    ...values.filter((v) => v !== NA_VALUE).map((v) => ({ label: v, value: v })),
    ...legacyValues.map((v) => ({ label: v, value: v })),
  ];
}

const naGuideClass = "na-guide";

function blockViewOnlyInteraction(event: React.SyntheticEvent) {
  event.preventDefault();
  event.stopPropagation();
}

export function ProjectFieldControl({
  field,
  value,
  disabled = false,
  readOnly = false,
  registry,
  domId,
  onChange,
}: ProjectFieldControlProps) {
  const [selectFocused, setSelectFocused] = useState(false);
  const isViewOnly = readOnly && !disabled;
  const isNa = isMissingValue(value);
  const spanClass = field.span === 3 ? "project-field-span-3" : field.span === 2 ? "project-field-span-2" : "";
  const capitalizeClass = field.capitalizeWords ? "project-field-capitalize" : "";
  const anchorId = domId;
  const fieldId = anchorId ? `${anchorId}-control` : `project-field-${field.key}`;

  function handleSelectChange(next: string) {
    if (isViewOnly) return;
    onChange(next === NA_VALUE ? "" : next);
  }

  const control = (() => {
    if (field.type === "readonly") {
      return (
        <Input
          id={fieldId}
          value={isNa ? NA_VALUE : value}
          classNames={{ input: cn(isNa && naGuideClass) }}
          readOnly
        />
      );
    }

    if (field.type === "select") {
      return (
        <Select
          id={fieldId}
          className={cn(isNa && !selectFocused && naGuideClass, isViewOnly && "project-field-view-only-select")}
          style={{ width: "100%" }}
          value={isNa ? NA_VALUE : value}
          disabled={disabled && !isViewOnly}
          open={isViewOnly ? false : undefined}
          showSearch={!isViewOnly}
          tabIndex={isViewOnly ? -1 : undefined}
          options={registryOptions(registry, field.registry, value)}
          onChange={handleSelectChange}
          onFocus={() => setSelectFocused(true)}
          onBlur={() => setSelectFocused(false)}
          onMouseDown={isViewOnly ? blockViewOnlyInteraction : undefined}
          onClick={isViewOnly ? blockViewOnlyInteraction : undefined}
          onKeyDown={isViewOnly ? blockViewOnlyInteraction : undefined}
        />
      );
    }

    if (field.type === "textarea") {
      return (
        <NaClearingTextArea
          id={fieldId}
          value={value}
          disabled={disabled && !isViewOnly}
          readOnly={isViewOnly}
          onChange={onChange}
        />
      );
    }

    if (field.type === "order_quantity") {
      return (
        <NaClearingInput
          id={fieldId}
          value={value}
          disabled={disabled && !isViewOnly}
          readOnly={isViewOnly}
          inputMode="decimal"
          sanitize={sanitizeOrderQuantityInput}
          normalizeOnBlur={normalizeOrderQuantityOnBlur}
          onChange={onChange}
        />
      );
    }

    if (field.type === "date") {
      return (
        <AppDatePicker
          id={fieldId}
          value={value}
          disabled={disabled && !isViewOnly}
          readOnly={isViewOnly}
          onChange={onChange}
        />
      );
    }

    if (field.type === "month") {
      return (
        <AppMonthPicker
          id={fieldId}
          value={value}
          disabled={disabled && !isViewOnly}
          readOnly={isViewOnly}
          onChange={onChange}
        />
      );
    }

    if (field.type === "numeric") {
      return (
        <NaClearingInput
          id={fieldId}
          value={value}
          disabled={disabled && !isViewOnly}
          readOnly={isViewOnly}
          inputMode="numeric"
          sanitize={sanitizeNumericDigits}
          onChange={onChange}
        />
      );
    }

    if (field.type === "alphanumeric") {
      const sanitize =
        field.key === "po_control_no" ? sanitizePoControlNoInput : sanitizeAlphanumericInput;
      return (
        <NaClearingInput
          id={fieldId}
          value={value}
          disabled={disabled && !isViewOnly}
          readOnly={isViewOnly}
          sanitize={sanitize}
          onChange={onChange}
        />
      );
    }

    return (
      <NaClearingInput
        id={fieldId}
        value={value}
        disabled={disabled && !isViewOnly}
        readOnly={isViewOnly}
        normalizeOnBlur={field.capitalizeWords ? toTitleCase : undefined}
        onChange={onChange}
      />
    );
  })();

  return (
    <div
      id={anchorId}
      className={cn("project-field", spanClass, capitalizeClass, isViewOnly && "project-field-view-only")}
    >
      <label className="project-field-label" htmlFor={fieldId}>
        {field.tooltip ? <FieldHelpIcon title={field.tooltip} /> : null}
        <span className="project-field-label-text">{field.label}</span>
      </label>
      {control}
    </div>
  );
}
