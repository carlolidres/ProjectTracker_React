import { logAuditTrail } from "@/services/auditService";
import {
  ALL_MENU_KEYS,
  type MenuCapabilities,
  type MenuKey,
  type MenuPermissionOverride,
} from "@/lib/menuPermissions";
import { supabase } from "@/lib/supabaseClient";
import { formatServiceError } from "@/lib/utils";
import type { UserRole } from "@/types";

function mapRow(row: Record<string, unknown>): MenuPermissionOverride {
  return {
    role: String(row.role) as UserRole,
    menu_key: String(row.menu_key) as MenuKey,
    can_view: Boolean(row.can_view),
    can_create: Boolean(row.can_create),
    can_edit: Boolean(row.can_edit),
    can_export: Boolean(row.can_export),
  };
}

export async function listMenuPermissionOverrides(): Promise<MenuPermissionOverride[]> {
  const { data, error } = await supabase
    .from("menu_permission_overrides")
    .select("role, menu_key, can_view, can_create, can_edit, can_export")
    .order("role")
    .order("menu_key");
  if (error) {
    // Table may not exist yet in some environments — treat as no overrides.
    if (error.code === "42P01" || /does not exist|schema cache/i.test(error.message)) {
      return [];
    }
    throw new Error(formatServiceError(error, "Failed to load menu permission overrides."));
  }
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function upsertMenuPermissionOverride(
  override: MenuPermissionOverride,
  userEmail: string,
  previous?: MenuPermissionOverride | null,
): Promise<MenuPermissionOverride> {
  if (!ALL_MENU_KEYS.includes(override.menu_key)) {
    throw new Error(`Unknown menu key: ${override.menu_key}`);
  }
  const { data, error } = await supabase
    .from("menu_permission_overrides")
    .upsert(
      {
        role: override.role,
        menu_key: override.menu_key,
        can_view: override.can_view,
        can_create: override.can_create,
        can_edit: override.can_edit,
        can_export: override.can_export,
        updated_by: userEmail,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "role,menu_key" },
    )
    .select("role, menu_key, can_view, can_create, can_edit, can_export")
    .single();
  if (error) throw new Error(formatServiceError(error, "Failed to save menu permission override."));

  const saved = mapRow(data as Record<string, unknown>);
  await logAuditTrail({
    module: "Access Matrix",
    action: previous ? "UPDATE" : "CREATE",
    recordId: `${override.role}:${override.menu_key}`,
    projectId: "N/A",
    fieldName: "menu_permissions",
    oldValue: previous
      ? formatCaps(previous)
      : "",
    newValue: formatCaps(saved),
    remarks: `Menu permission override for ${override.role} / ${override.menu_key}`,
    userEmail,
  });
  return saved;
}

export async function deleteMenuPermissionOverride(
  role: UserRole,
  menuKey: MenuKey,
  userEmail: string,
  previous?: MenuPermissionOverride | null,
): Promise<void> {
  const { error } = await supabase
    .from("menu_permission_overrides")
    .delete()
    .eq("role", role)
    .eq("menu_key", menuKey);
  if (error) throw new Error(formatServiceError(error, "Failed to delete menu permission override."));

  await logAuditTrail({
    module: "Access Matrix",
    action: "DELETE",
    recordId: `${role}:${menuKey}`,
    projectId: "N/A",
    fieldName: "menu_permissions",
    oldValue: previous ? formatCaps(previous) : "",
    newValue: "",
    remarks: `Restored default menu permissions for ${role} / ${menuKey}`,
    userEmail,
  });
}

function formatCaps(caps: MenuCapabilities | MenuPermissionOverride): string {
  return [
    caps.can_view ? "View" : null,
    caps.can_create ? "Create" : null,
    caps.can_edit ? "Edit" : null,
    caps.can_export ? "Export" : null,
  ]
    .filter(Boolean)
    .join(", ") || "(none)";
}
