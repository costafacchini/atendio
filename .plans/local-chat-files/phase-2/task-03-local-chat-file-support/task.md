# Task: LocalChat file message support

**Plan**: Local Chat — File Sending
**Phase**: 2
**Task ID (phase-local)**: task-03
**Task Path**: phase-2/task-03-local-chat-file-support
**Spec References**: Story 1 (P1), FR-004, FR-005 — Scenarios S2, S4
**Depends On**: phase-1/task-01-storage-upload-helper (conceptually — upload.ts must exist before task-02 can call it, but LocalChat changes are independent of the route)
**JIRA**: N/A

## Objective

Extend `LocalChat.parseMessage` to accept file messages (body has `url` + `fileName` instead of `text`), and extend `LocalChat.sendMessage` to emit `url` and `fileName` in the `new-room-message` socket event.

## Context

**`LocalChat.parseMessage`** (lines 55-79 of `LocalChat.ts`):
Currently returns `null` when `!body?.text`. The extension adds a second valid branch: if `body.url && body.fileName`, produce a file message. The parsed message shape for `kind: 'file'` must match what `ChatsBase.responseToMessages` expects (lines 144-160 of `Base.ts`):

```ts
messages: [{ kind: 'file', file: { url: body.url, fileName: body.fileName, text: null }, senderName: body.agentName ?? null }]
```

Guard logic after extension:
```ts
if (!body?.roomId || (!body?.text && !(body?.url && body?.fileName))) {
  this.messageParsed = null
  return
}
```

**`LocalChat.sendMessage`** (lines 21-52 of `LocalChat.ts`):
Currently emits only `text` and `kind`. Must also emit `url: message.url ?? null` and `fileName: message.fileName ?? null` so the frontend socket callback can render file messages.

The socket event shape received by `useChatSocket` must carry these fields — see `client/src/hooks/useChatSocket.ts` for the destructured payload.

## Before You Start

- [ ] `git switch plan/local-chat-files && git pull --rebase origin plan/local-chat-files`
- [ ] Read `src/app/plugins/chats/LocalChat.ts` in full
- [ ] Read `src/app/plugins/chats/Base.ts` lines 144-160 — confirm the exact file message shape expected by `responseToMessages`
- [ ] Read `src/app/plugins/chats/LocalChat.spec.ts` — understand test setup (installMemoryRepositories, factories)
- [ ] Mark this task `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/plugins/chats/LocalChat.ts` | modify | parseMessage + sendMessage extensions |
| `src/app/plugins/chats/LocalChat.spec.ts` | modify | Implement stubs for S2, S4 scenarios |

### Do NOT Modify

- `src/app/plugins/chats/Base.ts` — read-only reference
- `src/app/plugins/storage/upload.ts` — owned by task-01
- `src/app/routes/resources-routes.ts` — owned by task-02
- `src/app/controllers/ChatRoomsController.ts` — owned by task-04

## Implementation Steps

### Step 1: Extend parseMessage

In `LocalChat.ts`, update `parseMessage` to handle the file branch:

```ts
async parseMessage(body: any) {
  const hasText = !!body?.text
  const hasFile = !!(body?.url && body?.fileName)

  if (!body?.roomId || (!hasText && !hasFile)) {
    this.messageParsed = null
    return
  }

  const room = await this._roomRepository.findFirst({ _id: body.roomId })
  if (!room || room.closed) {
    this.messageParsed = null
    return
  }

  const contact = await this.contactRepository.findFirst({ _id: room.contact })
  if (!contact) {
    this.messageParsed = null
    return
  }

  if (hasFile) {
    this.messageParsed = {
      contact,
      room,
      action: this.action(),
      messages: [{ kind: 'file', file: { url: body.url, fileName: body.fileName, text: null }, senderName: body.agentName ?? null }],
    }
    return
  }

  this.messageParsed = {
    contact,
    room,
    action: this.action(),
    messages: [{ kind: 'text', text: { body: body.text }, senderName: body.agentName ?? null }],
  }
}
```

### Step 2: Extend sendMessage socket payload

In `LocalChat.ts`, update the `emitToLicensee` call in `sendMessage`:

```ts
emitToLicensee(this.licensee._id, 'new-room-message', {
  roomId: room._id.toString(),
  messageId: message._id.toString(),
  licenseeId: this.licensee._id.toString(),
  text: message.text ?? null,
  url: message.url ?? null,
  fileName: message.fileName ?? null,
  kind: message.kind,
  destination: message.destination,
  createdAt: message.createdAt instanceof Date ? message.createdAt.toISOString() : message.createdAt,
  sended: message.sended,
  contact: { id: messageContact._id?.toString(), name: messageContact.name },
})
```

### Step 3: Implement spec stubs

Add a new `describe` block to `LocalChat.spec.ts` for the file message scenarios.

## Testing

**Spec scenarios covered**:
- [ ] Scenario S2 (file message created in room): Given open room + valid file body, When sendMessage called, Then message with kind='file' exists in DB — `src/app/plugins/chats/LocalChat.spec.ts`
- [ ] Scenario S4 (socket event has url + fileName): Given file message, When sendMessage called, Then emitToLicensee is called with non-null url and fileName — `src/app/plugins/chats/LocalChat.spec.ts`

**Additional verification**:
- [ ] parseMessage with text body still works (no regression)
- [ ] parseMessage with no text and no url still returns null messageParsed
- [ ] `yarn test src/app/plugins/chats/LocalChat.spec.ts` passes
- [ ] `yarn typecheck` passes

## Documentation / KB Updates

- [ ] No KB/doc updates required — pattern is additive to existing LocalChat logic.

## Completion Criteria

- [ ] `LocalChat.parseMessage` handles file bodies and produces the correct message shape for `ChatsBase.responseToMessages`
- [ ] `LocalChat.sendMessage` emits `url` and `fileName` in socket event
- [ ] All stubs in `LocalChat.spec.ts` for S2 and S4 are implemented and passing
- [ ] Existing `LocalChat.spec.ts` tests still pass
- [ ] `yarn typecheck` passes
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- task-02 and task-04 run in parallel — neither touches `LocalChat.ts`.
