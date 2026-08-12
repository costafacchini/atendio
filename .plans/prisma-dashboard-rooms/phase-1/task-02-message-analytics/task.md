# Task: Message analytics repository methods

**Plan**: prisma-dashboard-rooms
**Phase**: 1
**Task ID**: task-02
**Task Path**: phase-1/task-02-message-analytics
**Spec References**: Story 1 (P1), Story 2 (P1), Story 3 (P2) — FR-002, FR-008, FR-009, FR-010
**Depends On**: None
**JIRA**: N/A

## Objective

Add all PostgreSQL-native query methods to `PrismaMessageDatabaseRepository` that the dashboard and rooms controllers need, replacing every Mongoose `.model().aggregate()` / `.model().countDocuments()` / `.model().find()` call.

## Context

`PrismaMessageDatabaseRepository` is in `src/app/repositories/message.ts`. It currently only overrides `toData()` to strip `cart`. The following methods need to be added:

| Method | Used by | Mongoose equivalent |
|--------|---------|---------------------|
| `countMessages(params)` | DashboardController (sentCount, failedCount, pendingMessages, messagesToday) | `.model().where(f).countDocuments()` |
| `groupByDay(params, start, end)` | DashboardController messageVolume, messagesPerDay | `.model().aggregate([...per-day pipeline])` |
| `groupByHour(params, start, end)` | DashboardController messageVolume | `.model().aggregate([...per-hour pipeline])` |
| `avgQueueTime(params, start, end)` | DashboardController queue | `.model().aggregate([...avgQueue pipeline])` |
| `avgMessagesPerRoom(params, start, end)` | DashboardController conversations | `.model().aggregate([...avgMsgPerConv pipeline])` |
| `lastMessagePerRoom(roomIds)` | DashboardController openRooms, RoomsController index | `.model().aggregate([...lastMsg pipeline])` |
| `countForRoom(roomId)` | RoomsController messages | `.model().countDocuments({ room })` |
| `findPagedForRoom(roomId, page, limit)` | RoomsController messages | `.model().find({ room }).sort().skip().limit().lean()` |

### EXCLUDE_SYSTEM_CLOSE filter

The Mongoose code uses `{ $nor: [{ kind: 'text', text: 'Chat encerrado pelo agente' }] }` which in SQL is:
```sql
NOT (kind = 'text' AND text = 'Chat encerrado pelo agente')
```

Define this as a reusable Prisma `where` clause:
```typescript
const EXCLUDE_SYSTEM_CLOSE = {
  NOT: { AND: [{ kind: 'text' }, { text: 'Chat encerrado pelo agente' }] }
}
```

Use it with Prisma's `count({ where: { ...EXCLUDE_SYSTEM_CLOSE, ... } })` for simple counts, and as a SQL fragment in `$queryRaw` queries.

### `$queryRaw` pattern

Use Prisma's tagged template for safe parameterised queries:
```typescript
import { Prisma } from '@prisma/client'
const rows = await getPrismaClient().$queryRaw<RowType[]>`
  SELECT ... FROM messages WHERE ...
`
```

Never interpolate variables directly — use `${variable}` inside the template tag.

For arrays (e.g. `roomIds`), use:
```typescript
import { Prisma } from '@prisma/client'
const rows = await getPrismaClient().$queryRaw<RowType[]>(
  Prisma.sql`SELECT ... WHERE room = ANY(${roomIds})`
)
```

## Before You Start

- [ ] Pull latest `feature/prisma-migration`: `git pull --rebase origin feature/prisma-migration`
- [ ] Read `src/app/controllers/DashboardController.ts` lines 112–165 (messageVolume), 233–262 (queue), 276–326 (conversations), 433–470 (openRooms) to understand each pipeline
- [ ] Read `src/app/controllers/RoomsController.ts` lines 68–100 (index), 155–170 (messages)
- [ ] Read `src/app/repositories/message.prisma.spec.ts` to understand the integration spec pattern (RUN_POSTGRES_TESTS=1 guard)
- [ ] Check this task's `status.md` — if already `in-progress` or `complete`, stop
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/repositories/message.ts` | modify | Add 8 methods to `PrismaMessageDatabaseRepository` |
| `src/app/repositories/message.prisma.spec.ts` | modify | Add integration tests for all 8 methods |

### Do NOT Modify

- `src/app/repositories/repository.ts` — owned by task-01
- `src/app/repositories/room.ts` — owned by task-03
- `src/app/repositories/department.ts` — owned by task-04
- `src/app/controllers/` — owned by Phase 2

## Implementation Steps

### Step 1: Add the EXCLUDE_SYSTEM_CLOSE Prisma where clause

At the top of `PrismaMessageDatabaseRepository` (or as a module-level constant), add:

```typescript
const EXCLUDE_SYSTEM_CLOSE_WHERE = {
  NOT: { AND: [{ kind: 'text' }, { text: 'Chat encerrado pelo agente' }] },
}

