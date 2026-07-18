/** Curated release history for the About drawer (newest first). Keep in sync with GitHub Releases / agent-workflow/releases. */

export interface AppVersionHistoryEntry {
  version: string;
  title: string;
  date?: string;
  sha?: string;
  changes: string[];
}

export const APP_VERSION_HISTORY: AppVersionHistoryEntry[] = [
  {
    version: "0.91.0",
    title: "Projects Database UX + remarks columns + About history",
    date: "2026-07-18",
    changes: [
      "Projects Database: Full View default, FG Month filters, Activity Type creatable cells, Esc clears selection",
      "Hide long-text columns from spreadsheet; TSD/QC Remarks on Project Entry (migrations)",
      "Project Entry: role-default tabs; expand hierarchy when opened from Projects Database",
      "Dashboard workspace Phase B create-return flows; sticky Dashboard context on DB drills",
      "Retire dead Project Entry CnfCreateModal; New CNF → CnfTrackerDetailModal only",
      "About drawer version history with per-release change summaries",
    ],
  },
  {
    version: "0.90.0",
    title: "Dashboard workspace Phase A + collapsed shell hover rail",
    date: "2026-07-18",
    sha: "de385ef",
    changes: [
      "Dashboard “Do next” action strip and project quick drawer (feature-flagged)",
      "Drill routes return to Dashboard via filter banner",
      "Collapsed sidebar persists across navigation; hover FAB shows icon rail",
      "Project Entry sticky title + role tabs stack without overlap",
    ],
  },
  {
    version: "0.89.0",
    title: "Menu permission matrix + dashboard hub",
    date: "2026-07-18",
    sha: "82bc127",
    changes: [
      "Access Matrix admin UI and menu View/Create/Edit/Export overrides",
      "Default seven core menus for new/non-admin users",
      "Dashboard filter banners and FG delivery / monthly trend drills",
      "Menu-matrix migration and rollback documentation",
    ],
  },
  {
    version: "0.88.0",
    title: "Endorsement Tracker, Support enhancements, N/A guide",
    date: "2026-07-16",
    sha: "9e87130",
    changes: [
      "Endorsement Tracker UI, sync, and related Supabase migrations",
      "Support Activities Non-Process fields and CNF link improvements",
      "CNF Tracker classification and project deep-link fixes",
      "Global italic N/A styling for empty optional fields",
      "About / version drawer wired to package version + deploy SHA",
    ],
  },
];

export function getAppVersionHistory(): AppVersionHistoryEntry[] {
  return APP_VERSION_HISTORY;
}
