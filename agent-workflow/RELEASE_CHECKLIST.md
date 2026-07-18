# Release Checklist

Use before every production deploy to GitHub Pages. One checklist per `package.json` version.

This supports an Application Version Description (AVD) style record aligned with ISO/IEC/IEEE 12207 configuration/release practice, ISO/IEC 27001 change evidence, and ISO 9001 documented-information control. Completing this checklist does **not** mean the organization is ISO-certified.

## Rules

1. Do not treat a local About drawer label as released until Actions deploy succeeds.
2. Prefer PR → review → merge to `main` (avoid undocumented direct pushes for releases).
3. Bump `package.json` version in the release PR.
4. After green deploy, create a **GitHub Release + git tag** matching the package version (example: `v0.89.0`).
5. Record approver name/date in the Release body (this is the approval evidence).

## Pre-flight

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Target version set in `package.json` | ☐ | `x.y.z` = ________ |
| 2 | Change class selected (Major* / Minor / Patch / Rollback) | ☐ | ________ |
| 3 | Change request / issue IDs listed (or `N/A` with reason) | ☐ | ________ |
| 4 | Scope summary written (1–3 sentences) | ☐ | See Release notes |
| 5 | Features / defects / security-config bullets drafted | ☐ | See Release notes |
| 6 | Supabase migrations listed (or `none`) | ☐ | ________ |
| 7 | Rollback SHA / prior package version known | ☐ | ________ |
| 8 | Risk level set (Low / Medium / High) + rationale | ☐ | ________ |

\*Major under `0.x` = breaking, security/RLS/session, or operational rollback even without SemVer major bump.

## Verification (run before merge)

| # | Command / activity | Status | Result / notes |
|---|---|---|---|
| 1 | `npm run typecheck` | ☐ | |
| 2 | `npm run build` | ☐ | |
| 3 | Release-relevant scripts (list below) | ☐ | |
| 4 | Browser smoke (owner) | ☐ | See `BROWSER_TESTING.md` section: ________ |
| 5 | Supabase migration dry-run / apply plan (if any) | ☐ | Target project: ________ |

Release-relevant scripts for this version:

```text
(list commands here)
```

## Review and approval

| Role | Name | Date | Method |
|---|---|---|---|
| Author / implementer | | | PR author |
| Reviewer | | | GitHub PR review |
| Approver (release authority) | | | PR approve + Release body |
| Deployment owner | | | Merge / Actions monitor |

Blockers if blank: **Approver** and **Reviewer** must not both be empty for Medium/High risk or security-config changes.

## Deploy

| # | Step | Status | Evidence |
|---|---|---|---|
| 1 | PR merged to `main` (or approved direct push documented) | ☐ | PR #________ |
| 2 | Actions workflow `Deploy to GitHub Pages` succeeded | ☐ | Run URL: ________ |
| 3 | Deploy SHA recorded | ☐ | ________ |
| 4 | About drawer matches package + SHA | ☐ | Expected `vX.Y.Z (abcdef0)` |
| 5 | Git tag created `vX.Y.Z` pointing at deploy SHA | ☐ | |
| 6 | GitHub Release published with notes template | ☐ | Release URL: ________ |
| 7 | AVD / version history row updated (canvas or archive) | ☐ | |

## Post-deploy

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Migrations applied on target Supabase (if required) | ☐ | |
| 2 | Smoke critical paths (login, role nav, changed modules) | ☐ | |
| 3 | `agent-workflow/HANDOFF.md` updated with commit + deploy status | ☐ | |
| 4 | Versioned handoff created (if meaningful release) | ☐ | `agent-history/version-*-handoff.md` |

## Rollback trigger

Execute rollback if any of the following occur after deploy:

- Auth loop / widespread access denial
- Data loss or failed saves on critical paths
- Actions deploy green but About identity wrong and cannot be corrected quickly
- Migration apply failure with production impact

**Rollback procedure (app):** redeploy last known-good SHA (from prior Release) by revert or restore + push to `main`; confirm Actions success and About identity.

**Rollback procedure (DB):** use migration down scripts / module rollback docs only after backup/export. Prefer app feature-flag rollback when available.

## Template locations

| Artifact | Path |
|---|---|
| This checklist | `agent-workflow/RELEASE_CHECKLIST.md` |
| Example notes (0.89.0) | `agent-workflow/releases/v0.89.0-RELEASE_NOTES.md` |
| Menu matrix rollback | `agent-workflow/MENU_MATRIX_ROLLBACK.md` |
| Browser smoke | `agent-workflow/BROWSER_TESTING.md` |
