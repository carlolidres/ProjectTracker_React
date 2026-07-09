import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type CellClassParams,
  type CellClickedEvent,
  type CellKeyDownEvent,
  type CellValueChangedEvent,
  type ColDef,
  type ColGroupDef,
  type ColumnResizedEvent,
  type GridApi,
  type GridReadyEvent,
  type ICellRendererParams,
  type ValueFormatterParams,
} from "ag-grid-community";
import { ProjectIdLink } from "@/components/common/project-id-link";
import { formatAppDate, formatAppMonth } from "@/lib/date";
import {
  PROJECTS_DB_DATA_COLUMNS,
  PROJECTS_DB_DEFAULT_ROW_HEIGHT,
  PROJECTS_DB_PROJECT_ID_COLUMN,
  PROJECTS_DB_ROW_HEIGHT_STORAGE_KEY,
  PROJECTS_DB_WIDTHS_STORAGE_KEY,
  canEditSpreadsheetColumn,
  filterTypeForEditor,
  type SpreadsheetColumnDef,
} from "@/lib/projectsDatabaseColumns";
import { ROLE_COLORS } from "@/lib/roleColors";
import { canAdjustSavedFgMonth, canEditProjectFields, isViewerRole } from "@/lib/roleAccess";
import { valueOrNA } from "@/lib/utils";
import type { ProjectRow, UserRole } from "@/types";
import type { SpreadsheetCellEdit } from "@/services/projectsDatabaseService";

ModuleRegistry.registerModules([AllCommunityModule]);

interface CellCoord {
  rowId: string;
  field: string;
}

