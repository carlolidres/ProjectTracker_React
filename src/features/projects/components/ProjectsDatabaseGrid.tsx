import { FormOutlined } from "@ant-design/icons";
import { App, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AgGridReact } from "ag-grid-react";
import { useAuth } from "@/app/auth-provider";
import { useRegistry } from "@/app/registry-provider";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type CellClassParams,
  type CellClickedEvent,
  type CellContextMenuEvent,
  type CellFocusedEvent,
  type CellKeyDownEvent,
  type CellMouseDownEvent,
  type CellValueChangedEvent,
  type ColDef,
  type ColGroupDef,
  type ColumnResizedEvent,
  type GridApi,
  type GridReadyEvent,
  type ICellRendererParams,
  type ValueFormatterParams,
} from "ag-grid-community";
import { compareAppMonthYear, compareMonthFilterDate, formatAppDate, formatAppMonth } from "@/lib/date";
import {
  PROJECTS_DB_DATA_COLUMNS,
  PROJECTS_DB_DEFAULT_ROW_HEIGHT,
  PROJECTS_DB_PROJECT_ID_COLUMN,
  PROJECTS_DB_ROW_HEIGHT_STORAGE_KEY,
  PROJECTS_DB_WIDTHS_STORAGE_KEY,
  canEditSpreadsheetColumn,
  filterTypeForEditor,
  isMonthYearFilterColumn,
  resolveSpreadsheetColumnFocus,
  type SpreadsheetColumnDef,
  type SpreadsheetColumnFocus,
} from "@/lib/projectsDatabaseColumns";
import { ProjectsDbMonthYearDateInput } from "@/features/projects/components/ProjectsDbMonthYearDateInput";
import { RegistryCreatableCellEditor } from "@/features/projects/components/RegistryCreatableCellEditor";
import {
  cellErrorKey,
  validateSpreadsheetCellValue,
} from "@/lib/projectsDatabaseValidation";
import { ROLE_COLORS } from "@/lib/roleColors";
import { canAdjustSavedFgMonth, canEditProjectFields, isViewerRole } from "@/lib/roleAccess";
import { isMissingValue, valueOrNA } from "@/lib/utils";
import { removeRegistryValue, saveRegistryValue } from "@/services/registryService";
import type { ProjectRow, UserRole } from "@/types";
import type { SpreadsheetCellEdit } from "@/services/projectsDatabaseService";

ModuleRegistry.registerModules([AllCommunityModule]);

interface CellCoord {
  rowId: string;
  field: string;
}

type CellWriteResult =
  | { status: "applied"; edit: SpreadsheetCellEdit }
  | { status: "unchanged" }
  | { status: "protected"; label: string }
  | { status: "invalid"; label: string; message: string };

