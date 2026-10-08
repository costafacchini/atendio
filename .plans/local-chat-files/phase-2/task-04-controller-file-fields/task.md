# Task: ChatRoomsController file fields

**Plan**: Local Chat — File Sending
**Phase**: 2
**Task ID (phase-local)**: task-04
**Task Path**: phase-2/task-04-controller-file-fields
**Spec References**: Story 1 (P1), FR-006 — Scenario S2
**Depends On**: None
**JIRA**: N/A

## Objective

Extend `ChatRoomsController.replyToRoom` to extract `kind`, `url`, and `fileName` from the request body and include them in the body forwarded to `IngestChatMessage.execute`.

## Context

`ChatRoomsController.replyToRoom` (lines 31-63 of `ChatRoomsController.ts`) currently only reads `text` from `req.body` and builds:

```ts
const body = { roomId, text, agentId, agentName: user?.name ?? null }
```

For file messages, the agent will POST `{ kind: 'file', url: '...', fileName: '...' }` (with no `text`). The controller must pass these fields through to `IngestChatMessage`, which saves the body for the `chat-message` job. The job then calls `LocalChat.parseMessage(body.content)` — so `url` and `fileName` must be present in `body.content`.

`text` remains optional — a file message may have no text.

## Before You Start

- [ ] `git switch plan/local-chat-files && git pull --rebase origin plan/local-chat-files`
- [ ] Read `src/app/controllers/ChatRoomsController.ts` in full
- [ ] Read `src/app/usecases/webhooks/IngestChatMessage.ts` — confirm `body` is saved verbatim as `content`
- [ ] Read `src/app/controllers/ChatRoomsController.spec.ts` — understand builder pattern for test setup
- [ ] Mark this task `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/controllers/ChatRoomsController.ts` | modify | Forward kind, url, fileName |
| `src/app/controllers/ChatRoomsController.spec.ts` | modify | Implement S2 stub for file fields |

### Do NOT Modify

- `src/app/usecases/webhooks/IngestChatMessage.ts` — no change needed, body is saved verbatim
- `src/app/plugins/chats/LocalChat.ts` — owned by task-03
- `src/app/routes/resources-routes.ts` — owned by task-02

## Implementation Steps

### Step 1: Extend replyToRoom to read file fields

In `ChatRoomsController.ts`, update the body extraction:

```ts
const { text, kind, url, fileName } = req.body
// ...
const body = {
  roomId,
  text: text ?? null,
  kind: kind ?? 'text',
  url: url ?? null,
  fileName: fileName ?? null,
  agentId,
  agentName: user?.name ?? null,
}
await this.ingestChatMessage.execute({ body, licenseeId, inboxId })
```

No validation is needed at the controller — `LocalChat.parseMessage` handles the guard logic. The route will add express-validator rules if required in a future hardening pass.

### Step 2: Implement spec stub

Add a new test case to `ChatRoomsController.spec.ts` that verifies `ingestChatMessage.execute` receives `url` and `fileName` when a file message is posted.

## Testing

**Spec scenarios covered**:
- [ ] Scenario S2 (file fields forwarded): Given valid open room + file body, When POST to replyToRoom, Then `ingestChatMessage.execute` is called with `body.url`, `body.fileName`, and `body.kind === 'file'` — `src/app/controllers/ChatRoomsController.spec.ts`

**Additional verification**:
- [ ] Text message body still works (kind defaults to 'text', url and fileName are null)
- [ ] `yarn test src/app/controllers/ChatRoomsController.spec.ts` passes
- [ ] `yarn typecheck` passes

## Documentation / KB Updates

- [ ] No KB/doc updates required — additive change to existing controller.

## Completion Criteria

- [ ] `replyToRoom` forwards `kind`, `url`, `fileName` to `IngestChatMessage`
- [ ] Stub for S2 is implemented and passing
- [ ] Existing `ChatRoomsController.spec.ts` tests still pass
- [ ] `yarn typecheck` passes
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- task-02 (resources-routes) and task-03 (LocalChat) run in parallel — neither touches `ChatRoomsController.ts`.
