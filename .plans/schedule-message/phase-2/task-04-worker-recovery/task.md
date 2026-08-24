# Task: Worker Startup Recovery

**Plan**: Schedule Message for Future Delivery
**Phase**: 2
**Task ID**: task-04
**Task Path**: phase-2/task-04-worker-recovery
**Spec References**: Story 2 (P1), FR-006, SC-003
**Depends On**: phase-1/task-02-schema
**JIRA**: N/A

## Objective

Add a one-time startup recovery function to `worker.ts` that re-enqueues all `Message` records with `scheduledAt > now && sended: false && ignored: false` so no scheduled message is lost on Redis restart.

## Context

BullMQ delayed jobs live in Redis sorted sets. If Redis restarts without persistence, those jobs are silently dropped. The `Message` table (PostgreSQL via Prisma) is the source of truth.

On worker startup, before any queue processing begins, scan for messages that are scheduled for the future but have not yet been sent or cancelled, and re-enqueue them on the correct queue with the remaining delay.

**Queue mapping** (from `message.destination`):

| destination | queue |
|-------------|-------|
| `to-messenger` | `send-message-to-messenger` |
| `to-chat` | `send-message-to-chat` |
| `to-chatbot` | — (out of scope; chatbot credentials not available; skip with a warning log) |

The job body for each is `{ messageId: message._id }` — all three `SendMessage*` services can look up the rest from the DB.

Note: `sendMessageToChatbot` currently requires `url` and `token` in the job data without fallback. Do not re-enqueue `to-chatbot` messages; log a warning instead.

## Before You Start

- [ ] `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-1/task-02-schema/status.md` shows `complete`
- [ ] Check `status.md` — stop if `in-progress` or `complete`
- [ ] Read `worker.ts` in full
- [ ] Read `src/app/repositories/message.ts` — understand `PrismaMessageDatabaseRepository` and `findAll`/`find` interface
- [ ] Mark `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `worker.ts` | modify | Add `recoverScheduledMessages()` call after `connect()` |

### Do NOT Modify

- `src/config/queue.ts` — complete
- `src/app/usecases/messages/CreateMessage.ts` — owned by task-03

## Implementation Steps

### Step 1: Write the recovery function

Add before the `queuesWithWorkerEnabled.forEach(...)` block in `worker.ts`:

```ts
async function recoverScheduledMessages() {
  const { messageRepository } = jobDependencies
  const now = new Date()

  const pending = await messageRepository.find({
    scheduledAt: { $gt: now },
    sended: false,
    ignored: { $ne: true },
  })

  const DESTINATION_TO_QUEUE: Record<string, string> = {
    'to-messenger': 'send-message-to-messenger',
    'to-chat': 'send-message-to-chat',
  }

  for (const message of pending) {
    const queue = DESTINATION_TO_QUEUE[message.destination as string]
    if (!queue) {
      console.warn(`[recovery] Skipping message ${message._id}: no queue for destination "${message.destination}"`)
      continue
    }
    const delay = new Date(message.scheduledAt!).getTime() - Date.now()
    if (delay <= 0) continue  // already past due — let it dispatch immediately or skip
    await queueServer.addJob(queue, { messageId: message._id }, { delay })
  }

  console.log(`[recovery] Re-enqueued ${pending.length} scheduled message(s)`)
}
```

### Step 2: Call recovery after `connect()`

```ts
connect()
recoverScheduledMessages().catch((err) => console.error('[recovery] Failed:', err))
```

### Step 3: Check repository query compatibility

`messageRepository.find` in `PrismaMessageDatabaseRepository` uses Prisma where clauses. Verify it supports `{ scheduledAt: { gt: now } }`. If the existing `find` method doesn't support this shape, add a dedicated `findScheduledPending(now: Date)` method to the repository class.

## Testing

**Spec scenarios covered**:
- [ ] **Scenario 7** — After Redis restart, pending scheduled messages are re-enqueued with correct queue and delay
  → Unit test (Jest, in-memory): mock `messageRepository.find` returning two messages with future `scheduledAt`, assert `queueServer.addJob` called twice with correct queue names and delay values
- [ ] **Scenario 8** — Ignored messages are NOT re-enqueued
  → Same test: include a message with `ignored: true`, assert it is not in `addJob` calls

**Additional**:
- [ ] `to-chatbot` destination logs a warning and is skipped
- [ ] Messages with `scheduledAt` in the past (delay ≤ 0) are skipped
- [ ] Existing worker behaviour (queue processing) unchanged

## Documentation / KB Updates

- [ ] No KB update required for this task alone. The full pattern is documented when task-08 runs `document-solution`.

## Completion Criteria

- [ ] Scenarios 7 and 8 tests pass
- [ ] Recovery runs silently when no pending messages exist
- [ ] `to-chatbot` skipped with warning log
- [ ] `yarn typecheck` passes
- [ ] `status.md` updated
