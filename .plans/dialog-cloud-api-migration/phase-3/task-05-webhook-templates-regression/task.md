# Task: Add regression tests for setWebhook/searchTemplates

**Plan**: dialog-cloud-api-migration
**Phase**: 3
**Task ID (phase-local)**: task-05
**Task Path**: phase-3/task-05-webhook-templates-regression
**Spec References**: Story 3 (P3), FR-003
**Depends On**: phase-2/task-04-media-download-migration
**JIRA**: N/A

## Objective

Prove — with an explicit URL assertion, not just a passing mocked test — that `setWebhook` and `searchTemplates` keep working unchanged against the Cloud API host, since their paths (`v1/configs/webhook`, `v1/configs/templates`) are not expected to change.

## Context

`src/app/plugins/messengers/Dialog.ts:429` (`setWebhook`) and `Dialog.ts:33` (`getTemplates`, called by `searchTemplates`) already use `{url}v1/configs/webhook` and `{url}v1/configs/templates`. Planning-time research confirmed these paths are unchanged on the Cloud API (https://docs.360dialog.com/partner/integrations-and-api-development/webhook-events-and-setup/webhook-configuration-and-management, https://docs.360dialog.com/docs/resources/templates) — only the host changes.

**This task is verification, not a redesign.** Existing tests (`Dialog.spec.ts:2492-2639`) already call these methods with `'https://waba.360dialog.io/'` and mock the request layer, but — same gap as task-02 found for `sendMessage` — they don't assert the exact URL called, so they wouldn't catch a path regression either.

If, while adding the explicit assertion, you discover the path actually does need to change (i.e., the planning-time research was wrong), stop and treat that as a new finding: update `spec.md` FR-003 and this task's scope, and do not silently implement an undocumented path change.

## Before You Start

- [ ] Switch to the base branch and pull latest: `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-2/task-04-media-download-migration`'s `status.md` shows `complete`
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/plugins/messengers/Dialog.spec.ts` | modify | `#setWebhook` (lines ~2492-2510) and `#searchTemplates` (lines ~2511-2639) blocks: update fixture host, add URL assertions |

### Do NOT Modify

- `src/app/plugins/messengers/Dialog.ts` — no production code change expected for this task; if research turns out wrong, escalate per the Context section instead of changing code silently here
- Any other describe block in `Dialog.spec.ts` outside `#setWebhook`/`#searchTemplates`

## Implementation Steps

### Step 1: Update fixture hosts

In `describe('#setWebhook', ...)` and `describe('#searchTemplates', ...)`, replace `'https://waba.360dialog.io/'` with `'https://waba-v2.360dialog.io/'` in the method calls.

### Step 2: Add explicit URL assertions

For `setWebhook`: assert `request.post` was called with `'https://waba-v2.360dialog.io/v1/configs/webhook'` and the expected body/headers (reuse the existing body assertion already in the test at `Dialog.spec.ts:2495-2505`).

For `searchTemplates`/`getTemplates`: assert `request.get` was called with `'https://waba-v2.360dialog.io/v1/configs/templates'` and the `D360-API-KEY` header.

## Testing

**Spec scenarios covered**:
- [ ] Scenario: Given `whatsappUrl` set to the Cloud API host, When `setWebhook` runs, Then it POSTs to `{whatsappUrl}v1/configs/webhook` unchanged — `src/app/plugins/messengers/Dialog.spec.ts:2492+`
- [ ] Scenario: Given `whatsappUrl` set to the Cloud API host, When `searchTemplates` runs, Then it GETs `{whatsappUrl}v1/configs/templates` unchanged — `src/app/plugins/messengers/Dialog.spec.ts:2511+`

**Additional verification**:
- [ ] `npx jest src/app/plugins/messengers/Dialog.spec.ts`
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

- [ ] No KB/doc updates required for this task unless Step 1/2 reveals the paths actually changed — in that case, update `spec.md` and flag it for task-06 to include in the rollout doc

## Completion Criteria

- [ ] `setWebhook`/`searchTemplates` tests assert the exact Cloud API URL, not just mocked responses
- [ ] No production code changed, unless a real path discrepancy was found and documented
- [ ] Changes committed to `plan/dialog-cloud-api-migration/phase-3/task-05-webhook-templates-regression` branch
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- Do not start until task-04 is `complete` (same spec file).
- phase-3/task-06 depends on this task completing.
