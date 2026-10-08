# Local Chat — Agent File Upload

**Last Updated**: October 2026
**Context**: Read when extending the Local Chat file-sending flow (upload route, LocalChat plugin, or the Chat panel's file picker/rendering), or when adding another multipart/form-data upload endpoint to this codebase.

---

## Overview

Agents in the admin Chat panel can attach a file (image/video/audio/document) to an
open room. The file is uploaded via the existing `STORAGE_PROVIDER` abstraction
(LocalStorage or S3), a `kind: 'file'` message is created, and the customer receives
it through the same socket infrastructure used for text messages.

---

## The Problem

There was no multipart upload endpoint in this codebase, no `Buffer`-accepting
storage adapter (the existing `LocalStorage`/`S3` plugins only accept base64
strings), and the client's shared `api()` helper cannot send `FormData`.

### Root Cause

- `LocalStorage`/`S3` (`src/app/plugins/storage/Local.ts`, `S3.ts`) were built for
  base64 payloads coming from messenger webhooks, not `Buffer`s from an HTTP
  multipart upload.
- `client/src/services/api.ts` always does `JSON.stringify(body)` and forces
  `Content-Type: application/json` on every request — incompatible with
  `FormData`.

---

## The Solution

### Key Files

| File | Role |
|------|------|
| `src/app/plugins/storage/upload.ts` | `uploadFile(buffer, fileName, contact)` — thin adapter that writes a `Buffer` directly via `fs.writeFileSync` (local) or `PutObjectCommand` (S3), selected by `STORAGE_PROVIDER`. Avoids the base64 round-trip the existing plugins require. |
| `src/app/routes/resources-routes.ts` | `POST /resources/rooms/:roomId/upload` — `multer({ storage: multer.memoryStorage() })`, validates extension via `isPhoto`/`isVideo`/`isMidia`/`isVoice` (`src/app/helpers/Files.ts`), checks room is open, calls `uploadFile`, returns `{ url, fileName }`. Sits after the route-level `router.use(authenticate)`, so no extra auth middleware is needed on the route itself. |
| `src/app/plugins/chats/LocalChat.ts` | `parseMessage` now branches: `body.text` → `kind: 'text'`, `body.url && body.fileName` → `kind: 'file'` with `file: { url, fileName, text: null }` (shape required by `ChatsBase.responseToMessages`, `Base.ts:144-160`). `sendMessage` adds `url`/`fileName` to the `new-room-message` socket payload. |
| `src/app/controllers/ChatRoomsController.ts` | `replyToRoom` forwards `kind`/`url`/`fileName` from `req.body` to `IngestChatMessage` (which saves the body verbatim as job `content`). |
| `client/src/services/rooms.ts` | `uploadRoomFile` — uses raw `fetch` directly, **not** `api()` (see gotcha below). `sendRoomFileMessage` posts `{ kind: 'file', url, fileName }` via the normal `api()` client. |
| `client/src/helpers/files.ts` | Client-side copy of the four backend regex helpers (`isPhoto`/`isVideo`/`isMidia`/`isVoice`). Intentionally duplicated rather than imported, to keep the client decoupled from backend code. |
| `client/src/pages/Chat/components/MessageInput.tsx` | Attachment button + hidden `<input type="file">` + `pendingFile` state. `onSendFile(file)` fires instead of `onSend(text)` when a file is pending. |
| `client/src/pages/Chat/components/ConversationPanel.tsx` | `renderFileMessage(url, fileName)` picks `<img>`/`<video>`/`<audio>`/`<a download>` by extension. |
| `client/src/pages/Chat/index.tsx` | `handleSendFile` orchestrates `uploadRoomFile` → `sendRoomFileMessage`, with an optimistic message cleared once the real message arrives (via reload) or on failure. |

### Code Pattern

Buffer-based upload adapter (avoids the base64 conversion the existing plugins need):

```ts
// src/app/plugins/storage/upload.ts
export function uploadFile(buffer: Buffer, fileName: string, contact: { number: string }): Promise<string> {
  const relativePath = buildRelativePath(contact.number, fileName)
  const provider = process.env.STORAGE_PROVIDER ?? 'local'
  if (provider === 's3') return uploadFileS3(buffer, relativePath)
  return uploadFileLocal(buffer, relativePath)
}
```

Client upload bypassing the shared `api()` client:

```ts
// client/src/services/rooms.ts
export async function uploadRoomFile(roomId: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(`resources/rooms/${roomId}/upload`, {
    method: 'POST',
    headers: headers(),
    body: form,
  })
  return { status: response.status, data: await response.json() }
}
```

---

## Gotchas

### S3/MinIO: the SDK endpoint and the public URL are not the same address

In the docker-compose dev setup, `AWS_ENDPOINT_URL=http://host.docker.internal:9000`
is only reachable from inside containers (the app/worker container, where Baileys
fetches the file to upload it to WhatsApp). A browser rendering `<img src>` in the
admin Chat panel runs on the host, not in a container, and can't resolve
`host.docker.internal` — the image just shows as broken.

`uploadFileS3()` now builds the *returned* URL from `AWS_PUBLIC_URL` (falling back
to `AWS_ENDPOINT_URL` if unset), while the S3 `SDK client` itself still connects
via `AWS_ENDPOINT_URL`. Set `AWS_PUBLIC_URL` to whatever address your own browser
can reach MinIO at (typically `http://localhost:9000`, since MinIO's port is also
published to the host). Real AWS S3 (no custom endpoint) is unaffected — that path
already returns a universally-reachable `https://{bucket}.s3.amazonaws.com/...` URL.

`uploadFile()`'s returned URL is also now built with each path segment
(`encodeURIComponent`'d) — filenames with spaces or special characters (very
common for screenshots) previously went straight into the URL unescaped.

### `api()` cannot send `FormData`

`client/src/services/api.ts`'s `request()` unconditionally does
`JSON.stringify(body)` and sets `Content-Type: application/json`. Passing a
`FormData` body through it silently breaks the upload (body becomes `"{}"`,
and the browser never gets to set its own multipart boundary). Any future
file-upload client call must use raw `fetch` (or a dedicated upload client),
not the shared `api()` helper — unless `api()` itself is extended to detect
`FormData` and skip both the stringify and the content-type override.

### Jest tests run with `NODE_ENV=test`, not bare `npx jest`

Specs that call the real `createRuntimeDependencies()` (e.g.
`LocalChat.spec.ts`) construct a real `QueueServer` (BullMQ `Queue` per job,
real Redis connection) at import time. Always run via `yarn test <path>` (or
`NODE_ENV=test npx jest --config=jest.config.mjs ...`), and add `--forceExit`
when running a single file directly — the open Redis/BullMQ handles keep the
process alive well after all tests have already passed, which looks like a
hang but isn't one.

### multer version used here is CJS-safe

`multer@2.4.0` has no `"module"`/`type: module` field, so `require('multer')`
resolves cleanly under the Babel/CJS Jest pipeline — no
`transformIgnorePatterns` entry was needed (contrast with the `bl` v7 ESM
issue in the mistake log, 2026-04-21).

### Pre-existing, unrelated `IMessage.department` vs `.sector` mismatch

`client/src/types/message.ts`'s `IMessage` has `sector`, not `department`, but
`Chat/index.tsx` and `Messages/scenes/Index/index.tsx` construct/read
`department`. This already fails `cd client && npx tsc --noEmit` on `main`
and is explicitly out of scope per this plan's `spec.md` Assumptions. Don't
attribute this error to a new change unless the diff touches those literals
directly — diff the `tsc` error list before/after to confirm.

---

## Related

- [socketio-jwt-licensee-rooms](../integrations/socketio-jwt-licensee-rooms.md) — the `new-room-message` socket event this plan extends with `url`/`fileName`.
