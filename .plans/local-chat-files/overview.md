# Plan: Local Chat — File Sending

**Status**: not-started
**Created**: 2026-09-02
**Last Updated**: 2026-09-02
**Assigned Dev**: Alan Costa Facchini
**PR Strategy**: single
**Spec**: [spec.md](spec.md) — 2 user stories · 8 acceptance scenarios · 3 success criteria

## Objective

Add file-sending capability to the agent-facing Local Chat admin panel so that agents can attach images, video, audio, and documents to conversations and have them delivered to customers via the existing socket infrastructure.

## Scope

### In Scope
- Upload endpoint (`POST /resources/rooms/:roomId/upload`) using the existing LocalStorage/S3 provider abstraction
- `LocalChat.parseMessage` and `sendMessage` extended for `kind: 'file'` messages
- `ChatRoomsController.replyToRoom` extended to accept file fields
- `MessageInput` file attachment button and `onSendFile` prop
- `ConversationPanel` file rendering (img / video / audio / download link)
- `useChatSocket` socket callback passes `url` and `fileName` from payload

### Out of Scope
- Widget (customer → agent) file upload — separate plan
- File size limits — future hardening
- Thumbnail generation or virus scanning
- File download by contacts (they receive only the URL)

## Kill Criteria

- If the IMessage schema already has a breaking change that blocks `kind: 'file'` in Prisma without a migration, stop and raise a migration task first.
- If multer introduces an ESM/CommonJS incompatibility with the current Jest setup (see mistake log entry 2026-04-21), stop and evaluate alternatives.

## Phases

| Phase | Name | Tasks | Dependencies | Description |
|-------|------|-------|--------------|-------------|
| 1 | Storage Helper | task-01 | None | Create upload adapter wrapping LocalStorage / S3 for Buffer input |
| 2 | Backend Message Flow | task-02, task-03, task-04 | Phase 1 | Upload route, LocalChat file support, controller extension |
| 3 | Frontend | task-05, task-06, task-07, task-08 | Phase 2 | Rooms service, MessageInput, ConversationPanel, Chat/index wire-up |

## Task Summary

| Task Path | Title | Phase | Status | Depends On |
|-----------|-------|-------|--------|------------|
| phase-1/task-01-storage-upload-helper | Storage upload helper | 1 | not-started | — |
| phase-2/task-02-upload-route | Upload route + multer | 2 | not-started | phase-1/task-01-storage-upload-helper |
| phase-2/task-03-local-chat-file-support | LocalChat file message support | 2 | not-started | phase-1/task-01-storage-upload-helper |
| phase-2/task-04-controller-file-fields | ChatRoomsController file fields | 2 | not-started | — |
| phase-3/task-05-rooms-service-socket | Rooms service + useChatSocket | 3 | not-started | phase-2/task-02-upload-route |
| phase-3/task-06-message-input-file-picker | MessageInput file picker | 3 | not-started | — |
| phase-3/task-07-conversation-panel-rendering | ConversationPanel file rendering | 3 | not-started | — |
| phase-3/task-08-chat-index-wire-up | Chat/index.tsx wire-up | 3 | not-started | phase-3/task-05-rooms-service-socket, phase-3/task-06-message-input-file-picker, phase-3/task-07-conversation-panel-rendering |

## Branch Convention

Pattern: `plan/local-chat-files`

Base branch: `main`

## Key Files

| File/Directory | Relevance |
|----------------|-----------|
| `src/app/plugins/storage/Local.ts` | LocalStorage plugin — reference for upload helper |
| `src/app/plugins/storage/S3.ts` | S3 plugin — reference for upload helper |
| `src/app/plugins/storage/upload.ts` | NEW — storage upload adapter |
| `src/app/plugins/chats/LocalChat.ts` | parseMessage + sendMessage must be extended |
| `src/app/plugins/chats/Base.ts` | responseToMessages already handles kind='file' (lines 144-160) |
| `src/app/helpers/Files.ts` | isPhoto / isVideo / isMidia / isVoice — file type validation |
| `src/app/controllers/ChatRoomsController.ts` | replyToRoom must forward file fields |
| `src/app/routes/resources-routes.ts` | Upload route added here |
| `client/src/services/rooms.ts` | uploadRoomFile + sendRoomMessage extended |
| `client/src/hooks/useChatSocket.ts` | Must pass url/fileName from socket payload |
| `client/src/pages/Chat/index.tsx` | handleSendFile + updated socket callback |
| `client/src/pages/Chat/components/MessageInput.tsx` | File picker button + onSendFile prop |
| `client/src/pages/Chat/components/ConversationPanel.tsx` | File message rendering |

## Risks

- multer CJS/ESM compatibility with Jest — confirmed risk from mistake log. Mitigation: use `memoryStorage()` mode and avoid dynamic requires; add a Jest transform if needed.
- `LocalChat.parseMessage` currently hard-guards on `body.text` missing → null; changing this guard may affect other code paths calling parseMessage. Mitigation: add branch (text OR url+fileName), not replace guard.
- `ChatsBase.responseToMessages` for `kind: 'file'` expects `message.file.url` / `message.file.fileName` (Base.ts:156-157). Ensure LocalChat.parseMessage produces exactly this shape.

## Success Criteria

- [ ] SC-001: Agent can select a file, send it, and see the file message in the conversation list
- [ ] SC-002: Socket event for file messages carries non-null `url` and `fileName`
- [ ] SC-003: All 8 acceptance scenario test stubs pass; existing specs remain green
- [ ] All TypeScript compilation passes (`yarn typecheck`)
- [ ] Linter passes (`yarn linter`)
- [ ] No regressions in existing text message flow

## References

- **JIRA Epic**: N/A
- **Weekly Plan Brief**: N/A
- **Related Plans**: [Local Chat UI](../local-chat-ui/overview.md) (completed), [Chat Widget](../chat-widget/overview.md) (completed)
- **Rock Alignment**: N/A
