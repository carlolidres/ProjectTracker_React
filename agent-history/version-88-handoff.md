# Version 88 Handoff — Endorsement Tracker, Support enhancements, N/A guide

Project Location: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React`

Date: 2026-07-16

Previous Version: `agent-history/version-64-handoff.md` (last versioned checkpoint; interim work lived in `agent-workflow/HANDOFF.md` through v80–v88)

Project Status: **v88 — Endorsement Tracker + Support/CNF enhancements deployed**

Application version (`package.json`): `0.88.0`

---

## What Was Delivered

1. Endorsement Tracker UI, services, sync from Project Entry / Support Activities, and related Supabase migrations.
2. Support Activities Non-Process fields, CNF link states, reusable options, and form UX refresh.
3. CNF Tracker classification, project links, and deep-link / supporting-activity navigation fixes.
4. Global gray italic **N/A** guide for optional text/select fields (`naField`, `NaClearingInput` / `NaClearingSelect`).
5. App version drawer (`app-version-button`) wired to `package.json` + deploy SHA.
6. Data map updated for endorsement, support, reusable options, N/A convention, and migration pointers.

---

## Migrations (apply on target Supabase before relying on new features)

| Migration | Purpose |
|---|---|
| `20260713121028_cnf_tracker_project_links.sql` | CNF ↔ project link table |
| `20260714110110_endorsement_tracker_and_support_enhancements.sql` | Endorsement tracker + support columns + reusable_options |
| `20260714123000_support_activity_type.sql` | Support activity type |
| `20260714194000_cnf_tracker_classification.sql` | CNF classification |
| `20260714216000_fix_save_support_activity_id_ambiguity.sql` | Support save ID ambiguity fix |
| `20260714220000_skip_endorsement_ensure_without_number.sql` | Skip stub ensure without number |
| `20260714221000_ensure_endorsement_by_number.sql` | Ensure endorsement by number |

Down scripts exist alongside where provided.

---

## Verification

| Check | Status |
|---|---|
| `npm run typecheck` | Run before commit |
| `npm run build` | Run before commit |
| GitHub Pages deploy | Triggered by push to `main` |

---

## Deploy

- Hosting: GitHub Pages via `.github/workflows/deploy.yml`
- Base path: `/ProjectTracker_React/`
- Version label: `0.88.0` + short SHA from `VITE_APP_GIT_SHA`
