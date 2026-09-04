# Task: Chat/index.tsx wire-up

**Plan**: Local Chat — File Sending
**Phase**: 3
**Task ID (phase-local)**: task-08
**Task Path**: phase-3/task-08-chat-index-wire-up
**Spec References**: Story 1 (P1), FR-001, FR-005, FR-007 — Scenarios S1, S2, S4
**Depends On**: phase-3/task-05-rooms-service-socket, phase-3/task-06-message-input-file-picker, phase-3/task-07-conversation-panel-rendering
**JIRA**: N/A

## Objective

Wire up the full file-send flow in `client/src/pages/Chat/index.tsx`:
1. Add `handleSendFile(file: File)` — uploads the file then sends a file message.
2. Pass `onSendFile={handleSendFile}` to `ConversationPanel` → `MessageInput`.
3. Update the `useChatSocket` callback to populate `url` and `fileName` in the incoming `IMessage` instead of hardcoding `null`.

## Context

**Current state** (lines ~92-116 of `Chat/index.tsx`):
- `handleSend(text)` POSTs text and adds an optimistic message.
- The socket callback (lines ~145-154) hardcodes `url: null, fileName: null` when building the incoming `IMessage`.

**What changes**:
1. `handleSendFile(file: File)` flow:
   - Calls `uploadRoomFile(selectedRoom._id, file)` (from task-05)
   - On success, calls `sendRoomFileMessage(selectedRoom._id, { url, fileName })` (from task-05)
   - Adds an optimistic message with `kind: 'file'`, `url`, `fileName` to state while the request is in-flight
   - On failure, removes the optimistic message

2. Socket callback update: the payload now carries `url` and `fileName` (from task-05 `useChatSocket` extension). Build the `incoming` IMessage with the actual values instead of null.

3. `ConversationPanel` receives `onSendFile={handleSendFile}`, which it passes to `MessageInput` as the `onSendFile` prop (task-06 already added the prop).

**`ConversationPanel` props** — add `onSendFile?: (file: File) => void` to `ConversationPanelProps` and thread it to `MessageInput`. This is a 2-line change in `ConversationPanel.tsx` but that file is owned by task-07. If task-07 is already complete, add the `onSendFile` prop there. If not, coordinate to add it together.

**NOTE on ConversationPanel ownership**: The `onSendFile` prop threading touches `ConversationPanel.tsx` (owned by task-07). If task-07 and task-08 run sequentially (task-08 last), this is fine — task-08 can add the prop after task-07's implementation. If running concurrently, task-08 should stub the prop in task-07 first.

## Before You Start

- [ ] `git switch plan/local-chat-files && git pull --rebase origin plan/local-chat-files`
- [ ] Verify task-05, task-06, task-07 `status.md` all show `complete`
- [ ] Read `client/src/pages/Chat/index.tsx` in full
- [ ] Confirm `uploadRoomFile` and `sendRoomFileMessage` are exported from `rooms.ts`
- [ ] Confirm `useChatSocket` callback type includes `url` and `fileName`
- [ ] Mark this task `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `client/src/pages/Chat/index.tsx` | modify | handleSendFile + socket callback fix + pass onSendFile |
| `client/src/pages/Chat/components/ConversationPanel.tsx` | modify | Add onSendFile prop (small addition to task-07 work) |
| `client/src/pages/Chat/index.spec.tsx` | modify | Add stub for end-to-end file send flow |

### Do NOT Modify

- `client/src/services/rooms.ts` — owned by task-05 (read-only)
- `client/src/hooks/useChatSocket.ts` — owned by task-05 (read-only)
- `client/src/pages/Chat/components/MessageInput.tsx` — owned by task-06 (read-only)

## Implementation Steps

### Step 1: Add handleSendFile to Chat/index.tsx

```ts
import { uploadRoomFile, sendRoomFileMessage } from '../../services/rooms'

async function handleSendFile(file: File) {
  if (!selectedRoom) return
  const optimisticId = `optimistic-file-${Date.now()}`
  const optimistic: IMessage = {
    id: optimisticId,
    kind: 'file',
    destination: 'to-messenger',
    text: null,
    url: URL.createObjectURL(file),
    fileName: file.name,
    latitude: 0,
    longitude: 0,
    sended: false,
    error: null,
    cart: null,
    createdAt: new Date().toISOString(),
    contact: null,
    trigger: null,
    department: null,
  }
  setMessages(prev => [...prev, optimistic])
  try {
    const uploadRes = await uploadRoomFile(selectedRoom._id, file)
    await sendRoomFileMessage(selectedRoom._id, { url: uploadRes.data.url, fileName: uploadRes.data.fileName })
    // Replace optimistic with actual after next socket event or reload; for now just clear
    setMessages(prev => prev.filter(m => m.id !== optimisticId))
    loadMessages(selectedRoom._id)
  } catch {
    setMessages(prev => prev.filter(m => m.id !== optimisticId))
  }
}
```

### Step 2: Fix socket callback to pass url and fileName

In the `useChatSocket` callback, update the `incoming` IMessage construction:
```ts
const incoming: IMessage = {
  id: messageId,
  kind: kind ?? 'text',
  destination: destination ?? 'to-chat',
  text: text ?? null,
  url: url ?? null,         // was: null
  fileName: fileName ?? null, // was: null
  // ...
}
```

### Step 3: Thread onSendFile to ConversationPanel

In `ConversationPanel.tsx` (small addition over task-07):
```ts
interface ConversationPanelProps {
  // ... existing props ...
  onSendFile?: (file: File) => void
}
```

Pass it through to `MessageInput`:
```tsx
<MessageInput onSend={onSend} onSchedule={onSchedule} onSendFile={onSendFile} disabled={...} />
```

In `Chat/index.tsx`, pass to `ConversationPanel`:
```tsx
<ConversationPanel
  ...
  onSendFile={handleSendFile}
/>
```

## Testing

**Spec scenarios covered**:
- [ ] Scenario S2 (end-to-end file send): Given open room + file selected, When Send clicked, Then upload + file message created — `client/src/pages/Chat/index.spec.tsx` (integration stub)
- [ ] Scenario S4 (socket carries url/fileName): Given socket event with url, When received, Then message in state has non-null url — `client/src/pages/Chat/index.spec.tsx`

**Additional verification**:
- [ ] Text message send still works (handleSend regression test)
- [ ] `cd client && yarn typecheck` passes
- [ ] `cd client && npx vitest run client/src/pages/Chat/index.spec.tsx`

## Documentation / KB Updates

- [ ] Run `document-solution` after completing this task — the full file upload flow (upload helper → route → controller → LocalChat → socket → frontend) is a non-obvious multi-file pattern worth capturing in the KB.
- [ ] Run `check-kb-index` after KB doc is created.

## Completion Criteria

- [ ] Agent can select a file, click Send, and see the file message in the conversation list
- [ ] Socket `new-room-message` for file messages populates `url` and `fileName` in the IMessage state
- [ ] `ConversationPanel` receives and threads `onSendFile` to `MessageInput`
- [ ] SC-001 and SC-002 are verifiable end-to-end via the running app
- [ ] `cd client && yarn typecheck` passes
- [ ] `yarn test` backend tests pass
- [ ] `pre-commit-check` passes
- [ ] Status updated in `status.md`
