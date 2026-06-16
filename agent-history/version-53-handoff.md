# Version 53 Handoff - Feedback TTL, VAL Labels, BMR Header, Data Map UI, Responsive

Project Location: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React`

Date: 2026-06-16

Previous Version: `agent-history/version-52-handoff.md`

Project Status: **v53 feature set implemented locally — migration 024 must be applied on Supabase before addressed-feedback auto-delete works in production**

---

## What Was Requested

1. Addressed feedback auto-delete after 72 hours
2. Rename VAL field labels (display only)
3. Add "Client Approval" to validation report status registries
4. BMR Lock Status readonly field in project header grid
5. Tooltip `?` icons on LEFT of label text
6. Data Map UI overhaul matching reference screenshot style
7. Responsive design pass (project form, feedback modal, data map, dashboard layout, sidebar)

---

## What Was Implemented

| Area | Change |
|------|--------|
| `024_feedback_addressed_ttl.sql` | `addressed_at` column, trigger on status change, `purge_expired_addressed_feedback()` RPC (admin), `purge_expired_addressed_feedback_system()` for optional pg_cron |
| `feedbackService.ts` | Purge RPC on `listAppFeedback()`; `addressed_at` in type/select; `feedbackAddressedExpiryLabel()` helper |
| `feedback-chat.tsx` | 72h notice in admin inbox; 5-minute refresh while open; expiry hint on addressed items |
| `projectFormFields.ts`, `duplicateReview.ts` | Shortened VAL interim/report labels and tooltips |
| `constants.ts` | "Client Approval" added to `val_interim_report_status` and `validation_report_status` |
| `bmrLock.ts` | `isProjectBmrLocked()`, `projectBmrLockStatusLabel()` |
| `ProjectEntryPage.tsx` | Readonly BMR Lock Status beside FG Code (below Activity Type row); FieldHelpIcon tooltip |
| `ProjectFieldControl.tsx`, `project-form.css` | Help icon before label text; flex layout without space-between |
| `DataMapPage.tsx`, `data-map.css` | Force-directed circular nodes, colored glow, thin edges, theme-aware canvas; custom node component |
| `globals.css`, `project-form.css`, `data-map.css` | Targeted responsive media queries for mobile/wide viewports |

---

## Verification

- `npm run build` — pass (2026-06-16)

---

## Assumptions

- BMR Lock Status shows **Yes** when any batch has BMR locked per existing `isBmrLockedForBatch()` rules (validation study present and batch endorsement not Approved/NA).
- Frontend purge on admin inbox load/refresh is sufficient when pg_cron is unavailable; pg_cron schedule is documented in migration comments for Supabase Pro.
- VAL field **keys** unchanged; only labels/tooltips updated in UI and duplicate review modals.
- Data Map force layout runs client-side on filter changes (no external layout library).

---

## Risks

- Migration **024** must be applied before purge RPC and `addressed_at` column work; without it, purge is silently skipped and listing still works.
- Existing addressed rows backfilled with `created_at` as `addressed_at` — may delete sooner than 72h from when they were marked if migration applied long after marking.
- pg_cron hourly job is **not** auto-scheduled (comment-only in migration); rely on frontend purge unless admin enables cron manually.
- Force-directed graph layout is non-deterministic (seeded by table order); node positions change on search filter reset.

---

## Git Traceability

- Commit message: *(pending — not committed in this session)*
- Commit hash: *(pending)*

---

## Manual Test Plan

1. Apply migration 024 on Supabase.
2. Admin feedback inbox → mark item Addressed → see expiry hint; after 72h (or manual RPC) item removed.
3. VAL tab → labels show "Interim Report …" and "Report …" without "Validation" prefix.
4. Report status dropdowns include "Client Approval".
5. Project header → BMR Lock Status beside FG Code; Yes/No updates with endorsement state; tooltip on `?`.
6. Form labels → `?` icon appears left of label text.
7. Admin Data Map → circular colored nodes, thin edges, dark/light canvas; pan/zoom/search/integrity panel still work.
8. Resize to mobile width → project sticky header wraps; feedback modal fits viewport; data map stacks panels.

---

## Migration Steps for User

1. In Supabase SQL Editor, run `supabase/migrations/024_feedback_addressed_ttl.sql`.
2. *(Optional, Supabase Pro)* Enable `pg_cron` extension and schedule:
   ```sql
   select cron.schedule(
     'purge-addressed-feedback',
     '0 * * * *',
     $$select public.purge_expired_addressed_feedback_system();$$
   );
   ```
3. Deploy frontend after build; no new env vars required.

---

## Next Steps

1. Apply migration 024 on Supabase.
2. Commit as `v53: feedback TTL, VAL labels, BMR header, data map UI, responsive pass`.
3. Live smoke test addressed-feedback purge and BMR header on real projects.
4. Optional: code-split Data Map route to reduce main bundle size.
