import { detectDuplicateValues } from "@/lib/duplicateReview";
import { buildProjectHierarchy } from "@/services/projectService";
import { generateId, isMissingValue, valueOrNA } from "@/lib/utils";
import type { Notification, ProjectRow } from "@/types";

export const LOGIC_VIOLATION_CRITICAL_KIND = "logic_violation_critical" as const;
export const LOGIC_VIOLATION_INFO_KIND = "logic_violation_info" as const;

const CRITICAL_DUPLICATE_FIELD_KEYS = new Set(["so_no", "po_control_no"]);

function normalizeIdentifier(value: unknown): string | null {
  const normalized = valueOrNA(value);
  if (isMissingValue(normalized)) return null;
  return normalized.trim().toLowerCase();
}

function groupRowsByProject(rows: ProjectRow[]): Map<string, ProjectRow[]> {
  const map = new Map<string, ProjectRow[]>();
  for (const row of rows) {
    const list = map.get(row.project_id) ?? [];
    list.push(row);
    map.set(row.project_id, list);
  }
  return map;
}

function buildLogicNotification(params: {
  projectId: string;
  recordId: string;
  fgMonth: string;
  title: string;
  message: string;
  critical: boolean;
}): Omit<Notification, "created_at"> {
  return {
    notification_id: generateId("NTF"),
    project_id: params.projectId,
    record_id: params.recordId,
    fg_month: params.fgMonth,
    severity: params.critical ? "logic" : "info",
    title: params.title,
    message: params.message,
    status: "OPEN",
    kind: params.critical ? LOGIC_VIOLATION_CRITICAL_KIND : LOGIC_VIOLATION_INFO_KIND,
  };
}

function addCrossProjectDuplicateNotifications(
  rows: ProjectRow[],
  field: "so_no" | "po_control_no",
  label: string,
  notifications: Omit<Notification, "created_at">[],
) {
  const valueToProjects = new Map<string, Set<string>>();
  for (const row of rows) {
    const value = normalizeIdentifier(row[field]);
    if (!value) continue;
    const projects = valueToProjects.get(value) ?? new Set<string>();
    projects.add(row.project_id);
    valueToProjects.set(value, projects);
  }

  for (const [value, projects] of valueToProjects) {
    if (projects.size <= 1) continue;
    const projectId = [...projects][0];
    const sample = rows.find(
      (row) => row.project_id === projectId && normalizeIdentifier(row[field]) === value,
    );
    notifications.push(
      buildLogicNotification({
        projectId,
        recordId: sample?.record_id ?? "N/A",
        fgMonth: sample?.fg_month ?? "N/A",
        critical: true,
        title: `Critical: Duplicate ${label} across projects`,
        message: `${label} "${value.toUpperCase()}" is used on ${projects.size} active projects.`,
      }),
    );
  }
}

function addIntraProjectDuplicateNotifications(
  projectId: string,
  projectRows: ProjectRow[],
  field: "so_no" | "po_control_no",
  label: string,
  notifications: Omit<Notification, "created_at">[],
) {
  const counts = new Map<string, number>();
  for (const row of projectRows) {
    const value = normalizeIdentifier(row[field]);
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  for (const [value, count] of counts) {
    if (count <= 1) continue;
    const sample = projectRows.find((row) => normalizeIdentifier(row[field]) === value);
    notifications.push(
      buildLogicNotification({
        projectId,
        recordId: sample?.record_id ?? "N/A",
        fgMonth: sample?.fg_month ?? "N/A",
        critical: true,
        title: `Critical: Duplicate ${label} in project`,
        message: `${label} "${value.toUpperCase()}" appears on ${count} PO lines in project ${projectId}.`,
      }),
    );
  }
}

export function buildLogicViolationNotifications(rows: ProjectRow[]): Omit<Notification, "created_at">[] {
  const notifications: Omit<Notification, "created_at">[] = [];
  const byProject = groupRowsByProject(rows);

  addCrossProjectDuplicateNotifications(rows, "so_no", "SO No.", notifications);
  addCrossProjectDuplicateNotifications(rows, "po_control_no", "PO Control No.", notifications);

  for (const [projectId, projectRows] of byProject) {
    addIntraProjectDuplicateNotifications(projectId, projectRows, "so_no", "SO No.", notifications);
    addIntraProjectDuplicateNotifications(projectId, projectRows, "po_control_no", "PO Control No.", notifications);

    const hierarchy = buildProjectHierarchy(projectRows);
    if (!hierarchy) continue;

    const duplicateGroups = detectDuplicateValues(hierarchy).filter(
      (group) => !CRITICAL_DUPLICATE_FIELD_KEYS.has(group.fieldKey),
    );

    for (const group of duplicateGroups) {
      notifications.push(
        buildLogicNotification({
          projectId,
          recordId: projectRows[0]?.record_id ?? "N/A",
          fgMonth: projectRows[0]?.fg_month ?? "N/A",
          critical: false,
          title: "Repeated field values (informational)",
          message: `${group.fieldLabel} "${group.value}" is repeated on ${group.occurrences.length} PO lines.`,
        }),
      );
    }
  }

  return notifications;
}

export function isCriticalLogicViolation(
  notification: Pick<Notification, "kind">,
): boolean {
  return notification.kind === LOGIC_VIOLATION_CRITICAL_KIND;
}

export function isInfoLogicViolation(notification: Pick<Notification, "kind">): boolean {
  return notification.kind === LOGIC_VIOLATION_INFO_KIND;
}

export function countCriticalLogicViolations(
  notifications: Array<Pick<Notification, "kind">>,
): number {
  return notifications.filter(isCriticalLogicViolation).length;
}

export function countInfoLogicViolations(
  notifications: Array<Pick<Notification, "kind">>,
): number {
  return notifications.filter(isInfoLogicViolation).length;
}
