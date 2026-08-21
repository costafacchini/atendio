# Task: Add onSchedule prop to ConversationPanel

**Plan**: Schedule Message for Future Delivery
**Phase**: 3
**Task ID (phase-local)**: task-06
**Task Path**: phase-3/task-06-conversation-panel
**Spec References**: Story 1 (P1), FR-006
**Depends On**: phase-3/task-05-message-input
**JIRA**: N/A

## Objective

Add `onSchedule?: (text: string, scheduledAt: string) => void` to `ConversationPanel` and pass it through to `MessageInput` so the parent (`Chat/index.tsx`) can provide the handler.

## Context

`ConversationPanel` (`client/src/pages/Chat/components/ConversationPanel.tsx`) renders `<MessageInput onSend={onSend} disabled={...} />`. After task-05, `MessageInput` accepts an optional `onSchedule` prop. `ConversationPanel` needs to accept and thread it through without owning any scheduling logic.

This is a thin prop-drilling task — the component itself gains no new logic.

Test pattern: Vitest + RTL. See `ConversationPanel.spec.tsx` for conventions.

## Before You Start

- [ ] Switch to main and pull latest: `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-3/task-05-message-input/status.md` shows `complete`
- [ ] Check this task's `status.md` — if already `in-progress` or `complete`, stop and investigate
- [ ] Read `client/src/pages/Chat/components/ConversationPanel.tsx` and `ConversationPanel.spec.tsx`
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `client/src/pages/Chat/components/ConversationPanel.tsx` | modify | Add `onSchedule?` prop, thread to `MessageInput` |
| `client/src/pages/Chat/components/ConversationPanel.spec.tsx` | modify | Add test for `onSchedule` threading |

### Do NOT Modify

- `client/src/pages/Chat/components/MessageInput.tsx` — owned by phase-3/task-05-message-input (complete before this task starts)
- `client/src/pages/Chat/index.tsx` — owned by phase-3/task-07-chat-page

## Implementation Steps

### Step 1: Update `ConversationPanelProps`

```ts
interface ConversationPanelProps {
  room: IRoom | null
  messages: IMessage[]
  onSend: (text: string) => void
  onSchedule?: (text: string, scheduledAt: string) => void
  loading: boolean
  onBack: () => void
  onClose: () => void
}
```

### Step 2: Pass `onSchedule` to `MessageInput`

Update the `<MessageInput>` render:

```tsx
<MessageInput onSend={onSend} onSchedule={onSchedule} disabled={loading || room.closed} />
```

### Step 3: Update tests

Add one test to `ConversationPanel.spec.tsx`:
- When `onSchedule` prop is provided and the clock button is clicked and a future datetime is entered, the "Agendar" button calls `onSchedule`

Note: This test will need to simulate a future datetime. Set `scheduledAt` to `new Date(Date.now() + 60_000).toISOString().slice(0, 16)` as the picker value.

## Testing

**Spec scenarios covered**:
- [ ] **Scenario 3 (component level)** — Given `onSchedule` prop is provided, When clock is toggled and a future date entered, Then clicking "Agendar" calls `onSchedule` via delegation to `MessageInput`
  → `ConversationPanel.spec.tsx` — `'delegates onSchedule to MessageInput'`

**Additional verification**:
- [ ] All eight existing `ConversationPanel` tests pass unchanged
- [ ] When `onSchedule` is not provided, no clock button appears (inherited from MessageInput)
- [ ] `yarn typecheck` (client) passes
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

- [ ] No KB/doc updates required — prop drilling is a standard React pattern.

## Completion Criteria

- [ ] `onSchedule` prop accepted and threaded to `MessageInput`
- [ ] Delegation test passes
- [ ] Existing tests unchanged
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- task-07 (`Chat/index.tsx`) depends on this task completing first — do not start task-07 until ConversationPanel's `onSchedule` prop is merged.
