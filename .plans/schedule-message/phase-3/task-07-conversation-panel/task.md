# Task: Clock Indicator + onSchedule in ConversationPanel

**Plan**: Schedule Message for Future Delivery
**Phase**: 3
**Task ID**: task-07
**Task Path**: phase-3/task-07-conversation-panel
**Spec References**: Story 1 (P1), Story 3 (P2), FR-005, SC-001
**Depends On**: phase-3/task-06-message-input
**JIRA**: N/A

## Objective

Two changes in `ConversationPanel`:
1. Add `onSchedule?` prop and pass it to `MessageInput`
2. Render a clock icon + formatted scheduled time on message bubbles where `scheduledAt > now && !sended`

## Context

`ConversationPanel` renders the message list and `MessageInput`. After task-06, `MessageInput` accepts `onSchedule?`. This task threads the prop through and adds the visual indicator on scheduled message bubbles.

A scheduled message has `message.scheduledAt` set to a future datetime and `message.sended === false`. The bubble should show the clock icon (`bi-clock`) and the formatted date alongside the normal send time, so the agent knows when it will fire. On cancel, the agent clicks a small "×" which calls `onCancelScheduled(message.id)` — this maps to `ignoreMessage` in the parent.

Client `IMessage` type now has `scheduledAt?: string | null` (from task-02).

## Before You Start

- [ ] `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-3/task-06-message-input/status.md` shows `complete`
- [ ] Check `status.md` — stop if `in-progress` or `complete`
- [ ] Read `ConversationPanel.tsx` and `ConversationPanel.spec.tsx` in full
- [ ] Mark `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `client/src/pages/Chat/components/ConversationPanel.tsx` | modify | `onSchedule?` prop + clock indicator |
| `client/src/pages/Chat/components/ConversationPanel.spec.tsx` | modify | Fill the 1 pending stub + add clock indicator test |
| `client/src/pages/Chat/styles.module.scss` | modify | `.scheduledBadge` style |

### Do NOT Modify

- `client/src/pages/Chat/components/MessageInput.tsx` — complete
- `client/src/pages/Chat/index.tsx` — owned by task-08

## Implementation Steps

### Step 1: Extend `ConversationPanelProps`

```ts
interface ConversationPanelProps {
  room: IRoom | null
  messages: IMessage[]
  onSend: (text: string) => void
  onSchedule?: (text: string, scheduledAt: string) => void
  onCancelScheduled?: (messageId: string) => void
  loading: boolean
  onBack: () => void
  onClose: () => void
}
```

### Step 2: Pass `onSchedule` to `MessageInput`

```tsx
<MessageInput onSend={onSend} onSchedule={onSchedule} disabled={loading || room.closed} />
```

### Step 3: Add scheduled indicator to message bubbles

In the `messages.map(...)` render, after the bubble text and time, add:

```tsx
{message.scheduledAt && !message.sended && new Date(message.scheduledAt) > new Date() && (
  <div className={styles.scheduledBadge}>
    <i className="bi bi-clock" aria-hidden="true" />
    <span>{t('chat.scheduledFor', { time: formatMsgTime(message.scheduledAt) })}</span>
    {onCancelScheduled && (
      <button
        type="button"
        onClick={() => onCancelScheduled(message.id)}
        aria-label={t('chat.cancelScheduledAriaLabel')}
      >
        ×
      </button>
    )}
  </div>
)}
```

Add i18n keys: `chat.scheduledFor`, `chat.cancelScheduledAriaLabel`.

### Step 4: `.scheduledBadge` style

Small pill below the bubble — `font-size: 0.75rem`, muted color, flex row with gap.

### Step 5: Fill pending stubs and add new tests

Implement the 1 existing stub (`delegates onSchedule to MessageInput`). Add one more test: scheduled message bubble shows clock icon and cancel button when `onCancelScheduled` is provided.

## Testing

**Spec scenarios covered**:
- [ ] **Scenario 3 (component level)** — `onSchedule` prop provided → `MessageInput` receives it
- [ ] **Scenario 6** — Message with `scheduledAt > now` and `sended: false` → bubble shows clock icon
- [ ] **Scenario 9** — Cancel button clicked → `onCancelScheduled` called with message id

**Additional**:
- [ ] All 8 existing `ConversationPanel` tests pass unchanged
- [ ] No clock icon when message is already sent (`sended: true`)
- [ ] `cd client && yarn typecheck` passes

## Documentation / KB Updates

- [ ] No KB update required for this task.

## Completion Criteria

- [ ] `onSchedule` threaded to `MessageInput`
- [ ] Clock indicator renders for unsent scheduled messages
- [ ] Cancel button calls `onCancelScheduled`
- [ ] Existing tests unchanged
- [ ] `status.md` updated
