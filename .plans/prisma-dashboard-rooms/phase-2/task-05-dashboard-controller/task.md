# Task: Rewrite DashboardController

**Plan**: prisma-dashboard-rooms
**Phase**: 2
**Task ID**: task-05
**Task Path**: phase-2/task-05-dashboard-controller
**Spec References**: Story 1 (P1) — SC-001, SC-003, FR-006
**Depends On**: phase-1/task-01-base-count-licensee-contact, phase-1/task-02-message-analytics, phase-1/task-03-room-queries
**JIRA**: N/A

## Objective

Replace every `.model()` call in `DashboardController` with the Prisma repository methods added in Phase 1, and rewrite `DashboardController.spec.ts` to mock those methods instead of `.model()`.

## Context

`src/app/controllers/DashboardController.ts` has 10 endpoints. All currently call `.model()` on repositories. Each endpoint maps to specific Phase 1 methods:

| Endpoint | Repository calls to replace |
|----------|-----------------------------|
| `licensees` | `licenseeRepository.count(params)` × 5 |
| `messageVolume` | `messageRepository.countMessages(params)` × 2, `.groupByDay()`, `.groupByHour()` |
| `deliveryRate` | `messageRepository.countMessages(params)` × 3 |
| `queue` | `messageRepository.countMessages(params)` × 1, `.avgQueueTime()` |
| `conversations` | `contactRepository.findIds(params)`, `roomRepository.count(params)` × 2, `messageRepository.avgMessagesPerRoom()`, `roomRepository.avgDuration()` |
| `contacts` | `contactRepository.count(params)` × 2 |
| `messagesToday` | `messageRepository.countMessages(params)` × 2 |
| `messagesPerDay` | `messageRepository.groupByDay()` |
| `openRooms` | `contactRepository.findIds(params)`, `roomRepository.findManyPaged()`, `messageRepository.lastMessagePerRoom()` — plus contact name/number enrichment |
| `closeRoom` | `roomRepository.findById(id)`, `roomRepository.close(id)` |

### Date range filter translation

The Mongoose code passes `{ createdAt: { $gte: startDate, $lt: endDate } }` to `.where()`. `PrismaRepository.toWhere` does **not** translate Mongo operators. For `countMessages`, pass date range fields directly in the params object that becomes the Prisma `where`:

```typescript
// Instead of passing Mongo-style operators, call with Prisma-native params:
await this.messageRepository.countMessages({
  sended: true,
  licensee: licenseeId ?? undefined,
  createdAt: { gte: startDate, lt: endDate },
})
```

The `countMessages` method must accept `createdAt` as a Prisma date filter directly in `params` (it should spread `params` into the Prisma `where` clause without going through `toWhere`). Verify with task-02's implementation — adapt if needed.

### `openRooms` contact enrichment

After `roomRepository.findManyPaged()`, rooms have `contact: number` (an ID). The controller originally populated `name` and `number` from the contact document. With Prisma, do a separate lookup:

```typescript
const contactIdList = rooms.map((r: any) => r.contact)
const contacts = await this.contactRepository.findManyByIds(contactIdList)
const contactMap = new Map(contacts.map((c: any) => [c.id, c]))
const enrichedRooms = rooms.map((r: any) => ({
  ...r,
  contact: contactMap.get(r.contact) ?? { id: r.contact },
}))
```

If `PrismaContactDatabaseRepository` does not yet have `findManyByIds`, add a simple `find({ id: { in: ids } })` call using the existing `find(params)` or add a dedicated method. Check task-01 first.

### `closeRoom` — remove Mongoose `room.save()`

Replace:
```javascript
room.status = 'closed'
await room.save()
```
With:
```typescript
await this.roomRepository.close(room._id as string)
```

### `closeRoom` — `room.closed` check

After `findById`, the plain Prisma record has a `closed: boolean` field. Check `record.closed` directly (no Mongoose getter needed).

### Spec rewrite strategy

`DashboardController.spec.ts` currently mocks repositories as `{ model: jest.fn().mockReturnValue(adapter) }`. Replace each mock with the methods the controller actually calls:

