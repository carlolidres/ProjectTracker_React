/** Kill-switch helpers for optional UX rollouts. Default ON unless explicitly false. */

function flagEnabled(raw: string | undefined, defaultOn = true): boolean {
  const value = String(raw ?? (defaultOn ? "true" : "false")).trim().toLowerCase();
  if (value === "false" || value === "0" || value === "off") return false;
  if (value === "true" || value === "1" || value === "on") return true;
  return defaultOn;
}

/** Dashboard primary workspace (action strip, quick drawer, return-to-dashboard). */
export function isDashboardWorkspaceEnabled(): boolean {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return flagEnabled(env?.VITE_FEATURE_DASHBOARD_WORKSPACE, true);
}
