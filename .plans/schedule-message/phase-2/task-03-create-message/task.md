# Task: Extend CreateMessage with scheduledAt

**Plan**: Schedule Message for Future Delivery
**Phase**: 2
**Task ID**: task-03
**Task Path**: phase-2/task-03-create-message
**Spec References**: Story 1 (P1), FR-001, FR-002, FR-003, SC-001, SC-002
**Depends On**: phase-1/task-01-queue-delay, phase-1/task-02-schema
**JIRA**: N/A

## Objective

Add `scheduledAt` to `CreateMessage`: whitelist the field, validate it is in the future, compute `delay`, and dispatch to the correct queue (`send-message-to-messenger` or `send-message-to-chat`) with the BullMQ `delay` option.

## Context

`CreateMessage` (`src/app/usecases/messages/CreateMessage.ts`) is the usecase behind `POST /resources/messages`. It currently:
- Picks allowed fields via `CREATE_MESSAGE_FIELDS`
- Creates the `Message` record
- Queues `send-message-to-messenger` only for `to-messenger` destination

After this task it will also:
- Accept `scheduledAt` (ISO string)
- Reject with a thrown error (which `MessagesController.create` maps to 422) if delay ≤ 0
- Pass `{ delay }` to `addJob` so BullMQ holds the job until `scheduledAt`
- Dispatch `send-message-to-chat` for `to-chat` destination (with or without delay)

`SendMessageToMessenger` already returns early when `message.ignored === true` (verify this in the service file before implementing). If not, add the guard as part of this task.

Test pattern: Jest, in-memory fakes. See `CreateMessage.spec.ts` for the established style.

## Before You Start

- [ ] `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-1/task-01-queue-delay/status.md` shows `complete`
- [ ] Verify `phase-1/task-02-schema/status.md` shows `complete`
- [ ] Check `status.md` — stop if `in-progress` or `complete`
- [ ] Read `src/app/usecases/messages/CreateMessage.ts` and `CreateMessage.spec.ts` in full
- [ ] Read `src/app/services/SendMessageToMessenger.ts` — confirm `ignored` guard or add it
- [ ] Mark `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/usecases/messages/CreateMessage.ts` | modify | Add `scheduledAt`, delay logic, `to-chat` dispatch |
| `src/app/usecases/messages/CreateMessage.spec.ts` | modify | Add scenarios 4 and 5 tests |
| `src/app/services/SendMessageToMessenger.ts` | modify if needed | Add `ignored` guard if absent |

### Do NOT Modify

- `src/config/queue.ts` — complete
- `prisma/schema.prisma` — complete
- `worker.ts` — owned by task-04

## Implementation Steps

### Step 1: Add `scheduledAt` to `CREATE_MESSAGE_FIELDS`

```ts
const CREATE_MESSAGE_FIELDS = [
  'licensee', 'contact', 'phone', 'kind', 'destination',
  'text', 'url', 'fileName', 'latitude', 'longitude',
  'fromMe', 'senderName', 'departament',
  'scheduledAt',   // ← add
]
```

### Step 2: Validate and compute delay in `execute()`

After creating the message, before dispatching:

```ts
let delay: number | undefined
if (message.scheduledAt) {
  const ms = new Date(message.scheduledAt).getTime() - Date.now()
  if (ms <= 0) {
    throw Object.assign(new Error('Validation failed'), {
      errors: { scheduledAt: { message: 'must be a future datetime' } },
    })
  }
  delay = ms
}
```

(The controller's existing `catch` block already maps `err.errors` to a 422 via `sanitizeModelErrors`.)

### Step 3: Extend job dispatch

Replace the existing `if (message.destination === 'to-messenger')` block:

```ts
const messengerOptions: JobOptions = {}
if (message.kind === 'file') {
  messengerOptions.attempts = 3
  messengerOptions.backoff = { type: 'exponential', delay: 3000 }
}
if (delay) messengerOptions.delay = delay

if (message.destination === 'to-messenger') {
  await this.jobQueue.addJob(SEND_MESSAGE_TO_MESSENGER_JOB, { messageId: message._id }, messengerOptions)
} else if (message.destination === 'to-chat') {
  const chatOptions: JobOptions = delay ? { delay } : {}
  await this.jobQueue.addJob('send-message-to-chat', { messageId: message._id }, chatOptions)
}
```

### Step 4: Verify `ignored` guard in `SendMessageToMessenger`

Open `src/app/services/SendMessageToMessenger.ts`. If a guard like the following is absent, add it after loading the message:

```ts
if (message.ignored) return
```

### Step 5: Run tests

```bash
npx jest src/app/usecases/messages/CreateMessage
```

## Testing

**Spec scenarios covered**:
- [ ] **Scenario 4** — Valid future `scheduledAt` → `Message` created with `scheduledAt` set, `addJob` called with `delay > 0`
  → `CreateMessage.spec.ts` — `'queues send-message-to-messenger with delay when scheduledAt is valid and future'`
- [ ] **Scenario 5** — Past `scheduledAt` → error thrown with `errors.scheduledAt`
  → `CreateMessage.spec.ts` — `'throws validation error when scheduledAt is in the past'`
- [ ] **Scenario 10** — `ignored` guard: job fires, message is ignored → service returns without sending
  → `SendMessageToMessenger` test or inline assertion

**Additional**:
- [ ] `to-chat` destination with delay queues `send-message-to-chat` with correct delay
- [ ] No `scheduledAt` → existing behaviour unchanged (immediate dispatch)
- [ ] Existing `CreateMessage` tests pass unchanged
- [ ] `yarn typecheck` passes

## Documentation / KB Updates

- [ ] After full plan completes, run `document-solution` to create a KB entry covering the schedule-message pattern.

## Completion Criteria

- [ ] Scenarios 4 and 5 pass
- [ ] `to-chat` dispatch with delay works
- [ ] `ignored` guard present in `SendMessageToMessenger`
- [ ] Existing tests unchanged
- [ ] TypeScript clean
- [ ] `status.md` updated