```typescript
const licenseeRepository = {
  count: jest.fn().mockResolvedValue(0),
}
const messageRepository = {
  countMessages: jest.fn().mockResolvedValue(0),
  groupByDay: jest.fn().mockResolvedValue([]),
  groupByHour: jest.fn().mockResolvedValue([]),
  avgQueueTime: jest.fn().mockResolvedValue(0),
  avgMessagesPerRoom: jest.fn().mockResolvedValue(0),
  lastMessagePerRoom: jest.fn().mockResolvedValue([]),
}
// etc.
```

Keep all existing test scenarios — only change the mock setup.

## Before You Start

- [ ] Verify all Phase 1 tasks are `complete` in their `status.md` files
- [ ] Pull latest `feature/prisma-migration`
- [ ] Read the full `DashboardController.ts` (all 505 lines)
- [ ] Read the full `DashboardController.spec.ts` to catalogue every existing test scenario
- [ ] Mark this task `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/controllers/DashboardController.ts` | modify | Replace all `.model()` calls with repository methods |
| `src/app/controllers/DashboardController.spec.ts` | modify | Rewrite mocks; preserve all test scenarios |

### Do NOT Modify

- `src/app/repositories/` — Phase 1 complete; read-only for this task
- `src/app/controllers/RoomsController.ts` — owned by task-06

## Implementation Steps

### Step 1: Audit all `.model()` call sites

Run: `grep -n "\.model()" src/app/controllers/DashboardController.ts`

List each line and the repository method that replaces it. Verify the mapping against the table above.

### Step 2: Rewrite `licensees()`

Replace 5 `.model().where(f).countDocuments()` with `await this.licenseeRepository.count(params)`:

```typescript
const [total, active, demo, free, paid] = await Promise.all([
  this.licenseeRepository.count({}),
  this.licenseeRepository.count({ active: true }),
  this.licenseeRepository.count({ licenseKind: 'demo' }),
  this.licenseeRepository.count({ licenseKind: 'free' }),
  this.licenseeRepository.count({ licenseKind: 'paid' }),
])
```

### Step 3: Rewrite `messageVolume()`

```typescript
const licenseeIdInt = licensee ? parseInt(licensee as string, 10) : null
const [perDay, perHour, sentCount, failedCount] = await Promise.all([
  this.messageRepository.groupByDay(licenseeIdInt, startDate, endDate),
  this.messageRepository.groupByHour(licenseeIdInt, startDate, endDate),
  this.messageRepository.countMessages({ sended: true, ...(licenseeIdInt ? { licensee: licenseeIdInt } : {}), createdAt: { gte: startDate, lt: endDate } }),
  this.messageRepository.countMessages({ sended: false, ...(licenseeIdInt ? { licensee: licenseeIdInt } : {}), createdAt: { gte: startDate, lt: endDate } }),
])
```

### Step 4: Rewrite `deliveryRate()`

Three `countMessages` calls with Prisma-native `where` params.

### Step 5: Rewrite `queue()`

```typescript
const [pendingMessages, avgTimeInQueueSeconds] = await Promise.all([
  this.messageRepository.countMessages({ sended: false, destination: 'to-messenger', ...(licenseeIdInt ? { licensee: licenseeIdInt } : {}) }),
  this.messageRepository.avgQueueTime(licenseeIdInt, startDate, endDate),
])
```

### Step 6: Rewrite `conversations()`

```typescript
let contactIds: number[] = []
if (licensee) {
  contactIds = await this.contactRepository.findIds({ licensee: parseInt(licensee as string, 10) })
}
const roomFilter = contactIds.length > 0 ? { contact: { in: contactIds } } : {}

const [startedCount, endedCount, avgMessages, avgDuration] = await Promise.all([
  this.roomRepository.count({ ...roomFilter, createdAt: { gte: startDate, lt: endDate } }),
  this.roomRepository.count({ ...roomFilter, closedAt: { gte: startDate, lt: endDate } }),
  this.messageRepository.avgMessagesPerRoom(licenseeIdInt, startDate, endDate),
  this.roomRepository.avgDuration(contactIds.length > 0 ? contactIds : null, startDate, endDate),
])
```

Note: `roomRepository.count` is inherited from the base `PrismaRepository` via task-01.

### Step 7: Rewrite `contacts()`

