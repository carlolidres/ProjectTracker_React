import type { ComponentType } from "react";

export type UserRole =
  | "am_bm_pl"
  | "qa"
  | "pp"
  | "tsd"
  | "val"
  | "qc"
  | "admin"
  | "view";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  middle_initial: string | null;
  last_name: string | null;
  department: string | null;
  avatar_url: string | null;
  role: UserRole;
  requested_role: UserRole | null;
  status: "pending" | "active" | "inactive";
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  roles?: UserRole[];
}
