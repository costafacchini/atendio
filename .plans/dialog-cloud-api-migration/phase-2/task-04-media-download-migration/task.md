# Task: Migrate downloadMedia/getMediaUrl to two-step Cloud API flow

**Plan**: dialog-cloud-api-migration
**Phase**: 2
**Task ID (phase-local)**: task-04
**Task Path**: phase-2/task-04-media-download-migration
**Spec References**: Story 2 (P2), FR-002
**Depends On**: phase-2/task-03-contact-validation-implementation
**JIRA**: N/A

## Objective

Replace the hardcoded, dead-host, single-GET media download in `downloadMedia`/`getMediaUrl` with the Cloud API's two-step flow, and add the test coverage this code path currently has none of.

## Context

Current code (`src/app/plugins/messengers/Dialog.ts`):
```ts
// line 134-141
const downloadMedia = async (mediaId: any, whatsappToken: any) => {
  const headers = { 'D360-API-KEY': whatsappToken }
  const response = await request.download(`https://waba.360dialog.io/v1/media/${mediaId}`, {
    headers,
  })
  return response
}

// line 441-448
async getMediaUrl(mediaId: any, _url: any, token: any, contact: any) {
  const response = await downloadMedia(mediaId, token)
  const extension = mime.extension(response.headers?.get('content-type'))
  const fileName = `${mediaId}.${extension}`
  const fileBase64 = Buffer.from(response.data).toString('base64')
  return uploadFile(this.licensee, contact, fileName, fileBase64)
}
```
Two bugs today: (1) the host is hardcoded to the dead On-Premise host, (2) `_url` (the licensee's configured `whatsappUrl`) is received but discarded — prefixed with `_` precisely because it was unused.

**Planning-time research found** (not independently verified against a live call — see spec.md Story 2 scenario 1 `[NEEDS CLARIFICATION]`):
- Step 1: `GET {whatsappUrl}{mediaId}` (no `v1/media/` prefix) returns a Meta `lookaside.fbsbx.com` URL for the media.
- Step 2: download the binary by taking that URL and replacing the `lookaside.fbsbx.com` host with `waba-v2.360dialog.io`, keeping the path/query (`/whatsapp_business/attachments/?mid=...&ext=...&hash=...`), then GET that with the `D360-API-KEY` header.

**Before implementing, confirm the exact Step 1 response shape** (which JSON field holds the lookaside URL) against 360dialog's official API reference (https://docs.360dialog.com/docs/messaging-api/api-reference/media and https://docs.360dialog.com/docs/messaging/media/upload-retrieve-or-delete-media) or a sandbox call if available. Do not guess a field name and ship it unverified — if you cannot confirm it, stop and flag this in `status.md` Blockers per this plan's Kill Criteria rather than merge an unverified shape.

`Base.ts:253-258` already calls `getMediaUrl(messageToSend.attachmentWaId, this.inbox?.whatsappUrl, this.inbox?.whatsappToken, contact)` — the signature (4 params, same order) must not change, only the parameter's internal usage (stop discarding `url`).

## Before You Start

- [ ] Switch to the base branch and pull latest: `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-2/task-03-contact-validation-implementation`'s `status.md` shows `complete`
- [ ] Confirm the Step 1 response shape per the Context section above before writing implementation code
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/plugins/messengers/Dialog.ts` | modify | `downloadMedia` (lines 134-141) and `getMediaUrl` (lines 441-448) |
| `src/app/plugins/messengers/Dialog.spec.ts` | modify | Add new `describe('#getMediaUrl', ...)` block (none exists today) |

### Do NOT Modify

- `src/app/plugins/messengers/Dialog.ts:409` (`sendMessage` path) and `getWaIdContact` — owned by task-02/task-03, already merged by the time this task runs
- `setWebhook`/`searchTemplates` — owned by phase-3/task-05
- `src/app/plugins/messengers/Base.ts` — signature contract only, do not modify this file

