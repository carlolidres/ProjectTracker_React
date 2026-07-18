import assert from "node:assert/strict";
import {
  ALL_MENU_KEYS,
  DEFAULT_MENU_PERMISSIONS,
  DEFAULT_USER_MENU_KEYS,
  canMenu,
  canMenuPath,
  menuKeyFromPath,
  resolveMenuCapabilities,
  type MenuKey,
  type MenuPermissionOverride,
} from "../src/lib/menuPermissions";
import type { UserRole } from "../src/types";

const nonAdminRoles: UserRole[] = ["view", "am_bm_pl", "pp", "tsd", "val", "qc", "qa"];

for (const role of nonAdminRoles) {
  for (const menu of DEFAULT_USER_MENU_KEYS) {
    assert.equal(
      DEFAULT_MENU_PERMISSIONS[role][menu].can_view,
      true,
      `${role} should View ${menu}`,
    );
  }
  for (const menu of ALL_MENU_KEYS.filter((key) => !DEFAULT_USER_MENU_KEYS.includes(key))) {
    assert.equal(
      DEFAULT_MENU_PERMISSIONS[role][menu].can_view,
      false,
      `${role} should not View ${menu} by default`,
    );
  }
}

for (const menu of DEFAULT_USER_MENU_KEYS) {
  assert.equal(canMenu("view", menu, "create"), false);
  assert.equal(canMenu("view", menu, "edit"), false);
  assert.equal(canMenu("view", menu, "export"), false);
}

assert.equal(canMenu("val", "cnf_tracker", "create"), true);
assert.equal(canMenu("am_bm_pl", "cnf_tracker", "create"), false);
assert.equal(canMenu("val", "endorsement_tracker", "edit"), true);
assert.equal(canMenu("qa", "endorsement_tracker", "edit"), true);
assert.equal(canMenu("admin", "audit_trail", "view"), true);
assert.equal(canMenu("admin", "admin_access", "view"), true);

assert.equal(menuKeyFromPath("/projects/database"), "projects_database");
assert.equal(menuKeyFromPath("/admin/access"), "admin_access");
assert.equal(canMenuPath("view", "/audit-trail", "view"), false);
assert.equal(canMenuPath("admin", "/audit-trail", "view"), true);

const override: MenuPermissionOverride = {
  role: "view",
  menu_key: "audit_trail",
  can_view: true,
  can_create: false,
  can_edit: false,
  can_export: true,
};
assert.equal(resolveMenuCapabilities("view", "audit_trail", [override]).can_view, true);
assert.equal(canMenu("view", "audit_trail", "export", [override]), true);
assert.equal(canMenu("view", "audit_trail", "edit", [override]), false);

const blockEdit: MenuPermissionOverride = {
  role: "val",
  menu_key: "endorsement_tracker",
  can_view: true,
  can_create: false,
  can_edit: false,
  can_export: false,
};
assert.equal(canMenu("val", "endorsement_tracker", "edit", [blockEdit]), false);

// Dashboard never gets create/edit/export even if override tries
const badDash: MenuPermissionOverride = {
  role: "admin",
  menu_key: "dashboard",
  can_view: true,
  can_create: true,
  can_edit: true,
  can_export: true,
};
const dashCaps = resolveMenuCapabilities("admin", "dashboard", [badDash]);
assert.equal(dashCaps.can_create, false);
assert.equal(dashCaps.can_edit, false);
assert.equal(dashCaps.can_export, false);

void (ALL_MENU_KEYS as readonly MenuKey[]);

console.log("verify-menu-permissions: PASS");
