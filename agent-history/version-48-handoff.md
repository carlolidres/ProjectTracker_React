# Version 48 Handoff - Archived Search, Registry Form, Title Case Names

Project Location: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\ProjectTracker_React`

Date: 2026-06-13

Previous Version: `agent-history/version-47-handoff.md`

Project Status: **Archived global search, registry add-form layout, and client/product title case — deployed**

---

## What Was Requested

1. **Archived page** — Add a global search bar above the Projects/Support tabs for auto-filtering archived records.
2. **Registry page** — Fix the Add form layout so the Add button no longer sticks to the Type select.
3. **Project entry** — Client Name and Product Name fields should default to capital letters (title case).

---

## What Was Implemented

| Area | Change |
|------|--------|
| `ArchivedPage.tsx` | Search card above tabs; filters projects and support tables; tab counts reflect filtered totals |
| `RegistryPage.tsx` | Vertical grid layout (`Row`/`Col`) for Add Registry Value form with labeled fields and spaced Add button |
| `utils.ts` | `toTitleCase()` helper |
| `projectFormFields.ts` | `capitalizeWords: true` on `client_name` and `product_name` |
| `ProjectFieldControl.tsx` | Blur normalization + `project-field-capitalize` CSS class |
| `ProjectEntryPage.tsx` | Title case applied on save for client/product names |
| `project-form.css` | `text-transform: capitalize` for name fields |

---

## What Was Not Implemented

- No changes to other text fields beyond Client Name and Product Name.

---

## Verification

- `npm run build` — pass

---

## Assumptions

- Title case (first letter of each word capitalized) matches user intent for "default capital letter."
- Archived search filters the active tab's dataset independently; tab labels show filtered counts.

---

## Risks

- Title case may alter intentional mixed-case names (e.g. `3M`, `McDonald's`) on blur/save.
- `reference/dummy_accounts.xlsx` local change was left uncommitted.

---

## Git Traceability

- Commit message: `v48: archived search, registry form layout, title case names`
- Commit hash: `e07ba7e`

---

## Manual Test Plan

1. Archived → type in search bar → Projects and Support tabs filter and counts update.
2. Registry → Add form fields align in a grid; Add button is in its own column.
3. Project entry → type `kenvue` in Client Name → blur shows `Kenvue`; save persists title case.
4. Product Name behaves the same as Client Name.

---

## Next Steps

1. Live smoke test on GitHub Pages after deploy workflow completes.
2. Continue migration gap items from `reference/legacy-gap-checklist.md` as prioritized.
