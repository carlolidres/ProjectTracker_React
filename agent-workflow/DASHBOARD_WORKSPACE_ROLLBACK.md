# Dashboard Workspace — Rollback

Use when dashboard workspace UX (Phase A + Phase B) causes false creates, broken drills, or save regressions.

Phase A: action strip, project quick drawer, return-to-dashboard on drills.
Phase B: create-from-dashboard (`?new=1` + return after save), Browse vs My work labels.

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
   - KPI/worklist use original labels
   - Create links omit `?new=1` / `return_to` from the action strip (pages still accept those query params if present)

## App redeploy

Redeploy prior Release if needed: `v0.89.0` @ `82bc127` or `0.88.0` @ `9e87130`.

## Notes

- No schema migration is required for this flag.
- Menu matrix / RLS are unchanged by the kill-switch.
