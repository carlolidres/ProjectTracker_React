import { Input, Select } from "antd";

import { useEffect, useState } from "react";

import { FieldHelpIcon } from "@/components/common/field-help-icon";

import { NA_VALUE } from "@/lib/constants";
import { formatAppMonth } from "@/lib/date";

import type { ProjectFieldDef } from "@/lib/projectFormFields";
import {
  normalizeOrderQuantityOnBlur,
  sanitizeNumericDigits,
  sanitizeOrderQuantityInput,
} from "@/lib/orderQuantity";
import { cn, isMissingValue } from "@/lib/utils";



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

  const [focused, setFocused] = useState(false);
  const [draftValue, setDraftValue] = useState(value);
  const isDateLikeField = field.type === "date" || field.type === "month";

  useEffect(() => {
    if (!focused || !isDateLikeField) {
      setDraftValue(value);
    }
  }, [focused, isDateLikeField, value]);

  const isViewOnly = readOnly && !disabled;

  const isNa = isMissingValue(value);

  const showNaGuide = isNa && !focused && !isViewOnly;

  const spanClass = field.span === 3 ? "project-field-span-3" : field.span === 2 ? "project-field-span-2" : "";

  const anchorId = domId;

  const fieldId = anchorId ? `${anchorId}-control` : `project-field-${field.key}`;

  const inputClassNames = { input: cn(showNaGuide && naGuideClass) };

  const textareaClassNames = { textarea: cn(showNaGuide && naGuideClass) };

  const helpSuffix = field.tooltip ? <FieldHelpIcon title={field.tooltip} /> : undefined;



  function handleFocus() {

    if (isViewOnly) return;

    setFocused(true);

  }



  function handleBlur(next: string) {

    if (isViewOnly) return;

    setFocused(false);

    const trimmed = next.trim();

    onChange(trimmed === NA_VALUE ? "" : trimmed);

  }



  function handleSelectChange(next: string) {

    if (isViewOnly) return;

    onChange(next === NA_VALUE ? "" : next);

  }



  function handleViewOnlyFocus(event: React.FocusEvent<HTMLElement>) {

    if (!isViewOnly) return;

    event.target.blur();

  }



  const control = (() => {

    if (field.type === "readonly") {

      return (

        <Input

          id={fieldId}

          value={isNa ? NA_VALUE : value}

          classNames={{ input: cn(isNa && naGuideClass) }}

          suffix={helpSuffix}

          readOnly

          disabled

        />

      );

    }



    if (field.type === "select") {

      return (

        <div className="project-field-input-shell project-field-input-shell-select">

          <Select

            id={fieldId}

            className={cn(isNa && naGuideClass, isViewOnly && "project-field-view-only-select")}

            style={{ width: "100%" }}

            value={isNa ? NA_VALUE : value}

            disabled={disabled && !isViewOnly}

            open={isViewOnly ? false : undefined}

            showSearch={!isViewOnly}

            tabIndex={isViewOnly ? -1 : undefined}

            options={registryOptions(registry, field.registry, value)}

            onChange={handleSelectChange}

            onMouseDown={isViewOnly ? blockViewOnlyInteraction : undefined}

            onClick={isViewOnly ? blockViewOnlyInteraction : undefined}

            onKeyDown={isViewOnly ? blockViewOnlyInteraction : undefined}

            onFocus={handleViewOnlyFocus}

          />

          {field.tooltip ? <FieldHelpIcon title={field.tooltip} className="field-help-icon-overlay" /> : null}

        </div>

      );

    }



    if (field.type === "textarea") {

      return (

        <div className="project-field-input-shell project-field-input-shell-textarea">

          <Input.TextArea

            id={fieldId}

            rows={3}

            classNames={textareaClassNames}

            value={showNaGuide ? NA_VALUE : value}

            disabled={disabled && !isViewOnly}

            readOnly={isViewOnly}

            tabIndex={isViewOnly ? -1 : undefined}

            onFocus={(event) => {

              handleViewOnlyFocus(event);

              handleFocus();

            }}

            onBlur={(e) => handleBlur(e.target.value)}

            onChange={(e) => onChange(e.target.value)}

            onMouseDown={isViewOnly ? blockViewOnlyInteraction : undefined}

          />

          {field.tooltip ? <FieldHelpIcon title={field.tooltip} className="field-help-icon-overlay" /> : null}

        </div>

      );

    }



    if (field.type === "order_quantity") {
      return (
        <Input
          id={fieldId}
          classNames={inputClassNames}
          value={showNaGuide ? NA_VALUE : value}
          disabled={disabled && !isViewOnly}
          readOnly={isViewOnly}
          tabIndex={isViewOnly ? -1 : undefined}
          suffix={helpSuffix}
          inputMode="decimal"
          onFocus={(event) => {
            handleViewOnlyFocus(event);
            handleFocus();
          }}
          onBlur={(e) => {
            if (isViewOnly) return;
            setFocused(false);
            onChange(normalizeOrderQuantityOnBlur(e.target.value));
          }}
          onChange={(e) => onChange(sanitizeOrderQuantityInput(e.target.value))}
          onMouseDown={isViewOnly ? blockViewOnlyInteraction : undefined}
        />
      );
    }

    if (field.type === "date" || field.type === "month") {
      const inputType = showNaGuide || isViewOnly ? "text" : field.type;
      const displayValue = showNaGuide
        ? NA_VALUE
        : field.type === "month" && isViewOnly
          ? formatAppMonth(value)
          : focused
            ? draftValue
            : value;

      return (
        <Input
          id={fieldId}
          type={inputType}
          classNames={inputClassNames}
          value={displayValue}
          disabled={disabled && !isViewOnly}
          readOnly={isViewOnly}
          tabIndex={isViewOnly ? -1 : undefined}
          suffix={helpSuffix}
          onFocus={(event) => {
            handleViewOnlyFocus(event);
            setDraftValue(value);
            handleFocus();
          }}
          onBlur={(e) => {
            if (isViewOnly) return;
            setFocused(false);
            const trimmed = e.target.value.trim();
            const next = trimmed === NA_VALUE ? "" : trimmed;
            setDraftValue(next);
            onChange(next);
          }}
          onChange={(e) => {
            if (isViewOnly) return;
            setDraftValue(e.target.value);
          }}
          onMouseDown={isViewOnly ? blockViewOnlyInteraction : undefined}
        />
      );
    }



    return (

      <Input

        id={fieldId}

        classNames={inputClassNames}

        value={showNaGuide ? NA_VALUE : value}

        disabled={disabled && !isViewOnly}

        readOnly={isViewOnly}

        tabIndex={isViewOnly ? -1 : undefined}

        suffix={helpSuffix}

        inputMode={field.type === "numeric" ? "numeric" : undefined}

        onFocus={(event) => {

          handleViewOnlyFocus(event);

          handleFocus();

        }}

        onBlur={(e) => handleBlur(e.target.value)}

        onChange={(e) => {
          const next =
            field.type === "numeric" ? sanitizeNumericDigits(e.target.value) : e.target.value;
          onChange(next);
        }}

        onMouseDown={isViewOnly ? blockViewOnlyInteraction : undefined}

      />

    );

  })();



  return (

    <div

      id={anchorId}

      className={cn("project-field", spanClass, isViewOnly && "project-field-view-only")}

    >

      <label className="project-field-label" htmlFor={fieldId}>

        {field.label}

      </label>

      {control}

    </div>

  );

}


