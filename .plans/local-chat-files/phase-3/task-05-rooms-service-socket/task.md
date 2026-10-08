# Task: Rooms service + useChatSocket update

**Plan**: Local Chat — File Sending
**Phase**: 3
**Task ID (phase-local)**: task-05
**Task Path**: phase-3/task-05-rooms-service-socket
**Spec References**: Story 1 (P1), FR-001, FR-005 — Scenarios S2, S4
**Depends On**: phase-2/task-02-upload-route
**JIRA**: N/A

## Objective

Add `uploadRoomFile(roomId, file)` to `client/src/services/rooms.ts` and update `useChatSocket.ts` so the incoming socket event payload exposes `url` and `fileName` to callers.

## Context

**`client/src/services/rooms.ts`**:
- `sendRoomMessage(roomId, text)` currently POSTs `{ text }`. Extend it (or add `sendRoomFileMessage`) to also accept `{ kind, url, fileName }` for file messages. Cleanest approach: keep `sendRoomMessage` for text; add `sendRoomFileMessage(roomId, { url, fileName })` that POSTs `{ kind: 'file', url, fileName }`. This avoids a union type on the existing function.
- Add `uploadRoomFile(roomId, file)` that POSTs multipart to `/resources/rooms/:roomId/upload` and returns `{ url, fileName }`.

**`client/src/hooks/useChatSocket.ts`**:
The callback currently destructures the socket payload without `url` or `fileName`. The payload must be extended to include them so `Chat/index.tsx` (task-08) can pass them into the `IMessage` shape. Look at the current destructuring in `useChatSocket.ts` and add `url` and `fileName` to both the type and the callback argument.

**Auth header pattern** (from mistake log 2026-06-17): Every call in `client/src/services/rooms.ts` must use `headers: { 'x-access-token': getToken() }`.

For multipart upload, use the `api()` client but set `Content-Type` to `multipart/form-data` via `FormData`:
```ts
const form = new FormData()
form.append('file', file)
return api().post(`resources/rooms/${roomId}/upload`, { headers: headers(), body: form })
```

## Before You Start

- [ ] `git switch plan/local-chat-files && git pull --rebase origin plan/local-chat-files`
- [ ] Verify task-02 `status.md` shows `complete`
- [ ] Read `client/src/services/rooms.ts` in full — understand existing auth header pattern
- [ ] Read `client/src/hooks/useChatSocket.ts` in full — understand callback type and socket event destructuring
- [ ] Read mistake log entry 2026-06-17 — confirm `getToken()` import is included
- [ ] Mark this task `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `client/src/services/rooms.ts` | modify | Add uploadRoomFile + sendRoomFileMessage |
| `client/src/hooks/useChatSocket.ts` | modify | Add url + fileName to socket payload type and callback |

### Do NOT Modify

- `client/src/pages/Chat/index.tsx` — owned by task-08
- `client/src/pages/Chat/components/MessageInput.tsx` — owned by task-06
- `client/src/pages/Chat/components/ConversationPanel.tsx` — owned by task-07

## Implementation Steps

### Step 1: Add file functions to rooms service

In `client/src/services/rooms.ts`:

```ts
export function uploadRoomFile(roomId: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  return api().post<{ url: string; fileName: string }>(`resources/rooms/${roomId}/upload`, {
    headers: headers(),
    body: form,
  })
}

export function sendRoomFileMessage(roomId: string, payload: { url: string; fileName: string }) {
  return api().post(`resources/rooms/${roomId}/messages`, {
    headers: headers(),
    body: { kind: 'file', url: payload.url, fileName: payload.fileName },
  })
}
```

### Step 2: Extend useChatSocket socket event type

In `client/src/hooks/useChatSocket.ts`, add `url` and `fileName` to the destructured socket payload and the callback argument type:

```ts
// In the socket event handler:
const { roomId, messageId, text, url, fileName, kind, destination, createdAt, sended, contact } = payload
// Pass them through to the callback
```

The callback type signature should include `url?: string | null` and `fileName?: string | null`.

## Testing

**Spec scenarios covered**:
- [ ] Scenario S2 (upload returns url/fileName): `uploadRoomFile` posts to upload endpoint — manual test or mock test
- [ ] Scenario S4 (socket carries url/fileName): `useChatSocket` passes url and fileName to callback — `client/src/hooks/useChatSocket.spec.ts`

**Additional verification**:
- [ ] `sendRoomMessage` (text) still works with no regression
- [ ] Auth header `x-access-token` is present on `uploadRoomFile` call
- [ ] Frontend TypeScript compiles: `cd client && yarn typecheck`

## Documentation / KB Updates

- [ ] No KB/doc updates required.

## Completion Criteria

- [ ] `uploadRoomFile` and `sendRoomFileMessage` exported from `rooms.ts` with auth headers
- [ ] `useChatSocket` callback type includes `url` and `fileName`
- [ ] `cd client && yarn typecheck` passes
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- task-06, task-07 run in parallel. Neither touches `rooms.ts` or `useChatSocket.ts`.
- task-08 depends on this task — it consumes `uploadRoomFile` and `sendRoomFileMessage`.
