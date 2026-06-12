# Legacy App Gap Checklist — `sampleApp` vs React

Reference: `sampleApp/Code.gs`, `sampleApp/Script.html`, `sampleApp/Index.html`  
Target: `src/` React + Supabase app  
Status date: 2026-06-12  
Direction: **Option 1 complete → Option 2 in progress (standalone Supabase + behavior realignment)**

Legend: ✅ Match | ⚠️ Partial | ❌ Missing / Wrong

---

## 1. Platform & Architecture

| # | Legacy behavior | React status | Priority |
|---|-----------------|--------------|----------|
| 1.1 | Google Sheet is sole database (`1bBTkZXaPjx7kWY2ZELw0wy6B2MfSslgpN1vrlypYrLg`) | ❌ Co-hosted on CNF Tracker Ver 2.0 Supabase | **P0** — reset to standalone PT project |
| 1.2 | No login page; Google account via `Session.getActiveUser()` | ❌ Supabase Auth login required | **P1** — keep auth for identity, remove access blocking |
| 1.3 | All 7 nav pages visible to everyone | ❌ Role-based nav hiding (`roleAccess.ts`) | **P0** — open all routes |
| 1.4 | Role labels = **form field tabs**, not permissions | ❌ Roles gate routes and field editability | **P0** — tabs for grouping only |
| 1.5 | Timezone `Asia/Manila` for dates/KPIs | ⚠️ Partial (`getTodayManila` exists) | **P1** |
| 1.6 | Auto-refresh every 20s + on tab visible | ❌ Manual refresh only | **P2** |
| 1.7 | `initializeDatabase()` on app start | ❌ No equivalent | **P2** — registry seed only |

---

## 2. Navigation & Shell

| # | Legacy | React | Priority |
|---|--------|-------|----------|
| 2.1 | Dashboard | ✅ | — |
| 2.2 | Projects (form) | ✅ | — |
| 2.3 | Projects Database | ✅ | — |
| 2.4 | Support Activities | ✅ | — |
| 2.5 | Audit Trail | ⚠️ Admin/view only in React | **P0** |
| 2.6 | Archived | ⚠️ Admin only in React | **P0** |
| 2.7 | Registry | ⚠️ Admin only in React | **P0** |
| 2.8 | Message to Admin (sidebar button) | ❌ Missing | **P1** |
| 2.9 | Page meta: connected spreadsheet name | ❌ Generic subtitle | **P3** |
| 2.10 | Processing indicator (8-dot animation) | ❌ Missing | **P3** |
| 2.11 | Refresh current view button | ⚠️ Per-page reload only | **P2** |

---

## 3. Projects Form (`saveProject` / `updateProject` / `Script.html`)

| # | Legacy function / UX | React status | Priority |
|---|----------------------|--------------|----------|
| 3.1 | Hierarchy Project → Batch → MO → PO | ✅ Collapse UI | — |
| 3.2 | Instance IDs: `BAT-`, `MO-`, `PO-`, `CNF-` | ⚠️ Generated on add; not always on load | **P1** |
| 3.3 | **Multiple CNF entries per PO** (`cnf_entries[]` → `cnf_entries_json`) | ❌ Single flat CNF fields only | **P0** |
| 3.4 | Role tabs: AM/BM/PL, PP, TSD, VAL, QC | ❌ All fields in one scroll; role disables edits | **P0** |
| 3.5 | Copy from 1st PO (`cnf_reference`, protocol, Val_Strategy…) | ⚠️ Partial — missing `cnf_reference` | **P1** |
| 3.6 | View N/A Fields report | ❌ Missing | **P2** |
| 3.7 | Expand All / Collapse All | ❌ Missing (Ant Collapse only) | **P2** |
| 3.8 | New Project → `getNextProjectId()` → `PROJ-YYYY-001` | ❌ Uses `PRJ-{timestamp}` or `N/A` | **P0** |
| 3.9 | Clear form after successful save | ❌ Form stays populated | **P1** |
| 3.10 | Duplicate review: **field values within draft** (`detectDuplicateValues_`) | ❌ Wrong logic: client+product across DB | **P0** |
| 3.11 | Duplicate highlight on role tabs + review modal | ❌ Simple Modal.confirm | **P0** |
| 3.12 | Read-only archived/historical projects (`record_state`) | ❌ Missing | **P2** |
| 3.13 | Field tooltips from `PO_FIELDS` config | ❌ Missing | **P3** |
| 3.14 | Normalize draft before save (`normalizeProjectDraft_`) | ⚠️ Partial in service layer | **P1** |
| 3.15 | Save verification (`persistedCount` check) | ❌ Missing post-save verify | **P2** |

