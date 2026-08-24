# Task: Add `delay` to JobOptions & QueueServer

**Plan**: Schedule Message for Future Delivery
**Phase**: 1
**Task ID**: task-01
**Task Path**: phase-1/task-01-queue-delay
**Spec References**: FR-004
**Depends On**: None
**JIRA**: N/A

## Objective

Add `delay?: number` to the `JobOptions` interface and verify `QueueServer.addJob` forwards it to BullMQ's `Queue.add()`.

## Context

BullMQ's `Queue.add(name, data, opts)` natively accepts `{ delay: number }` (ms). `JobOptions` in `src/config/queue.ts` currently only types `attempts` and `backoff`. The `addJob` method already spreads `options` into `queue.bull.add()`, so TypeScript is the only blocker.

This task is a prerequisite for task-03, which needs the typed `delay` field on `JobOptions`.

## Before You Start

- [ ] `git switch main && git pull --rebase origin main`
- [ ] Check `status.md` — stop if `in-progress` or `complete`
- [ ] Read `docs/kb/architecture/job-queue-system.md`
- [ ] Mark `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/config/queue.ts` | modify | Add `delay?: number` to `JobOptions` |

### Do NOT Modify

- Any file outside `src/config/queue.ts`

## Implementation Steps

### Step 1: Update `JobOptions`

```ts
export interface JobOptions {
  attempts?: number
  backoff?: { type: string; delay: number }
  delay?: number
}
```

### Step 2: Confirm spread still in place

The existing `addJob` already does `{ attempts: 1, ...options }` — no further change needed.

### Step 3: Verify

```bash
yarn typecheck
```

## Testing

No new test file required — interface-only change, covered transitively by task-03 tests.

- [ ] `yarn typecheck` reports no new errors
- [ ] `npx jest` passes unchanged

## Documentation / KB Updates

- [ ] No KB update required.

## Completion Criteria

- [ ] `JobOptions` includes `delay?: number`
- [ ] TypeScript clean
- [ ] All tests pass
- [ ] `status.md` updated
