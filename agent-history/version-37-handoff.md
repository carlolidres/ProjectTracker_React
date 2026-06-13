# Version 37 Handoff - Form State Preserved Across Window Minimize Reload

Project Location: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React`

Date: 2026-06-12

Previous Version: `agent-history/version-36-handoff.md`

Project Status: **Form draft persistence and auth/router hardening deployed to address data loss when the Project Tracker browser window is minimized and restored**

---

## What Was Requested

1. Deeper investigation of form data loss when switching browser tabs/windows (issue persisted after v36 TOKEN_REFRESHED fix).
2. Correct misunderstanding: minimize of the **Project Tracker window** triggers refresh/data loss; another app covering PT does not.
3. Commit and deploy the fix to GitHub Pages.

---

## Root Cause (Confirmed)

Two mechanisms:

| Mechanism | Symptom |
|-----------|---------|
| **Auth/router unmount** | `SessionScopedRouter` and `ProtectedRoute` replaced page content with spinners, unmounting form components |
| **Browser tab discard on window minimize** | Chromium discards/reloads minimized background tabs; full document reload wipes React state |

Collapsed expanded forms after restore proved **full remount/reload** — `openKeys` was not persisted.

---

## What Was Implemented

### Auth and routing

- `auth-provider.tsx` — ignore duplicate `INITIAL_SESSION`; handle `TOKEN_REFRESHED`/`USER_UPDATED` silently; remove `sessionEpoch`; diagnostic logging
- `App.tsx` — remove `HashRouter`/`AppRouter` remount keys; always keep router mounted
- `protected-route.tsx` — overlay spinner during session pending; **keep children mounted** when user exists

### Form draft persistence

- `formDraftStorage.ts` — localStorage drafts for Projects and Support Activities
- Project drafts include `project`, `openKeys`, `activeTab`
- Debounced save (400ms) + **synchronous flush on `visibilitychange` hidden / `pagehide`** (minimize safety)
- Restore on remount; clear on save, clear form, logout

### Diagnostics

- `sessionDiagnostics.ts` — auth events, lifecycle mounts, route changes, visibility/focus/pageshow
- Enable in dev or with `VITE_AUTH_DIAGNOSTICS=true` (documented in `.env.example`)

### Other

- `sessionCleanup.ts` — clear form drafts on logout
- `globals.css` — session-pending overlay styles

---

## Verification

- `npm run build` — pass

---

## Manual Test Plan (Post-Deploy)

1. Open Projects, enter data, expand batch/MO/PO sections.
2. Minimize the Project Tracker browser window for ~30s.
3. Restore window — data and expanded sections should return.
4. Repeat on Support Activities form.
5. Optional: set `VITE_AUTH_DIAGNOSTICS=true` in GitHub Actions secrets and confirm console shows draft restore after `pageshow { persisted: false }`.

---

## Git Traceability

- Commit message: `v37: preserve form drafts across minimize-triggered reloads`
- Commit hash: `4293b79`

---

## Remaining Risks / Next Steps

1. Browser Memory Saver may still reload minimized tabs — drafts mitigate but user can exclude site in browser settings.
2. Editing existing project via `?projectId=` does not use drafts (by design).
3. Remove or disable `VITE_AUTH_DIAGNOSTICS` in production after validation if console noise is unwanted.

---

## Lessons Learned

- Window **minimize** (not tab switch or window overlap) was the user’s trigger for Chromium tab discard.
- Collapsed forms were evidence of reload + missing UI state in drafts, not Ant Design `resetFields`.
- Flushing drafts synchronously on `pagehide` is required because debounced saves may not run before discard.
