# Menu Permission Matrix — Rollback

Use when the Access Matrix, menu gating, or dashboard drill wiring causes false denials, broken navigation, or deploy failures.

## Triggers

- Non-admin users lose the seven default menus (false View denials).
- VAL/TSD/QA cannot Create/Edit work they previously could (bad defaults/overrides).
- Dashboard drills open empty/wrong Projects Database or Support lists.
- Auth loop or redirect storm to `/dashboard`.
- `menu_permission_overrides` migration/RLS blocks Admin Access Matrix.

## Configuration backup

1. Before Admin edits or migrate: export overrides from Supabase SQL Editor:

```sql
COPY (
  SELECT role, menu_key, can_view, can_create, can_edit, can_export, updated_by, updated_at
  FROM public.menu_permission_overrides
  ORDER BY role, menu_key
) TO STDOUT WITH CSV HEADER;
```

2. Git tag current HEAD (e.g. `v88-pre-matrix` or current release).
3. Defaults remain in `src/lib/menuPermissions.ts` (`DEFAULT_MENU_PERMISSIONS`).

## App / feature-flag rollback (preferred)

1. Set `VITE_FEATURE_MENU_MATRIX=false` in the GitHub Pages build env (or `.env` locally) and redeploy.
2. App falls back to legacy `ROUTE_ACCESS` in `src/lib/roleAccess.ts`; Access Matrix page shows flag-off warning.
3. Overrides table can remain; it is ignored while the flag is off.

## Database restoration

1. Prefer app rollback first; do not drop product tables.
2. If schema must reverse after export:

```text
supabase/migrations/20260716140000_menu_permission_overrides.down.sql
```

3. Do not reverse endorsement/CNF/support migrations as part of this rollback.

## Deployment reversal

- Redeploy prior green `main` commit via GitHub Actions (`workflow_dispatch` or revert + push).
- Confirm Pages site loads login → dashboard.

## Recovery verification

- Login as `admin`, `view`, `val`, `tsd`.
- With flag off: nav matches pre-matrix `ROUTE_ACCESS` (including Audit for admin/view).
- With flag on after fix: seven default menus for non-admin; Admin Access Matrix editable; dashboard drills show filter banners.
- Audit Trail readable; no orphaned routes.
- Record incident in a versioned handoff.

## Related

- Pattern: `agent-workflow/ENDORSEMENT_ROLLBACK.md`
- Matrix code: `src/lib/menuPermissions.ts`
- Overrides service: `src/services/menuPermissionService.ts`
