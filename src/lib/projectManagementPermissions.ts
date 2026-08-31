import type { Profile, UserRole } from "@/types";

/** Prompt "Administrator" → existing admin role. */
export function canManagePmWorkspace(role: UserRole | undefined): boolean {
  return role !== undefined && role !== "view";
}

/**
 * Who may assign/reassign Project Management tasks.
 * Admin and VAL always can. Other roles need the User Management privilege.
 */
export function canAssignPmTasks(role: UserRole | undefined, eligible = false): boolean {
  if (!role || role === "view") return false;
  if (role === "admin" || role === "val") return true;
  return eligible;
}

/** Active users who can appear on a Project Management task. VAL is always eligible. */
export function isPmTaskAssigneeOption(
  profile: Pick<Profile, "status" | "role" | "pm_task_eligible">,
): boolean {
  if (profile.status !== "active" || profile.role === "view") return false;
  if (profile.role === "val") return true;
  return Boolean(profile.pm_task_eligible);
}

/** Prompt "Reviewer or Approver" for documented phase overrides. */
export function canOverridePmPhase(role: UserRole | undefined): boolean {
  return role === "admin" || role === "am_bm_pl" || role === "val";
}

export function canReopenPmTask(role: UserRole | undefined): boolean {
  return role === "admin" || role === "am_bm_pl" || role === "val";
}

export function canDeletePmTask(role: UserRole | undefined): boolean {
  return role === "admin" || role === "am_bm_pl" || role === "val";
}

export function canUpdateAssignedPmTask(
  role: UserRole | undefined,
  userId: string | undefined,
  assigneeIds: string[],
  eligible = false,
): boolean {
  if (!role || role === "view" || !userId) return false;
  if (canAssignPmTasks(role, eligible)) return true;
  return assigneeIds.includes(userId);
}