// SQL fragment for $queryRaw queries
const EXCLUDE_SYSTEM_CLOSE_SQL = `NOT (kind = 'text' AND text = 'Chat encerrado pelo agente')`
```

### Step 2: Add `countMessages(params)`

```typescript
async countMessages(params: Record<string, unknown> = {}): Promise<number> {
  return getPrismaClient().message.count({
    where: { ...EXCLUDE_SYSTEM_CLOSE_WHERE, ...(this.toWhere(params) as any) },
  })
}
```

Note: `params` may include `sended`, `ignored`, `destination`, `licensee`, and date ranges. Date ranges come pre-parsed as `Date` objects. `toWhere` handles `licensee` coercion to `int` (it's in `fkFields`).

For date range filtering, the controller passes plain objects like `{ createdAt: { $gte: startDate, $lt: endDate } }`. The `PrismaRepository.toWhere` does not translate Mongo operators — the executing agent must check how `toWhere` handles these and adapt. If `toWhere` only handles `_id` coercion and FK coercion (as seen in `repository.ts`), date range params must be passed as Prisma-native `{ createdAt: { gte: startDate, lt: endDate } }` from the caller (controller). See task-05 notes.

### Step 3: Add `groupByDay(params, startDate, endDate)`

```typescript
async groupByDay(
  licenseeId: number | null,
  startDate: Date,
  endDate: Date,
): Promise<{ _id: string; count: number }[]> {
  const licenseeFilter = licenseeId
    ? Prisma.sql`AND licensee = ${licenseeId}`
    : Prisma.sql``

  return getPrismaClient().$queryRaw<{ _id: string; count: number }[]>`
    SELECT
      TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "_id",
      COUNT(*)::int AS count
    FROM messages
    WHERE ${Prisma.raw(EXCLUDE_SYSTEM_CLOSE_SQL)}
      AND "createdAt" >= ${startDate}
      AND "createdAt" < ${endDate}
      ${licenseeFilter}
    GROUP BY 1
    ORDER BY 1
  `
}
```

### Step 4: Add `groupByHour(licenseeId, startDate, endDate)`

Same shape as `groupByDay` but format string is `'YYYY-MM-DD"T"HH24'`:

```typescript
async groupByHour(
  licenseeId: number | null,
  startDate: Date,
  endDate: Date,
): Promise<{ _id: string; count: number }[]> {
  const licenseeFilter = licenseeId
    ? Prisma.sql`AND licensee = ${licenseeId}`
    : Prisma.sql``

  return getPrismaClient().$queryRaw<{ _id: string; count: number }[]>`
    SELECT
      TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24') AS "_id",
      COUNT(*)::int AS count
    FROM messages
    WHERE ${Prisma.raw(EXCLUDE_SYSTEM_CLOSE_SQL)}
      AND "createdAt" >= ${startDate}
      AND "createdAt" < ${endDate}
      ${licenseeFilter}
    GROUP BY 1
    ORDER BY 1
  `
}
```

### Step 5: Add `avgQueueTime(licenseeId, startDate, endDate)`

```typescript
async avgQueueTime(
  licenseeId: number | null,
  startDate: Date,
  endDate: Date,
): Promise<number> {
  const licenseeFilter = licenseeId
    ? Prisma.sql`AND licensee = ${licenseeId}`
    : Prisma.sql``

  const rows = await getPrismaClient().$queryRaw<{ avg: number | null }[]>`
    SELECT AVG(EXTRACT(EPOCH FROM ("sendedAt" - "createdAt")))::float AS avg
    FROM messages
    WHERE ${Prisma.raw(EXCLUDE_SYSTEM_CLOSE_SQL)}
      AND "sendedAt" IS NOT NULL
      AND "createdAt" >= ${startDate}
      AND "createdAt" < ${endDate}
      ${licenseeFilter}
  `
  return parseFloat((rows[0]?.avg ?? 0).toFixed(2))
}
```

### Step 6: Add `avgMessagesPerRoom(licenseeId, startDate, endDate)`

```typescript
async avgMessagesPerRoom(
  licenseeId: number | null,
  startDate: Date,
  endDate: Date,
): Promise<number> {
  const licenseeFilter = licenseeId
    ? Prisma.sql`AND licensee = ${licenseeId}`
    : Prisma.sql``

  const rows = await getPrismaClient().$queryRaw<{ avg: number | null }[]>`
    SELECT COALESCE(AVG(cnt)::float, 0) AS avg
    FROM (
      SELECT COUNT(*) AS cnt
      FROM messages
      WHERE room IS NOT NULL
        AND ${Prisma.raw(EXCLUDE_SYSTEM_CLOSE_SQL)}
        AND "createdAt" >= ${startDate}
        AND "createdAt" < ${endDate}
        ${licenseeFilter}
      GROUP BY room
    ) sub
  `
  return parseFloat((rows[0]?.avg ?? 0).toFixed(2))
}
```

### Step 7: Add `lastMessagePerRoom(roomIds)`

```typescript
async lastMessagePerRoom(
  roomIds: number[],
): Promise<{ room: number; text: string | null; createdAt: Date }[]> {
  if (roomIds.length === 0) return []

  return getPrismaClient().$queryRaw<{ room: number; text: string | null; createdAt: Date }[]>(
    Prisma.sql`
      SELECT DISTINCT ON (room) room, text, "createdAt"
      FROM messages
      WHERE room = ANY(${roomIds})
        AND ${Prisma.raw(EXCLUDE_SYSTEM_CLOSE_SQL)}
      ORDER BY room, "createdAt" DESC
    `
  )
}
```

### Step 8: Add `countForRoom(roomId)` and `findPagedForRoom(roomId, page, limit)`

```typescript
async countForRoom(roomId: number): Promise<number> {
  return getPrismaClient().message.count({ where: { room: roomId } })
}

