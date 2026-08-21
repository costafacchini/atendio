# Task: Thread delay through IngestChatMessage

**Plan**: Schedule Message for Future Delivery
**Phase**: 2
**Task ID (phase-local)**: task-02
**Task Path**: phase-2/task-02-ingest-schedule
**Spec References**: Story 1 (P1), FR-005, SC-001
**Depends On**: phase-1/task-01-queue-delay
**JIRA**: N/A

## Objective

Extend `IngestChatMessage.execute()` to accept an optional `delay?: number` (ms) and forward it to `queueServer.addJob()` so BullMQ schedules the job for future delivery.

## Context

`IngestChatMessage` (`src/app/usecases/webhooks/IngestChatMessage.ts`) is the single entry-point that saves a Body record and enqueues a `chat-message` job. Its `execute()` input is currently `{ body, licenseeId, inboxId? }`. The controller (`ChatRoomsController`) will pass `delay` after task-03 extends it.

`queueServer.addJob(name, data, options?)` already accepts a third `options` argument (`JobOptions`). After task-01, `JobOptions` includes `delay?: number`. We just need to thread it through.

Test pattern: Jest, in-memory fakes (`BodyRepositoryMemory`), mock `jobQueue.addJob`. See `IngestChatMessage.spec.ts` for the established style.

## Before You Start

- [ ] Switch to main and pull latest: `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-1/task-01-queue-delay/status.md` shows `complete`
- [ ] Check this task's `status.md` — if already `in-progress` or `complete`, stop and investigate
- [ ] Read `docs/kb/architecture/job-queue-system.md`
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/usecases/webhooks/IngestChatMessage.ts` | modify | Add `delay?` to input type, forward to `addJob` |
| `src/app/usecases/webhooks/IngestChatMessage.spec.ts` | modify | Add two new test cases (scenarios 3 and 6) |

### Do NOT Modify

- `src/config/queue.ts` — owned by phase-1/task-01-queue-delay (complete before this task starts)
- `src/app/controllers/ChatRoomsController.ts` — owned by phase-2/task-03-controller-schedule

## Implementation Steps

### Step 1: Update `IngestChatMessageInput` type

Add `delay?: number` to the input interface:

```ts
interface IngestChatMessageInput {
  body: Record<string, any>
  licenseeId: string
  inboxId?: string | null
  delay?: number
}
```

### Step 2: Forward `delay` in `execute()`

Update the `addJob` call to pass delay as a job option when provided:

```ts
await this.jobQueue.addJob(
  CHAT_MESSAGE_JOB,
  { bodyId: bodySaved._id, licenseeId },
  delay !== undefined ? { delay } : undefined,
)
```

Note: `addJob` accepts `options?: JobOptions`. Pass `undefined` (not `{}`) when no delay so existing behaviour is preserved and existing tests need no changes.

### Step 3: Run tests

```bash
npx jest src/app/usecases/webhooks/IngestChatMessage
```

## Testing

**Spec scenarios covered**:
- [ ] **Scenario 6** — Given `delay` is provided to `IngestChatMessage.execute()`, When it calls `queueServer.addJob()`, Then the delay is passed as part of the BullMQ job options
  → test: `IngestChatMessage.spec.ts` — `'forwards delay to addJob when delay is provided'`
- [ ] **Scenario 3 (partial)** — When no delay is provided, `addJob` is called without a delay option (existing behaviour preserved)
  → test: `IngestChatMessage.spec.ts` — `'calls addJob without delay option when delay is not provided'`

**Additional verification**:
- [ ] All four existing `IngestChatMessage` tests still pass unchanged
- [ ] `yarn typecheck` passes
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

- [ ] No KB/doc updates required — this is an internal usecase parameter extension; the pattern follows existing `inboxId` optionality.

## Completion Criteria

- [ ] Scenario 6 test passes
- [ ] Existing tests pass unchanged
- [ ] TypeScript compiles cleanly
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- `task-03-controller-schedule` modifies `ChatRoomsController.ts` only — no file overlap with this task.
- Both phase-2 tasks can start simultaneously after task-01 completes.