```typescript
const licenseeId = user.licensee as any
const [total, inChatbot] = await Promise.all([
  this.contactRepository.count({ licensee: licenseeId }),
  this.contactRepository.count({ licensee: licenseeId, talkingWithChatBot: true }),
])
```

### Step 8: Rewrite `messagesToday()`

Two `countMessages` calls.

### Step 9: Rewrite `messagesPerDay()`

```typescript
const perDay = await this.messageRepository.groupByDay(
  parseInt(String(user.licensee), 10),
  sevenDaysAgo,
  endDate,
)
```

### Step 10: Rewrite `openRooms()`

```typescript
let contactIds: number[] = []
if (licensee) {
  contactIds = await this.contactRepository.findIds({ licensee: parseInt(licensee as string, 10) })
}
const roomParams: Record<string, any> = { closed: false }
if (contactIds.length > 0) roomParams.contact = { in: contactIds }

const roomResults = await this.roomRepository.findManyPaged(roomParams, page, limit)
const hasMore = roomResults.length > limit
const rooms = hasMore ? roomResults.slice(0, limit) : roomResults

// Enrich with contact name/number
const contactIdList = [...new Set(rooms.map((r: any) => r.contact))]
const contacts = await this.contactRepository.find({ id: { in: contactIdList } })
const contactMap = new Map(contacts.map((c: any) => [c.id, c]))

const roomIds = rooms.map((r: any) => r.id as number)
const lastMessages = await this.messageRepository.lastMessagePerRoom(roomIds)
const lastMsgMap: Record<number, any> = {}
for (const m of lastMessages) lastMsgMap[m.room] = m

const roomsWithMessages = rooms
  .map((r: any) => ({
    ...r,
    contact: contactMap.get(r.contact) ?? { id: r.contact },
    lastMessage: lastMsgMap[r.id] ?? null,
  }))
  .filter((r: any) => r.lastMessage !== null)

return res.status(200).json({ rooms: roomsWithMessages, hasMore })
```

### Step 11: Rewrite `closeRoom()`

```typescript
const room = await this.roomRepository.findById(req.params.roomId)
if (!room) return res.status(404).json({ errors: { message: 'Room not found' } })
if ((room as any).closed) return res.status(200).json({ message: 'Already closed' })

await this.roomRepository.close(req.params.roomId)
return res.status(200).json({ message: 'Room closed' })
```

### Step 12: Rewrite `DashboardController.spec.ts`

Replace `buildModelAdapter` and `model: jest.fn()` with direct method mocks. Keep every existing `it(...)` block — only change the mock factories and assertions that depended on the Mongoose chain.

### Step 13: Run tests and lint

```bash
npx jest src/app/controllers/DashboardController.spec.ts --no-coverage
npx eslint src/app/controllers/DashboardController.ts
```

## Testing

**Spec scenarios covered**:
- [ ] Story 1 Scenario 1 — `licensees()` returns counts → spec test updated
- [ ] Story 1 Scenario 2 — `messageVolume()` → spec test updated
- [ ] Story 1 Scenario 3 — `deliveryRate()` → spec test updated
- [ ] Story 1 Scenario 4 — `queue()` → spec test updated
- [ ] Story 1 Scenario 5 — `conversations()` → spec test updated
- [ ] Story 1 Scenario 6 — `contacts()` → spec test updated
- [ ] Story 1 Scenario 7 — `messagesToday()` → spec test updated
- [ ] Story 1 Scenario 8 — `messagesPerDay()` → spec test updated
- [ ] Story 1 Scenario 9 — `openRooms()` → spec test updated
- [ ] Story 1 Scenario 10 — `closeRoom()` → spec test updated

**Additional verification**:
- [ ] `grep -n "\.model()" src/app/controllers/DashboardController.ts` returns zero results
- [ ] All spec tests pass: `npx jest src/app/controllers/DashboardController.spec.ts`
- [ ] `npx eslint src/app/controllers/DashboardController.ts` clean

## Documentation / KB Updates

No KB/doc updates required.

## Completion Criteria

- [ ] Zero `.model()` calls in `DashboardController.ts`
- [ ] All 10 endpoints use Prisma repository methods
- [ ] `DashboardController.spec.ts` fully rewritten; all tests green
- [ ] Lint clean
- [ ] `status.md` updated to `complete`
