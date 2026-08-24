# Task: Schedule UI in MessageInput

**Plan**: Schedule Message for Future Delivery
**Phase**: 3
**Task ID**: task-06
**Task Path**: phase-3/task-06-message-input
**Spec References**: Story 1 (P1), FR-007, SC-001
**Depends On**: phase-2/task-03-create-message
**JIRA**: N/A

## Objective

Add a clock-icon toggle, a `datetime-local` picker, and an "Agendar" submit button to `MessageInput`. The "Agendar" button is disabled when the picked datetime is not in the future. On submit, calls `onSchedule(text, isoString)` and resets state.

## Context

`MessageInput` (`client/src/pages/Chat/components/MessageInput.tsx`) currently has `onSend` and `disabled` props. We add `onSchedule?: (text: string, scheduledAt: string) => void`. When absent, the clock button is not rendered (backwards compatible).

New internal state: `showSchedule: boolean`, `scheduledAt: string`.

Use `useTranslation` for all new user-visible strings — add i18n keys: `chat.scheduleToggleAriaLabel`, `chat.scheduleDateAriaLabel`, `chat.scheduleSubmitLabel`.

## Before You Start

- [ ] `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-2/task-03-create-message/status.md` shows `complete`
- [ ] Check `status.md` — stop if `in-progress` or `complete`
- [ ] Read `MessageInput.tsx` and `MessageInput.spec.tsx` in full
- [ ] Mark `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `client/src/pages/Chat/components/MessageInput.tsx` | modify | Add schedule toggle, picker, "Agendar" button |
| `client/src/pages/Chat/components/MessageInput.spec.tsx` | modify | Fill in the 5 pending stubs |
| `client/src/pages/Chat/styles.module.scss` | modify | Add `.scheduleRow` style |

### Do NOT Modify

- `client/src/pages/Chat/components/ConversationPanel.tsx` — owned by task-07
- `client/src/pages/Chat/index.tsx` — owned by task-08

## Implementation Steps

### Step 1: Extend props

```ts
interface MessageInputProps {
  onSend: (text: string) => void
  onSchedule?: (text: string, scheduledAt: string) => void
  disabled?: boolean
}
```

### Step 2: Add state

```ts
const [showSchedule, setShowSchedule] = useState(false)
const [scheduledAt, setScheduledAt] = useState('')
```

### Step 3: Helper

```ts
function isScheduleValid() {
  return !!scheduledAt && new Date(scheduledAt).getTime() > Date.now()
}
```

### Step 4: handleSchedule

```ts
function handleSchedule() {
  if (!text.trim() || !isScheduleValid() || !onSchedule) return
  onSchedule(text.trim(), new Date(scheduledAt).toISOString())
  setText('')
  setScheduledAt('')
  setShowSchedule(false)
}
```

### Step 5: JSX additions

Clock toggle (only when `onSchedule` prop exists):
```tsx
{onSchedule && (
  <button type="button" onClick={() => setShowSchedule(s => !s)} aria-label={t('chat.scheduleToggleAriaLabel')}>
    <i className="bi bi-clock" aria-hidden="true" />
  </button>
)}
```

Schedule row (below the input row, when `showSchedule` is true):
```tsx
{showSchedule && (
  <div className={styles.scheduleRow}>
    <input
      type="datetime-local"
      value={scheduledAt}
      onChange={e => setScheduledAt(e.target.value)}
      aria-label={t('chat.scheduleDateAriaLabel')}
      disabled={disabled}
    />
    <button
      type="button"
      onClick={handleSchedule}
      disabled={disabled || !text.trim() || !isScheduleValid()}
      aria-label={t('chat.scheduleSubmitLabel')}
    >
      {t('chat.scheduleSubmitLabel')}
    </button>
  </div>
)}
```

### Step 6: Fill in the 5 pending stubs in `MessageInput.spec.tsx`

The stubs were added during planning. Implement each one now.

## Testing

**Spec scenarios covered**:
- [ ] **Scenario 1** — Clock button clicked → datetime picker appears
- [ ] **Scenario 2** — Past datetime selected → "Agendar" button disabled
- [ ] **Scenario 3** — Future datetime + text → clicking "Agendar" calls `onSchedule` with ISO string
- [ ] **Scenario 6 (partial)** — After `onSchedule` called → text cleared, picker hidden

**Additional**:
- [ ] No clock button when `onSchedule` is absent
- [ ] All 4 existing `MessageInput` tests pass unchanged
- [ ] `cd client && yarn typecheck` passes

## Documentation / KB Updates

- [ ] No KB update required for this task.

## Completion Criteria

- [ ] All 5 spec stubs implemented and passing
- [ ] Existing tests unchanged
- [ ] TypeScript clean
- [ ] `status.md` updated