### Backend parity (`Code.gs`)

| Function | React equivalent | Status |
|----------|------------------|--------|
| `flattenProjectPayload_` | `flattenProjectPayload` | ✅ |
| `buildProjectHierarchy_` | `getProjectById` | ✅ |
| `updateProject` PO-line merge by `po_instance_id`/`po_control_no` | `updateProject` | ✅ |
| `deleteProject` = soft archive all lines | `archiveProject` | ✅ |
| `validateProjectLines_` | Minimal check | ⚠️ |
| `refreshNotificationsForProject_` | Not called after save | ❌ **P1** |

---

## 4. Projects Database

| # | Legacy | React | Priority |
|---|--------|-------|----------|
| 4.1 | Flat table of all PO lines | ✅ | — |
| 4.2 | Search, owner, activity, final status, FG month/year filters | ⚠️ Verify all filters | **P1** |
| 4.3 | KPI drill-down from dashboard (`openDatabaseWithFilter`) | ⚠️ Partial | **P1** |
| 4.4 | Pending role filter (`rowPendingRole_`) | ❌ Missing | **P1** |
| 4.5 | Export Excel (client-side XML) | ✅ `exportService` | — |
| 4.6 | Open project in form from row click | ⚠️ Via URL param | **P2** |

---

## 5. Dashboard (`getDashboardData`)

| # | Legacy KPI / panel | React | Priority |
|---|-------------------|-------|----------|
| 5.1 | Total **projects** vs total **PO lines** | ⚠️ Verify card labels | **P1** |
| 5.2 | Open / Closed PO lines | ✅ | — |
| 5.3 | Overdue / Due within 7 (FG Month) | ✅ | — |
| 5.4 | Pending CNF / Protocol / Report | ✅ | — |
| 5.5 | Due date overview buckets (today, 3, 7, 15, 30) | ⚠️ Verify UI renders all buckets | **P1** |
| 5.6 | CNF status + Final status charts | ✅ | — |
| 5.7 | Department pending actions (click → database filter) | ⚠️ Verify click-through | **P1** |
| 5.8 | Monthly closed trend chart | ⚠️ Verify | **P1** |
| 5.9 | Support activity overview | ✅ | — |
| 5.10 | Priority worklist (`buildWorklistItem_`, sort) | ⚠️ Verify sort/rank match | **P1** |
| 5.11 | Due Soon sidebar list | ⚠️ Verify | **P2** |
| 5.12 | Dashboard search on recent records | ❌ Missing | **P2** |

---

## 6. Notifications (`refreshAllNotifications_` / `getNotifications`)

| # | Legacy | React | Priority |
|---|--------|-------|----------|
| 6.1 | Table `NOTIFICATIONS` with `notification_id`, `status: OPEN` | ❌ Used `pt_notifications` on co-hosted DB | **P0** — revert to `notifications` |
| 6.2 | Full sheet clear + rebuild on every `getNotifications()` | ⚠️ Delete all + insert pattern | **P1** |
| 6.3 | Rules: FG overdue, due ≤7d, CNF not Approved ≤14d | ✅ Same logic | — |
| 6.4 | Open = `OPEN`, `Others`, `NA` final status | ✅ `isOpenFinalStatus` | — |
| 6.5 | Notification bell + modal list | ✅ `NotificationCenter` | — |

---

## 7. Support Activities

| # | Legacy | React | Priority |
|---|--------|-------|----------|
| 7.1 | TSD vs RnD field sets | ✅ | — |
| 7.2 | `generateSupportId_()` for activity_id | ⚠️ `SUP-{timestamp}` vs legacy format | **P1** |
| 7.3 | `generateSupportProjectId_()` → `SPROJ-YYYY-001` | ❌ Uses `SPR-{timestamp}` | **P0** |
| 7.4 | Modal form UX | ❌ Inline form in React | **P2** |
| 7.5 | Archive with confirm | ✅ | — |
| 7.6 | Export Excel | ✅ | — |

