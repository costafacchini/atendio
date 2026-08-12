# Task: Rewrite RoomsController

**Plan**: prisma-dashboard-rooms
**Phase**: 2
**Task ID**: task-06
**Task Path**: phase-2/task-06-rooms-controller
**Spec References**: Story 2 (P1), Story 3 (P2), Story 4 (P2) — SC-002, SC-003, FR-007
**Depends On**: phase-1/task-02-message-analytics, phase-1/task-03-room-queries, phase-1/task-04-department-findids
**JIRA**: N/A

## Objective

Replace every `.model()` call in `RoomsController` with Prisma repository methods from Phase 1, and rewrite `RoomsController.spec.ts` to mock those methods directly.

## Context

`src/app/controllers/RoomsController.ts` has 4 action methods. The `.model()` calls by method:

| Method | `.model()` calls | Replacement |
|--------|------------------|-------------|
| `index` | `departmentRepository.model().find(...)` | `departmentRepository.findIds(params)` |
| `index` | `messageRepository.model().aggregate([...lastMsg])` | `messageRepository.lastMessagePerRoom(roomIds)` |
| `messages` | `messageRepository.model().countDocuments(...)` | `messageRepository.countForRoom(roomId)` |
| `messages` | `messageRepository.model().find(...).sort().skip().limit().lean()` | `messageRepository.findPagedForRoom(roomId, page, limit)` |
| `closeRoom` | `roomRepository.model().findById(id)` | `roomRepository.findById(id)` |
| `closeRoom` | `room.status = 'closed'; room.save()` | `roomRepository.close(id)` |

### `index` — department IDs and room listing

Current flow:
1. `departmentRepository.model().find({ users: userId, licensee, active: true }).select('_id').lean()` → gets agent's department IDs
2. `roomRepository.findForLicensee(licenseeId, { departmentIds, page, limit })` → already a method call
3. `messageRepository.model().aggregate([...lastMsg])` → last message per room

New flow:
1. `departmentRepository.findIds({ users: userId, licensee: licenseeId, active: true })`
2. `roomRepository.findForLicensee(licenseeId, { departmentIds, contactIds, page, limit })` — note: `findForLicensee` in task-03 was designed to accept `contactIds` for licensee scoping; the controller must fetch them first if needed
3. `messageRepository.lastMessagePerRoom(roomIds)`

**However**: `RoomsController.index` does not filter by licensee in the room query directly — it passes `licenseeId` to `findForLicensee`. Check task-03's implementation of `findForLicensee` — if it accepts `contactIds` in opts, the controller may need to first call `contactRepository.findIds({ licensee: licenseeId })` and pass them.

Read `src/app/repositories/room.ts` after task-03 is complete to understand the exact signature.

### `index` — lastMessage enrichment

After `findForLicensee`, rooms have `contact: number`. Current Mongoose code does not populate contact here (no `.populate()` in the index). So only `lastMessage` enrichment is needed:

```typescript
const roomIds = rooms.map((r: any) => r.id as number)
const lastMessages = await this.messageRepository.lastMessagePerRoom(roomIds)
const lastMsgMap: Record<number, any> = {}
for (const m of lastMessages) lastMsgMap[m.room] = m

const roomsWithLast = rooms.map((r: any) => ({
  ...r,
  lastMessage: lastMsgMap[r.id] ?? null,
}))
```

### `messages` — pagination

```typescript
const roomId = (room as any).id as number  // integer id from Prisma record
const total = await this.messageRepository.countForRoom(roomId)
const messages = await this.messageRepository.findPagedForRoom(roomId, page, limit)
const hasMore = messages.length > limit
const pageMessages = hasMore ? messages.slice(0, limit) : messages
return res.status(200).json({ messages: pageMessages, total, page, hasMore })
```

### `closeRoom`

```typescript
const room = await this.roomRepository.findById(req.params.roomId)
if (!room) return res.status(404).json({ errors: { message: 'Room not found' } })

if (user.role !== 'super') {
  const userLicenseeId = this._resolveLicenseeId(user)?.toString()
  const contact = await this.contactRepository.findFirst({ _id: (room as any).contact })
  const roomLicenseeId = (contact?.licensee as any)?._id?.toString() ?? contact?.licensee?.toString() ?? null
  if (userLicenseeId !== roomLicenseeId) {
    return res.status(403).json({ errors: { message: 'Forbidden' } })
  }
}

if ((room as any).closed) return res.status(200).json({ message: 'Already closed' })

await this.roomRepository.close(req.params.roomId)
return res.status(200).json({ message: 'Room closed' })
```

