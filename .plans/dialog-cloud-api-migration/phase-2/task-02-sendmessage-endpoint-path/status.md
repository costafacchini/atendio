# Status: Fix sendMessage endpoint path

**Current Status**: complete
**Last Updated**: 2026-10-29
**Agent**: implementer
**Branch**: plan/dialog-cloud-api-migration/phase-2/task-02-sendmessage-endpoint-path
**PR**: — (single combined PR opened later by orchestrator)

## Status History

| Timestamp | Status | Agent | Notes |
|-----------|--------|-------|-------|
| 2026-10-29 | not-started | — | Task created |
| 2026-10-29 | in-progress | implementer | Branch created from main; starting implementation |
| 2026-10-29 | complete | implementer | Path fixed, fixture host updated, new endpoint-assertion test added and verified to fail against the old path; all tests/lint green; committed and pushed |

## Blockers

None

## Artifacts

- Branch: `plan/dialog-cloud-api-migration/phase-2/task-02-sendmessage-endpoint-path` (pushed to origin)
- `src/app/plugins/messengers/Dialog.ts:409` — `${url}v1/messages/` -> `${url}messages`
- `src/app/plugins/messengers/Dialog.spec.ts` — `#sendMessage` fixture host updated from `https://waba.360dialog.io/` to `https://waba-v2.360dialog.io/` (14 occurrences, scoped to the `#sendMessage` describe block only); new `describe('endpoint', ...)` test added asserting `request.post` is called with `'https://waba-v2.360dialog.io/messages'` and `{ 'D360-API-KEY': 'token-dialog' }`
- Test results: `npx jest src/app/plugins/messengers/Dialog.spec.ts` — 45/45 passed
- Regression proof: temporarily reverted `Dialog.ts:409` to `${url}v1/messages/` and re-ran the new test in isolation (`-t "posts to the Cloud API"`) — it failed with `Expected: "https://waba-v2.360dialog.io/messages" ... Received: "https://waba-v2.360dialog.io/v1/messages/"`; fix was then restored and full suite re-verified green (45/45)
- Lint: `npx eslint src/app/plugins/messengers/Dialog.ts src/app/plugins/messengers/Dialog.spec.ts` — clean, no issues
- `pre-commit-check` — PASS (one pre-existing WARN noted: `Dialog.spec.ts` is 2700 lines, over the 500-line guideline, but this predates this task and is out of scope for a one-line path fix)

## Adaptations

None — implementation followed task.md exactly (Step 1 path fix, Step 2 fixture host replacement scoped to `#sendMessage`, Step 3 new endpoint-assertion test). `getWaIdContact`, `downloadMedia`/`getMediaUrl`, `setWebhook`/`searchTemplates` and their tests were not touched, per File Ownership / Do NOT Modify.
