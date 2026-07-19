import type { CustomCellEditorProps } from "ag-grid-react";
import {
  CreatableNaSelect,
  type CreatableOption,
} from "@/components/common/creatable-na-select";
import type { ProjectRow } from "@/types";

export interface RegistryCreatableEditorParams {
  options: CreatableOption[];
  canManageOptions?: boolean;
  sanitize?: (value: string) => string;
  onCreateOption?: (value: string) => Promise<void>;
  onRemoveOption?: (option: CreatableOption) => Promise<void>;
}

/** AG Grid popup editor: searchable creatable registry select (Activity Type, etc.). */
export function RegistryCreatableCellEditor(
  props: CustomCellEditorProps<ProjectRow, string> & RegistryCreatableEditorParams,
) {
  const value = props.value == null ? "" : String(props.value);

  return (
    <div className="projects-db-creatable-editor">
      <CreatableNaSelect
        value={value}
        options={props.options ?? []}
        canManageOptions={props.canManageOptions}
        sanitize={props.sanitize}
        popupClassName="ag-custom-component-popup projects-db-creatable-popup"
        onChange={(next) => {
          props.onValueChange(next);
          props.stopEditing();
        }}
        onCreateOption={props.onCreateOption}
        onRemoveOption={props.canManageOptions ? props.onRemoveOption : undefined}
      />
    </div>
  );
}
