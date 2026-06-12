import type { Profile, UserRole } from "@/types";

const LEGACY_ROLE_MAP: Record<string, UserRole> = {
  admin: "admin",
  am: "am_bm_pl",
  bm: "am_bm_pl",
  nb: "am_bm_pl",
  pl: "am_bm_pl",
  am_bm_pl: "am_bm_pl",
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
  return {
    ...profile,
    role: normalizeUserRole(profile.role),
    status: profile.status === "active" ? "active" : "inactive",
  };
}
