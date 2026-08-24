# Plan: Schedule Message for Future Delivery

**Status**: not-started
**Created**: 2026-08-21
**Last Updated**: 2026-08-24
**Assigned Dev**: Alan Costa Facchini
**PR Strategy**: single
**Spec**: [spec.md](spec.md) — 3 user stories · 10 acceptance scenarios · 4 success criteria

## Objective

Allow agents to schedule a message via `POST /resources/messages` with a `scheduledAt` field. The `Message` record is created immediately (visible in the chat timeline with a clock icon), and BullMQ dispatches the actual send after the delay. A startup recovery scan re-enqueues any scheduled messages lost on Redis restart.

## Scope

### In Scope
- `delay?: number` added to `JobOptions` / `QueueServer.addJob` (`src/config/queue.ts`)
- `scheduledAt DateTime?` Prisma migration + `IMessage` type update
- `CreateMessage` usecase: `scheduledAt` field, delay computation, validation, dispatch to `send-message-to-messenger` / `send-message-to-chat` with delay
- `worker.ts` startup recovery: scan `Message` table for unsent scheduled messages, re-enqueue with remaining delay
- Frontend `scheduleMessage` service function (`client/src/services/message.ts`)
- Clock-icon toggle + `datetime-local` picker + "Agendar" button in `MessageInput`
- Scheduled message clock indicator in `ConversationPanel` message bubbles
- `onSchedule` prop wired through `ConversationPanel` to `Chat/index.tsx`
- Cancellation via existing `POST /resources/messages/:id/ignore`

### Out of Scope
- `to-chatbot` destination recovery — chatbot credentials (url/token) are not easily looked up; follow-up plan
- Listing scheduled messages in a dedicated panel — the timeline clock icon is sufficient for this plan
- Upper-bound validation on `scheduledAt` (e.g., max 30 days) — not requested
- Push/socket notification when a scheduled message fires — future work

## Kill Criteria

- If BullMQ delayed jobs are found unreliable at the current Redis configuration even with startup recovery, escalate before shipping
- If the Prisma migration introduces a breaking change in the messages table, stop and consult

## Phases

| Phase | Name | Tasks | Dependencies | Description |
|-------|------|-------|--------------|-------------|
| 1 | Foundation | task-01, task-02 | None | `delay` in JobOptions + Prisma schema migration |
| 2 | Backend Feature | task-03, task-04 | Phase 1 | `CreateMessage` delay dispatch + worker recovery |
| 3 | Frontend | task-05, task-06, task-07, task-08 | Phase 2 | Service + UI components + page orchestration |

## Task Summary

| Task Path | Title | Phase | Status | Depends On |
|-----------|-------|-------|--------|------------|
| phase-1/task-01-queue-delay | Add `delay` to JobOptions & QueueServer | 1 | not-started | — |
| phase-1/task-02-schema | Prisma migration + IMessage type | 1 | complete | — |
| phase-2/task-03-create-message | Extend CreateMessage with scheduledAt | 2 | not-started | phase-1/task-01-queue-delay, phase-1/task-02-schema |
| phase-2/task-04-worker-recovery | Worker startup recovery | 2 | not-started | phase-1/task-02-schema |
| phase-3/task-05-service | scheduleMessage service function | 3 | not-started | phase-2/task-03-create-message |
| phase-3/task-06-message-input | Schedule UI in MessageInput | 3 | not-started | phase-2/task-03-create-message |
| phase-3/task-07-conversation-panel | Clock indicator + onSchedule in ConversationPanel | 3 | not-started | phase-3/task-06-message-input |
| phase-3/task-08-chat-page | handleSchedule in Chat/index.tsx | 3 | not-started | phase-3/task-05-service, phase-3/task-07-conversation-panel |

## Branch Convention

Pattern: `plan/schedule-message/{task-path}`

Example branches:
- `plan/schedule-message/phase-1/task-01-queue-delay`
- `plan/schedule-message/phase-2/task-03-create-message`

Base branch: `main`

## Key Files

| File/Directory | Relevance |
|----------------|-----------|
| `src/config/queue.ts` | Add `delay?` to `JobOptions`; forward in `QueueServer.addJob` |
| `prisma/schema.prisma` | Add `scheduledAt DateTime?` to `Message` model |
| `src/types/index.ts` | Add `scheduledAt?` to `IMessage` interface |
| `src/app/usecases/messages/CreateMessage.ts` | Core change: accept + validate `scheduledAt`, dispatch with delay |
| `src/app/usecases/messages/CreateMessage.spec.ts` | Must cover delay forwarding and 422 path |
| `worker.ts` | Startup recovery: re-enqueue unsent scheduled messages |
| `client/src/types/message.ts` | Add `scheduledAt?` to frontend `IMessage` |
| `client/src/services/message.ts` | Add `scheduleMessage` function |
| `client/src/pages/Chat/components/MessageInput.tsx` | Clock toggle + datetime picker + "Agendar" |
| `client/src/pages/Chat/components/MessageInput.spec.tsx` | New scenarios for schedule mode |
| `client/src/pages/Chat/components/ConversationPanel.tsx` | `onSchedule` prop + clock indicator on bubbles |
| `client/src/pages/Chat/components/ConversationPanel.spec.tsx` | Clock indicator and delegation tests |
| `client/src/pages/Chat/index.tsx` | `handleSchedule` implementation |

## Risks

- BullMQ delayed jobs rely on Redis sorted sets; Redis restart without persistence causes job loss — Mitigation: startup recovery in `worker.ts` re-enqueues from `Message` table (source of truth)
- `datetime-local` input value is local time; timezone mismatch causes wrong delay — Mitigation: convert to `new Date(value).toISOString()` on the client before sending
- Prisma migration adds a nullable column — safe for existing rows (defaults to `null`); no downtime risk

## Success Criteria

- [ ] Agent can schedule a message via Chat UI; `Message` record appears with clock icon; BullMQ job queued with `delay > 0`
- [ ] Server rejects past `scheduledAt` with HTTP 422
- [ ] Worker startup re-enqueues all pending scheduled messages after Redis restart
- [ ] All pre-existing tests pass unchanged
- [ ] `pre-commit-check` passes on the final single PR
- [ ] No regressions in the immediate send-now flow

## References

- **JIRA Epic**: N/A
- **Related Plans**: [Local Chat UI](../local-chat-ui/overview.md), [Inbox Concept](../inbox-concept/overview.md), [Prisma Dashboard & Rooms](../prisma-dashboard-rooms/overview.md)
- **Rock Alignment**: N/A
