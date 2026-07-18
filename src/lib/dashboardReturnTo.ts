import { isDashboardWorkspaceEnabled } from "@/lib/featureFlags";

export const RETURN_TO_PARAM = "return_to";
export const DASHBOARD_RETURN_PATH = "/dashboard";

/** Append return_to=/dashboard when workspace UX is enabled. */
export function appendReturnToDashboard(path: string): string {
  if (!isDashboardWorkspaceEnabled()) return path;
  const qIndex = path.indexOf("?");
  const base = qIndex >= 0 ? path.slice(0, qIndex) : path;
  const params = new URLSearchParams(qIndex >= 0 ? path.slice(qIndex + 1) : "");
  if (!params.get(RETURN_TO_PARAM)) {
    params.set(RETURN_TO_PARAM, DASHBOARD_RETURN_PATH);
  }
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function readReturnToPath(searchParams: URLSearchParams): string | null {
  const raw = (searchParams.get(RETURN_TO_PARAM) ?? "").trim();
  if (!raw) return null;
  // Only allow in-app hash routes we control (leading slash, no protocol).
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) return null;
  return raw;
}

export function stripReturnToParam(searchParams: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  next.delete(RETURN_TO_PARAM);
  return next;
}
