# Feature Specification: Prisma Dashboard & Rooms Migration

**Plan**: prisma-dashboard-rooms
**Created**: 2026-08-12
**Status**: Final
**Input**: Migrate DashboardController and RoomsController from Mongoose .model() API to Prisma/PostgreSQL queries.

---

## User Stories

### Story 1 — Dashboard panels load without errors (P1)

As a logged-in super/admin user, I can open any dashboard panel (licensees, message volume, delivery rate, queue, conversations, contacts, messages today, messages per day, open rooms) and receive a 200 response with the expected data shape — no 500 "model is not a function" errors.

**Why this priority**: Every dashboard endpoint is currently broken for all users using Prisma repositories.

**Independent Test**: Call each of the 10 dashboard endpoints with a valid auth token and verify 200 + correct JSON shape.

**Acceptance Scenarios**:

1. **Given** a super user, **When** GET `/dashboard/licensees`, **Then** 200 `{ total, active, by_kind: { demo, free, paid } }`
2. **Given** an admin user, **When** GET `/dashboard/message-volume?startDate=X&endDate=Y`, **Then** 200 `{ per_day, per_hour, peak_throughput, avg_transfer_rate }`
3. **Given** an admin user, **When** GET `/dashboard/delivery-rate`, **Then** 200 `{ sent_today, failed_today, failed_total, sent_pct, failed_pct }`
4. **Given** an admin user, **When** GET `/dashboard/queue`, **Then** 200 `{ pending_messages, avg_time_in_queue_seconds }`
5. **Given** an admin user, **When** GET `/dashboard/conversations`, **Then** 200 `{ started_today, ended_today, avg_messages_per_conversation, avg_duration_seconds }`
6. **Given** an admin user (not super), **When** GET `/dashboard/contacts`, **Then** 200 `{ total, in_chatbot }`
7. **Given** an admin user, **When** GET `/dashboard/messages-today`, **Then** 200 `{ sent_today, failed_today, sent_pct, failed_pct }`
8. **Given** an admin user, **When** GET `/dashboard/messages-per-day`, **Then** 200 `{ per_day: [...] }`
9. **Given** a super user with `?licensee=X`, **When** GET `/dashboard/open-rooms`, **Then** 200 `{ rooms: [...], hasMore }`
10. **Given** an open room, **When** POST `/dashboard/rooms/:id/close`, **Then** 200 `{ message: 'Room closed' }`

---

### Story 2 — Rooms list with last messages (P1)

As a logged-in agent/admin, I can load the rooms index (`GET /rooms`) and see each room enriched with its most recent non-system message.

**Why this priority**: The rooms list is the primary agent workspace — broken = agents can't work.

**Independent Test**: `GET /rooms` returns 200 `{ rooms, hasMore }` with `lastMessage` on each room.

**Acceptance Scenarios**:

1. **Given** an admin user with no department assignments, **When** GET `/rooms`, **Then** 200 `{ rooms, hasMore }` — rooms belong to the user's licensee
2. **Given** rooms with messages, **When** GET `/rooms`, **Then** each room in the result has `lastMessage` with `text` and `createdAt`
3. **Given** rooms with no non-system messages, **When** GET `/rooms`, **Then** those rooms have `lastMessage: null`

---

### Story 3 — Room messages with pagination (P2)

As a logged-in agent, I can load messages for a specific room with cursor-style pagination.

**Acceptance Scenarios**:

1. **Given** a room with 35 messages, **When** GET `/rooms/:id/messages?page=1`, **Then** 200 `{ messages: [30 items], total: 35, page: 1, hasMore: true }`
2. **Given** a room, **When** GET `/rooms/:id/messages?page=2`, **Then** correct offset applied, `hasMore: false`
3. **Given** a room the user's licensee does not own, **When** GET `/rooms/:id/messages`, **Then** 403

---

### Story 4 — Close a room (P2)

As an agent or admin, I can close an open room via the API.

