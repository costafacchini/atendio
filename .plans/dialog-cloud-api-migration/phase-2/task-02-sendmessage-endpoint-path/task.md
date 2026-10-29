# Task: Fix sendMessage endpoint path

**Plan**: dialog-cloud-api-migration
**Phase**: 2
**Task ID (phase-local)**: task-02
**Task Path**: phase-2/task-02-sendmessage-endpoint-path
**Spec References**: Story 1 (P1), FR-001, FR-005, FR-006
**Depends On**: None
**JIRA**: N/A

## Objective

Change `sendMessage`'s request target from `{url}v1/messages/` to `{url}messages` (Cloud API shape), with a test that actually asserts the URL — today's tests mock `request.post`'s return value but never assert what URL it was called with, so this regression would currently go undetected.

## Context

`src/app/plugins/messengers/Dialog.ts:409`:
```ts
const messageResponse = await request.post(`${url}v1/messages/`, { headers, body: messageBody })
```
must become:
```ts
const messageResponse = await request.post(`${url}messages`, { headers, body: messageBody })
```
The `url` parameter is `inbox.whatsappUrl`, already threaded through correctly from `src/app/services/SendMessageToMessenger.ts:38`. No other plumbing change is needed — this is a one-line path fix plus test coverage.

Do not touch the `headers` (`D360-API-KEY` stays as-is — FR-005) or `messageBody` construction (FR-006) — those are unrelated to the path change.

Existing tests in `src/app/plugins/messengers/Dialog.spec.ts` (`describe('#sendMessage', ...)`, lines ~1293-2491) pass `'https://waba.360dialog.io/'` as the `url` argument and mock `request.post`'s resolved value, but never assert `request.post`'s call arguments — so they will keep passing whether or not this fix is applied. Do not rely on "existing tests still pass" as proof; add the explicit assertion described below.

## Before You Start

- [ ] Switch to the base branch and pull latest: `git switch main && git pull origin main`
- [ ] Verify `phase-1/task-01-contact-validation-investigation`'s `status.md` is not required for this task (it isn't — this task only touches the path, not the contact-validation call) — confirm via `Depends On: None` above
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/plugins/messengers/Dialog.ts` | modify | Line 409 only: `v1/messages/` → `messages` |
| `src/app/plugins/messengers/Dialog.spec.ts` | modify | Update the `url` fixture in `#sendMessage` tests to the Cloud API host; add one new explicit URL-assertion test |

### Do NOT Modify

- `getWaIdContact` (`Dialog.ts:12-28`) and its tests (the "when contact is invalid" describe block) — owned by phase-2/task-03
- `downloadMedia`/`getMediaUrl` (`Dialog.ts:134-141, 441-448`) — owned by phase-2/task-04
- `setWebhook`/`searchTemplates` (`Dialog.ts:422-439`) and their tests — owned by phase-3/task-05

## Implementation Steps

### Step 1: Fix the path

In `src/app/plugins/messengers/Dialog.ts:409`, change `${url}v1/messages/` to `${url}messages`.

### Step 2: Update the test fixture host

Across `describe('#sendMessage', ...)` in `Dialog.spec.ts`, the literal `'https://waba.360dialog.io/'` passed as the second argument to `dialog.sendMessage(...)` is now semantically wrong (that host is dead). Replace it with `'https://waba-v2.360dialog.io/'` throughout this describe block only (do not touch other describe blocks — `#setWebhook`/`#searchTemplates` are task-05's scope). This is a find-and-replace within the `#sendMessage` block's line range only.

### Step 3: Add an explicit URL-assertion test

Add one new test inside `describe('#sendMessage', ...)` (e.g. a new `describe('endpoint', ...)` sibling block right after the opening of `#sendMessage`) that:
1. Sets up a minimal valid text message + contact (reuse the pattern from the existing "when the message was sent" test at `Dialog.spec.ts:1294-1344`, including a contact with a pre-set `waId` so `getWaIdContact` is not invoked).
2. Mocks `request.post` to resolve successfully.
3. Calls `dialog.sendMessage(...)`.
4. Asserts: `expect(request.post).toHaveBeenCalledWith('https://waba-v2.360dialog.io/messages', expect.objectContaining({ headers: { 'D360-API-KEY': 'token-dialog' } }))`.

This is the test that actually proves FR-001/SC-001 — without it, a future revert of this fix would go undetected, same as it did until now.

## Testing

**Spec scenarios covered**:
- [ ] Scenario: Given a Cloud API host and valid `D360-API-KEY`, When a text message is sent, Then the request POSTs to `{whatsappUrl}messages` — new test, `src/app/plugins/messengers/Dialog.spec.ts` (new `describe('endpoint', ...)` block inside `#sendMessage`)
- [ ] Scenario: Given the same setup, When a non-text message kind is sent, Then the same endpoint is used — covered by existing per-kind tests once the fixture host is updated (Step 2); no new test needed since payload shape is unchanged (FR-006)
- [ ] Scenario: Given a non-201 response, When sendMessage processes it, Then existing error-logging still works — covered by the existing "when can not send the message" test (`Dialog.spec.ts:2428+`) once its fixture host is updated

**Additional verification**:
- [ ] All existing `#sendMessage` tests still pass after the fixture host update
- [ ] `npx jest src/app/plugins/messengers/Dialog.spec.ts`
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

- [ ] No KB/doc updates required for this task (path fix only; the migration-level summary lands in task-06)

## Completion Criteria

- [ ] `sendMessage` posts to `{url}messages`
- [ ] New endpoint-assertion test passes and would fail if the path regressed to `v1/messages/`
- [ ] All existing `#sendMessage` tests pass with the updated fixture host
- [ ] Changes committed to `plan/dialog-cloud-api-migration/phase-2/task-02-sendmessage-endpoint-path` branch
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- task-03 and task-04 both depend on this task completing first (sequential chain within Phase 2) specifically to avoid concurrent edits to `Dialog.ts`/`Dialog.spec.ts`. Merge this task fully before starting task-03.
