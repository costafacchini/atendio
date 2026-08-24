# Task: scheduleMessage Service Function

**Plan**: Schedule Message for Future Delivery
**Phase**: 3
**Task ID**: task-05
**Task Path**: phase-3/task-05-service
**Spec References**: Story 1 (P1), FR-008, SC-001
**Depends On**: phase-2/task-03-create-message
**JIRA**: N/A

## Objective

Add `scheduleMessage(payload)` to `client/src/services/message.ts`, following the `x-access-token` auth header convention established in `rooms.ts`.

## Context

`client/src/services/message.ts` already has `getMessages`, `resendMessage`, `ignoreMessage`. The new `scheduleMessage` posts to `POST /resources/messages` with the full message payload including `scheduledAt`. The auth pattern is `const headers = () => ({ 'x-access-token': getToken() })` — see `rooms.ts` for the canonical example.

The `Chat/index.tsx` will call this to schedule a message from a room context, constructing the payload as:
```ts
{
  licensee: effectiveLicenseeId,
  contact: selectedRoom.contact._id,
  destination: 'to-messenger',
  kind: 'text',
  text,
  scheduledAt,    // ISO UTC string
}
```

## Before You Start

- [ ] `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-2/task-03-create-message/status.md` shows `complete`
- [ ] Check `status.md` — stop if `in-progress` or `complete`
- [ ] Read `client/src/services/message.ts` and `client/src/services/rooms.ts` in full
- [ ] Mark `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `client/src/services/message.ts` | modify | Add `scheduleMessage` export |

### Do NOT Modify

- `client/src/services/rooms.ts` — not needed for this flow
- Component files — owned by tasks 06–08

## Implementation Steps

### Step 1: Add auth header helper

If not already present at the top of `message.ts`, add:

```ts
const headers = () => ({ 'x-access-token': getToken() })
```

(Check first — if the file already calls `getToken()` inline, match that pattern instead.)

### Step 2: Add `scheduleMessage`

```ts
interface ScheduleMessagePayload {
  licensee: string
  contact: string
  destination: string
  kind: string
  text?: string
  url?: string
  fileName?: string
  scheduledAt: string   // ISO UTC
}

function scheduleMessage(payload: ScheduleMessagePayload) {
  return api().post('resources/messages', { headers: headers(), body: payload })
}

export { getMessages, resendMessage, ignoreMessage, scheduleMessage }
```

## Testing

No dedicated spec file is needed for this task — the function is a thin wrapper. Task-08 covers the integration via `Chat/index.tsx` tests.

- [ ] `cd client && yarn typecheck` passes
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

- [ ] No KB update required for this task. Covered by the full-plan `document-solution` in task-08.

## Completion Criteria

- [ ] `scheduleMessage` exported and typed
- [ ] Auth header present
- [ ] TypeScript clean
- [ ] `status.md` updated
