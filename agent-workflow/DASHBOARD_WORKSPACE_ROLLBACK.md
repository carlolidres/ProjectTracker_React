# Dashboard Workspace — Rollback

Use when Phase A dashboard workspace UX (action strip, project quick drawer, return-to-dashboard) causes false creates, broken drills, or save regressions.

## Feature flag (preferred)

1. Set in GitHub Pages build env (or `.env.local`):

```env
VITE_FEATURE_DASHBOARD_WORKSPACE=false
```

2. Redeploy via push or workflow_dispatch.

3. App restores pre-workspace behavior:
   - No role action strip
   - Worklist / notifications navigate to full Project Entry (no quick drawer)
   - Drill routes omit `return_to`; banner has no “Back to Dashboard”

## App redeploy

Redeploy prior Release if needed: `v0.89.0` @ `82bc127` or `0.88.0` @ `9e87130`.

## Notes

- No schema migration is required for this flag.
- Menu matrix / RLS are unchanged by the kill-switch.
