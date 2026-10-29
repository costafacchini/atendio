# Task: Implement decided contact-validation strategy

**Plan**: dialog-cloud-api-migration
**Phase**: 2
**Task ID (phase-local)**: task-03
**Task Path**: phase-2/task-03-contact-validation-implementation
**Spec References**: Story 4 (P2), FR-004
**Depends On**: phase-1/task-01-contact-validation-investigation, phase-2/task-02-sendmessage-endpoint-path
**JIRA**: N/A

## Objective

Implement whatever strategy was decided in `docs/kb/research/360dialog-cloud-api-contact-validation-2026.md` (task-01's output) to replace `getWaIdContact`'s `v1/contacts` `force_check` call, which has no confirmed Cloud API equivalent.

## Context

**Do not start this task until you have read task-01's decision doc.** This task file intentionally does not prescribe the exact implementation, because that decision belongs to task-01 — implementing a guess here would contradict the investigation this plan's Phase 1 exists to do.

Current code, for reference:
- `getWaIdContact` (`Dialog.ts:12-28`): `POST {url}v1/contacts/` with `force_check: true`, returns `{ valid, waId, data }`.
- Call site in `sendMessage` (`Dialog.ts:296-307`):
  ```ts
  let waId = messageContact.waId
  if (!waId) {
    const waContact = await getWaIdContact(messageContact.number, url, token)
    if (waContact.valid) {
      waId = waContact.waId
    } else {
      logger.error(`A mensagem não foi enviada para a Dialog pois o contato não é válido ${JSON.stringify(waContact.data)}`)
      return
    }
  }
  ```
- Existing test coverage for this path: `describe('when contact is invalid', ...)` at `Dialog.spec.ts:2388-2427` (mocks the `v1/contacts` call returning `status: 'invalid'`).

By the time this task starts, `Dialog.ts:409` already posts to `{url}messages` (task-02 merged) — build on that, don't re-fix it.

## Before You Start

- [ ] Switch to the base branch and pull latest: `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-1/task-01-contact-validation-investigation`'s `status.md` shows `complete`
- [ ] Verify `phase-2/task-02-sendmessage-endpoint-path`'s `status.md` shows `complete`
- [ ] Read `docs/kb/research/360dialog-cloud-api-contact-validation-2026.md` in full — this is the actual spec for this task's implementation
- [ ] If the decision doc says Option C (escalate, no workable path found), stop here — do not implement anything; confirm with the user how to proceed before writing code
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/plugins/messengers/Dialog.ts` | modify | `getWaIdContact` (lines 12-28) and its call site in `sendMessage` (lines 296-307), per the decision doc |
| `src/app/plugins/messengers/Dialog.spec.ts` | modify | Update/replace `describe('when contact is invalid', ...)` (lines 2388-2427) to match the new behavior |

### Do NOT Modify

- `src/app/plugins/messengers/Dialog.ts:409` (the `{url}messages` path) — already fixed by task-02, do not re-touch
- `downloadMedia`/`getMediaUrl` — owned by phase-2/task-04
- `setWebhook`/`searchTemplates` — owned by phase-3/task-05

## Implementation Steps

### Step 1: Implement the decided strategy

Follow `docs/kb/research/360dialog-cloud-api-contact-validation-2026.md` exactly. If it chose Option A (send-direct): remove or bypass the `v1/contacts` call, use the contact's stored number directly as the send target on first contact, and keep `waId` resolution logic minimal (e.g., treat the E.164 number as `waId` until a real `wa_id` is observed in a later webhook, if the decision doc specifies that). If it chose Option B (new endpoint found): implement exactly the endpoint/response shape documented there — do not invent a shape that wasn't confirmed.

### Step 2: Preserve the error-logging contract

Whatever the new flow, a send to an invalid/unreachable contact must still result in `messageToSend.error` being set and `logger.error` being called (FR-004 acceptance scenario 3, mirroring Story 1's existing error-path behavior in `sendMessage`'s final `else` branch at `Dialog.ts:415-419`). Reuse that existing error branch where possible instead of adding a second, parallel error-handling path.

### Step 3: Update tests

Replace the `describe('when contact is invalid', ...)` test (`Dialog.spec.ts:2388-2427`) with one or more tests matching the new flow: mock whatever request(s) the new strategy makes, and assert the same user-visible outcome (message not marked `sended`, appropriate error logged/stored) using inputs realistic to the decided strategy.

## Testing

**Spec scenarios covered**:
- [ ] Scenario: Given the decision is implemented, When a contact without a stored `waId` sends/receives a first message, Then `sendMessage` no longer calls `v1/contacts` — `src/app/plugins/messengers/Dialog.spec.ts` (replaces `when contact is invalid` block)
- [ ] Scenario: Given the Cloud API `/messages` response indicates an invalid/unknown recipient, When `sendMessage` processes it, Then the existing error-logging path still captures the failure — same test file, new assertion

**Additional verification**:
- [ ] `npx jest src/app/plugins/messengers/Dialog.spec.ts`
- [ ] Existing `#sendMessage` tests with a contact that already has `waId` set are unaffected (no regression to the already-validated path)
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

- [ ] If implementation deviated from the decision doc in any way, update `docs/kb/research/360dialog-cloud-api-contact-validation-2026.md` to reflect what was actually built, and note the deviation in this task's `status.md` Adaptations section
- [ ] `check-kb-index` if the KB doc content materially changed

## Completion Criteria

- [ ] `getWaIdContact`/`sendMessage` implement the decision doc's chosen strategy
- [ ] No references to `v1/contacts` remain in `Dialog.ts` unless the decision doc explicitly kept that endpoint
- [ ] Error-logging contract preserved and tested
- [ ] Changes committed to `plan/dialog-cloud-api-migration/phase-2/task-03-contact-validation-implementation` branch
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- Do not start until task-01 (decision) and task-02 (same-file path fix) are both `complete`.
- phase-2/task-04 depends on this task completing (same-file serialization) — merge fully before starting task-04.
