export const COLUMN_CATEGORIES = [
  { id: "featured", label: "Featured" },
  { id: "essentials", label: "Essentials" },
  { id: "super", label: "Super Useful" },
  { id: "team", label: "Team Power-Up" },
  { id: "board", label: "Board Power-Up" },
] as const;

export type ColumnCategory = (typeof COLUMN_CATEGORIES)[number]["id"];

export interface ColumnTypeDef {
  type: string;
  title: string;
  description: string;
  category: Exclude<ColumnCategory, "featured">;
  featured?: boolean;
  color: string;
  readOnly?: boolean;
}

export const COLUMN_TYPES: ColumnTypeDef[] = [
  { type: "status", title: "Status", description: "A color label for where the task stands.", category: "essentials", featured: true, color: "#00c875" },
  { type: "priority", title: "Priority", description: "How urgent the task is, separate from status.", category: "essentials", featured: true, color: "#fdab3d" },
  { type: "label", title: "Label", description: "One color category, such as Validation or QC.", category: "essentials", featured: true, color: "#a25ddc" },
  { type: "people", title: "People", description: "One or more people from this workspace.", category: "essentials", featured: true, color: "#579bfc" },
  { type: "date", title: "Date", description: "A single date, stored as a calendar day.", category: "essentials", color: "#00c875" },
  { type: "timeline", title: "Timeline", description: "A start and end date for this column.", category: "essentials", featured: true, color: "#a25ddc" },
  { type: "numbers", title: "Numbers", description: "A number, percent, or plain amount.", category: "essentials", featured: true, color: "#fdab3d" },
  { type: "text", title: "Text", description: "A short line such as a batch or reference.", category: "essentials", featured: true, color: "#579bfc" },
  { type: "document", title: "Task Document", description: "A note or link kept with the task.", category: "essentials", color: "#7e5bef" },
  { type: "connect", title: "Connect Boards", description: "Link tasks on this board or another board you can open.", category: "essentials", color: "#e2445c" },
  { type: "mirror", title: "Mirror", description: "Show a column from a task linked by Connect Boards.", category: "essentials", color: "#ff5ac4" },
  { type: "checkbox", title: "Checkbox", description: "Checked or not checked.", category: "super", color: "#fdab3d" },
  { type: "link", title: "Link", description: "A web address with an optional label.", category: "super", color: "#579bfc" },
  { type: "clock", title: "World Clock", description: "The current time in a chosen timezone.", category: "super", color: "#00c875" },
  { type: "itemId", title: "Item ID", description: "The task’s saved id. It cannot be edited.", category: "super", color: "#579bfc", readOnly: true },
  { type: "phone", title: "Phone", description: "A phone number you can call.", category: "super", color: "#a25ddc" },
  { type: "location", title: "Location", description: "An address or place name.", category: "super", color: "#ff5ac4" },
  { type: "files", title: "Files", description: "Files stored with this task.", category: "super", color: "#579bfc" },
  { type: "tags", title: "Tags", description: "Several keywords on the task.", category: "team", color: "#a25ddc" },
  { type: "vote", title: "Vote", description: "One vote per person, with a count.", category: "team", color: "#00c875" },
  { type: "rating", title: "Rating", description: "A 1 to 5 rating.", category: "team", color: "#579bfc" },
  { type: "created", title: "Creation Log", description: "Who created the task and when.", category: "team", color: "#a25ddc", readOnly: true },
  { type: "updated", title: "Last Updated", description: "Who last changed the task and when.", category: "team", color: "#e2445c", readOnly: true },
  { type: "autoNumber", title: "Auto Number", description: "The task’s order in its group.", category: "team", color: "#fdab3d", readOnly: true },
  { type: "progress", title: "Progress Tracking", description: "A percent from 0 to 100.", category: "team", color: "#a25ddc" },
  { type: "dependencies", title: "Dependencies", description: "Predecessor tasks on this board.", category: "board", color: "#7e5bef" },
  { type: "formula", title: "Formula", description: "A calculated number from other columns.", category: "board", color: "#7e5bef", readOnly: true },
  { type: "timer", title: "Time Tracking", description: "Start and stop time spent on the task.", category: "board", color: "#fdab3d" },
  { type: "dropdown", title: "Dropdown", description: "One choice from a list you define.", category: "board", color: "#00c875" },
  { type: "button", title: "Button", description: "Opens the task.", category: "board", featured: true, color: "#7e5bef" },
  { type: "week", title: "Week", description: "A calendar week, including the year.", category: "board", color: "#fdab3d" },
  { type: "hour", title: "Hour", description: "A time of day.", category: "board", color: "#579bfc" },
  { type: "email", title: "Email", description: "An email address.", category: "board", color: "#00c875" },
  { type: "country", title: "Country", description: "A country stored as its two-letter code.", category: "board", color: "#00c875" },
  { type: "color", title: "Color Picker", description: "A hex color.", category: "board", color: "#579bfc" },
];

const BUILTIN_KEYS: Record<string, string> = {
  status: "status",
  priority: "priority",
  people: "owner",
  timeline: "timeline",
  dependencies: "depends",
};

export function builtinColumnKey(type: string): string | null {
  return BUILTIN_KEYS[type] ?? null;
}

export function formatColumnValue(type: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return type === "progress" ? `${value}%` : String(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === "string" || typeof item === "number") return String(item);
      if (item && typeof item === "object" && "title" in item) return String((item as { title?: unknown }).title ?? "");
      return "";
    }).filter(Boolean).join(", ");
  }
  return "";
}

export function columnSortKey(type: string, value: unknown): string | number {
  if (value === null || value === undefined || value === "") return "";
  if (type === "numbers" || type === "progress" || type === "rating") {
    const number = typeof value === "number" ? value : Number(value);
    return Number.isFinite(number) ? number : "";
  }
  if (type === "checkbox") return value ? 1 : 0;
  return formatColumnValue(type, value).toLowerCase();
}

export function columnTypeDef(type: string): ColumnTypeDef | undefined {
  return COLUMN_TYPES.find((item) => item.type === type);
}

export function defaultColumnSettings(type: string): Record<string, unknown> {
  if (type === "status") {
    return { options: ["Not Started", "Working on it", "Stuck", "Done"] };
  }
  if (type === "priority") return { options: ["Critical", "High", "Medium", "Low"] };
  if (type === "label") return { options: ["Validation", "QC Testing", "Documentation", "Client Review"] };
  if (type === "dropdown") return { options: ["Option 1", "Option 2"] };
  if (type === "clock") return { timeZone: "Asia/Manila" };
  if (type === "formula") return { expression: "" };
  if (type === "mirror") return { sourceColumnId: "" };
  if (type === "numbers") return { format: "number" };
  if (type === "button") return { label: "Open" };
  return {};
}

export interface BoardColumn {
  id: string;
  projectId: string;
  type: string;
  title: string;
  settings: Record<string, unknown>;
  position: number;
}

export function optionList(settings: Record<string, unknown>): string[] {
  const raw = settings.options;
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => String(item)).filter(Boolean);
}
