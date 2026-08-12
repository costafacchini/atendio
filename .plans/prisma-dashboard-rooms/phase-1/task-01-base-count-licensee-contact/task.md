# Task: Base count + Licensee & Contact query methods

**Plan**: prisma-dashboard-rooms
**Phase**: 1
**Task ID**: task-01
**Task Path**: phase-1/task-01-base-count-licensee-contact
**Spec References**: Story 1 (P1) — SC-001, FR-001, FR-004
**Depends On**: None
**JIRA**: N/A

## Objective

Add a generic `count(params)` method to `PrismaRepository`, add `findIds(params)` to `PrismaContactDatabaseRepository`, and verify both in their integration spec files. These primitives unblock task-05 (DashboardController) for the `/licensees` and `/contacts` endpoints.

## Context

- `PrismaRepository` lives in `src/app/repositories/repository.ts` around line 449. It already has `findFirst`, `find`, `create`, `update`, `save`, `delete`. Adding `count` follows the exact same delegation pattern.
- `PrismaLicenseeDatabaseRepository` is in `src/app/repositories/licensee.ts`. The dashboard `licensees` endpoint calls `.where({}).countDocuments()` five times with different filters; all become `this.count(params)`.
- `PrismaContactDatabaseRepository` is in `src/app/repositories/contact.ts`. The dashboard `conversations` and `openRooms` endpoints call `.find({ licensee }).select('_id')` to get contact IDs for a room filter. This becomes `findIds(params)` returning `number[]`.
- Integration specs for both live in `src/app/repositories/licensee.prisma.spec.ts` and `src/app/repositories/contact.prisma.spec.ts` (guarded by `RUN_POSTGRES_TESTS=1`).

## Before You Start

- [ ] Pull latest `feature/prisma-migration`: `git pull --rebase origin feature/prisma-migration`
- [ ] Verify tasks 02, 03, 04 are not yet modifying `repository.ts` — they own different files; the only shared file is `repository.ts` and only this task touches it
- [ ] Check this task's `status.md` — if already `in-progress` or `complete`, stop
- [ ] Read `src/app/repositories/repository.ts` lines 449–510 to understand existing `PrismaRepository` pattern
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/repositories/repository.ts` | modify | Add `count(params)` to `PrismaRepository` only |
| `src/app/repositories/contact.ts` | modify | Add `findIds(params)` to `PrismaContactDatabaseRepository` |
| `src/app/repositories/licensee.prisma.spec.ts` | modify | Add `count` integration test |
| `src/app/repositories/contact.prisma.spec.ts` | modify | Add `findIds` integration test |

### Do NOT Modify

- `src/app/repositories/message.ts` — owned by task-02
- `src/app/repositories/room.ts` — owned by task-03
- `src/app/repositories/department.ts` — owned by task-04
- `src/app/controllers/` — owned by Phase 2

## Implementation Steps

### Step 1: Add `count(params)` to `PrismaRepository`

In `src/app/repositories/repository.ts`, add after the existing `find` method inside `class PrismaRepository<T>`:

```typescript
async count(params: Record<string, unknown> = {}): Promise<number> {
  return this.delegate().count({ where: this.toWhere(params) })
}
```

This follows the same `this.delegate()` + `this.toWhere()` pattern as every other method in the class.

### Step 2: Add `findIds` to `PrismaContactDatabaseRepository`

In `src/app/repositories/contact.ts`, add to `PrismaContactDatabaseRepository`:

```typescript
async findIds(params: Record<string, unknown> = {}): Promise<number[]> {
  const records = await getPrismaClient().contact.findMany({
    where: this.toWhere(params) as any,
    select: { id: true },
  })
  return records.map((r) => r.id)
}
```

Note: `toWhere` is protected on `PrismaRepository` — call it as `this.toWhere(params)` (accessible from the subclass).

### Step 3: Add integration test for `count` in licensee spec

In `src/app/repositories/licensee.prisma.spec.ts`, inside the `describeIf` block, add a `#count` describe:

```typescript
describe('#count', () => {
  it('returns total count with no filter', async () => {
    const n = await repo.count()
    expect(typeof n).toBe('number')
    expect(n).toBeGreaterThanOrEqual(1) // at least the seed licensee
  })

  it('counts by licenseKind', async () => {
    const demo = await repo.count({ licenseKind: 'demo' })
    const paid = await repo.count({ licenseKind: 'paid' })
    expect(demo).toBeGreaterThanOrEqual(1)
    expect(paid).toBe(0)
  })
})
```

### Step 4: Add integration test for `findIds` in contact spec

In `src/app/repositories/contact.prisma.spec.ts`, inside the `describeIf` block, add a `#findIds` describe:

```typescript
describe('#findIds', () => {
  it('returns integer IDs for matching contacts', async () => {
    await getPrismaClient().contact.create({
      data: { number: '11999990001', talkingWithChatBot: false, licensee: licenseeId },
    })
    const ids = await repo.findIds({ licensee: licenseeId })
    expect(Array.isArray(ids)).toBe(true)
    expect(ids.length).toBeGreaterThanOrEqual(1)
    ids.forEach((id) => expect(typeof id).toBe('number'))
  })

  it('returns empty array when no contacts match', async () => {
    const ids = await repo.findIds({ licensee: 999999 })
    expect(ids).toEqual([])
  })
})
```

### Step 5: Lint and run unit tests

```bash
npx eslint src/app/repositories/repository.ts src/app/repositories/contact.ts
npx jest src/app/repositories/contact.spec.ts src/app/repositories/licensee.spec.ts --no-coverage
```

Both must pass before marking complete.

## Testing

**Spec scenarios covered**:
- [ ] SC-001 partial — `count()` enables the `/dashboard/licensees` and `/dashboard/contacts` endpoints (verified in task-05)
- [ ] `findIds()` returns correct integer IDs for a licensee — integration spec added in Step 4
- [ ] `count()` returns correct integer count — integration spec added in Step 3

**Additional verification**:
- [ ] `npx eslint` reports no errors on changed files
- [ ] Existing unit tests still pass: `npx jest src/app/repositories/contact.spec.ts src/app/repositories/licensee.spec.ts --no-coverage`

## Documentation / KB Updates

No KB/doc updates required — this adds standard repository primitives following the existing PrismaRepository pattern.

## Completion Criteria

- [ ] `PrismaRepository.count(params)` implemented and lint-clean
- [ ] `PrismaContactDatabaseRepository.findIds(params)` implemented and lint-clean
- [ ] Integration test stubs added to both prisma spec files
- [ ] Unit tests pass
- [ ] `status.md` updated to `complete`

## Conflict Avoidance Notes

- Only `repository.ts` is shared; task-02, task-03, task-04 do not touch it. If any of those tasks need `count`, they inherit it automatically from the base class once this task is merged.
