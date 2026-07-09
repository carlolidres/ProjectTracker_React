/** Shared role palette — keep in sync with CSS vars in role-colors.css / project-form.css */

export type RoleColorKey = "am" | "qa" | "pp" | "tsd" | "val" | "qc" | "id";

export interface RoleColorTokens {
  text: string;
  bg: string;
  accent: string;
  border: string;
  tint: string;
  headerBg: string;
}

export const ROLE_COLORS: Record<RoleColorKey, RoleColorTokens> = {
  am: {
    text: "#0b6f71",
    bg: "#edf8f6",
    accent: "#0f8b8d",
    border: "#b9d9d3",
    tint: "rgba(15, 139, 141, 0.06)",
    headerBg: "#d8efec",
  },
  qa: {
    text: "#8c4a24",
    bg: "#fdf3eb",
    accent: "#b86a3a",
    border: "#e8cdb8",
    tint: "rgba(184, 106, 58, 0.06)",
    headerBg: "#f7e6d8",
  },
  pp: {
    text: "#285b9c",
    bg: "#eff5fc",
    accent: "#3d6fa8",
    border: "#bed0e5",
    tint: "rgba(61, 111, 168, 0.06)",
    headerBg: "#dce8f5",
  },
  tsd: {
    text: "#8a5a12",
    bg: "#fff7e8",
    accent: "#a36c18",
    border: "#e6d1aa",
    tint: "rgba(163, 108, 24, 0.06)",
    headerBg: "#f5e8cc",
  },
  val: {
    text: "#6842a6",
    bg: "#f5f0fb",
    accent: "#7651ad",
    border: "#d4c4e8",
    tint: "rgba(118, 81, 173, 0.06)",
    headerBg: "#e8dff4",
  },
  qc: {
    text: "#26734d",
    bg: "#eef8f1",
    accent: "#39805b",
    border: "#bddbc9",
    tint: "rgba(57, 128, 91, 0.06)",
    headerBg: "#d8eee0",
  },
  id: {
    text: "#374151",
    bg: "#f3f4f6",
    accent: "#6b7280",
    border: "#d1d5db",
    tint: "rgba(107, 114, 128, 0.04)",
    headerBg: "#e5e7eb",
  },
};

export const ROLE_LEGEND_ITEMS: { key: RoleColorKey; label: string }[] = [
  { key: "am", label: "AM/BM/PL" },
  { key: "pp", label: "PP" },
  { key: "tsd", label: "TSD" },
  { key: "val", label: "VALDN" },
  { key: "qc", label: "QC" },
  { key: "pp", label: "PLANNING (PP)" },
];