async findPagedForRoom(
  roomId: number,
  page: number,
  limit: number,
): Promise<any[]> {
  return getPrismaClient().message.findMany({
    where: { room: roomId },
    orderBy: { createdAt: 'asc' },
    skip: (page - 1) * limit,
    take: limit + 1,
  })
}
```

### Step 9: Add integration tests to `message.prisma.spec.ts`

Add a describe block for each new method following the existing `describeIf` guard pattern. Focus on:
- `countMessages` with no filter returns a number
- `groupByDay` returns array of `{ _id: 'YYYY-MM-DD', count: number }`
- `groupByHour` returns array of `{ _id: 'YYYY-MM-DDTHH', count: number }`
- `avgQueueTime` returns a number (may be 0 if no sendedAt data)
- `avgMessagesPerRoom` returns a number
- `lastMessagePerRoom([])` returns `[]`
- `lastMessagePerRoom([validRoomId])` returns the most recent non-system message
- `countForRoom` returns integer
- `findPagedForRoom` returns messages in ascending createdAt order

### Step 10: Lint

```bash
npx eslint src/app/repositories/message.ts
```

## Testing

**Spec scenarios covered**:
- [ ] Story 1 Scenario 2 — `groupByDay` and `groupByHour` power `messageVolume`
- [ ] Story 1 Scenario 4 — `avgQueueTime` powers `queue`
- [ ] Story 1 Scenario 5 — `avgMessagesPerRoom` powers `conversations`
- [ ] Story 1 Scenario 9 — `lastMessagePerRoom` powers `openRooms`
- [ ] Story 2 Scenario 2 — `lastMessagePerRoom` powers rooms index
- [ ] Story 3 Scenario 1 — `countForRoom` + `findPagedForRoom` power `messages`

**Additional verification**:
- [ ] Integration tests added to `message.prisma.spec.ts` (run with `RUN_POSTGRES_TESTS=1`)
- [ ] `npx eslint` passes on changed files

## Documentation / KB Updates

Run `document-solution` on completion — the `$queryRaw` + `DISTINCT ON` + `Prisma.sql` composition pattern is non-obvious and worth a KB entry under `architecture/`.

## Completion Criteria

- [ ] All 8 methods implemented in `PrismaMessageDatabaseRepository`
- [ ] Integration tests added to `message.prisma.spec.ts`
- [ ] `npx eslint src/app/repositories/message.ts` clean
- [ ] `status.md` updated to `complete`
