# Current Handoff

Last Updated: `2026-07-18`
Version: `v89 Menu permission matrix + dashboard hub + shell/CNF UX`
Branch: `main`
Commit: `(pending commit)`
App version: `0.89.0`

## Current Status

`0.89.0` release package prepared: menu permission matrix, dashboard drills, CNF return-to-project / modal polish, shell collapse FAB, release checklist, DATA_MAP/CODEMAP/AVD updates. Deploy via push to `main` → GitHub Pages Actions. Apply Supabase migration before relying on overrides persistence.

## Recently Completed

- Menu matrix + Access Matrix + migration `20260716140000_menu_permission_overrides`
- Dashboard filter banners + FG delivery/monthly trend drills
- CNF create from Projects with `returnProjectId`; modal close width fix; creatable-select helper cleanup
- Shell: full hide sidebar/topbar + glowing expand FAB with synchronized motion
- Workflow status icon badges; `RELEASE_CHECKLIST.md` + `releases/v0.89.0-RELEASE_NOTES.md`
- AVD: `agent-history/version-89-handoff.md`

## Verification

| Check | Status | Result |
|---|---|---|
| `npm run typecheck` | PASSED | clean |
| `npm run build` | PASSED | Vite OK |
| `npm run test:menu-permissions` | PASSED | clean |
| `npm run test:dashboard-drilldown` | PASSED | clean |
| Browser smoke | NOT_RUN | BROWSER_TESTING access matrix |
| GitHub Pages deploy | PENDING | after push |
| Migration on target Supabase | NOT_VERIFIED | owner apply |

## Next Action

After green deploy: tag/Release `v0.89.0`; update version-89-handoff + release notes with SHA/Actions URL; apply migration; owner browser-smoke. Rollback: `0.88.0` @ `9e87130`.

## Dumb-Zone Recovery

- Status: `NOT_TRIGGERED`
