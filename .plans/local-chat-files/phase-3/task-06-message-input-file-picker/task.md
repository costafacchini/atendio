# Task: MessageInput file picker

**Plan**: Local Chat — File Sending
**Phase**: 3
**Task ID (phase-local)**: task-06
**Task Path**: phase-3/task-06-message-input-file-picker
**Spec References**: Story 1 (P1), FR-007 — Scenarios S1, S2
**Depends On**: None
**JIRA**: N/A

## Objective

Add a file attachment button (paperclip icon) and hidden `<input type="file">` to `MessageInput.tsx`. When a file is selected, show the filename as a preview. When Send is clicked with a file pending, call the new `onSendFile(file: File)` prop instead of `onSend`.

## Context

`MessageInput.tsx` (`client/src/pages/Chat/components/MessageInput.tsx`) is a controlled component with `text`, `showSchedule`, and `scheduledAt` state. The file picker adds a fourth state: `pendingFile: File | null`.

UI rules:
- Attachment button: `<button>` with `<i className="bi bi-paperclip">` icon, next to the existing clock and send buttons. Clicking it triggers the hidden file input.
- Hidden file input: `<input type="file" accept="image/*,video/*,audio/*">` — the `accept` attribute gives browsers a hint; server-side validation (task-02) is the enforcer.
- When a file is selected, display the `file.name` as a small preview label. Text input should be hidden or disabled while a file is pending (to keep UX simple — one thing at a time).
- Clicking Send with a `pendingFile`: call `onSendFile(pendingFile)` and clear `pendingFile`.
- Clicking Send with text and no file: call `onSend(text)` as before.
- Attachment button is hidden when `disabled` is true (room closed).

**Props extension** (`MessageInputProps`):
```ts
interface MessageInputProps {
  onSend: (text: string) => void
  onSchedule?: (text: string, scheduledAt: string) => void
  onSendFile?: (file: File) => void
  disabled?: boolean
}
```

Keep `onSendFile` optional so callers that don't need file upload (if any) don't break.

The styles are in `client/src/pages/Chat/styles.module.scss`. Add minimal CSS for the filename preview (`.filePreview` class). Do not modify unrelated style rules.

## Before You Start

- [ ] `git switch plan/local-chat-files && git pull --rebase origin plan/local-chat-files`
- [ ] Read `client/src/pages/Chat/components/MessageInput.tsx` in full
- [ ] Read `client/src/pages/Chat/components/MessageInput.spec.tsx` — understand vi.mock setup and existing tests
- [ ] Read `client/src/pages/Chat/styles.module.scss` — find existing button classes to reuse
- [ ] Mark this task `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `client/src/pages/Chat/components/MessageInput.tsx` | modify | Add file picker, onSendFile prop |
| `client/src/pages/Chat/components/MessageInput.spec.tsx` | modify | Implement S1, S2 stubs for file attachment |
| `client/src/pages/Chat/styles.module.scss` | modify | Add .filePreview rule only |

### Do NOT Modify

- `client/src/pages/Chat/index.tsx` — owned by task-08
- `client/src/pages/Chat/components/ConversationPanel.tsx` — owned by task-07
- `client/src/services/rooms.ts` — owned by task-05

## Implementation Steps

### Step 1: Add pendingFile state and file input ref

```ts
const [pendingFile, setPendingFile] = useState<File | null>(null)
const fileInputRef = useRef<HTMLInputElement>(null)
```

### Step 2: Add handleFileChange and handleSend extension

```ts
function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0] ?? null
  setPendingFile(file)
  // Reset the input so the same file can be re-selected
  e.target.value = ''
}

function handleSend() {
  if (disabled) return
  if (pendingFile && onSendFile) {
    onSendFile(pendingFile)
    setPendingFile(null)
    return
  }
  if (!text.trim()) return
  onSend(text.trim())
  setText('')
}
```

### Step 3: Render attachment button and file preview

In the `inputRow` div, before the existing clock button:
```tsx
{onSendFile && !disabled && (
  <>
    <input
      type="file"
      ref={fileInputRef}
      style={{ display: 'none' }}
      accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
      onChange={handleFileChange}
      aria-label={t('chat.attachFileAriaLabel')}
    />
    <button
      type="button"
      className={styles.attachBtn}
      onClick={() => fileInputRef.current?.click()}
      aria-label={t('chat.attachFileAriaLabel')}
    >
      <i className="bi bi-paperclip" aria-hidden="true" />
    </button>
  </>
)}
{pendingFile && (
  <span className={styles.filePreview} aria-live="polite">
    {pendingFile.name}
    <button type="button" onClick={() => setPendingFile(null)} aria-label={t('chat.clearFileAriaLabel')}>×</button>
  </span>
)}
```

### Step 4: Add i18n keys

Add to the existing translation files (pt and en):
- `chat.attachFileAriaLabel`
- `chat.clearFileAriaLabel`

Check the i18n setup (likely `client/src/i18n/` or similar) and add keys to both locales.

### Step 5: Add .attachBtn and .filePreview to styles.module.scss

Keep it minimal — reuse existing button base styles where possible.

## Testing

**Spec scenarios covered**:
- [ ] Scenario S1: Given open room, When agent clicks attachment button, Then filename preview appears — `client/src/pages/Chat/components/MessageInput.spec.tsx`
- [ ] Scenario S2: Given agent has pending file, When Send clicked, Then onSendFile is called with the File — `client/src/pages/Chat/components/MessageInput.spec.tsx`

**Additional verification**:
- [ ] Clicking Send with text (no file) still calls `onSend` — existing spec should pass
- [ ] Clicking × clears the pending file
- [ ] Attachment button hidden when `disabled={true}`
- [ ] `cd client && yarn typecheck` passes
- [ ] `cd client && npx vitest run client/src/pages/Chat/components/MessageInput.spec.tsx`

## Documentation / KB Updates

- [ ] No KB/doc updates required.

## Completion Criteria

- [ ] `onSendFile` prop accepted and called when file is pending
- [ ] Attachment button + hidden input rendered when `onSendFile` prop present
- [ ] Filename preview shown with clear button
- [ ] Stubs for S1 and S2 implemented and passing in `MessageInput.spec.tsx`
- [ ] Existing `MessageInput.spec.tsx` tests still pass
- [ ] `cd client && yarn typecheck` passes
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- task-05, task-07 run in parallel — neither touches `MessageInput.tsx`.
- task-08 depends on this task to consume the `onSendFile` prop.
