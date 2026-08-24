# Task: handleSchedule in Chat/index.tsx

**Plan**: Schedule Message for Future Delivery
**Phase**: 3
**Task ID**: task-08
**Task Path**: phase-3/task-08-chat-page
**Spec References**: Story 1 (P1), Story 3 (P2), SC-001, SC-004
**Depends On**: phase-3/task-05-service, phase-3/task-07-conversation-panel
**JIRA**: N/A

## Objective

Wire `handleSchedule` and `handleCancelScheduled` into `Chat/index.tsx` and pass them to `ConversationPanel`. Run `document-solution` after completion.

## Context

`Chat/index.tsx` already has `handleSend`, `effectiveLicenseeId`, and `selectedRoom`. The scheduling handler constructs the full payload for `POST /resources/messages` using the room context. Cancellation calls `ignoreMessage` from `client/src/services/message.ts`.

Room messages from the Chat UI always use `destination: 'to-messenger'` and `kind: 'text'` for text messages.

## Before You Start

- [ ] `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-3/task-05-service/status.md` shows `complete`
- [ ] Verify `phase-3/task-07-conversation-panel/status.md` shows `complete`
- [ ] Check `status.md` — stop if `in-progress` or `complete`
- [ ] Read `client/src/pages/Chat/index.tsx` in full
- [ ] Mark `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `client/src/pages/Chat/index.tsx` | modify | Add `handleSchedule`, `handleCancelScheduled` |
| `client/src/pages/Chat/index.spec.tsx` | modify or create | Test for schedule and cancel handlers |

### Do NOT Modify

- `client/src/services/message.ts` — complete
- `client/src/pages/Chat/components/ConversationPanel.tsx` — complete

## Implementation Steps

### Step 1: Import `scheduleMessage` and `ignoreMessage`

```ts
import { scheduleMessage, ignoreMessage } from '../../services/message'
```

(`ignoreMessage` may already be imported — check first.)

### Step 2: Add `handleSchedule`

```ts
async function handleSchedule(text: string, scheduledAt: string) {
  if (!selectedRoom || !effectiveLicenseeId) return
  try {
    await scheduleMessage({
      licensee: effectiveLicenseeId,
      contact: (selectedRoom.contact as any)._id ?? String(selectedRoom.contact),
      destination: 'to-messenger',
      kind: 'text',
      text,
      scheduledAt,
    })
    // Message will appear in the list after reload or socket event
    loadMessages(selectedRoom._id)
  } catch {
    // Silent failure — MessageInput has already cleared; a toast can be added later
  }
}
```

### Step 3: Add `handleCancelScheduled`

```ts
async function handleCancelScheduled(messageId: string) {
  try {
    await ignoreMessage(messageId)
    setMessages(prev => prev.filter(m => m.id !== messageId))
  } catch {
    // Silent failure
  }
}
```

### Step 4: Pass to `ConversationPanel`

```tsx
<ConversationPanel
  room={selectedRoom}
  messages={messages}
  onSend={handleSend}
  onSchedule={handleSchedule}
  onCancelScheduled={handleCancelScheduled}
  loading={messagesLoading}
  onBack={handleBack}
  onClose={handleClose}
/>
```

### Step 5: Tests

Add or create `Chat/index.spec.tsx`:
- Mock `scheduleMessage` — verify called with correct payload when `handleSchedule` fires
- Mock `ignoreMessage` — verify called with correct messageId; message removed from state

### Step 6: Run `document-solution`

After all tests pass, run `document-solution` to create a KB entry for the schedule-message pattern. Then run `check-kb-index`.

## Testing

**Spec scenarios covered**:
- [ ] **Scenario 3 (page level)** — `handleSchedule` called → `scheduleMessage` called with correct payload
- [ ] **Scenario 9 (page level)** — `handleCancelScheduled` called → `ignoreMessage` called → message removed from state

**Additional**:
- [ ] `handleSend` (immediate flow) unchanged
- [ ] `cd client && yarn typecheck` passes
- [ ] Full test suite: `npx jest && cd client && npx vitest run`
- [ ] `pre-commit-check` passes
- [ ] Manual smoke: start dev server, select a room, click clock, pick a future datetime, click "Agendar" — verify network request to `POST /resources/messages` with `scheduledAt`, bubble appears with clock icon

## Documentation / KB Updates

- [ ] Run `document-solution` — create KB entry covering: Prisma `scheduledAt` field, `CreateMessage` delay dispatch, BullMQ delay option, worker recovery scan, frontend clock indicator pattern
- [ ] Run `check-kb-index` after KB entry is created

## Completion Criteria

- [ ] Scenarios 3 and 9 page-level tests pass
- [ ] Full test suite green
- [ ] `pre-commit-check` passes
- [ ] Single PR opened for the plan
- [ ] `document-solution` + `check-kb-index` run
- [ ] `status.md` updated
