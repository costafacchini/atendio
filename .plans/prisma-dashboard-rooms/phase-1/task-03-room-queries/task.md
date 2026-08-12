# Task: Room query methods

**Plan**: prisma-dashboard-rooms
**Phase**: 1
**Task ID**: task-03
**Task Path**: phase-1/task-03-room-queries
**Spec References**: Story 1 (P1), Story 2 (P1), Story 4 (P2) — FR-003, FR-009
**Depends On**: None
**JIRA**: N/A

## Objective

Add PostgreSQL-native query methods to `PrismaRoomDatabaseRepository` that replace every Mongoose `.model()` call in `DashboardController` and `RoomsController` that touches rooms.

## Context

`PrismaRoomDatabaseRepository` is in `src/app/repositories/room.ts`. It currently only defines `delegate()` and `fkFields()`. The following methods are needed:

| Method | Used by | Mongoose equivalent |
|--------|---------|---------------------|
| `findById(id)` | DashboardController.closeRoom, RoomsController.closeRoom | `.model().findById(id)` |
| `close(id)` | DashboardController.closeRoom, RoomsController.closeRoom | `room.status = 'closed'; room.save()` |
| `findOpenForContact(contactId)` | RoomsController.create | `RepositoryMemory` version (already on memory repo) |
| `findForLicensee(licenseeId, opts)` | RoomsController.index | Memory-only method (not on Prisma repo) |
| `findManyPaged(params, page, limit)` | DashboardController.openRooms | `.model().find().sort().skip().limit().populate().lean()` |
| `countRooms(params)` | DashboardController.conversations | `.model().where(f).countDocuments()` |
| `avgDuration(contactIds, startDate, endDate)` | DashboardController.conversations | `.model().aggregate([...avgDuration])` |

### Room schema (from `prisma/schema.prisma`)

```
model Room {
  id         Int       @id @default(autoincrement())
  closed     Boolean   @default(false)
  closedAt   DateTime?
  contact    Int
  agent      Int?
  department Int?
  inbox      Int?
  status     String    @default("pending")
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
}
```

There are **no `@relation` directives** — `contact` is a bare `Int`. Cross-table joins for `findForLicensee` and `findManyPaged` (which need contact.name / contact.number) must be done as separate queries or `$queryRaw`.

### `findForLicensee` strategy

`RoomsController.index` needs rooms for a licensee, filtered optionally by departmentIds, with the contact's `name` and `number`. Since rooms don't have a `licensee` column, the join is via `contacts`:

```sql
SELECT r.*, c.name AS contact_name, c.number AS contact_number
FROM rooms r
JOIN contacts c ON c.id = r.contact
WHERE c.licensee = $1
  AND r.closed = false
  [AND (r.department IS NULL OR r.department = ANY($2))]
ORDER BY r."createdAt" DESC
LIMIT $3 OFFSET $4
```

Or: two-step — get contactIds for licensee, then findMany rooms.

The two-step approach is simpler and avoids raw SQL. Prefer it unless performance is a concern:
```typescript
const contactIds = await contactRepo.findIds({ licensee: licenseeId })
const rooms = await prisma.room.findMany({
  where: { contact: { in: contactIds }, closed: false, ... },
  orderBy: { createdAt: 'desc' },
  skip, take,
})
```

However, `RoomRepositoryMemory.findForLicensee` is called from `RoomsController` and the interface `IRoomRepository` already declares it. `PrismaRoomDatabaseRepository` must implement the same signature:

```typescript
async findForLicensee(
  licenseeId: string,
  opts?: { departmentIds?: number[]; page?: number; limit?: number }
): Promise<any[]>
```

Since this method needs contact IDs, it must accept them as input OR accept `contactRepository` as a constructor dependency. **Recommended**: accept `contactIds: number[]` inside `opts`, or use `$queryRaw` for the join. Executing agent picks the cleaner option.

### `findManyPaged` (openRooms dashboard)

The dashboard's `openRooms` endpoint needs rooms with `contact.name` and `contact.number` populated. Since there's no Prisma relation, return plain room records and let the controller fetch contact data separately (or use `$queryRaw`). Executing agent decides.

## Before You Start

- [ ] Pull latest `feature/prisma-migration`
- [ ] Read `src/app/controllers/DashboardController.ts` lines 433–500 (openRooms, closeRoom)
- [ ] Read `src/app/controllers/RoomsController.ts` lines 53–105 (index), 175–200 (closeRoom)
- [ ] Read `src/app/repositories/room.prisma.spec.ts` to understand integration spec pattern
- [ ] Read `RoomRepositoryMemory.findForLicensee` signature in `src/app/repositories/room.ts`
- [ ] Check this task's `status.md`
- [ ] Mark this task `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/repositories/room.ts` | modify | Add 7 methods to `PrismaRoomDatabaseRepository` |
| `src/app/repositories/room.prisma.spec.ts` | modify | Add integration tests for all new methods |

### Do NOT Modify

- `src/app/repositories/repository.ts` — owned by task-01
- `src/app/repositories/message.ts` — owned by task-02
- `src/app/repositories/contact.ts` — owned by task-01
- `src/app/repositories/department.ts` — owned by task-04
- `src/app/controllers/` — owned by Phase 2

