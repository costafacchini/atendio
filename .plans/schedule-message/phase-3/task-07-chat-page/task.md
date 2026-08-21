# Task: Implement handleSchedule in Chat/index.tsx

**Plan**: Schedule Message for Future Delivery
**Phase**: 3
**Task ID (phase-local)**: task-07
**Task Path**: phase-3/task-07-chat-page
**Spec References**: Story 1 (P1), Story 2 (P2), FR-001, SC-001
**Depends On**: phase-3/task-04-service, phase-3/task-06-conversation-panel
**JIRA**: N/A

## Objective

Add `handleSchedule(text, scheduledAt)` to `Chat/index.tsx` and pass it to `ConversationPanel` as `onSchedule`. The handler calls `scheduleRoomMessage` from the rooms service and handles error by leaving the message visible (no optimistic removal).

## Context

`Chat/index.tsx` is the page orchestrator. It already has `handleSend(text)` which calls `sendRoomMessage`. The pattern for `handleSchedule` is simpler: no optimistic update (the message won't appear in the list until BullMQ dispatches it), so the handler just calls the service and ignores success (the `MessageInput` clears itself in task-05).

`ConversationPanel` now accepts `onSchedule?` (task-06). `Chat/index.tsx` passes `handleSchedule` there.

The `scheduleRoomMessage` import comes from `'../../services/rooms'` (task-04).

## Before You Start

- [ ] Switch to main and pull latest: `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-3/task-04-service/status.md` shows `complete`
- [ ] Verify `phase-3/task-06-conversation-panel/status.md` shows `complete`
- [ ] Check this task's `status.md` — if already `in-progress` or `complete`, stop and investigate
- [ ] Read `client/src/pages/Chat/index.tsx` (full file) before editing
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `client/src/pages/Chat/index.tsx` | modify | Add `handleSchedule`, pass to `ConversationPanel` |
| `client/src/pages/Chat/index.spec.tsx` | modify or create | Add test for `handleSchedule` |

### Do NOT Modify

- `client/src/services/rooms.ts` — owned by phase-3/task-04-service (complete before this task starts)
- `client/src/pages/Chat/components/ConversationPanel.tsx` — owned by phase-3/task-06-conversation-panel (complete before this task starts)

## Implementation Steps

### Step 1: Import `scheduleRoomMessage`

Add to the existing import from `'../../services/rooms'`:

```ts
import { getRooms, getRoomMessages, sendRoomMessage, scheduleRoomMessage, closeRoom } from '../../services/rooms'
```

### Step 2: Add `handleSchedule`

```ts
async function handleSchedule(text: string, scheduledAt: string) {
  if (!selectedRoom) return
  try {
    await scheduleRoomMessage(selectedRoom._id, text, scheduledAt)
  } catch {
    // Schedule failed silently — MessageInput does not optimistically add the message
    // so there is nothing to roll back
  }
}
```

### Step 3: Pass `onSchedule` to `ConversationPanel`

```tsx
<ConversationPanel
  room={selectedRoom}
  messages={messages}
  onSend={handleSend}
  onSchedule={handleSchedule}
  loading={messagesLoading}
  onBack={handleBack}
  onClose={handleClose}
/>
```

### Step 4: Check/create `index.spec.tsx`

If `client/src/pages/Chat/index.spec.tsx` exists, add a test case for `handleSchedule`. If it does not exist, create a minimal spec that covers the scheduling path only (do not duplicate existing coverage).

Test: mock `scheduleRoomMessage` and verify it is called with the correct arguments when `handleSchedule` is invoked with a future ISO string.

## Testing

**Spec scenarios covered**:
- [ ] **Scenario 3 (page level)** — Given `selectedRoom` is set, When `handleSchedule(text, scheduledAt)` is called, Then `scheduleRoomMessage(roomId, text, scheduledAt)` is called with the correct arguments
  → `Chat/index.spec.tsx` — `'calls scheduleRoomMessage with roomId, text and scheduledAt'`

**Additional verification**:
- [ ] `handleSend` (existing flow) is unchanged
- [ ] `yarn typecheck` (client) passes
- [ ] `pre-commit-check` passes
- [ ] Manual smoke: start dev server, select a room, toggle the clock icon, pick a future time, click "Agendar" — verify network request is sent and input clears

## Documentation / KB Updates

- [ ] After this task completes the full plan, run `document-solution` to create a KB entry for the schedule-message pattern (BullMQ delay + client datetime picker) so future agents can find it.
- [ ] Run `check-kb-index` after creating the KB entry.

## Completion Criteria

- [ ] `handleSchedule` is wired and calls `scheduleRoomMessage`
- [ ] Scenario-3 test at page level passes
- [ ] Existing send-now flow unchanged
- [ ] All tests across the plan pass (`npx jest && cd client && npx vitest run`)
- [ ] `pre-commit-check` passes
- [ ] Single PR opened for the full plan
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- This is the final task; no parallel siblings. Ensure tasks 04 and 06 are both `complete` before starting.
