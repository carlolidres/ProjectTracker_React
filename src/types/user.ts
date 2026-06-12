import type { ComponentType } from "react";

export type UserRole =
  | "am_bm_pl"
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
  role: UserRole;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  roles?: UserRole[];
}
