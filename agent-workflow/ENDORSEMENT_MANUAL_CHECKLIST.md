# Endorsement Tracker — Manual Smoke Checklist

Use HashRouter URLs under GitHub Pages base path, e.g. `/ProjectTracker_React/#/...`.

## Preflight
- [ ] Login as Admin, VAL, QA, View, and one other department role
- [ ] Confirm sidebar shows **Endorsement Tracker** directly below **CNF Tracker**
- [ ] Confirm existing CNF Tracker, Support Activities, and Projects still open

## Support Activities
- [ ] Existing TSD/RnD rows load, edit, save, filter, and export
- [ ] Activity Type includes **Non-Process**
- [ ] Status searchable dropdown: In-process / Planned / Done
- [ ] Status Date beside Status; display `DD MMM YYYY`; blank status date remains valid
- [ ] Switching Activity Type hides/shows fields without clearing hidden values
- [ ] Non-Process: Department, Material, Line or Room, Planning Schedule visible
- [ ] CNF Number: select existing (ID-linked), enter new, or Not Applicable (no CNF row created)
- [ ] New CNF duplicate is rejected or linked safely; failed save leaves no partial CNF+activity pair when RPC path is used
- [ ] Editable dropdowns: Type of Validation, Protocol/Report/Endorsement Status create/search/remove (admin remove + confirm)
- [ ] Gray NA on optional empties; clears on focus; normalizes on submit; not applied to Status/dates
- [ ] Enter a **new CNF Number** (with Title set) and Save → opens CNF Tracker New CNF with reference + Title prefilled; after CNF save, Support Non-Process is linked and Title stays in sync
- [ ] Clear Form appears beside Save in the Support Activities card header
- [ ] Save with Endorsement Status **In Process** (without a new CNF) creates one Endorsement Tracker and redirects only after success
- [ ] Repeated save does not create a second endorsement for the same activity

## Project / Validation
- [ ] Existing project endorsement fields still save
- [ ] Save with Endorsement Number + Status In Process/In-process creates/links one tracker and redirects
- [ ] BMR lock / CNF Tracker behaviors unchanged for Approved / Not Applicable

## Endorsement Tracker
- [ ] Route `#/endorsement-tracker` protected for authenticated users
- [ ] Deep link `#/endorsement-tracker?id=END-YYYY-###` opens detail; missing id shows clear error
- [ ] Independent create works; optional Non-Process Support Activity link populates mapped fields (CNF/Project link UI removed; CNF still auto-resolves from project/support)
- [ ] Classification / Project editable on independent New Endorsement; display-only from Project Entry / existing linked record
- [ ] Product Name / Product Code locked whenever a Project is linked (Process); editable only when Process has no Project
- [ ] Item rows add/remove with confirm; cancel preserves row; soft-delete only the item
- [ ] Item numbers resequence; stable item IDs retained
- [ ] VAL/QA verification names and dates save; QA role limited to QA verification fields
- [ ] Admin/VAL manage full record; View cannot save
- [ ] Two-way sync: mapped fields update source and tracker; unrelated fields unchanged; stale version shows clear message

## Regression
- [ ] Login, dashboard, audit trail, registry, archive still work
- [ ] Production build already verified in agent session (`npm run build`)
- [ ] After remote migration apply (owner-approved): advisors + smoke again