---

## 8. Audit Trail

| # | Legacy | React | Priority |
|---|--------|-------|----------|
| 8.1 | All users can view | ❌ Admin/view RLS + route guard | **P0** |
| 8.2 | Filters: search, module, action, user, date range | ⚠️ Verify | **P1** |
| 8.3 | Plain-English old/new in `logAuditDiff_` | ✅ | — |
| 8.4 | Column headers match `AUDIT_HEADERS` | ⚠️ Verify display labels | **P2** |

---

## 9. Archived & Registry

| # | Legacy | React | Priority |
|---|--------|-------|----------|
| 9.1 | Archived projects + support (`Is Active = FALSE`) | ✅ | — |
| 9.2 | All users can view archived | ❌ Admin route only | **P0** |
| 9.3 | Registry CRUD for dropdown values | ⚠️ Admin only | **P1** |
| 9.4 | `DEFAULT_REGISTRY` fallback + sheet values | ✅ `getRegistryBundle` | — |

---

## 10. Admin Messages

| # | Legacy `submitAdminMessage` | React | Priority |
|---|---------------------------|-------|----------|
| 10.1 | Sidebar "Message to Admin" modal | ❌ Missing | **P1** |
| 10.2 | Categories, subject, message | ❌ Missing | **P1** |
| 10.3 | Stored in `ADMIN_MESSAGES` sheet | ⚠️ Table exists, no UI | **P1** |

---

## 11. ID Generation (critical for migration accuracy)

| ID type | Legacy format | React format | Status |
|---------|---------------|--------------|--------|
| Project | `PROJ-2026-001` | `PRJ-{timestamp}` | ❌ **P0** |
| Record (PO line) | `REC-…` sequential | `REC-{timestamp}` | ⚠️ **P1** |
| Support activity | `SUP-…` | `SUP-{timestamp}` | ⚠️ **P1** |
| Support project_id | `SPROJ-2026-001` | `SPR-{timestamp}` | ❌ **P0** |
| Hierarchy | `BAT-`, `MO-`, `PO-`, `CNF-` local IDs | Similar | ⚠️ |

---

## 12. Database / Supabase (Option 2 reset)

| # | Standalone Project Tracker schema | Co-hosted state (deprecated) | Action |
|---|-----------------------------------|------------------------------|--------|
| 12.1 | `001_initial_schema.sql` + `002_rls_policies.sql` | Mixed with CNF tables | **Use on new project** |
| 12.2 | `notifications` table (001) | `pt_notifications` + CNF `notifications` | **Drop co-hosting** |
| 12.3 | `current_user_role()` from PT enum | `pt_current_user_role()` CNF bridge | **Remove bridge** |
| 12.4 | Table GRANTs for `authenticated` | Missing until 006 | **Add 007** |
| 12.5 | Open access for all authenticated (like GAS) | Role-restricted RLS | **Add 008** |
| 12.6 | Migrations 003–006 | Co-hosting only | **Do not apply on standalone** |

---

## 13. Recommended fix order (Option 2 execution)

### Phase A — Database reset (P0)
1. Create new Supabase project (Project Tracker only)
2. Apply `001`, `002`, `007`, `008` only
3. Update `.env.local` to new project URL + keys
4. Re-sync GitHub secrets

### Phase B — Access model (P0)
5. Open all routes/nav to authenticated users
6. Revert `notifications` table usage
7. Open RLS read/write for authenticated (match GAS)

### Phase C — Core form logic (P0)
8. Fix ID generation (`PROJ-`, `SPROJ-` sequential)
9. Port `detectDuplicateValues_` + review modal
10. Add role tabs on project form
11. Add multiple CNF entries per PO

### Phase D — UX parity (P1)
12. Clear form after save; refresh notifications after save
13. Message to Admin modal
14. Audit/archived/registry open to all
15. Dashboard drill-down filters

### Phase E — Data migration (after parity)
16. Export Google Sheets → validate → import (only when UI matches)

---

## Reviewers Feedback

- **Reviewers:** @carlo-mauring
- **Comments:**
