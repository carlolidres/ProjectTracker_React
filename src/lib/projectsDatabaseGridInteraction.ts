/**
 * Drag-select mousedown must not cancel an open cell editor / dropdown.
 * Ant Design Select hits `.ant-select` (not always `input`) on option open.
 */
const CELL_MOUSEDOWN_IGNORE_SELECTOR = [
  "a",
  "button",
  "input",
  "textarea",
  ".ant-select",
  ".ant-select-dropdown",
  ".ag-popup-editor",
  ".ag-select-list",
  ".ag-rich-select",
  ".ag-custom-component-popup",
  ".projects-db-creatable-editor",
].join(", ");

export function shouldIgnoreProjectsDbCellMouseDown(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== "function") return false;
  return Boolean((target as Element).closest(CELL_MOUSEDOWN_IGNORE_SELECTOR));
}
