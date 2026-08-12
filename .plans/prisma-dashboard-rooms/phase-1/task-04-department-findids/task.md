# Task: Department findIds (JSON array filter)

**Plan**: prisma-dashboard-rooms
**Phase**: 1
**Task ID**: task-04
**Task Path**: phase-1/task-04-department-findids
**Spec References**: Story 2 (P1) — FR-005
**Depends On**: None
**JIRA**: N/A

## Objective

Add `findIds(params)` to `PrismaDepartmentDatabaseRepository` to replace `departmentRepository.model().find({ users: req.userId, licensee: licenseeId, active: true }).select('_id').lean()` in `RoomsController.index`.

## Context

`PrismaDepartmentDatabaseRepository` is in `src/app/repositories/department.ts`. The Department Prisma schema has:

```
model Department {
  id              Int      @id @default(autoincrement())
  users           Json
  licensee        Int
  active          Boolean  @default(true)
  ...
}
```

`users` is a `Json` column. In Mongoose, filtering `{ users: userId }` on an array field finds documents where the array contains `userId`. The equivalent in PostgreSQL requires a JSONB containment operator: `users @> '[userId]'::jsonb`.

### Critical pre-flight: verify the JSON format

Before writing the filter, **the executing agent must check the format** of `users` in the database:

```bash
# With RUN_POSTGRES_TESTS=1 or by inspecting the DB:
# Does users look like [1, 2, 3] (integer array)?
# Or ["abc123", "def456"] (string array)?
# Or something else?
```

If integers: `users @> '[${userId}]'::jsonb` where `userId` is a number.
If strings: `users @> '["${userId}"]'::jsonb`.

**If the format is neither**, stop and consult Alan (kill criterion).

### Prisma JSON filter option

Prisma supports `array_contains` for JSON fields. Try it first:

```typescript
prisma.department.findMany({
  where: {
    licensee: parseInt(licenseeId),
    active: true,
    users: { array_contains: userId },  // userId may need to be int or string
  },
  select: { id: true },
})
```

If `array_contains` does not produce the expected SQL (verify with Prisma query logging or a test), fall back to `$queryRaw`:

```typescript
getPrismaClient().$queryRaw<{ id: number }[]>`
  SELECT id FROM departments
  WHERE licensee = ${parseInt(licenseeId)}
    AND active = true
    AND users @> ${JSON.stringify([userId])}::jsonb
`
```

## Before You Start

- [ ] Pull latest `feature/prisma-migration`
- [ ] Read `src/app/repositories/department.ts` — understand current `PrismaDepartmentDatabaseRepository`
- [ ] Read `src/app/repositories/department.prisma.spec.ts` — understand spec pattern
- [ ] Read `src/app/controllers/RoomsController.ts` lines 68–74 to see the exact Mongoose call being replaced
- [ ] **Verify the `users` JSON format** — read existing department records or check a seed/spec to confirm integer vs string IDs
- [ ] Check this task's `status.md`
- [ ] Mark this task `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/repositories/department.ts` | modify | Add `findIds` to `PrismaDepartmentDatabaseRepository` |
| `src/app/repositories/department.prisma.spec.ts` | modify | Add integration test for `findIds` |

### Do NOT Modify

- `src/app/repositories/repository.ts` — owned by task-01
- `src/app/repositories/message.ts` — owned by task-02
- `src/app/repositories/room.ts` — owned by task-03
- `src/app/controllers/` — owned by Phase 2

## Implementation Steps

### Step 1: Check existing department spec for user format

In `src/app/repositories/department.prisma.spec.ts`, look at how `users` is seeded. If it's `[1, 2]` (integers), the filter uses an integer. If it's `["abc"]` (strings), use string.

### Step 2: Implement `findIds`

```typescript
async findIds(params: {
  users?: string | number
  licensee?: string | number
  active?: boolean
}): Promise<number[]> {
  const { users: userId, licensee: licenseeId, active } = params
  const licenseeInt = licenseeId != null ? parseInt(String(licenseeId), 10) : undefined

  // Prisma array_contains filter (preferred):
  const records = await getPrismaClient().department.findMany({
    where: {
      ...(licenseeInt != null ? { licensee: licenseeInt } : {}),
      ...(active != null ? { active } : {}),
      ...(userId != null ? { users: { array_contains: userId } } : {}),
    },
    select: { id: true },
  })
  return records.map((r) => r.id)
}
```

If `array_contains` fails (type mismatch), switch to `$queryRaw` as described in Context.

### Step 3: Add integration test

In `department.prisma.spec.ts`, inside the `describeIf` block:

```typescript
describe('#findIds', () => {
  it('returns department IDs where users array contains the given userId', async () => {
    // Create a department with a known userId in the users array
    const userId = 42  // or whatever format the repo uses
    await getPrismaClient().department.create({
      data: {
        name: 'Test Dept',
        licensee: licenseeId,
        active: true,
        departmentToken: 'tok-findids-test',
        users: [userId],
      },
    })
    const ids = await repo.findIds({ users: userId, licensee: licenseeId, active: true })
    expect(ids.length).toBeGreaterThanOrEqual(1)
    ids.forEach((id) => expect(typeof id).toBe('number'))
  })

  it('returns empty array when no department has the given userId', async () => {
    const ids = await repo.findIds({ users: 999999, licensee: licenseeId, active: true })
    expect(ids).toEqual([])
  })
})
```

Adjust `userId` type (int vs string) based on Step 1 findings.

### Step 4: Lint

```bash
npx eslint src/app/repositories/department.ts
```

## Testing

**Spec scenarios covered**:
- [ ] Story 2 Scenario 1 — `findIds` provides agent department IDs for the rooms index filter

**Additional verification**:
- [ ] Integration test added to `department.prisma.spec.ts`
- [ ] `npx eslint` passes

## Documentation / KB Updates

No KB/doc updates required.

## Completion Criteria

- [ ] `PrismaDepartmentDatabaseRepository.findIds` implemented and lint-clean
- [ ] Integration test added and commented with format discovered
- [ ] `status.md` updated to `complete`

## Conflict Avoidance Notes

- If the `users` JSON format turns out to be neither an integer array nor a string array, this is a kill criterion — stop and notify Alan before proceeding.
