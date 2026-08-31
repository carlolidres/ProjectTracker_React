# Current Handoff

Last Updated: `2026-08-31`
Version: `v0.95.0`
Branch: `main`
Commit: pending push
App version: `0.95.0`

## Current Status

AI Assistant uses a query planner and several controlled, JWT/RLS database tools before OpenAI answers. Replies are Answer / Basis / Limitations plus verified internal links. Redeployed `ai-assistant-chat` on `ilaeqepjuuqzknxqnyfa`.

## Recently Completed

- Clicking a My work card opens Tasks; existing tasks can be edited, source rows open or create the matching task.
- Database-grounded intelligence: intent/tool plan, multi-step retrieval, conversation record ids, business-rule guide, citation verification
- AI Assistant page, Ask AI from project drawers, owner-only chats
- Project Management cards, calendar/My Tasks create, Dashboard PM hub

## Deferred

- Document/RAG search (no file index). 50-question live model eval. Streaming. Helpful/not-helpful feedback.
- Compact New Project/Support drawers (plan R10)
- `menu_permission_overrides` table still absent on remote
- Per-user task notifications; file-storage attachments

## Verification

| Check | Status | Result |
|---|---|---|
| `npm run typecheck` | PASSED | clean |
| `npm run lint` | PASSED | max-warnings 0 |
| `npm run test:sidebar-nav` | PASSED | grouped nav; Ask AI not in sidebar; empty groups omitted |
| `npm run test:menu-permissions` | PASSED | menu keys unchanged |
| `npm run test:ai-assistant` | PASSED | planner, follow-up ids, citations, reply format |
| Edge Function `ai-assistant-chat` | PASSED | redeployed with `plan.ts`; JWT on |
| Browser smoke | NOT RUN | ask a follow-up after naming a project |

## Next Action

In AI Assistant, ask “Which projects are ready for Report/Endorsement?”, then a follow-up like “What activities are incomplete?” after naming a `PROJ-…` id.

## Dumb-Zone Recovery

- Status: `NOT_TRIGGERED`
