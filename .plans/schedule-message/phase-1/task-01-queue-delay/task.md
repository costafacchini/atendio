# Task: Add `delay` to JobOptions & QueueServer

**Plan**: Schedule Message for Future Delivery
**Phase**: 1
**Task ID (phase-local)**: task-01
**Task Path**: phase-1/task-01-queue-delay
**Spec References**: FR-004
**Depends On**: None
**JIRA**: N/A

## Objective

Extend the `JobOptions` interface and `QueueServer.addJob` implementation in `src/config/queue.ts` to accept and forward an optional `delay` (milliseconds) to BullMQ's `Queue.add()`.

## Context

BullMQ's `Queue.add(name, data, opts)` natively accepts `{ delay: number }` in `opts` (milliseconds from now). Currently `JobOptions` in `src/config/queue.ts` only types `attempts` and `backoff`. The `addJob` method spreads `options` into `queue.bull.add()` but the interface does not include `delay`, so TypeScript would reject it.

This task only touches `src/config/queue.ts`. It is a prerequisite for Phase 2 tasks which need the typed `delay` field.

## Before You Start

- [ ] Switch to main and pull latest: `git switch main && git pull --rebase origin main`
- [ ] Check this task's `status.md` — if already `in-progress` or `complete`, stop and investigate
- [ ] Read `docs/kb/architecture/job-queue-system.md`
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/config/queue.ts` | modify | Add `delay?: number` to `JobOptions`; forward in `addJob` |

### Do NOT Modify

- Any file in `src/app/` — owned by phase-2 tasks

## Implementation Steps

### Step 1: Update `JobOptions` interface

In `src/config/queue.ts`, add `delay?: number` to the `JobOptions` interface:

```ts
export interface JobOptions {
  attempts?: number
  backoff?: { type: string; delay: number }
  delay?: number
}
```

### Step 2: Forward `delay` in `QueueServer.addJob`

The existing call is:
```ts
return await queue.bull.add(name, { body }, { attempts: 1, ...options })
```

This already spreads `options`, so `delay` will be forwarded automatically once the interface allows it. No additional change needed — just verify the spread is still in place after your edit.

### Step 3: Run existing tests

```bash
npx jest src/config/queue --testPathPattern queue
```

No new test file is required for this task — the interface change is a type-level extension and has no independent runtime behaviour. Phase-2 tests will cover the end-to-end path.

## Testing

**Spec scenarios covered**: None directly (interface-only change; covered transitively by phase-2 tests)

**Additional verification**:
- [ ] `npx jest` passes with no failures
- [ ] `yarn typecheck` reports no new type errors
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

- [ ] No KB/doc updates required — this is a minimal interface extension; the job-queue-system KB doc does not need to list individual `JobOptions` fields.

## Completion Criteria

- [ ] `JobOptions` includes `delay?: number`
- [ ] `QueueServer.addJob` forwards `delay` to `queue.bull.add()` via spread
- [ ] TypeScript compiles cleanly
- [ ] All existing tests pass
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- Phase-2 tasks (`task-02-ingest-schedule`, `task-03-controller-schedule`) depend on this task. Do not start Phase 2 until this task's `status.md` shows `complete`.
