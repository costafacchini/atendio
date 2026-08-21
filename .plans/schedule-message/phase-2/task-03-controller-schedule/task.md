# Task: Parse scheduledAt in ChatRoomsController

**Plan**: Schedule Message for Future Delivery
**Phase**: 2
**Task ID (phase-local)**: task-03
**Task Path**: phase-2/task-03-controller-schedule
**Spec References**: Story 1 (P1), FR-001, FR-002, FR-003, SC-001, SC-002
**Depends On**: phase-1/task-01-queue-delay
**JIRA**: N/A

## Objective

Extend `ChatRoomsController.replyToRoom` to read an optional `scheduledAt` (ISO string) from the request body, validate it is in the future, compute `delay` in ms, and pass it to `ingestChatMessage.execute`.

## Context

`ChatRoomsController.replyToRoom` (`src/app/controllers/ChatRoomsController.ts`) handles `POST /api/v1/chat/rooms/:roomId/messages`. It currently reads `{ text }` from `req.body` and calls `this.ingestChatMessage.execute({ body, licenseeId, inboxId })`.

After task-02, `execute()` accepts an optional `delay` param. This task wires the HTTP layer: parse `scheduledAt`, reject with 422 if delay ≤ 0, and pass the computed delay to `execute`.

Test pattern: Jest, mock dependencies with `jest.fn()`. See `MessagesController.spec.ts` and the existing `ChatRoomsController.spec.ts` style (currently the controller only has a spec for `replyToRoom` happy path).

**Important**: There is currently no `ChatRoomsController.spec.ts` — you must create it. Model the file on `MessagesController.spec.ts`.

## Before You Start

- [ ] Switch to main and pull latest: `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-1/task-01-queue-delay/status.md` shows `complete`
- [ ] Check this task's `status.md` — if already `in-progress` or `complete`, stop and investigate
- [ ] Read `docs/kb/architecture/express-conventions.md`
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/controllers/ChatRoomsController.ts` | modify | Parse `scheduledAt`, validate, compute delay |
| `src/app/controllers/ChatRoomsController.spec.ts` | create | New spec covering schedule scenarios |

### Do NOT Modify

- `src/config/queue.ts` — owned by phase-1/task-01-queue-delay (complete)
- `src/app/usecases/webhooks/IngestChatMessage.ts` — owned by phase-2/task-02-ingest-schedule

## Implementation Steps

### Step 1: Parse `scheduledAt` from request body

In `replyToRoom`, extract `scheduledAt` alongside `text`:

```ts
const { text, scheduledAt } = req.body
```

### Step 2: Validate and compute delay

After verifying the room exists (existing guard), add:

```ts
let delay: number | undefined
if (scheduledAt !== undefined) {
  const ms = Date.parse(scheduledAt)
  if (isNaN(ms) || ms - Date.now() <= 0) {
    return res.status(422).json({ errors: { scheduledAt: 'must be a future datetime' } })
  }
  delay = ms - Date.now()
}
```

### Step 3: Pass delay to `ingestChatMessage.execute`

Update the `execute` call:

```ts
await this.ingestChatMessage.execute({ body, licenseeId, inboxId, delay })
```

(`delay` is `undefined` when not scheduled, which `execute` already handles.)

### Step 4: Create `ChatRoomsController.spec.ts`

Model on `MessagesController.spec.ts`. Include at minimum:

- `replyToRoom` happy-path (existing behaviour, `scheduledAt` absent) → 200
- `replyToRoom` with a valid future `scheduledAt` → `ingestChatMessage.execute` called with correct `delay` > 0, response 200
- `replyToRoom` with a past `scheduledAt` → 422 with `errors.scheduledAt`
- `replyToRoom` with an invalid (non-date) `scheduledAt` string → 422

### Step 5: Run tests

```bash
npx jest src/app/controllers/ChatRoomsController
```

## Testing

**Spec scenarios covered**:
- [ ] **Scenario 4** — Given a valid `scheduledAt` in the request body, When `replyToRoom` processes it, Then `ingestChatMessage.execute` is called with `delay = Date.parse(scheduledAt) - Date.now()` in ms
  → `ChatRoomsController.spec.ts` — `'calls ingestChatMessage.execute with delay when scheduledAt is valid and future'`
- [ ] **Scenario 5** — Given `scheduledAt` is in the past, When the request reaches `replyToRoom`, Then it returns 422 with `{ errors: { scheduledAt: 'must be a future datetime' } }`
  → `ChatRoomsController.spec.ts` — `'returns 422 when scheduledAt is in the past'`

**Additional verification**:
- [ ] Existing happy-path (no `scheduledAt`) still returns 200 and calls `execute` without delay
- [ ] Invalid (non-parseable) `scheduledAt` string → 422
- [ ] `yarn typecheck` passes
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

- [ ] No KB/doc updates required for this task alone. If `document-solution` hasn't been run on the scheduling pattern once the full plan is complete, run it then.

## Completion Criteria

- [ ] Scenarios 4 and 5 tests pass
- [ ] Existing room-reply behaviour unchanged
- [ ] TypeScript compiles cleanly
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- `task-02-ingest-schedule` modifies `IngestChatMessage.ts` only — no overlap.
- Both phase-2 tasks can run simultaneously after task-01 completes.
- Phase-3 tasks depend on this task's `status.md` being `complete`.