### `_resolveUser` — licensee relation

`RoomsController._resolveUser` calls `findFirst({ _id: userId }, ['licensee'])`. The second argument is `relations`. Verify the `PrismaUserDatabaseRepository.findFirst` supports this; if not, the licensee may need to be fetched separately. This is pre-existing behaviour — check and adapt if needed.

### Spec rewrite strategy

`RoomsController.spec.ts` currently mocks `departmentRepository.model()` and `messageRepository.model()`. Replace:

```typescript
// Old
const departmentRepository = {
  model: jest.fn().mockReturnValue(buildDepartmentModelAdapter()),
}
// New
const departmentRepository = {
  findIds: jest.fn().mockResolvedValue([]),
}

// Old
const messageRepository = {
  model: jest.fn().mockReturnValue(buildMessageModelAdapter()),
}
// New
const messageRepository = {
  lastMessagePerRoom: jest.fn().mockResolvedValue([]),
  countForRoom: jest.fn().mockResolvedValue(0),
  findPagedForRoom: jest.fn().mockResolvedValue([]),
}
```

Keep all existing test scenarios — only change mock setup.

## Before You Start

- [ ] Verify tasks 02, 03, 04 are all `complete` in their `status.md`
- [ ] Pull latest `feature/prisma-migration`
- [ ] Read the full `RoomsController.ts` (205 lines)
- [ ] Read the full `RoomsController.spec.ts` to catalogue every test scenario
- [ ] Read `PrismaRoomDatabaseRepository.findForLicensee` signature in `room.ts` (as implemented by task-03)
- [ ] Mark this task `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/controllers/RoomsController.ts` | modify | Replace all `.model()` calls |
| `src/app/controllers/RoomsController.spec.ts` | modify | Rewrite mocks; preserve all test scenarios |

### Do NOT Modify

- `src/app/repositories/` — Phase 1 complete; read-only for this task
- `src/app/controllers/DashboardController.ts` — owned by task-05

## Implementation Steps

### Step 1: Audit all `.model()` call sites

Run: `grep -n "\.model()" src/app/controllers/RoomsController.ts`

### Step 2: Rewrite `index()`

Replace department model call with `findIds`, and message model call with `lastMessagePerRoom`. See Context above for the full pattern.

### Step 3: Rewrite `messages()`

Replace `countDocuments` and `find().sort().skip().limit().lean()` with `countForRoom` and `findPagedForRoom`.

### Step 4: Rewrite `closeRoom()`

Replace `findById` and `room.save()` with `findById` and `close`. See Context above.

### Step 5: Rewrite `RoomsController.spec.ts`

Replace all `model: jest.fn()` mocks with direct method mocks. Preserve all `it(...)` blocks.

### Step 6: Run tests and lint

```bash
npx jest src/app/controllers/RoomsController.spec.ts --no-coverage
npx eslint src/app/controllers/RoomsController.ts
```

## Testing

**Spec scenarios covered**:
- [ ] Story 2 Scenario 1 — `index()` returns rooms with lastMessage → spec updated
- [ ] Story 2 Scenario 2 — rooms have lastMessage from `lastMessagePerRoom` → spec updated
- [ ] Story 2 Scenario 3 — rooms with no non-system messages have `lastMessage: null` → spec updated
- [ ] Story 3 Scenario 1 — `messages()` paginates correctly → spec updated
- [ ] Story 3 Scenario 2 — page 2 applies offset → spec updated
- [ ] Story 3 Scenario 3 — forbidden if wrong licensee → spec updated
- [ ] Story 4 Scenario 1 — `closeRoom()` closes room → spec updated
- [ ] Story 4 Scenario 2 — already-closed room returns 200 idempotently → spec updated
- [ ] Story 4 Scenario 3 — non-existent room returns 404 → spec updated

**Additional verification**:
- [ ] `grep -n "\.model()" src/app/controllers/RoomsController.ts` returns zero results
- [ ] All spec tests pass: `npx jest src/app/controllers/RoomsController.spec.ts`
- [ ] `npx eslint src/app/controllers/RoomsController.ts` clean

## Documentation / KB Updates

No KB/doc updates required.

## Completion Criteria

- [ ] Zero `.model()` calls in `RoomsController.ts`
- [ ] All 4 endpoints use Prisma repository methods
- [ ] `RoomsController.spec.ts` fully rewritten; all tests green
- [ ] Lint clean
- [ ] `status.md` updated to `complete`
