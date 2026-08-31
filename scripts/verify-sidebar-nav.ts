import assert from "node:assert/strict";
import {
  AI_ASSISTANT_NAV_LEAF,
  ALL_SIDEBAR_NAV_LEAVES,
  canViewAskAi,
  filterSidebarNavSections,
  flattenSidebarNavLeaves,
  getVisibleSidebarNavLeaves,
} from "../src/components/layout/sidebar-nav-tree";
import type { MenuPermissionOverride } from "../src/lib/menuPermissions";

const none: MenuPermissionOverride[] = [];

const viewSections = filterSidebarNavSections("view", none);
const viewHrefs = flattenSidebarNavLeaves(viewSections).map((item) => item.href);

assert.deepEqual(
  viewHrefs,
  [
    "/dashboard",
    "/project-management",
    "/projects",
    "/projects/database",
    "/support-activities",
    "/cnf-tracker",
    "/endorsement-tracker",
    "/lessons-learned",
  ],
);
assert.equal(viewSections.some((section) => section.type === "group" && section.id === "admin"), false);
assert.equal(viewHrefs.includes("/ai-assistant"), false);
assert.equal(canViewAskAi("view", none), true);

const adminHrefs = getVisibleSidebarNavLeaves("admin", none).map((item) => item.href);
assert.equal(adminHrefs.includes("/ai-assistant"), false);
assert.equal(adminHrefs.includes("/admin/users"), true);
assert.equal(adminHrefs.includes("/admin/data-map"), true);
assert.equal(canViewAskAi("admin", none), true);

const adminSections = filterSidebarNavSections("admin", none);
const projects = adminSections.find((section) => section.type === "group" && section.id === "projects");
assert.ok(projects && projects.type === "group");
assert.deepEqual(projects.items.map((item) => item.label), ["Entry", "Spreadsheet"]);

const trackers = adminSections.find((section) => section.type === "group" && section.id === "trackers");
assert.ok(trackers && trackers.type === "group");
assert.deepEqual(trackers.items.map((item) => item.label), ["CNF", "Endorsement"]);

const hideEntry: MenuPermissionOverride[] = [{
  role: "am_bm_pl",
  menu_key: "projects_entry",
  can_view: false,
  can_create: false,
  can_edit: false,
  can_export: false,
}];
const amSections = filterSidebarNavSections("am_bm_pl", hideEntry);
const amProjects = amSections.find((section) => section.type === "group" && section.id === "projects");
assert.ok(amProjects && amProjects.type === "group");
assert.deepEqual(amProjects.items.map((item) => item.href), ["/projects/database"]);

const hideBothProjects: MenuPermissionOverride[] = [
  ...hideEntry,
  {
    role: "am_bm_pl",
    menu_key: "projects_database",
    can_view: false,
    can_create: false,
    can_edit: false,
    can_export: false,
  },
];
const noProjects = filterSidebarNavSections("am_bm_pl", hideBothProjects);
assert.equal(noProjects.some((section) => section.type === "group" && section.id === "projects"), false);

const auditOverride: MenuPermissionOverride[] = [{
  role: "view",
  menu_key: "audit_trail",
  can_view: true,
  can_create: false,
  can_edit: false,
  can_export: true,
}];
const viewWithAudit = filterSidebarNavSections("view", auditOverride);
const adminGroup = viewWithAudit.find((section) => section.type === "group" && section.id === "admin");
assert.ok(adminGroup && adminGroup.type === "group");
assert.deepEqual(adminGroup.items.map((item) => item.href), ["/audit-trail"]);

assert.equal(ALL_SIDEBAR_NAV_LEAVES.some((item) => item.href === "/ai-assistant"), false);
assert.equal(AI_ASSISTANT_NAV_LEAF.href, "/ai-assistant");

const hideAskAi: MenuPermissionOverride[] = [{
  role: "view",
  menu_key: "ai_assistant",
  can_view: false,
  can_create: false,
  can_edit: false,
  can_export: false,
}];
assert.equal(canViewAskAi("view", hideAskAi), false);

console.log("verify-sidebar-nav: PASS");