## Implementation Steps

### Step 1: Rewrite `downloadMedia` for the two-step flow

Accept the configured `url` (stop discarding it), and implement:
1. `GET {url}{mediaId}` with `D360-API-KEY` header → parse the lookaside URL from the response per the confirmed shape (see Context).
2. Validate the resolved URL's host is `lookaside.fbsbx.com`; if not, `logger.error` with the unexpected URL and throw/return a clear failure rather than attempting a download against an unknown host (Edge Case from spec.md).
3. Build the download URL by replacing the host with `waba-v2.360dialog.io`, keeping path + query string.
4. `request.download(downloadUrl, { headers })` as before, returning the same response shape `getMediaUrl` already expects (`response.headers`, `response.data`).

### Step 2: Update `getMediaUrl`

Pass the real `url` parameter through to `downloadMedia` instead of discarding it (rename `_url` → `url` in the signature). No other change needed — `mime.extension`/`uploadFile` logic stays identical (FR-002 final clause).

### Step 3: Add test coverage

Add `describe('#getMediaUrl', ...)` to `Dialog.spec.ts` (there is currently no direct test for this method — it's only exercised indirectly via `Base.ts`). Cover:
1. Happy path: mock the Step 1 request resolving with a `lookaside.fbsbx.com` URL, mock `request.download` resolving with headers/data, assert the final call to `request.download` targets `waba-v2.360dialog.io` with the same path/query from the lookaside URL, and assert `uploadFile`/`S3` is invoked as before (reuse the `uploadFileS3Spy`/`presignedUrlS3Spy` pattern already set up at the top of the spec file).
2. Unexpected host: mock Step 1 resolving with a URL whose host isn't `lookaside.fbsbx.com`; assert `logger.error` is called and no download is attempted.

## Testing

**Spec scenarios covered**:
- [ ] Scenario: Given a mediaId and valid token, When `getMediaUrl` is called, Then it GETs `{whatsappUrl}{mediaId}` to resolve the lookaside URL — `src/app/plugins/messengers/Dialog.spec.ts` (new `#getMediaUrl` block, happy-path test)
- [ ] Scenario: Given the lookaside URL response, When downloading, Then the host is swapped to `waba-v2.360dialog.io` and the attachments path/query is preserved — same test, assertion on `request.download`'s call args
- [ ] Scenario: Given the binary is downloaded, When `getMediaUrl` completes, Then it uploads to S3 and returns a presigned URL unchanged — same test, assertion on `uploadFileS3Spy`/`presignedUrlS3Spy`
- [ ] Edge case: unexpected lookaside host logs an error and does not attempt download — new test in the same block

**Additional verification**:
- [ ] `npx jest src/app/plugins/messengers/Dialog.spec.ts`
- [ ] Existing inbound-file-message tests under `#responseToMessages` (which exercise `getMediaUrl` indirectly via `Base.ts`) still pass
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

- [ ] No standalone KB doc required for this task; the migration-level summary (including the confirmed/unconfirmed status of the media response shape) rolls into task-06's rollout doc — note in this task's `status.md` whether Step 1's shape was confirmed via docs or sandbox, so task-06 can reflect that accurately

## Completion Criteria

- [ ] `downloadMedia`/`getMediaUrl` use `whatsappUrl` and the two-step Cloud API flow, no hardcoded host remains
- [ ] New `#getMediaUrl` tests pass, including the unexpected-host edge case
- [ ] Existing indirect coverage via `Base.ts`/`#responseToMessages` still passes
- [ ] Changes committed to `plan/dialog-cloud-api-migration/phase-2/task-04-media-download-migration` branch
- [ ] Status updated in `status.md`, including whether the Step 1 response shape was confirmed or remains a documented assumption

## Conflict Avoidance Notes

- Do not start until task-03 is `complete` (same-file serialization).
- phase-3/task-05 depends on this task completing before touching `Dialog.spec.ts` again.
