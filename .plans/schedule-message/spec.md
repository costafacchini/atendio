# Feature Specification: Schedule Message for Future Delivery

**Plan**: schedule-message
**Created**: 2026-08-21
**Revised**: 2026-08-24
**Status**: Final
**Input**: Allow an agent to compose a message in the Chat page and choose a future datetime for it to be delivered. The message is stored immediately in the `Message` table (visible in the chat timeline), and dispatched via BullMQ's native `delay` option at the chosen time.

---

## User Stories *(mandatory)*

### Story 1 — Schedule a Future Message (P1)

As an agent on the Chat page, I want to compose a message, pick a future datetime, and click "Agendar" so the message is delivered automatically at that time — appearing in the chat timeline with a clock icon until it is sent.

**Why this priority**: Core deliverable. Without this the feature does not exist.

**Independent Test**: Schedule a message via the Chat UI. Verify the `Message` record is created immediately with `scheduledAt` set, the timeline shows a clock indicator, and the BullMQ job fires at the correct time.

**Acceptance Scenarios**:

1. **Given** an open room is selected and the agent has typed text, **When** the agent clicks the clock-icon button in `MessageInput`, **Then** a `datetime-local` picker and an "Agendar" button appear
2. **Given** the datetime picker is visible, **When** the agent selects a datetime in the past, **Then** the "Agendar" button is disabled
3. **Given** the datetime picker is visible and a future datetime is selected, **When** the agent clicks "Agendar", **Then** `POST /resources/messages` is called with `{ licensee, contact, destination, kind, text, scheduledAt }` and the auth header
4. **Given** a valid `scheduledAt` (ISO string) in the `POST /resources/messages` request body, **When** `CreateMessage.execute` runs, **Then** a `Message` record is created with `scheduledAt` set and a BullMQ job is queued with `delay = Date.parse(scheduledAt) - Date.now()`
5. **Given** `scheduledAt` resolves to a delay ≤ 0, **When** `CreateMessage.execute` runs, **Then** a 422 is returned with `{ errors: { scheduledAt: 'must be a future datetime' } }`
6. **Given** the `Message` record has `scheduledAt` in the future and `sended: false`, **When** it is returned by the room messages API, **Then** the frontend renders it with a clock icon and the formatted scheduled time

---

### Story 2 — Recover Scheduled Messages After Redis Restart (P1)

As a system operator, I want scheduled messages to be re-enqueued automatically if Redis restarts so no message is silently lost.

**Why this priority**: Without recovery, Redis restart silently drops all pending scheduled messages. Combined with Story 1 it forms the minimum viable reliability guarantee.

**Independent Test**: Stop Redis, restart it, restart the worker, verify all pending scheduled messages are re-enqueued and eventually sent.

**Acceptance Scenarios**:

7. **Given** Redis has restarted (all delayed jobs lost), **When** the worker process starts, **Then** every `Message` with `scheduledAt > now` and `sended: false` and `ignored: false` is re-enqueued on the correct queue with `delay = scheduledAt - now`
8. **Given** a scheduled message has been cancelled (`ignored: true`) before the worker restarts, **When** the recovery runs, **Then** that message is NOT re-enqueued

---

### Story 3 — Cancel a Scheduled Message (P2)

As an agent, I want to cancel a scheduled message from the Chat timeline so it is not sent.

**Why this priority**: Agents make mistakes; cancellation prevents unwanted messages from being sent hours later.

**Independent Test**: Click cancel on a scheduled message in the chat timeline. The message is marked `ignored: true`. When the BullMQ job fires, it sees `ignored: true` and skips the send.

**Acceptance Scenarios**:

9. **Given** a scheduled message is visible in the chat timeline with a clock icon, **When** the agent clicks "Cancelar", **Then** `POST /resources/messages/:id/ignore` is called and the message is removed from the timeline
10. **Given** a cancelled message's job fires (BullMQ delayed job), **When** `SendMessageToMessenger` (or equivalent) runs, **Then** it detects `message.ignored === true` and returns without sending

---

### Edge Cases

- What if `scheduledAt` is more than 30 days in the future? — Accepted; no upper bound in this plan.
- What if the room is closed before the scheduled job fires? — The plugin's `sendMessage` handles gracefully (no action or a no-op); no special handling needed at this layer.
- What if `SendMessageToChatbot` recovery needs `url`/`token`? — Out of scope for this plan; chatbot recovery requires looking up chatbot credentials and will be addressed as a follow-up. Recovery for `to-messenger` and `to-chat` is in scope.

---

## Functional Requirements *(mandatory)*

- **FR-001**: `POST /resources/messages` MUST accept an optional `scheduledAt` field (ISO 8601 string)
- **FR-002**: `CreateMessage.execute` MUST reject `scheduledAt` values that resolve to `delay ≤ 0 ms` with HTTP 422
- **FR-003**: When `scheduledAt` is valid, `CreateMessage.execute` MUST pass `delay` (ms) as a BullMQ job option and dispatch to the correct queue based on `destination`: `to-messenger` → `send-message-to-messenger`; `to-chat` → `send-message-to-chat`
- **FR-004**: `JobOptions` in `src/config/queue.ts` MUST include `delay?: number`; `QueueServer.addJob` MUST forward it to `queue.bull.add()`
- **FR-005**: The Prisma `Message` schema MUST include `scheduledAt DateTime?`; `IMessage` and the client `IMessage` type MUST include `scheduledAt?: string | Date | null`
- **FR-006**: On `worker.ts` startup, the recovery function MUST re-enqueue all `Message` records where `scheduledAt > now && sended: false && ignored: false` with the correct queue and remaining delay
- **FR-007**: The `MessageInput` "Agendar" button MUST be disabled when the selected datetime is not in the future
- **FR-008**: `scheduleMessage` in `client/src/services/message.ts` MUST include `{ 'x-access-token': getToken() }` on the request
- **FR-009**: `SendMessageToMessenger` (and equivalent services) MUST check `message.ignored === true` and return early without sending

---

## Success Criteria *(mandatory)*

- **SC-001**: An agent can schedule a message via the Chat UI; the `Message` record appears in the timeline with a clock icon, and the BullMQ job is queued with `delay > 0`
- **SC-002**: The server rejects past `scheduledAt` values with HTTP 422
- **SC-003**: After a Redis restart, the worker startup recovery re-enqueues all pending scheduled messages
- **SC-004**: All pre-existing tests for `CreateMessage`, `MessagesController`, `MessageInput`, and `ConversationPanel` continue to pass unchanged

---

## Assumptions

- Scheduling entry point is `POST /resources/messages` (not the room-specific endpoint)
- The `Message` record is created immediately at request time so the frontend can display it with a clock icon before the job fires
- Timezone handling: the `datetime-local` picker returns local time; the client converts to ISO UTC before sending
- `to-chatbot` destination recovery (requires url/token lookup) is explicitly out of scope
- Cancellation reuses the existing `POST /resources/messages/:id/ignore` endpoint; no new delete endpoint
- The `send-message-to-*` job handlers already check `ignored` or are guarded at the service layer; FR-009 may only require confirming existing behaviour rather than new code