function loadStoredWidths(): Record<string, number> {
  try {
    const raw = localStorage.getItem(PROJECTS_DB_WIDTHS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveStoredWidths(widths: Record<string, number>) {
  try {
    localStorage.setItem(PROJECTS_DB_WIDTHS_STORAGE_KEY, JSON.stringify(widths));
  } catch {
    // ignore
  }
}

export function loadStoredRowHeight(): number {
  try {
    const raw = localStorage.getItem(PROJECTS_DB_ROW_HEIGHT_STORAGE_KEY);
    const value = raw ? Number(raw) : PROJECTS_DB_DEFAULT_ROW_HEIGHT;
    return Number.isFinite(value) && value >= 24 && value <= 80 ? value : PROJECTS_DB_DEFAULT_ROW_HEIGHT;
  } catch {
    return PROJECTS_DB_DEFAULT_ROW_HEIGHT;
  }
}

export function saveStoredRowHeight(height: number) {
  try {
    localStorage.setItem(PROJECTS_DB_ROW_HEIGHT_STORAGE_KEY, String(height));
  } catch {
    // ignore
  }
}

function ProjectIdCell(params: ICellRendererParams<ProjectRow>) {
  const projectId = params.data?.project_id ?? "";
  return <ProjectIdLink projectId={projectId} />;
}

function formatCellValue(field: string, value: unknown, editor: string): string {
  const text = value == null ? "" : String(value);
  if (!text.trim() || valueOrNA(text) === "N/A") return text;
  if (editor === "month" || field === "fg_month") return formatAppMonth(text);
  if (editor === "date") return formatAppDate(text);
  return text;
}

function editableFieldsInOrder(): string[] {
  return PROJECTS_DB_DATA_COLUMNS.map((c) => c.field);
}

function isCellEditable(
  role: UserRole | undefined,
  column: SpreadsheetColumnDef | undefined,
  row: ProjectRow | undefined,
): boolean {
  if (!column || !row) return false;
  if (!canEditSpreadsheetColumn(role, column, canEditProjectFields) || isViewerRole(role)) return false;
  if (column.field === "fg_month") {
    const current = String(row.fg_month ?? "").trim();
    if (current && valueOrNA(current) !== "N/A" && !canAdjustSavedFgMonth(role)) return false;
  }
  if (column.field === "project_owner" && role !== "admin") return false;
  return true;
}

function buildLeafCol(
  column: SpreadsheetColumnDef,
  role: UserRole | undefined,
  dirtyKeys: Set<string>,
  selectedKeys: Set<string>,
  storedWidths: Record<string, number>,
): ColDef<ProjectRow> {
  const editable = canEditSpreadsheetColumn(role, column, canEditProjectFields);
  const colors = ROLE_COLORS[column.roleGroup];

  return {
    field: column.field as keyof ProjectRow & string,
    headerName: column.headerName,
    width: storedWidths[column.field] ?? column.width,
    pinned: column.pinned,
    editable: (params) => isCellEditable(role, column, params.data),
    cellEditor: column.editor === "select" ? "agSelectCellEditor" : "agTextCellEditor",
    headerClass: `projects-db-header-${column.roleGroup}`,
    cellClass: (params: CellClassParams<ProjectRow>) => {
      const classes = [`projects-db-cell-${column.roleGroup}`];
      if (!editable) classes.push("projects-db-cell-readonly");
      const key = `${params.data?.record_id}:${column.field}`;
      if (dirtyKeys.has(key)) classes.push("projects-db-cell-dirty");
      if (selectedKeys.has(key)) classes.push("projects-db-cell-selected");
      return classes.join(" ");
    },
    cellStyle: {
      backgroundColor: colors.tint,
    },
    valueFormatter: (params: ValueFormatterParams<ProjectRow>) =>
      formatCellValue(column.field, params.value, column.editor),
    filter: filterTypeForEditor(column.editor),
    floatingFilter: false,
    resizable: true,
    suppressHeaderMenuButton: false,
  };
}

function parseClipboardMatrix(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!normalized.trim()) return [[""]];
  return normalized.split("\n").filter((line, index, arr) => !(index === arr.length - 1 && line === "")).map((line) =>
    line.split("\t"),
  );
}

function matrixToClipboard(matrix: string[][]): string {
  return matrix.map((row) => row.join("\t")).join("\n");
}

interface ProjectsDatabaseGridProps {
  rows: ProjectRow[];
  role: UserRole | undefined;
  registry: Record<string, string[]>;
  dirtyEdits: SpreadsheetCellEdit[];
  onCellEdited: (edit: SpreadsheetCellEdit) => void;
  onBatchCellEdited?: (edits: SpreadsheetCellEdit[]) => void;
  rowHeight: number;
  showColumnFilters?: boolean;
  loading?: boolean;
  onUndoRedoAvailabilityChange?: (state: { canUndo: boolean; canRedo: boolean }) => void;
  undoRequestToken?: number;
  redoRequestToken?: number;
}

export function ProjectsDatabaseGrid({
  rows,
  role,
  registry,
  dirtyEdits,
  onCellEdited,
  onBatchCellEdited,
  rowHeight,
  showColumnFilters = true,
  loading = false,
  onUndoRedoAvailabilityChange,
  undoRequestToken = 0,
  redoRequestToken = 0,
}: ProjectsDatabaseGridProps) {
  const apiRef = useRef<GridApi<ProjectRow> | null>(null);
  const storedWidths = useMemo(() => loadStoredWidths(), []);
  const anchorRef = useRef<CellCoord | null>(null);
  const [selection, setSelection] = useState<CellCoord[]>([]);
  const columnByField = useMemo(() => {
    const map = new Map<string, SpreadsheetColumnDef>();
    map.set(PROJECTS_DB_PROJECT_ID_COLUMN.field, PROJECTS_DB_PROJECT_ID_COLUMN);
    for (const col of PROJECTS_DB_DATA_COLUMNS) map.set(col.field, col);
    return map;
  }, []);

  const dirtyKeys = useMemo(
    () => new Set(dirtyEdits.map((e) => `${e.recordId}:${e.field}`)),
    [dirtyEdits],
  );
  const selectedKeys = useMemo(
    () => new Set(selection.map((c) => `${c.rowId}:${c.field}`)),
    [selection],
  );

  const refreshUndoRedoState = useCallback(() => {
    const api = apiRef.current;
    if (!api || !onUndoRedoAvailabilityChange) return;
    onUndoRedoAvailabilityChange({
      canUndo: api.getCurrentUndoSize() > 0,
      canRedo: api.getCurrentRedoSize() > 0,
    });
  }, [onUndoRedoAvailabilityChange]);

  const columnDefs = useMemo((): (ColDef<ProjectRow> | ColGroupDef<ProjectRow>)[] => {
    const idCol: ColDef<ProjectRow> = {
      ...buildLeafCol(PROJECTS_DB_PROJECT_ID_COLUMN, role, dirtyKeys, selectedKeys, storedWidths),
      editable: false,
      cellRenderer: ProjectIdCell,
      lockPosition: "left",
      suppressMovable: true,
      floatingFilter: showColumnFilters,
      filter: "agTextColumnFilter",
    };

    const groups: ColGroupDef<ProjectRow>[] = [];
    let currentLabel = "";
    let currentChildren: ColDef<ProjectRow>[] = [];
    let currentRole = "";

    const flush = () => {
      if (!currentChildren.length) return;
      groups.push({
        headerName: currentLabel,
        marryChildren: true,
        headerClass: `projects-db-group-${currentRole}`,
        children: currentChildren,
      });
      currentChildren = [];
    };

    for (const column of PROJECTS_DB_DATA_COLUMNS) {
      if (column.roleGroupLabel !== currentLabel) {
        flush();
        currentLabel = column.roleGroupLabel;
        currentRole = column.roleGroup;
      }
      const leaf = buildLeafCol(column, role, dirtyKeys, selectedKeys, storedWidths);
      leaf.floatingFilter = showColumnFilters;
      if (column.editor === "select" && column.registry) {
        leaf.cellEditor = "agSelectCellEditor";
        leaf.cellEditorParams = {
          values: registry[column.registry] ?? [],
        };
      }
      currentChildren.push(leaf);
    }
    flush();

    return [idCol, ...groups];
  }, [dirtyKeys, registry, role, selectedKeys, showColumnFilters, storedWidths]);

  const defaultColDef = useMemo<ColDef<ProjectRow>>(
    () => ({
      sortable: true,
      resizable: true,
      filter: "agTextColumnFilter",
      floatingFilter: showColumnFilters,
      minWidth: 80,
      enableCellChangeFlash: true,
    }),
    [showColumnFilters],
  );

  const onGridReady = useCallback((event: GridReadyEvent<ProjectRow>) => {
    apiRef.current = event.api;
    refreshUndoRedoState();
  }, [refreshUndoRedoState]);

  useEffect(() => {
    apiRef.current?.resetRowHeights();
  }, [rowHeight]);

  useEffect(() => {
    if (!undoRequestToken) return;
    apiRef.current?.undoCellEditing();
    refreshUndoRedoState();
  }, [undoRequestToken, refreshUndoRedoState]);

  useEffect(() => {
    if (!redoRequestToken) return;
    apiRef.current?.redoCellEditing();
    refreshUndoRedoState();
  }, [redoRequestToken, refreshUndoRedoState]);

  const resolveRange = useCallback(
    (from: CellCoord, to: CellCoord): CellCoord[] => {
      const api = apiRef.current;
      if (!api) return [to];
      const fields = ["project_id", ...editableFieldsInOrder()];
      const fromFieldIndex = fields.indexOf(from.field);
      const toFieldIndex = fields.indexOf(to.field);
      if (fromFieldIndex < 0 || toFieldIndex < 0) return [to];

      const visibleIds: string[] = [];
      api.forEachNodeAfterFilterAndSort((node) => {
        if (node.id) visibleIds.push(node.id);
      });
      const fromRowIndex = visibleIds.indexOf(from.rowId);
      const toRowIndex = visibleIds.indexOf(to.rowId);
      if (fromRowIndex < 0 || toRowIndex < 0) return [to];

      const rowStart = Math.min(fromRowIndex, toRowIndex);
      const rowEnd = Math.max(fromRowIndex, toRowIndex);
      const colStart = Math.min(fromFieldIndex, toFieldIndex);
      const colEnd = Math.max(fromFieldIndex, toFieldIndex);
      const cells: CellCoord[] = [];
      for (let r = rowStart; r <= rowEnd; r += 1) {
        for (let c = colStart; c <= colEnd; c += 1) {
          cells.push({ rowId: visibleIds[r], field: fields[c] });
        }
      }
      return cells;
    },
    [],
  );

  const onCellClicked = useCallback(
    (event: CellClickedEvent<ProjectRow>) => {
      const field = event.colDef.field;
      const rowId = event.data?.record_id;
      if (!field || !rowId) return;
      const coord = { rowId, field };
      const mouseEvent = event.event as MouseEvent | undefined;
      if (mouseEvent?.shiftKey && anchorRef.current) {
        setSelection(resolveRange(anchorRef.current, coord));
      } else {
        anchorRef.current = coord;
        setSelection([coord]);
      }
    },
    [resolveRange],
  );

  const applyValueToCell = useCallback(
    (row: ProjectRow, field: string, newValue: string): SpreadsheetCellEdit | null => {
      const column = columnByField.get(field);
      if (!isCellEditable(role, column, row) || field === "project_id") return null;
      const oldValue = String((row as unknown as Record<string, unknown>)[field] ?? "");
      if (oldValue === newValue) return null;
      return {
        recordId: row.record_id,
        projectId: row.project_id,
        field,
        oldValue,
        newValue,
      };
    },
    [columnByField, role],
  );

  const commitEdits = useCallback(
    (edits: SpreadsheetCellEdit[]) => {
      if (!edits.length) return;
      const api = apiRef.current;
      if (!api) {
        if (onBatchCellEdited) onBatchCellEdited(edits);
        else edits.forEach((edit) => onCellEdited(edit));
        return;
      }
      // setDataValue fires cellValueChanged → onCellEdited for dirty tracking + undo stack
      for (const edit of edits) {
        const node = api.getRowNode(edit.recordId);
        if (!node?.data) continue;
        node.setDataValue(edit.field, edit.newValue);
      }
      refreshUndoRedoState();
    },
    [onBatchCellEdited, onCellEdited, refreshUndoRedoState],
  );

  const copySelection = useCallback(async () => {
    const api = apiRef.current;
    if (!api || !selection.length) return;
    const fields = ["project_id", ...editableFieldsInOrder()];
    const rowIds = new Set(selection.map((c) => c.rowId));
    const selectedFields = fields.filter((field) => selection.some((c) => c.field === field));
    const visualRowIds: string[] = [];
    api.forEachNodeAfterFilterAndSort((node) => {
      if (node.id && rowIds.has(node.id)) visualRowIds.push(node.id);
    });
    const matrix = visualRowIds.map((rowId) => {
      const node = api.getRowNode(rowId);
      return selectedFields.map((field) => {
        const value = node?.data ? String((node.data as unknown as Record<string, unknown>)[field] ?? "") : "";
        return value;
      });
    });
    await navigator.clipboard.writeText(matrixToClipboard(matrix));
  }, [selection]);

  const clearSelection = useCallback(() => {
    const api = apiRef.current;
    if (!api || !selection.length) return;
    const edits: SpreadsheetCellEdit[] = [];
    for (const cell of selection) {
      const node = api.getRowNode(cell.rowId);
      if (!node?.data) continue;
      const edit = applyValueToCell(node.data, cell.field, "");
      if (edit) edits.push(edit);
    }
    commitEdits(edits);
  }, [applyValueToCell, commitEdits, selection]);

  const pasteClipboard = useCallback(async () => {
    const api = apiRef.current;
    if (!api) return;
    const start = selection[0] ?? (anchorRef.current ? anchorRef.current : null);
    if (!start) return;
    let text = "";
    try {
      text = await navigator.clipboard.readText();
    } catch {
      return;
    }
    const matrix = parseClipboardMatrix(text);
    if (!matrix.length) return;

    const fields = ["project_id", ...editableFieldsInOrder()];
    const startFieldIndex = fields.indexOf(start.field);
    if (startFieldIndex < 0) return;

    const visibleIds: string[] = [];
    api.forEachNodeAfterFilterAndSort((node) => {
      if (node.id) visibleIds.push(node.id);
    });
    const startRowIndex = visibleIds.indexOf(start.rowId);
    if (startRowIndex < 0) return;

    const edits: SpreadsheetCellEdit[] = [];
    for (let r = 0; r < matrix.length; r += 1) {
      const rowId = visibleIds[startRowIndex + r];
      if (!rowId) break;
      const node = api.getRowNode(rowId);
      if (!node?.data) continue;
      for (let c = 0; c < matrix[r].length; c += 1) {
        const field = fields[startFieldIndex + c];
        if (!field) break;
        const edit = applyValueToCell(node.data, field, matrix[r][c] ?? "");
        if (edit) edits.push(edit);
      }
    }
    commitEdits(edits);
  }, [applyValueToCell, commitEdits, selection]);

  const onCellKeyDown = useCallback(
    (event: CellKeyDownEvent<ProjectRow>) => {
      const keyEvent = event.event as KeyboardEvent | undefined;
      if (!keyEvent) return;
      const isMod = keyEvent.ctrlKey || keyEvent.metaKey;
      const key = keyEvent.key.toLowerCase();

      if (isMod && key === "c") {
        keyEvent.preventDefault();
        void copySelection();
        return;
      }
      if (isMod && key === "v") {
        keyEvent.preventDefault();
        void pasteClipboard();
        return;
      }
      if (key === "delete" || key === "backspace") {
        if (event.api.getEditingCells().length) return;
        keyEvent.preventDefault();
        clearSelection();
        return;
      }
      if (isMod && key === "z" && !keyEvent.shiftKey) {
        // Let AG Grid undo handle; refresh buttons after
        window.setTimeout(refreshUndoRedoState, 0);
        return;
      }
      if ((isMod && key === "y") || (isMod && key === "z" && keyEvent.shiftKey)) {
        window.setTimeout(refreshUndoRedoState, 0);
      }
    },
    [clearSelection, copySelection, pasteClipboard, refreshUndoRedoState],
  );

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent<ProjectRow>) => {
      const data = event.data;
      const field = event.colDef.field;
      if (!data || !field || field === "project_id") return;
      const oldValue = event.oldValue == null ? "" : String(event.oldValue);
      const newValue = event.newValue == null ? "" : String(event.newValue);
      if (oldValue === newValue) return;
      onCellEdited({
        recordId: data.record_id,
        projectId: data.project_id,
        field,
        oldValue,
        newValue,
      });
      refreshUndoRedoState();
    },
    [onCellEdited, refreshUndoRedoState],
  );

  const onColumnResized = useCallback((event: ColumnResizedEvent<ProjectRow>) => {
    if (!event.finished || !event.column) return;
    const colId = event.column.getColId();
    const width = event.column.getActualWidth();
    if (!colId || !width) return;
    saveStoredWidths({ ...loadStoredWidths(), [colId]: width });
  }, []);

  const getRowHeight = useCallback(() => rowHeight, [rowHeight]);

  return (
    <div className="projects-db-grid-shell ag-theme-quartz">
      <AgGridReact<ProjectRow>
        theme={themeQuartz}
        rowData={rows}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        getRowId={(params) => params.data.record_id}
        getRowHeight={getRowHeight}
        onGridReady={onGridReady}
        onCellClicked={onCellClicked}
        onCellKeyDown={onCellKeyDown}
        onCellValueChanged={onCellValueChanged}
        onColumnResized={onColumnResized}
        undoRedoCellEditing
        undoRedoCellEditingLimit={50}
        singleClickEdit
        stopEditingWhenCellsLoseFocus
        animateRows={false}
        suppressCellFocus={false}
        loading={loading}
        ensureDomOrder
        alwaysShowHorizontalScroll
        alwaysShowVerticalScroll
      />
    </div>
  );
}
