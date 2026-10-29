# Task: Investigate & decide Cloud API contact-validation strategy

**Plan**: dialog-cloud-api-migration
**Phase**: 1
**Task ID (phase-local)**: task-01
**Task Path**: phase-1/task-01-contact-validation-investigation
**Spec References**: Story 4 (P2), FR-004
**Depends On**: None
**JIRA**: N/A

## Objective

Decide what replaces `getWaIdContact`'s `v1/contacts` `force_check` validation on the Cloud API, and document that decision, before any code in `sendMessage`/`getWaIdContact` is changed.

## Context

`src/app/plugins/messengers/Dialog.ts:12-28` (`getWaIdContact`) calls `POST {url}v1/contacts/` with `force_check: true` to validate a phone number and obtain a `wa_id`, which `sendMessage` (`Dialog.ts:296-307`) uses only when the contact doesn't already have a stored `waId`. This is an On-Premise API feature.

Planning-time research (web search, no live sandbox access) found:
- 360dialog's official migration docs (https://docs.360dialog.com/partner/partner-hub/migrating-phone-numbers/hosting-type-change-on-premise-api-to-cloud-api) state API responses/parameters differ by hosting type but don't give a full endpoint mapping.
- 360dialog's Contacts/Location Messages docs (https://docs.360dialog.com/docs/waba-messaging/contacts-and-location-messages) describe `wa_id` only as metadata inside a `contacts`-type message object sent via `/messages` — not a standalone pre-send validation call.
- No source found during planning confirms a direct Cloud API replacement for `force_check`. The closest documented guidance is: send directly to the E.164 number and handle delivery errors from the `/messages` response.

This is explicitly **not confirmed** — do not treat the above as settled. This task exists to settle it before Phase 2 implements anything.

## Before You Start

- [ ] Switch to the base branch and pull latest: `git switch main && git pull origin main`
- [ ] Read `src/app/plugins/messengers/Dialog.ts` in full, focusing on `getWaIdContact` (lines 12-28) and its call site in `sendMessage` (lines 296-307)
- [ ] Read `spec.md` Story 4 and FR-004 in this plan
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `docs/kb/research/360dialog-cloud-api-contact-validation-2026.md` | create | Decision doc — see template below |
| `docs/kb/README.md` | modify | Add the new doc to the Research table (run `check-kb-index` after) |

### Do NOT Modify

- `src/app/plugins/messengers/Dialog.ts` — owned by phase-2/task-02 and phase-2/task-03
- `src/app/plugins/messengers/Dialog.spec.ts` — owned by phase-2 tasks

## Implementation Steps

### Step 1: Confirm 360dialog's current Cloud API behavior for unvalidated contacts

Check 360dialog's official API reference (not just migration/overview pages) for:
- Whether `POST {url}v1/contacts/` (or any equivalent) still exists on `waba-v2.360dialog.io` and returns a `200`/`404`/error.
- What error code/shape the `/messages` endpoint returns when sent to a number with no WhatsApp account, or to a number never messaged before.
- Whether 360dialog's support/changelog documents a recommended migration path specifically for this check.

If sandbox credentials are available (check with the user — do not assume), make a real test call rather than relying on docs alone.

### Step 2: Decide the replacement strategy

Pick one, and document why:
- **Option A (send-direct)**: Drop the pre-check entirely. `sendMessage` uses the contact's stored phone number directly as the recipient on first send. On a `/messages` error response, log it exactly like today's "contact is invalid" case (reuse `messageToSend.error` + `logger.error`).
- **Option B (keep a check, new endpoint)**: Only valid if Step 1 finds a real Cloud API contact-check endpoint — document the exact endpoint/response shape found.
- **Option C (escalate)**: If Step 1 finds no workable path at all (per the plan's Kill Criteria), stop here and escalate to the user instead of picking A or B.

### Step 3: Write the decision doc

Create `docs/kb/research/360dialog-cloud-api-contact-validation-2026.md` following the format of existing docs in `docs/kb/research/` (see `docs/kb/research/rate-limiting-2026.md` or similar for structure: **Last Updated**, **Context**, then content). Include:
- The decision (Option A/B/C) and why.
- The exact new behavior `sendMessage`/`getWaIdContact` must implement (precise enough that task-03 can implement it without re-researching).
- Any confirmed endpoint/response shapes found in Step 1, with source links.
- Explicit note if anything remains unverified (e.g., "not tested against a live sandbox — verify in task-03 before merging").

### Step 4: Update the KB index

Add a row for the new doc under docs/kb/README.md's "Research" table, then run `check-kb-index` to confirm formatting/consistency.

## Testing

**Spec scenarios covered**:
- [ ] Scenario: Given no confirmed Cloud API contact-validation endpoint exists, When this task completes, Then a documented decision exists under `docs/kb/research/` — verified by the existence and content of the decision doc itself (no automated test; this is a research/documentation task).

**Additional verification**:
- [ ] Decision doc reviewed against spec.md Story 4 acceptance scenario 1
- [ ] `pre-commit-check` passes (markdown-only change, but still run it)

## Documentation / KB Updates

- [ ] `docs/kb/research/360dialog-cloud-api-contact-validation-2026.md` created
- [ ] `docs/kb/README.md` updated with the new doc
- [ ] `check-kb-index` run after the KB change

## Completion Criteria

- [ ] Decision doc exists and clearly states Option A, B, or C with rationale
- [ ] If Option C (escalate) was chosen, the user has been notified and Phase 2's task-03 is blocked pending their response (do not proceed to task-03 automatically)
- [ ] `docs/kb/README.md` index updated
- [ ] Changes committed to `plan/dialog-cloud-api-migration/phase-1/task-01-contact-validation-investigation` branch
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- This task makes no code changes to `Dialog.ts`/`Dialog.spec.ts` — it only produces documentation, so it cannot conflict with Phase 2 tasks on those files.
- phase-2/task-03 depends on this task's decision doc; do not let task-03 start until this task is `complete`.
