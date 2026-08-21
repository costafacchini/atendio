# Task: Add scheduleRoomMessage to rooms service

**Plan**: Schedule Message for Future Delivery
**Phase**: 3
**Task ID (phase-local)**: task-04
**Task Path**: phase-3/task-04-service
**Spec References**: Story 1 (P1), FR-007, SC-001
**Depends On**: phase-2/task-03-controller-schedule
**JIRA**: N/A

## Objective

Add `scheduleRoomMessage(roomId, text, scheduledAt)` to `client/src/services/rooms.ts`, following the existing `sendRoomMessage` pattern and including the `x-access-token` auth header.

## Context

`client/src/services/rooms.ts` already has `sendRoomMessage(roomId, text)` which calls:
```ts
api().post(`resources/rooms/${roomId}/messages`, { headers: headers(), body: { text } })
```
The `headers` helper at the top of the file is `const headers = () => ({ 'x-access-token': getToken() })`.

The new function will post the same endpoint but include `scheduledAt` in the body. The backend route `POST /api/v1/chat/rooms/:roomId/messages` now accepts `{ text, scheduledAt }` (after task-03).

There is no test file for `client/src/services/rooms.ts` yet. Create a minimal one covering the new function.

Test pattern: Vitest (`vi.mock`, `vi.fn()`). See `MessageInput.spec.tsx` for the test scaffold style.

## Before You Start

- [ ] Switch to main and pull latest: `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-2/task-03-controller-schedule/status.md` shows `complete`
- [ ] Check this task's `status.md` — if already `in-progress` or `complete`, stop and investigate
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `client/src/services/rooms.ts` | modify | Add `scheduleRoomMessage` export |
| `client/src/services/rooms.spec.ts` | create | Minimal test for the new function |

### Do NOT Modify

- `client/src/pages/Chat/components/MessageInput.tsx` — owned by phase-3/task-05-message-input
- `client/src/pages/Chat/components/ConversationPanel.tsx` — owned by phase-3/task-06-conversation-panel
- `client/src/pages/Chat/index.tsx` — owned by phase-3/task-07-chat-page

## Implementation Steps

### Step 1: Add `scheduleRoomMessage` to `rooms.ts`

```ts
export function scheduleRoomMessage(roomId: string, text: string, scheduledAt: string) {
  return api().post(`resources/rooms/${roomId}/messages`, {
    headers: headers(),
    body: { text, scheduledAt },
  })
}
```

Export it alongside the existing functions.

### Step 2: Create `rooms.spec.ts`

Mock `api` and `getToken`, then assert:
- `scheduleRoomMessage` calls the correct URL with `body: { text, scheduledAt }` and the auth header

### Step 3: Run tests

```bash
cd client && npx vitest run src/services/rooms.spec.ts
```

## Testing

**Spec scenarios covered**:
- [ ] **Scenario 3 (partial)** — When `scheduleRoomMessage` is called, Then the correct endpoint is hit with `{ text, scheduledAt }` and auth header
  → `client/src/services/rooms.spec.ts` — `'scheduleRoomMessage posts to the correct endpoint with text and scheduledAt'`

**Additional verification**:
- [ ] `sendRoomMessage` (existing) is not changed and its behaviour is unchanged
- [ ] `yarn typecheck` (client) passes
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

- [ ] No KB/doc updates required — follows the established service file pattern documented in mistake-log (`x-access-token` header rule).

## Completion Criteria

- [ ] `scheduleRoomMessage` exported and typed
- [ ] Auth header present on the request
- [ ] `rooms.spec.ts` test passes
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- This task only touches `rooms.ts` and its spec. No overlap with tasks 05–07 which modify component files.
- Can run in parallel with task-05 if both phase-2 tasks are complete.