function cellFromPoint(clientX: number, clientY: number): CellCoord | null {
  const el = document.elementFromPoint(clientX, clientY);
  if (!(el instanceof Element)) return null;
  const cell = el.closest(".ag-cell");
  const row = el.closest(".ag-row");
  if (!(cell instanceof HTMLElement) || !(row instanceof HTMLElement)) return null;
  const field = cell.getAttribute("col-id");
  const rowId = row.getAttribute("row-id");
  if (!field || !rowId) return null;
  return { rowId, field };
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

function formatSoNoLabel(value: unknown): string {
  const soNo = value == null ? "" : String(value).trim();
  return soNo && soNo.toUpperCase() !== "N/A" ? soNo : "N/A";
}

/** Content width for SO No. in All Columns mode; long values are capped (ellipsis). */
function estimateSoNoColumnWidth(rows: ProjectRow[]): number {
  const maxCharsCounted = 12;
  let maxLen = "SO No.".length;
  for (const row of rows) {
    maxLen = Math.max(maxLen, Math.min(formatSoNoLabel(row.so_no).length, maxCharsCounted));
  }
  return Math.min(160, Math.max(88, 24 + Math.ceil(maxLen * 7.5)));
}

function OpenProjectCell(params: ICellRendererParams<ProjectRow>) {
  const projectId = params.data?.project_id ?? "";
  if (isMissingValue(projectId)) {
    return (
      <span className="projects-db-open-cell is-disabled" aria-hidden>
        <FormOutlined />
      </span>
    );
  }
  return (
    <Link
      to={`/projects?projectId=${encodeURIComponent(projectId)}&from=database`}
      className="projects-db-open-cell"
      title="Open project form"
      aria-label={`Open project ${projectId}`}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <FormOutlined />
    </Link>
  );
}

function SoNoCell(params: ICellRendererParams<ProjectRow>) {
  return <span className="projects-db-so-value">{formatSoNoLabel(params.value)}</span>;
}

function formatCellValue(field: string, value: unknown, editor: string): string {
  const text = value == null ? "" : String(value);
  if (!text.trim() || valueOrNA(text) === "N/A") return text;
  if (editor === "month" || field === "fg_month") return formatAppMonth(text);
  if (editor === "date") return formatAppDate(text);
  return text;
}

function editableFieldsInOrder(dataColumns: SpreadsheetColumnDef[]): string[] {
  return dataColumns.map((c) => c.field);
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
  errorKeys: Set<string>,
  cellErrors: Record<string, string>,
  storedWidths: Record<string, number>,
  autofit = false,
): ColDef<ProjectRow> {
  const editable = canEditSpreadsheetColumn(role, column, canEditProjectFields);
  const colors = ROLE_COLORS[column.roleGroup];
  const preferredWidth = storedWidths[column.field] ?? column.width;

  return {
    field: column.field as keyof ProjectRow & string,
    headerName: column.headerName,
    ...(autofit && !column.pinned
      ? {
          flex: 1,
          minWidth: Math.max(96, Math.min(preferredWidth, 160)),
        }
      : {
          width: preferredWidth,
        }),
    pinned: column.pinned,
    editable: (params) => isCellEditable(role, column, params.data),
    cellEditor: column.editor === "select" ? "agSelectCellEditor" : "agTextCellEditor",
    headerClass: `projects-db-header-${column.roleGroup}`,
    cellClass: (params: CellClassParams<ProjectRow>) => {
      const classes = [`projects-db-cell-${column.roleGroup}`];
      if (!editable || column.readOnlyAlways) classes.push("projects-db-cell-readonly");
      const key = `${params.data?.record_id}:${column.field}`;
      if (dirtyKeys.has(key)) classes.push("projects-db-cell-dirty");
      if (selectedKeys.has(key)) classes.push("projects-db-cell-selected");
      if (errorKeys.has(key)) classes.push("projects-db-cell-error");
      return classes.join(" ");
    },
    cellStyle: {
      backgroundColor: colors.tint,
    },
    valueFormatter: (params: ValueFormatterParams<ProjectRow>) =>
      formatCellValue(column.field, params.value, column.editor),
    tooltipValueGetter: (params) => {
      if (!params.data) return undefined;
      return cellErrors[cellErrorKey(params.data.record_id, column.field)];
    },
    filter: isMonthYearFilterColumn(column)
      ? "agDateColumnFilter"
      : filterTypeForEditor(column.editor),
    ...(isMonthYearFilterColumn(column)
      ? {
          comparator: compareAppMonthYear,
          filterParams: {
            comparator: compareMonthFilterDate,
            browserDatePicker: false,
            buttons: ["clear"],
            maxNumConditions: 1,
          },
        }
      : {}),
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
  /** Column visibility focus only — never changes edit permissions. */
  columnFocus?: SpreadsheetColumnFocus;
  loading?: boolean;
  onUndoRedoAvailabilityChange?: (state: { canUndo: boolean; canRedo: boolean }) => void;
  undoRequestToken?: number;
  redoRequestToken?: number;
  onCellErrorsChange?: (errors: Record<string, string>) => void;
}

export function ProjectsDatabaseGrid({
  rows,
  role,
  registry,
  dirtyEdits,
  onCellEdited,
  onBatchCellEdited,
  rowHeight,
  showColumnFilters = false,
  columnFocus,
  loading = false,
  onUndoRedoAvailabilityChange,
  undoRequestToken = 0,
  redoRequestToken = 0,
  onCellErrorsChange,
}: ProjectsDatabaseGridProps) {
  const { message } = App.useApp();
  const { user } = useAuth();
  const { refreshRegistry } = useRegistry();
  const apiRef = useRef<GridApi<ProjectRow> | null>(null);
  const storedWidths = useMemo(() => loadStoredWidths(), []);
  const anchorRef = useRef<CellCoord | null>(null);
  const dragSelectingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const resolveRangeRef = useRef<(from: CellCoord, to: CellCoord) => CellCoord[]>(() => []);
  const [selection, setSelection] = useState<CellCoord[]>([]);
  const [cellErrors, setCellErrors] = useState<Record<string, string>>({});
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const dataColumns = useMemo(
    () => resolveSpreadsheetColumnFocus(columnFocus),
    [columnFocus],
  );
  const autofitColumns = Boolean(columnFocus && columnFocus.mode !== "all");
  const allColumnsMode = !autofitColumns;
  const soNoColumnWidth = useMemo(
    () => (allColumnsMode ? estimateSoNoColumnWidth(rows) : (storedWidths.so_no ?? 120)),
    [allColumnsMode, rows, storedWidths.so_no],
  );

  const canManageActivityTypeOptions =
    Boolean(role) && !isViewerRole(role) && canEditProjectFields(role as UserRole, "am");

  const activityTypeOptions = useMemo(
    () => (registry.activity_type ?? []).map((value) => ({ value })),
    [registry.activity_type],
  );

  const handleCreateActivityType = useCallback(
    async (value: string) => {
      if (!user?.email) throw new Error("Sign in again to add activity types.");
      await saveRegistryValue("activity_type", value, value, user.email);
      await refreshRegistry();
    },
    [refreshRegistry, user?.email],
  );

  const handleRemoveActivityType = useCallback(
    async (option: { value: string }) => {
      if (!user?.email) throw new Error("Sign in again to remove activity types.");
      await removeRegistryValue("activity_type", option.value, user.email);
      await refreshRegistry();
    },
    [refreshRegistry, user?.email],
  );

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
  const errorKeys = useMemo(() => new Set(Object.keys(cellErrors)), [cellErrors]);

  useEffect(() => {
    onCellErrorsChange?.(cellErrors);
  }, [cellErrors, onCellErrorsChange]);

  const clearCellError = useCallback((recordId: string, field: string) => {
    const key = cellErrorKey(recordId, field);
    setCellErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  const setCellError = useCallback((recordId: string, field: string, message: string) => {
    setCellErrors((current) => ({ ...current, [cellErrorKey(recordId, field)]: message }));
  }, []);

  const refreshUndoRedoState = useCallback(() => {
    const api = apiRef.current;
    if (!api || !onUndoRedoAvailabilityChange) return;
    onUndoRedoAvailabilityChange({
      canUndo: api.getCurrentUndoSize() > 0,
      canRedo: api.getCurrentRedoSize() > 0,
    });
  }, [onUndoRedoAvailabilityChange]);

  const columnDefs = useMemo((): (ColDef<ProjectRow> | ColGroupDef<ProjectRow>)[] => {
    const openProjectCol: ColDef<ProjectRow> = {
      colId: "open_project",
      headerName: "",
      width: 42,
      minWidth: 42,
      maxWidth: 42,
      pinned: "left",
      lockPosition: "left",
      suppressMovable: true,
      sortable: false,
      filter: false,
      floatingFilter: false,
      resizable: false,
      editable: false,
      cellRenderer: OpenProjectCell,
      cellClass: "projects-db-cell-open",
      headerClass: "projects-db-header-open",
      suppressHeaderMenuButton: true,
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

    for (const column of dataColumns) {
      if (column.roleGroupLabel !== currentLabel) {
        flush();
        currentLabel = column.roleGroupLabel;
        currentRole = column.roleGroup;
      }
      const leaf = buildLeafCol(
        column,
        role,
        dirtyKeys,
        selectedKeys,
        errorKeys,
        cellErrors,
        storedWidths,
        autofitColumns,
      );
      leaf.floatingFilter = showColumnFilters;
      if (column.field === "activity_type") {
        leaf.cellEditor = RegistryCreatableCellEditor;
        leaf.cellEditorPopup = true;
        leaf.cellEditorParams = {
          options: activityTypeOptions,
          canManageOptions: canManageActivityTypeOptions,
          onCreateOption: handleCreateActivityType,
          onRemoveOption: handleRemoveActivityType,
        };
      } else if (column.editor === "select" && column.registry) {
        leaf.cellEditor = "agSelectCellEditor";
        leaf.cellEditorParams = {
          values: registry[column.registry] ?? [],
        };
      }
      if (column.field === "so_no") {
        leaf.cellRenderer = SoNoCell;
        leaf.pinned = undefined;
        leaf.flex = undefined;
        leaf.width = soNoColumnWidth;
        leaf.minWidth = allColumnsMode ? 88 : 100;
        leaf.maxWidth = allColumnsMode ? 160 : undefined;
      }
      currentChildren.push(leaf);
    }
    flush();

    return [openProjectCol, ...groups];
  }, [
    activityTypeOptions,
    allColumnsMode,
    autofitColumns,
    canManageActivityTypeOptions,
    cellErrors,
    dataColumns,
    dirtyKeys,
    errorKeys,
    handleCreateActivityType,
    handleRemoveActivityType,
    registry,
    role,
    selectedKeys,
    showColumnFilters,
    soNoColumnWidth,
    storedWidths,
  ]);

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

  const gridComponents = useMemo(
    () => ({ agDateInput: ProjectsDbMonthYearDateInput }),
    [],
  );

  const onGridReady = useCallback((event: GridReadyEvent<ProjectRow>) => {
    apiRef.current = event.api;
    refreshUndoRedoState();
    if (autofitColumns) {
      window.requestAnimationFrame(() => event.api.sizeColumnsToFit());
    }
  }, [autofitColumns, refreshUndoRedoState]);

  useEffect(() => {
    apiRef.current?.resetRowHeights();
  }, [rowHeight]);

  useEffect(() => {
    if (!autofitColumns) return;
    const api = apiRef.current;
    if (!api) return;
    const fit = () => api.sizeColumnsToFit();
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [autofitColumns, columnDefs]);

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
      const fields = editableFieldsInOrder(dataColumns);
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
    [dataColumns],
  );

  useEffect(() => {
    resolveRangeRef.current = resolveRange;
  }, [resolveRange]);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!dragSelectingRef.current || !anchorRef.current) return;
      const coord = cellFromPoint(event.clientX, event.clientY);
      if (!coord) return;
      if (coord.rowId === anchorRef.current.rowId && coord.field === anchorRef.current.field) return;
      dragMovedRef.current = true;
      setSelection(resolveRangeRef.current(anchorRef.current, coord));
    };
    const endDrag = () => {
      if (!dragSelectingRef.current) return;
      dragSelectingRef.current = false;
      setIsDragSelecting(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", endDrag);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", endDrag);
    };
  }, []);

  const onCellMouseDown = useCallback(
    (event: CellMouseDownEvent<ProjectRow>) => {
      const mouseEvent = event.event as MouseEvent | undefined;
      if (!mouseEvent || mouseEvent.button !== 0) return;
      const target = mouseEvent.target as HTMLElement | null;
      if (target?.closest("a, button, input, textarea")) return;

      const field = event.colDef.field;
      const rowId = event.data?.record_id;
      if (!field || !rowId) return;

      mouseEvent.preventDefault();
      dragSelectingRef.current = true;
      dragMovedRef.current = false;
      setIsDragSelecting(true);
      event.api.stopEditing();

      const coord = { rowId, field };
      if (mouseEvent.shiftKey && anchorRef.current) {
        setSelection(resolveRange(anchorRef.current, coord));
      } else {
        anchorRef.current = coord;
        setSelection([coord]);
      }
    },
    [resolveRange],
  );

  const onCellClicked = useCallback(
    (event: CellClickedEvent<ProjectRow>) => {
      // Drag gestures already updated selection on mousedown/mousemove.
      if (dragMovedRef.current) {
        dragMovedRef.current = false;
        event.api.stopEditing();
        return;
      }
      const field = event.colDef.field;
      const rowId = event.data?.record_id;
      if (!field || !rowId) return;
      const coord = { rowId, field };
      const mouseEvent = event.event as MouseEvent | undefined;
      if (mouseEvent?.shiftKey && anchorRef.current) {
        setSelection(resolveRange(anchorRef.current, coord));
      } else if (!dragSelectingRef.current) {
        anchorRef.current = coord;
        setSelection([coord]);
      }
    },
    [resolveRange],
  );

  const onCellFocused = useCallback(
    (event: CellFocusedEvent<ProjectRow>) => {
      const api = apiRef.current;
      if (!api || event.rowIndex == null || !event.column) return;
      const column = typeof event.column === "string" ? api.getColumn(event.column) : event.column;
      const field = column?.getColDef().field;
      if (!field) return;
      const node = api.getDisplayedRowAtIndex(event.rowIndex);
      const rowId = node?.data?.record_id;
      if (!rowId) return;
      const coord = { rowId, field };
      // Sync custom selection with keyboard focus (mouse handled in onCellClicked).
      const fromKeyboard = Boolean(
        (event as CellFocusedEvent<ProjectRow> & { isFromKeyboardNavigation?: boolean })
          .isFromKeyboardNavigation,
      );
      if (!fromKeyboard) return;
      // AG Grid focus event does not always include the keyboard event; Shift extend stays on click.
      anchorRef.current = coord;
      setSelection([coord]);
    },
    [],
  );

  const applyValueToCell = useCallback(
    (row: ProjectRow, field: string, newValue: string): CellWriteResult => {
      const column = columnByField.get(field);
      const label = column?.headerName ?? field;
      if (!column || field === "project_id" || !isCellEditable(role, column, row)) {
        return { status: "protected", label };
      }
      const oldValue = String((row as unknown as Record<string, unknown>)[field] ?? "");
      const validated = validateSpreadsheetCellValue(column, newValue, registry);
      if (!validated.ok) {
        const errorMessage = validated.message ?? "Invalid value";
        setCellError(row.record_id, field, errorMessage);
        return { status: "invalid", label, message: errorMessage };
      }
      clearCellError(row.record_id, field);
      if (oldValue === validated.normalized) return { status: "unchanged" };
      return {
        status: "applied",
        edit: {
          recordId: row.record_id,
          projectId: row.project_id,
          field,
          oldValue,
          newValue: validated.normalized,
        },
      };
    },
    [clearCellError, columnByField, registry, role, setCellError],
  );

  const reportPasteFeedback = useCallback(
    (stats: { applied: number; protectedCount: number; invalidCount: number }) => {
      const parts: string[] = [];
      if (stats.applied) parts.push(`Updated ${stats.applied} cell${stats.applied === 1 ? "" : "s"}`);
      if (stats.protectedCount) {
        parts.push(
          `skipped ${stats.protectedCount} protected/read-only cell${stats.protectedCount === 1 ? "" : "s"}`,
        );
      }
      if (stats.invalidCount) {
        parts.push(
          `${stats.invalidCount} invalid value${stats.invalidCount === 1 ? "" : "s"} blocked`,
        );
      }
      if (!parts.length) {
        message.info("No editable cells changed");
        return;
      }
      const text = parts.join("; ");
      if (stats.protectedCount || stats.invalidCount) message.warning(text);
      else message.success(text);
    },
    [message],
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
    if (!api || !selection.length) {
      message.info("Select one or more cells to copy");
      return;
    }
    const fields = editableFieldsInOrder(dataColumns);
    const rowIds = new Set(selection.map((c) => c.rowId));
    const selectedFields = fields.filter((field) => selection.some((c) => c.field === field));
    const visualRowIds: string[] = [];
    api.forEachNodeAfterFilterAndSort((node) => {
      if (node.id && rowIds.has(node.id)) visualRowIds.push(node.id);
    });
    const matrix = visualRowIds.map((rowId) => {
      const node = api.getRowNode(rowId);
      return selectedFields.map((field) => {
        const column = columnByField.get(field);
        const raw = node?.data ? String((node.data as unknown as Record<string, unknown>)[field] ?? "") : "";
        return formatCellValue(field, raw, column?.editor ?? "text");
      });
    });
    try {
      await navigator.clipboard.writeText(matrixToClipboard(matrix));
      const cellCount = visualRowIds.length * selectedFields.length;
      message.success(`Copied ${cellCount} cell${cellCount === 1 ? "" : "s"}`);
    } catch {
      message.error("Clipboard access was blocked. Allow copy and try again.");
    }
  }, [columnByField, dataColumns, message, selection]);

  const clearSelection = useCallback(() => {
    const api = apiRef.current;
    if (!api || !selection.length) return;
    const edits: SpreadsheetCellEdit[] = [];
    let protectedCount = 0;
    let invalidCount = 0;
    for (const cell of selection) {
      const node = api.getRowNode(cell.rowId);
      if (!node?.data) continue;
      const result = applyValueToCell(node.data, cell.field, "");
      if (result.status === "applied") edits.push(result.edit);
      else if (result.status === "protected") protectedCount += 1;
      else if (result.status === "invalid") invalidCount += 1;
    }
    commitEdits(edits);
    reportPasteFeedback({ applied: edits.length, protectedCount, invalidCount });
  }, [applyValueToCell, commitEdits, reportPasteFeedback, selection]);

  const pasteClipboard = useCallback(async () => {
    const api = apiRef.current;
    if (!api) return;
    // resolveRange builds top-left → bottom-right order; selection[0] is the paste origin.
    const start = selection[0] ?? (anchorRef.current ? anchorRef.current : null);
    if (!start) {
      message.info("Select a cell or range before pasting");
      return;
    }
    let text = "";
    try {
      text = await navigator.clipboard.readText();
    } catch {
      message.error("Clipboard access was blocked. Allow paste and try again.");
      return;
    }
    const matrix = parseClipboardMatrix(text);
    if (!matrix.length) return;

    const fields = editableFieldsInOrder(dataColumns);
    const startFieldIndex = fields.indexOf(start.field);
    if (startFieldIndex < 0) return;

    const visibleIds: string[] = [];
    api.forEachNodeAfterFilterAndSort((node) => {
      if (node.id) visibleIds.push(node.id);
    });
    const startRowIndex = visibleIds.indexOf(start.rowId);
    if (startRowIndex < 0) return;

    const edits: SpreadsheetCellEdit[] = [];
    let protectedCount = 0;
    let invalidCount = 0;
    const collect = (row: ProjectRow, field: string, value: string) => {
      const result = applyValueToCell(row, field, value);
      if (result.status === "applied") edits.push(result.edit);
      else if (result.status === "protected") protectedCount += 1;
      else if (result.status === "invalid") invalidCount += 1;
    };

    const singleValue =
      matrix.length === 1
      && matrix[0].length === 1
      && selection.length > 1;

    if (singleValue) {
      const value = matrix[0][0] ?? "";
      for (const cell of selection) {
        const node = api.getRowNode(cell.rowId);
        if (!node?.data) continue;
        collect(node.data, cell.field, value);
      }
    } else {
      for (let r = 0; r < matrix.length; r += 1) {
        const rowId = visibleIds[startRowIndex + r];
        if (!rowId) break;
        const node = api.getRowNode(rowId);
        if (!node?.data) continue;
        for (let c = 0; c < matrix[r].length; c += 1) {
          const field = fields[startFieldIndex + c];
          if (!field) break;
          collect(node.data, field, matrix[r][c] ?? "");
        }
      }
    }
    commitEdits(edits);
    reportPasteFeedback({ applied: edits.length, protectedCount, invalidCount });
  }, [
    applyValueToCell,
    commitEdits,
    dataColumns,
    message,
    reportPasteFeedback,
    selection,
  ]);

  const fillDownSelection = useCallback(() => {
    const api = apiRef.current;
    if (!api || !selection.length) return;
    const fields = editableFieldsInOrder(dataColumns);
    const selectedFields = fields.filter((field) => selection.some((c) => c.field === field));
    const rowIds = new Set(selection.map((c) => c.rowId));
    const visualRowIds: string[] = [];
    api.forEachNodeAfterFilterAndSort((node) => {
      if (node.id && rowIds.has(node.id)) visualRowIds.push(node.id);
    });
    if (visualRowIds.length < 2) return;

    const edits: SpreadsheetCellEdit[] = [];
    let protectedCount = 0;
    let invalidCount = 0;
    for (const field of selectedFields) {
      const sourceNode = api.getRowNode(visualRowIds[0]);
      if (!sourceNode?.data) continue;
      const sourceValue = String((sourceNode.data as unknown as Record<string, unknown>)[field] ?? "");
      for (let i = 1; i < visualRowIds.length; i += 1) {
        const node = api.getRowNode(visualRowIds[i]);
        if (!node?.data) continue;
        const result = applyValueToCell(node.data, field, sourceValue);
        if (result.status === "applied") edits.push(result.edit);
        else if (result.status === "protected") protectedCount += 1;
        else if (result.status === "invalid") invalidCount += 1;
      }
    }
    commitEdits(edits);
    reportPasteFeedback({ applied: edits.length, protectedCount, invalidCount });
  }, [applyValueToCell, commitEdits, dataColumns, reportPasteFeedback, selection]);

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
      if (isMod && key === "d") {
        if (event.api.getEditingCells().length) return;
        keyEvent.preventDefault();
        fillDownSelection();
        return;
      }
      if (key === "escape") {
        if (event.api.getEditingCells().length) return;
        keyEvent.preventDefault();
        setSelection([]);
        anchorRef.current = null;
        setContextMenu(null);
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
    [clearSelection, copySelection, fillDownSelection, pasteClipboard, refreshUndoRedoState],
  );

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent<ProjectRow>) => {
      const data = event.data;
      const field = event.colDef.field;
      if (!data || !field || field === "project_id") return;
      const column = columnByField.get(field);
      const oldValue = event.oldValue == null ? "" : String(event.oldValue);
      const newValue = event.newValue == null ? "" : String(event.newValue);
      if (oldValue === newValue) return;

      if (!column || !isCellEditable(role, column, data)) {
        (data as unknown as Record<string, unknown>)[field] = oldValue;
        event.api.refreshCells({ rowNodes: [event.node], columns: [field], force: true });
        return;
      }

      const validated = validateSpreadsheetCellValue(column, newValue, registry);
      if (!validated.ok) {
        setCellError(data.record_id, field, validated.message ?? "Invalid value");
        (data as unknown as Record<string, unknown>)[field] = oldValue;
        event.api.refreshCells({ rowNodes: [event.node], columns: [field], force: true });
        return;
      }

      clearCellError(data.record_id, field);
      if (validated.normalized !== newValue) {
        (data as unknown as Record<string, unknown>)[field] = validated.normalized;
        event.api.refreshCells({ rowNodes: [event.node], columns: [field], force: true });
      }

      onCellEdited({
        recordId: data.record_id,
        projectId: data.project_id,
        field,
        oldValue,
        newValue: validated.normalized,
      });
      refreshUndoRedoState();
    },
    [clearCellError, columnByField, onCellEdited, refreshUndoRedoState, registry, role, setCellError],
  );

  const onColumnResized = useCallback((event: ColumnResizedEvent<ProjectRow>) => {
    if (!event.finished || !event.column) return;
    // Persist only user drags — ignore autofit / sizeColumnsToFit.
    if (event.source !== "uiColumnResized" && event.source !== "uiColumnDragged") return;
    const colId = event.column.getColId();
    const width = event.column.getActualWidth();
    if (!colId || !width) return;
    saveStoredWidths({ ...loadStoredWidths(), [colId]: width });
  }, []);

  const getRowHeight = useCallback(() => rowHeight, [rowHeight]);

  const onCellContextMenu = useCallback(
    (event: CellContextMenuEvent<ProjectRow>) => {
      const mouseEvent = event.event as MouseEvent | undefined;
      if (!mouseEvent) return;
      mouseEvent.preventDefault();
      mouseEvent.stopPropagation();

      const field = event.colDef.field;
      const rowId = event.data?.record_id;
      if (!field || !rowId) return;

      const coord = { rowId, field };
      const alreadySelected = selection.some(
        (cell) => cell.rowId === rowId && cell.field === field,
      );
      if (!alreadySelected) {
        anchorRef.current = coord;
        setSelection([coord]);
      }

      setContextMenu({ x: mouseEvent.clientX, y: mouseEvent.clientY });
    },
    [selection],
  );

  const contextMenuItems = useMemo<MenuProps["items"]>(
    () => [
      {
        key: "copy",
        label: "Copy",
        disabled: selection.length === 0,
        onClick: () => {
          void copySelection();
          setContextMenu(null);
        },
      },
      {
        key: "paste",
        label: "Paste",
        onClick: () => {
          void pasteClipboard();
          setContextMenu(null);
        },
      },
    ],
    [copySelection, pasteClipboard, selection.length],
  );

  return (
    <div
      className={`projects-db-grid-shell ag-theme-quartz${isDragSelecting ? " is-drag-selecting" : ""}`}
      onContextMenu={(event) => {
        // Browser menu is handled per-cell; suppress leftover shell context menus.
        if (event.target instanceof Element && event.target.closest(".ag-cell")) {
          event.preventDefault();
        }
      }}
    >
      <AgGridReact<ProjectRow>
        theme={themeQuartz}
        rowData={rows}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        components={gridComponents}
        getRowId={(params) => params.data.record_id}
        getRowHeight={getRowHeight}
        onGridReady={onGridReady}
        onCellMouseDown={onCellMouseDown}
        onCellClicked={onCellClicked}
        onCellContextMenu={onCellContextMenu}
        onCellFocused={onCellFocused}
        onCellKeyDown={onCellKeyDown}
        onCellValueChanged={onCellValueChanged}
        onColumnResized={onColumnResized}
        undoRedoCellEditing
        undoRedoCellEditingLimit={50}
        singleClickEdit={selection.length <= 1}
        stopEditingWhenCellsLoseFocus
        animateRows={false}
        suppressCellFocus={false}
        preventDefaultOnContextMenu
        enableBrowserTooltips
        tooltipShowDelay={400}
        loading={loading}
        ensureDomOrder
        alwaysShowHorizontalScroll={!autofitColumns}
        alwaysShowVerticalScroll
      />
      {contextMenu ? (
        <Dropdown
          menu={{ items: contextMenuItems }}
          open
          trigger={["contextMenu"]}
          onOpenChange={(open) => {
            if (!open) setContextMenu(null);
          }}
          destroyPopupOnHide
        >
          <span
            className="projects-db-context-menu-anchor"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          />
        </Dropdown>
      ) : null}
    </div>
  );
}
