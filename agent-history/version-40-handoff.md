# Version 40 Handoff - Copy CNF Entries from Another Project (Mother/Child Linking)

Project Location: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React`

Date: 2026-06-13

Previous Version: `agent-history/version-39-handoff.md`

Project Status: **Linked Copy CNF Entries feature implemented in frontend + services; migration 019 ready to apply in Supabase**

---

## What Was Requested

Implement **Copy CNF Entries from Another Project** in the CNF Entries section of the project form:

- Admin and AM/BM/PL only can copy/link/unlink
- Searchable/sortable modal of active open projects (exclude current, archived, closed, cancelled)
- Mother/child linking with read-only copied CNF entries in child
- Mother updates propagate to linked children on save
- Unlink with confirmation; after unlink require new unique CNF numbers (block mother's old numbers)
- Prevent self-copy and circular linking
- Full audit trail for copy, link, blocked edits, unlink, and validation failures

---

## What Was Implemented

| Area | Change |
|------|--------|
| `supabase/migrations/019_project_cnf_links.sql` | `project_cnf_links` table + RLS |
| `src/types/project.ts` | `ProjectCnfMotherLink`, `ProjectSummaryForCnfCopy`, `cnf_mother_link` on hierarchy |
| `src/lib/cnfMotherLink.ts` | Canonical CNF helpers, apply/sync, unlink validation message, mother URL |
| `src/lib/roleAccess.ts` | `canCopyCnfFromProject()` for admin + am_bm_pl |
| `src/services/cnfLinkService.ts` | Copy/link, unlink, sync on load, enforce on child save, propagate to children, circular checks, audit logs |
| `src/services/projectService.ts` | Save/update hooks: validate unlinked CNF numbers, enforce linked read-only, propagate mother changes |
| `src/features/projects/components/CopyCnfFromProjectModal.tsx` | Searchable/sortable active project picker |
| `src/features/projects/components/ProjectHierarchyForm.tsx` | Copy button, link/unlink on CNF Entry 1 header, mother banner, read-only linked fields, block add/remove |
| `src/features/projects/ProjectEntryPage.tsx` | Modal wiring, copy/unlink handlers, load sync via `attachCnfLinkToProject`, blocked-edit audit |
| `src/styles/project-form.css` | `.project-cnf-mother-banner` styles |

---

## What Was Not Implemented / Requires User Action

- **Supabase migration 019** must be applied manually before the feature works in production
- End-to-end manual QA against live Supabase data (copy, propagate, unlink, save validation)
- Git commit and GitHub Pages deploy — committed as v40; push triggers Actions deploy

---

## Verification

- `npm run build` — pass (TypeScript + Vite)

---

## Git Traceability

- Commit message: `v40: linked copy CNF entries from mother project`
- Commit hash: `5951a00`

---

## Manual Test Plan

1. Apply `019_project_cnf_links.sql` in Supabase.
2. Log in as Admin or AM/BM/PL → open saved active project → AM/BM/PL tab → canonical PO CNF section.
3. Click **Copy** (tooltip: "Copy from another Project") → modal shows active open projects only → select mother → **Copy and Link**.
4. Confirm mother project ID banner, clickable link opens mother in new tab, CNF fields read-only, add/remove CNF disabled.
5. Edit mother project CNF → save → reload child → entries match mother.
6. Click **Unlink** on CNF Entry 1 → confirm → fields editable; saving with mother's old CNF number blocked with required message.
7. Attempt copy creating circular link → error shown.
8. Log in as viewer/other role → Copy/Link/Unlink controls not visible.
9. Audit trail shows copy, blocked edit, unlink, and validation events.

---

## Risks / Next Steps

1. Run migration 019 on Supabase.
2. Manual QA copy → propagate → unlink → save validation flows.
3. Commit as `v40: linked copy CNF entries from mother project` and deploy when ready. **Done** (`5951a00`).
4. Consider debouncing blocked-edit audit logs if users click many read-only fields rapidly.
