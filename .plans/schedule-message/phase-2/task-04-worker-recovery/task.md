# Task: Worker Startup Recovery

**Plan**: Schedule Message for Future Delivery
**Phase**: 2
**Task ID**: task-04
**Task Path**: phase-2/task-04-worker-recovery
**Spec References**: Story 2 (P1), FR-006, SC-003
**Depends On**: phase-1/task-02-schema
**JIRA**: N/A

## Objective

Add a one-time startup recovery function to `worker.ts` that re-enqueues scheduled `Message` records lost on Redis restart, without creating duplicate jobs when Redis is still healthy. Also make `SendMessageToMessenger` and `SendMessageToChat` idempotent so a double-enqueue can never cause a double-send.

## Context

BullMQ delayed jobs live in Redis sorted sets. If Redis restarts without persistence, those jobs are silently dropped. The `Message` table (PostgreSQL via Prisma) is the source of truth.

On worker startup, before any queue processing begins, scan for messages that are scheduled for the future but have not yet been sent or cancelled, and re-enqueue them on the correct queue with the remaining delay.

**Duplicate-send prevention — two layers (A + C):**

- **A (skip-if-present)**: Before re-enqueuing, call `Queue.getDelayed()` on each target BullMQ queue to retrieve the set of messageIds already in the delayed state. Skip any message whose ID is already there. This is the primary guard; it prevents double-enqueue when Redis did not crash.
- **C (idempotent execution)**: In `SendMessageToMessenger` and `SendMessageToChat`, add `if (message.sended) return` at the top before executing the send. This is the safety net; even if a duplicate job fires it will no-op once the first execution marks `sended: true`.

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
- [ ] Read `src/config/queue.ts` — understand how to access the underlying BullMQ `Queue` object to call `getDelayed()`
- [ ] Read `src/app/repositories/message.ts` — understand `PrismaMessageDatabaseRepository` and `findAll`/`find` interface
- [ ] Read `src/app/services/SendMessageToMessenger.ts` — locate where send executes, verify `message.sended` is accessible
- [ ] Read `src/app/services/SendMessageToChat.ts` — same
- [ ] Mark `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `worker.ts` | modify | Add `recoverScheduledMessages()` call after `connect()` |
| `src/app/services/SendMessageToMessenger.ts` | modify | Add `if (message.sended) return` guard (approach C) |
| `src/app/services/SendMessageToChat.ts` | modify | Add `if (message.sended) return` guard (approach C) |

### Do NOT Modify

- `src/config/queue.ts` — complete (owned by task-01; expose `getDelayed` access via existing `queue.bull` handle if needed)
- `src/app/usecases/messages/CreateMessage.ts` — owned by task-03

## Implementation Steps

### Step 1: Collect already-queued messageIds from BullMQ (approach A)

In the recovery function, before iterating DB records, call `getDelayed()` on each relevant BullMQ queue and build a `Set` of messageIds that are already waiting. Access the underlying BullMQ `Queue` object via `queue.bull` (the internal handle exposed by `QueueServer`). If `QueueServer` doesn't expose queues by name, add a thin `getQueue(name: string)` accessor — it is a one-liner that returns the existing queue from the internal map.

```ts
async function getAlreadyQueuedIds(): Promise<Set<string>> {
  const queueNames = ['send-message-to-messenger', 'send-message-to-chat']
  const ids = new Set<string>()
  for (const name of queueNames) {
    const bull = queueServer.getQueue(name) // returns the BullMQ Queue instance
    const delayed = await bull.getDelayed()
    for (const job of delayed) {
      if (job.data?.messageId) ids.add(String(job.data.messageId))
    }
  }
  return ids
}
```

### Step 2: Write the recovery function

Add before the `queuesWithWorkerEnabled.forEach(...)` block in `worker.ts`:

```ts
async function recoverScheduledMessages() {
  const { messageRepository } = jobDependencies
  const now = new Date()

  const pending = await messageRepository.find({
    scheduledAt: { gt: now },
    sended: false,
    ignored: false,
  })

  const alreadyQueued = await getAlreadyQueuedIds()

  const DESTINATION_TO_QUEUE: Record<string, string> = {
    'to-messenger': 'send-message-to-messenger',
    'to-chat': 'send-message-to-chat',
  }

  let enqueued = 0
  for (const message of pending) {
    const queue = DESTINATION_TO_QUEUE[message.destination as string]
    if (!queue) {
      console.warn(`[recovery] Skipping message ${message._id}: no queue for destination "${message.destination}"`)
      continue
    }
    if (alreadyQueued.has(String(message._id))) continue  // approach A: already in Redis
    const delay = new Date(message.scheduledAt!).getTime() - Date.now()
    if (delay <= 0) continue  // past due — skip (will not be resent)
    await queueServer.addJob(queue, { messageId: message._id }, { delay })
    enqueued++
  }

  console.log(`[recovery] Re-enqueued ${enqueued} scheduled message(s) (${pending.length} checked)`)
}
```

### Step 3: Call recovery after `connect()`

```ts
connect()
recoverScheduledMessages().catch((err) => console.error('[recovery] Failed:', err))
```

### Step 4: Check repository query compatibility

`messageRepository.find` in `PrismaMessageDatabaseRepository` uses Prisma where clauses. Verify it supports `{ scheduledAt: { gt: now } }`. If the existing `find` method doesn't support this shape, add a dedicated `findScheduledPending(now: Date)` method to the repository class.

### Step 5: Add `message.sended` guard to `SendMessageToMessenger` (approach C)

At the top of the send execution block — before any HTTP call or state mutation — add:

```ts
if (message.sended) return  // idempotency: already sent, skip duplicate job
```

Verify `message.ignored` is also checked (it may already be). Do not restructure the function beyond adding this guard.

### Step 6: Add `message.sended` guard to `SendMessageToChat` (approach C)

Same guard, same location: immediately after the message is loaded from DB, before any send logic executes.

## Testing

**Spec scenarios covered**:
- [ ] **Scenario 7** — After Redis restart, pending scheduled messages are re-enqueued with correct queue and delay
  → Unit test (Jest, in-memory): mock `messageRepository.find` returning two messages with future `scheduledAt`, mock `getAlreadyQueuedIds` returning empty set, assert `queueServer.addJob` called twice with correct queue names and delay values
- [ ] **Scenario 8** — Ignored messages are NOT re-enqueued
  → Same test: include a message with `ignored: true`, assert it is not in `addJob` calls

**Additional (approach A — no-duplicate guard)**:
- [ ] Redis is healthy (no restart): `getDelayed()` returns jobs with the pending messageIds → `recoverScheduledMessages` skips them → `queueServer.addJob` not called
- [ ] Partial Redis crash: one message present in `getDelayed()`, one missing → only the missing one is re-enqueued

**Additional (approach C — idempotent execution)**:
- [ ] `SendMessageToMessenger`: when message has `sended: true`, returns early without making any HTTP call
- [ ] `SendMessageToChat`: same — `sended: true` causes early return

**Other**:
- [ ] `to-chatbot` destination logs a warning and is skipped
- [ ] Messages with `scheduledAt` in the past (delay ≤ 0) are skipped
- [ ] Existing worker behaviour (queue processing) unchanged

## Documentation / KB Updates

- [ ] No KB update required for this task alone. The full pattern is documented when task-08 runs `document-solution`.

## Completion Criteria

- [ ] Scenarios 7 and 8 tests pass
- [ ] No-duplicate guard (approach A) tests pass: messages already in `getDelayed()` are not re-enqueued
- [ ] Idempotency guard (approach C) tests pass: `SendMessageToMessenger` and `SendMessageToChat` return early when `message.sended === true`
- [ ] Recovery runs silently when no pending messages exist
- [ ] `to-chatbot` skipped with warning log
- [ ] `yarn typecheck` passes
- [ ] `status.md` updated
