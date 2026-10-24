export const LABEL_PALETTE = [
  "#00C875",
  "#FDAB3D",
  "#E2445C",
  "#C4C4C4",
  "#0073EA",
  "#5559DF",
  "#401694",
  "#00A9A5",
  "#FF5AC4",
  "#579BFC",
  "#9D50DD",
  "#037F4C",
  "#FFCB00",
  "#BB3354",
  "#784BD1",
  "#66CCFF",
] as const;

export interface BoardLabel {
  id: string;
  kind: "status" | "priority";
  name: string;
  color: string;
  order: number;
  active: boolean;
  retired: boolean;
  description: string;
  semantic: string;
}

export function defaultBoardLabels(): BoardLabel[] {
  const status: Array<[string, string, string]> = [
    ["Done", "#00C875", "Done"],
    ["Working on it", "#FDAB3D", "Working on it"],
    ["Stuck", "#E2445C", "Stuck"],
    ["Not Started", "#C4C4C4", "Not Started"],
  ];
  const priority: Array<[string, string, string]> = [
    ["Low", "#579BFC", "Low"],
    ["Medium", "#5559DF", "Medium"],
    ["High", "#401694", "High"],
  ];
  return [
    ...status.map(([id, color, semantic], order) => makeLabel("status", id, id, color, order, semantic)),
    ...priority.map(([id, color, semantic], order) => makeLabel("priority", id, id, color, order, semantic)),
  ];
}

function makeLabel(kind: BoardLabel["kind"], id: string, name: string, color: string, order: number, semantic: string): BoardLabel {
  return { id, kind, name, color, order, active: true, retired: false, description: "", semantic };
}

export function nextLabelColor(used: string[]): string {
  const taken = new Set(used.map((color) => color.toLowerCase()));
  return LABEL_PALETTE.find((color) => !taken.has(color.toLowerCase())) ?? LABEL_PALETTE[used.length % LABEL_PALETTE.length];
}

export function labelSaveError(labels: BoardLabel[]): string {
  const names = new Set<string>();
  for (const label of labels.filter((item) => !item.retired)) {
    const name = label.name.trim();
    if (!name) return "Enter a name for each label.";
    const key = name.toLowerCase();
    if (names.has(key)) return "Label names must be different.";
    names.add(key);
  }
  if (!labels.some((item) => item.active && !item.retired)) return "Keep at least one label that can be selected.";
  return "";
}

export function labelName(labels: BoardLabel[], kind: BoardLabel["kind"], id: string): string {
  return labels.find((item) => item.kind === kind && item.id === id)?.name || id;
}

export function labelColor(labels: BoardLabel[], kind: BoardLabel["kind"], id: string, fallback: string): string {
  return labels.find((item) => item.kind === kind && item.id === id)?.color || fallback;
}

export function semanticStatus(labels: BoardLabel[], id: string): string {
  return labels.find((item) => item.kind === "status" && item.id === id)?.semantic || id;
}

export function selectableLabels(labels: BoardLabel[], kind: BoardLabel["kind"]): BoardLabel[] {
  return labels.filter((item) => item.kind === kind && item.active && !item.retired).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}
