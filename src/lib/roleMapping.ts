import type { Profile, UserRole } from "@/types";

const LEGACY_ROLE_MAP: Record<string, UserRole> = {
  admin: "admin",
  am: "am_bm_pl",
  bm: "am_bm_pl",
  nb: "am_bm_pl",
  pl: "am_bm_pl",
  am_bm_pl: "am_bm_pl",
  qa: "qa",
  pp: "pp",
  tsd: "tsd",
  val: "val",
  qc: "qc",
  view: "view",
};

export function normalizeUserRole(rawRole: string | null | undefined): UserRole {
  const key = String(rawRole ?? "").trim().toLowerCase();
  return LEGACY_ROLE_MAP[key] ?? "view";
}

export function normalizeProfile(profile: Profile): Profile {
  const status =
    profile.status === "active" || profile.status === "pending"
      ? profile.status
      : "inactive";

  return {
    ...profile,
    role: normalizeUserRole(profile.role),
    requested_role: profile.requested_role
      ? normalizeUserRole(profile.requested_role)
      : null,
    status,
  };
}
