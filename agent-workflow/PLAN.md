# Active Plan

Last Updated: `2026-07-13`
Plan Owner: `Codex`
Status: `COMPLETED`

## Objective

CNF Tracker + Projects integration: New CNF, duplicates, Unique Batch navigation, Insert/New CNF on Projects, New Product under same CNF, ID-based `project_cnf_tracker_links`.

## Acceptance Criteria

- [x] New CNF from CNF Tracker toolbar + create form
- [x] Duplicate CNF Reference blocked (UI + service + DB index)
- [x] Unique Batch opens related project(s) or new project prefill
- [x] Insert CNF / searchable CNF selector / New CNF from Project form
- [x] New Product creates sibling Project under same CNF
- [x] Junction table + historical text snapshots preserved
- [x] Special-character sanitize widened
- [x] `npm run typecheck` / `npm run build` / `npm run test:cnf-project-integration`

## Completion Notes

Migration `033` is in-repo; apply to remote Supabase before production use. Browser smoke still pending.
