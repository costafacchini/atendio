# Plan: Schedule Message for Future Delivery

**Status**: not-started
**Created**: 2026-08-21
**Last Updated**: 2026-08-21
**Assigned Dev**: Alan Costa Facchini
**PR Strategy**: single
**Spec**: [spec.md](spec.md) — 2 user stories · 7 acceptance scenarios · 3 success criteria

## Objective

Allow agents to compose a message on the Chat page and pick a future datetime so BullMQ dispatches it automatically at that time, using the native `delay` option — no new model or cron job required.

## Scope

### In Scope
- `delay?: number` in `JobOptions` / `QueueServer.addJob` (`src/config/queue.ts`)
- `IngestChatMessage.execute()` accepting and forwarding an optional `delay`
- `ChatRoomsController.replyToRoom` reading `scheduledAt`, computing delay, validating future-only
- `scheduleRoomMessage` service function in `client/src/services/rooms.ts`
- Clock-icon toggle + `datetime-local` picker + "Agendar" button in `MessageInput`
- `onSchedule` prop wired through `ConversationPanel` to `Chat/index.tsx`

### Out of Scope
- New `ScheduledMessage` Mongoose/Prisma model — not needed; Body record + BullMQ delay is sufficient
- Listing or cancelling pending scheduled messages — out of scope for this plan
- Upper-bound validation on `scheduledAt` (e.g., max 30 days) — not requested
- Push/socket notification when a scheduled message fires — future work

## Kill Criteria

- If BullMQ's Redis-backed delayed jobs are found to be unreliable at the current `REDIS_URL` configuration, stop and evaluate an alternative (e.g., Agenda with MongoDB)
- If `scheduledAt` precision requirements exceed what `datetime-local` provides (seconds only), revisit the picker approach before shipping

## Phases

| Phase | Name | Tasks | Dependencies | Description |
|-------|------|-------|--------------|-------------|
| 1 | Queue Infrastructure | task-01 | None | Add `delay` to `JobOptions` and `QueueServer.addJob` |
| 2 | Backend Feature | task-02, task-03 | Phase 1 | Thread delay through `IngestChatMessage` and `ChatRoomsController` |
| 3 | Frontend | task-04, task-05, task-06, task-07 | Phase 2 | Service function, UI components, page orchestration |

## Task Summary

| Task Path | Title | Phase | Status | Depends On |
|-----------|-------|-------|--------|------------|
| phase-1/task-01-queue-delay | Add `delay` to JobOptions & QueueServer | 1 | not-started | — |
| phase-2/task-02-ingest-schedule | Thread delay through IngestChatMessage | 2 | not-started | phase-1/task-01-queue-delay |
| phase-2/task-03-controller-schedule | Parse scheduledAt in ChatRoomsController | 2 | not-started | phase-1/task-01-queue-delay |
| phase-3/task-04-service | Add scheduleRoomMessage to rooms service | 3 | not-started | phase-2/task-03-controller-schedule |
| phase-3/task-05-message-input | Schedule UI in MessageInput | 3 | not-started | phase-2/task-02-ingest-schedule, phase-2/task-03-controller-schedule |
| phase-3/task-06-conversation-panel | Add onSchedule prop to ConversationPanel | 3 | not-started | phase-3/task-05-message-input |
| phase-3/task-07-chat-page | Implement handleSchedule in Chat/index.tsx | 3 | not-started | phase-3/task-04-service, phase-3/task-06-conversation-panel |

## Branch Convention

Pattern: `plan/schedule-message/{task-path}`

Example branches:
- `plan/schedule-message/phase-1/task-01-queue-delay`
- `plan/schedule-message/phase-2/task-02-ingest-schedule`

Base branch: `main`

## Key Files

| File/Directory | Relevance |
|----------------|-----------|
| `src/config/queue.ts` | `JobOptions` interface + `QueueServer.addJob` — add `delay` |
| `src/app/usecases/webhooks/IngestChatMessage.ts` | Core usecase — accept and forward `delay` |
| `src/app/usecases/webhooks/IngestChatMessage.spec.ts` | Must cover delay forwarding |
| `src/app/controllers/ChatRoomsController.ts` | Parse `scheduledAt`, validate, compute delay |
| `src/app/controllers/ChatRoomsController.spec.ts` | Must cover 422 and delay-forwarding cases |
| `client/src/services/rooms.ts` | Add `scheduleRoomMessage` service function |
| `client/src/pages/Chat/components/MessageInput.tsx` | Schedule toggle + datetime picker UI |
| `client/src/pages/Chat/components/MessageInput.spec.tsx` | New scenarios for schedule mode |
| `client/src/pages/Chat/components/ConversationPanel.tsx` | Add `onSchedule` prop |
| `client/src/pages/Chat/components/ConversationPanel.spec.tsx` | Test prop threading |
| `client/src/pages/Chat/index.tsx` | `handleSchedule` implementation |

## Risks

- BullMQ delayed jobs rely on Redis sorted sets; if Redis restarts without persistence, pending scheduled jobs may be lost — Mitigation: document this limitation in a KB entry; Redis persistence (`appendonly yes`) is already recommended for production
- `datetime-local` input value is in local time; if the client and server are in different timezones, delay computation could be wrong — Mitigation: convert to `new Date(value).toISOString()` on the client before sending

## Success Criteria

- [ ] An agent can schedule a message via the Chat UI and the BullMQ job is added with `delay > 0`
- [ ] The server rejects past `scheduledAt` values with HTTP 422
- [ ] All pre-existing tests pass unchanged
- [ ] `pre-commit-check` passes on the final single PR
- [ ] No regressions in existing send-now flow

## References

- **JIRA Epic**: N/A
- **Weekly Plan Brief**: N/A
- **Related Plans**: [Local Chat UI](../local-chat-ui/overview.md) (parent feature), [Inbox Concept](../inbox-concept/overview.md)
- **Rock Alignment**: N/A
