# Feature Specification: Schedule Message for Future Delivery

**Plan**: schedule-message
**Created**: 2026-08-21
**Status**: Final
**Input**: Allow an agent to compose a message in the Chat page and choose a future datetime for it to be delivered, instead of sending immediately. The message is stored and dispatched via BullMQ's native `delay` option at the chosen time.

---

## User Stories *(mandatory)*

### Story 1 — Schedule a Future Message (P1)

As an agent on the Chat page, I want to compose a message and pick a future datetime so the message is delivered automatically at that time — without me needing to be present at the keyboard.

**Why this priority**: Core deliverable. Without this, the feature does not exist.

**Independent Test**: Schedule a message via the UI, verify the BullMQ job is added with a non-zero `delay`, confirm the API returns 200 and the input clears.

**Acceptance Scenarios**:

1. **Given** an open room is selected and the agent has typed text, **When** the agent clicks the clock-icon button in `MessageInput`, **Then** a `datetime-local` picker and an "Agendar" button appear
2. **Given** the datetime picker is visible, **When** the agent selects a datetime in the past, **Then** the "Agendar" button is disabled
3. **Given** the datetime picker is visible and a future datetime is selected, **When** the agent clicks "Agendar", **Then** `scheduleRoomMessage(roomId, text, scheduledAt)` is called with the correct arguments
4. **Given** a valid `scheduledAt` in the request body, **When** `ChatRoomsController.replyToRoom` processes it, **Then** `ingestChatMessage.execute` is called with `delay = Date.parse(scheduledAt) - Date.now()` in milliseconds
5. **Given** `scheduledAt` is in the past (or missing/invalid), **When** the request reaches `ChatRoomsController.replyToRoom`, **Then** it returns 422 with `{ errors: { scheduledAt: 'must be a future datetime' } }`
6. **Given** `delay` is provided to `IngestChatMessage.execute()`, **When** it calls `queueServer.addJob()`, **Then** the delay is passed as part of the BullMQ job options

---

### Story 2 — Confirmation Feedback After Scheduling (P2)

As an agent, after I schedule a message I want the input and picker to clear so I know the action was accepted.

**Why this priority**: UX polish — the feature works without it but agents would not know if scheduling succeeded.

**Independent Test**: After a successful `scheduleRoomMessage` API call, the message text input and datetime picker are empty and the schedule panel is dismissed.

**Acceptance Scenarios**:

7. **Given** a valid scheduled message has been submitted and the API responds with 200, **When** the promise resolves, **Then** the text input is cleared and the datetime picker panel is hidden

---

### Edge Cases

- What if `scheduledAt` is more than 30 days in the future? — Accepted (no upper bound constraint in this plan; BullMQ handles arbitrary delays).
- What if the worker is down when the job fires? — BullMQ retries per the existing `defaultJobOptions.attempts` setting (currently 1).
- What if the room is closed before the scheduled job fires? — The existing `ChatMessage` job will process normally; room-closed guard is already in the chat plugin, not this layer.

---

## Functional Requirements *(mandatory)*

- **FR-001**: The POST `/api/v1/chat/rooms/:roomId/messages` endpoint MUST accept an optional `scheduledAt` field (ISO 8601 string) in the request body
- **FR-002**: The server MUST reject requests where `scheduledAt` is present but resolves to a delay ≤ 0 ms, returning HTTP 422 with `{ errors: { scheduledAt: 'must be a future datetime' } }`
- **FR-003**: When `scheduledAt` is valid, the server MUST pass `delay` (ms) as a BullMQ job option via `queueServer.addJob`
- **FR-004**: The `JobOptions` interface in `src/config/queue.ts` MUST include `delay?: number`; `QueueServer.addJob` MUST forward it to `queue.bull.add()`
- **FR-005**: `IngestChatMessage.execute()` MUST accept an optional `delay?: number` and forward it to `addJob`
- **FR-006**: The `MessageInput` component MUST disable the "Agendar" button when the selected `datetime-local` value is not in the future
- **FR-007**: `scheduleRoomMessage` in `client/src/services/rooms.ts` MUST include `{ 'x-access-token': getToken() }` on the request

---

## Success Criteria *(mandatory)*

- **SC-001**: An agent can schedule a message via the Chat UI and the BullMQ job is added with `delay > 0`
- **SC-002**: The server rejects past `scheduledAt` values with HTTP 422
- **SC-003**: All pre-existing tests for `IngestChatMessage`, `ChatRoomsController`, `MessageInput`, and `ConversationPanel` continue to pass unchanged

---

## Assumptions

- BullMQ's `delay` option is sufficient for scheduling — no separate cron model or `ScheduledMessage` collection is needed
- The `IMessage` Mongoose schema is NOT modified; scheduled messages are stored as `Body` records (same as immediate messages)
- The "Agendar" button label and aria strings will use the existing i18n key pattern (keys added, not hardcoded strings)
- No upper bound on `scheduledAt` is enforced in this plan
- Timezone handling: the `datetime-local` picker returns a local datetime string; the client converts it to an ISO UTC string before sending
