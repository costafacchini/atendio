# Task: Schedule UI in MessageInput

**Plan**: Schedule Message for Future Delivery
**Phase**: 3
**Task ID (phase-local)**: task-05
**Task Path**: phase-3/task-05-message-input
**Spec References**: Story 1 (P1), Story 2 (P2), FR-006, SC-001
**Depends On**: phase-2/task-02-ingest-schedule, phase-2/task-03-controller-schedule
**JIRA**: N/A

## Objective

Add a clock-icon toggle button, a `datetime-local` picker, and an "Agendar" submit button to `MessageInput`. The "Agendar" button is disabled when the selected datetime is not in the future. Calls a new `onSchedule(text, scheduledAt)` prop on submit. Clears the input and hides the picker on success.

## Context

`MessageInput` (`client/src/pages/Chat/components/MessageInput.tsx`) currently has:
- `onSend: (text: string) => void`
- `disabled?: boolean`

We add:
- `onSchedule?: (text: string, scheduledAt: string) => void` — optional; when absent, the clock button is not shown (keeps the component usable in contexts that don't support scheduling)
- Internal state: `showSchedule: boolean`, `scheduledAt: string`

The clock-icon button toggles `showSchedule`. When `showSchedule` is true, a `<input type="datetime-local">` and an "Agendar" button appear. The "Agendar" button is disabled if `scheduledAt` is empty or resolves to a past datetime. On click it calls `onSchedule(text, new Date(scheduledAt).toISOString())` then clears both `text` and `scheduledAt` and hides the picker.

Test pattern: Vitest + React Testing Library. See `MessageInput.spec.tsx` for conventions.

Use i18n keys (via `useTranslation`) for all new user-visible strings; add key stubs (`chat.scheduleAriaLabel`, `chat.scheduleButtonLabel`, `chat.scheduleDateAriaLabel`) — actual translations handled in a follow-up if an i18n plan is active.

## Before You Start

- [ ] Switch to main and pull latest: `git switch main && git pull --rebase origin main`
- [ ] Verify both `phase-2/task-02-ingest-schedule/status.md` and `phase-2/task-03-controller-schedule/status.md` show `complete`
- [ ] Check this task's `status.md` — if already `in-progress` or `complete`, stop and investigate
- [ ] Read `client/src/pages/Chat/components/MessageInput.tsx` and `MessageInput.spec.tsx`
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `client/src/pages/Chat/components/MessageInput.tsx` | modify | Add schedule toggle, picker, "Agendar" button |
| `client/src/pages/Chat/components/MessageInput.spec.tsx` | modify | Add scenario tests for schedule mode |

### Do NOT Modify

- `client/src/pages/Chat/components/ConversationPanel.tsx` — owned by phase-3/task-06-conversation-panel
- `client/src/pages/Chat/index.tsx` — owned by phase-3/task-07-chat-page
- `client/src/services/rooms.ts` — owned by phase-3/task-04-service

## Implementation Steps

### Step 1: Extend `MessageInputProps`

```ts
interface MessageInputProps {
  onSend: (text: string) => void
  onSchedule?: (text: string, scheduledAt: string) => void
  disabled?: boolean
}
```

### Step 2: Add internal schedule state

```ts
const [showSchedule, setShowSchedule] = useState(false)
const [scheduledAt, setScheduledAt] = useState('')
```

### Step 3: Add schedule validity helper

```ts
function isScheduleValid(): boolean {
  if (!scheduledAt) return false
  return new Date(scheduledAt).getTime() > Date.now()
}
```

### Step 4: Add `handleSchedule` function

```ts
function handleSchedule() {
  if (!text.trim() || !isScheduleValid() || !onSchedule) return
  onSchedule(text.trim(), new Date(scheduledAt).toISOString())
  setText('')
  setScheduledAt('')
  setShowSchedule(false)
}
```

### Step 5: Update the JSX

Add a clock-icon toggle button (only when `onSchedule` is provided):
```tsx
{onSchedule && (
  <button type="button" onClick={() => setShowSchedule(s => !s)} aria-label={t('chat.scheduleAriaLabel')}>
    <i className="bi bi-clock" aria-hidden="true" />
  </button>
)}
```

When `showSchedule` is true, render below the existing input row:
```tsx
{showSchedule && (
  <div className={styles.scheduleRow}>
    <input
      type="datetime-local"
      value={scheduledAt}
      onChange={e => setScheduledAt(e.target.value)}
      aria-label={t('chat.scheduleDateAriaLabel')}
    />
    <button
      type="button"
      onClick={handleSchedule}
      disabled={disabled || !text.trim() || !isScheduleValid()}
      aria-label={t('chat.scheduleButtonLabel')}
    >
      {t('chat.scheduleButtonLabel')}
    </button>
  </div>
)}
```

Add `.scheduleRow` to `styles.module.scss` (flex row, gap 8px — minimal style).

### Step 6: Update tests

Add to `MessageInput.spec.tsx`:
- Clock button is not rendered when `onSchedule` is not provided
- Clock button is rendered when `onSchedule` is provided
- Clicking clock button shows the datetime picker
- "Agendar" button is disabled when datetime is not in the future
- "Agendar" button calls `onSchedule` with correct ISO string on click
- Input and picker clear after `onSchedule` is called

## Testing

**Spec scenarios covered**:
- [ ] **Scenario 1** — Given the clock button is clicked, Then the datetime picker and "Agendar" button appear
  → `MessageInput.spec.tsx` — `'shows datetime picker when clock button is clicked'`
- [ ] **Scenario 2** — Given a past datetime is selected, Then "Agendar" button is disabled
  → `MessageInput.spec.tsx` — `'disables Agendar button when selected datetime is in the past'`
- [ ] **Scenario 3** — Given a future datetime is selected and text is filled, When "Agendar" is clicked, Then `onSchedule` is called with ISO string
  → `MessageInput.spec.tsx` — `'calls onSchedule with ISO scheduledAt when datetime is valid'`
- [ ] **Scenario 7** — Given scheduling succeeds (onSchedule called), Then text and picker are cleared and picker is hidden
  → `MessageInput.spec.tsx` — `'clears text and hides picker after onSchedule is called'`

**Additional verification**:
- [ ] All four existing `MessageInput` tests pass unchanged
- [ ] `yarn typecheck` (client) passes
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

- [ ] No KB/doc updates required for this task. If the schedule-message plan KB entry is written at plan completion, reference this component there.

## Completion Criteria

- [ ] Scenarios 1, 2, 3, 7 tests pass
- [ ] Existing send tests pass unchanged
- [ ] "Agendar" button hidden when `onSchedule` prop is absent (backwards compatible)
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- task-06 (`ConversationPanel`) will import the updated `MessageInput` props. Do not merge this task until `onSchedule` prop is correctly typed and exported.