## Implementation Steps

### Step 1: Add `findById(id)`

```typescript
async findById(id: string | number): Promise<IRoom | null> {
  const record = await getPrismaClient().room.findUnique({
    where: { id: typeof id === 'string' ? parseInt(id, 10) : id },
  })
  return this.fromDB(record)
}
```

### Step 2: Add `close(id)`

Sets `status = 'closed'`, `closed = true`, `closedAt = now()`:

```typescript
async close(id: string | number): Promise<void> {
  await getPrismaClient().room.update({
    where: { id: typeof id === 'string' ? parseInt(id, 10) : id },
    data: { status: 'closed', closed: true, closedAt: new Date() },
  })
}
```

### Step 3: Add `findOpenForContact(contactId)`

```typescript
async findOpenForContact(contactId: string | number): Promise<IRoom | null> {
  const record = await getPrismaClient().room.findFirst({
    where: {
      contact: typeof contactId === 'string' ? parseInt(contactId, 10) : contactId,
      closed: false,
    },
  })
  return this.fromDB(record)
}
```

### Step 4: Add `countRooms(params)`

Inherit `count` from `PrismaRepository` (added by task-01) — no override needed unless the controller needs a different alias. Check whether `task-05` calls `this.roomRepository.count(params)` or `this.roomRepository.countRooms(params)` and use whichever aligns.

### Step 5: Add `avgDuration(contactIds, startDate, endDate)`

```typescript
async avgDuration(
  contactIds: number[] | null,
  startDate: Date,
  endDate: Date,
): Promise<number> {
  const contactFilter = contactIds && contactIds.length > 0
    ? Prisma.sql`AND contact = ANY(${contactIds})`
    : Prisma.sql``

  const rows = await getPrismaClient().$queryRaw<{ avg: number | null }[]>`
    SELECT COALESCE(AVG(EXTRACT(EPOCH FROM ("closedAt" - "createdAt")))::float, 0) AS avg
    FROM rooms
    WHERE "closedAt" >= ${startDate}
      AND "closedAt" < ${endDate}
      ${contactFilter}
  `
  return parseFloat((rows[0]?.avg ?? 0).toFixed(2))
}
```

### Step 6: Add `findManyPaged(params, page, limit)`

Returns plain room records (no contact population — controller handles enrichment):

```typescript
async findManyPaged(
  params: Record<string, unknown>,
  page: number,
  limit: number,
): Promise<IRoom[]> {
  const records = await getPrismaClient().room.findMany({
    where: this.toWhere(params) as any,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit + 1,
  })
  return this.fromDBMany(records) as IRoom[]
}
```

### Step 7: Add `findForLicensee(licenseeId, opts)`

This is called by `RoomsController.index`. The signature is defined by `IRoomRepository` in the controller. Use the two-step approach:

```typescript
async findForLicensee(
  licenseeId: string | number,
  opts: { departmentIds?: number[]; page?: number; limit?: number; contactIds?: number[] } = {},
): Promise<any[]> {
  const { departmentIds = [], page = 1, limit = 20, contactIds = [] } = opts
  const licenseeInt = typeof licenseeId === 'string' ? parseInt(licenseeId, 10) : licenseeId

  // contactIds are passed from the controller (fetched via contactRepository.findIds)
  // If not provided, fall back to a direct SQL join
  const contactFilter = contactIds.length > 0
    ? { contact: { in: contactIds } }
    : undefined

  const deptFilter =
    departmentIds.length > 0
      ? { OR: [{ department: null }, { department: { in: departmentIds } }] }
      : undefined

  const where: Record<string, any> = { closed: false }
  if (contactFilter) Object.assign(where, contactFilter)
  if (deptFilter) Object.assign(where, deptFilter)

  return getPrismaClient().room.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit + 1,
  })
}
```

**Important**: The controller must fetch `contactIds` first and pass them via `opts`. Update `RoomsController.index` in task-06 accordingly.

### Step 8: Add integration tests to `room.prisma.spec.ts`

Add tests for: `findById` (found + not found), `close` (sets fields), `findOpenForContact` (returns open room), `avgDuration` (returns number), `findManyPaged` (pagination), `findForLicensee` (filters by contactIds).

### Step 9: Lint

```bash
npx eslint src/app/repositories/room.ts
```

## Testing

**Spec scenarios covered**:
- [ ] Story 1 Scenario 10 — `close()` powers closeRoom on dashboard
- [ ] Story 2 Scenario 1 — `findForLicensee()` powers rooms index
- [ ] Story 4 Scenario 1 — `close()` marks room closed correctly
- [ ] Story 4 Scenario 2 — `findById` returns room; `room.closed` check is idempotent
- [ ] Story 4 Scenario 3 — `findById` returns null for missing ID → 404

**Additional verification**:
- [ ] Integration tests added to `room.prisma.spec.ts`
- [ ] `npx eslint` passes

## Documentation / KB Updates

No KB/doc updates required — follows standard PrismaRepository extension pattern.

## Completion Criteria

- [ ] All 7 methods implemented in `PrismaRoomDatabaseRepository`
- [ ] Integration tests added
- [ ] Lint clean
- [ ] `status.md` updated to `complete`
