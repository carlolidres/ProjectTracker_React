# Version 38 Handoff - Mobile Sidebar Drawer Full Viewport Height

Project Location: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React`

Date: 2026-06-13

Previous Version: `agent-history/version-37-handoff.md`

Project Status: **Mobile navigation drawer fills full screen height on tall vertical viewports**

---

## What Was Requested

Fix the mobile sidebar drawer so it covers the full viewport height on phones and tall vertical screens — no gap at the bottom, nav scrolls when needed, desktop layout unchanged.

---

## Root Cause

The Ant Design `Drawer` body sized to content (~712px) instead of the viewport. `.sidebar-inner` used `height: 100%` but the drawer parent had no explicit full-height chain.

---

## What Was Implemented

| File | Change |
|------|--------|
| `sidebar.tsx` | `rootClassName="sidebar-mobile-drawer"`; drawer body flex column with `overflow: hidden` |
| `globals.css` | Mobile-only rules: `100vh`/`100dvh`/`-webkit-fill-available` on drawer wrapper; flex fill for body and `.sidebar-inner`; scrollable `.sidebar-nav`; safe-area padding |

---

## Verification

- `npm run build` — pass

---

## Manual Test Plan

1. Open app on mobile or narrow viewport (< 960px).
2. Open hamburger menu — drawer should reach bottom of screen.
3. Confirm footer (user + credit) sits at bottom; nav scrolls if many items.
4. Desktop sidebar unchanged at ≥ 960px.

---

## Git Traceability

- Commit message: `v38: fix mobile sidebar drawer full viewport height`
- Commit hash: `f409668`

---

## Next Steps

None required for this fix.