**Acceptance Scenarios**:

1. **Given** an open room, **When** POST `/rooms/:id/close`, **Then** room `status = 'closed'`, `closed = true`, `closedAt` set, 200 `{ message: 'Room closed' }`
2. **Given** an already-closed room, **When** POST `/rooms/:id/close`, **Then** 200 `{ message: 'Already closed' }` — idempotent
3. **Given** a non-existent room ID, **When** POST `/rooms/:id/close`, **Then** 404

---

### Edge Cases

- What if `roomIds` array passed to `lastMessagePerRoom` is empty? Return `{}` without querying.
- What if the date range spans 0 hours? `avg_transfer_rate` and `avg_time_in_queue_seconds` return 0, not NaN.
- What if `contacts` result for a licensee filter is empty? Room queries return 0 counts gracefully.
- What if `department.users` JSON stores integers vs strings? Executing agent must verify the format and adapt `array_contains` call.

---

## Functional Requirements

- **FR-001**: `PrismaRepository<T>` MUST expose a `count(params)` method that delegates to `this.delegate().count({ where: this.toWhere(params) })`
- **FR-002**: `PrismaMessageDatabaseRepository` MUST provide: `countMessages(params)`, `groupByDay(params, start, end)`, `groupByHour(params, start, end)`, `avgQueueTime(params, start, end)`, `avgMessagesPerRoom(params, start, end)`, `lastMessagePerRoom(roomIds)`, `countForRoom(roomId)`, `findPagedForRoom(roomId, page, limit)`
- **FR-003**: `PrismaRoomDatabaseRepository` MUST provide: `findById(id)`, `close(id)`, `findOpenForContact(contactId)`, `findForLicensee(licenseeId, opts)`, `findManyPaged(params, page, limit)`, `countRooms(params)`, `avgDuration(contactIds, start, end)`
- **FR-004**: `PrismaContactDatabaseRepository` MUST provide `findIds(params)` returning `number[]`
- **FR-005**: `PrismaDepartmentDatabaseRepository` MUST provide `findIds(params)` filtering `users` JSON array via Prisma or `$queryRaw`
- **FR-006**: `DashboardController` MUST contain zero calls to `.model()` after this plan
- **FR-007**: `RoomsController` MUST contain zero calls to `.model()` after this plan
- **FR-008**: Date grouping queries MUST use PostgreSQL `TO_CHAR("createdAt", ...)` via `$queryRaw`
- **FR-009**: Duration/time averages MUST use `EXTRACT(EPOCH FROM (...))` via `$queryRaw`
- **FR-010**: The system-close exclusion filter (`NOT (kind = 'text' AND text = 'Chat encerrado pelo agente')`) MUST be applied as a SQL `WHERE` clause in all analytics queries, matching current behaviour

---

## Success Criteria

- **SC-001**: All 10 dashboard endpoints return 200 with correct shape when called with valid auth; no 500 errors remain
- **SC-002**: `GET /rooms`, `GET /rooms/:id/messages`, and `POST /rooms/:id/close` work end-to-end
- **SC-003**: `grep -rn "\.model()" src/app/controllers/DashboardController.ts src/app/controllers/RoomsController.ts` returns zero results
- **SC-004**: All existing tests pass; new unit tests cover every new repository method and every controller action
- **SC-005**: `npx eslint src/app/repositories/ src/app/controllers/DashboardController.ts src/app/controllers/RoomsController.ts` reports 0 errors

---

## Assumptions

- PostgreSQL is the only database in use; no MongoDB queries remain in scope
- `Department.users` is a JSON array of user IDs (format — integer or string — must be verified by the executing agent before writing the filter)
- The `Room` Prisma model has no `@relation` directives; cross-table joins are done via separate queries or `$queryRaw`
- Redis caching in `DashboardController._cached()` stays unchanged
- `RepositoryMemory` implementations are not touched by this plan
- No Prisma schema migrations are needed (all columns already exist)
