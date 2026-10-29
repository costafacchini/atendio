# Plan: 360dialog Cloud API Migration

**Status**: not-started
**Created**: 2026-10-29
**Last Updated**: 2026-10-29
**Assigned Dev**: Alan Costa Facchini
**PR Strategy**: single
**Spec**: [spec.md](spec.md) — 4 user stories · 10 acceptance scenarios · 5 success criteria

## Objective

Migrate the `Dialog` messenger plugin (`src/app/plugins/messengers/Dialog.ts`) from the retired 360dialog On-Premise API (`waba.360dialog.io`, switched off 2025-10-23, per issue #3346) to the 360dialog Cloud API (`waba-v2.360dialog.io`), fixing the endpoint paths/flows that changed and deciding a replacement for the contact-validation step that has no confirmed Cloud API equivalent.

## Scope

### In Scope
- Fix `sendMessage`'s endpoint path (`v1/messages/` → `/messages`).
- Redesign `downloadMedia`/`getMediaUrl` for the Cloud API's two-step media retrieval flow, and stop ignoring the configurable `whatsappUrl` parameter.
- Investigate and decide a Cloud-API-compatible replacement for `getWaIdContact`'s `v1/contacts` `force_check` validation, then implement it.
- Add regression tests proving `setWebhook`/`searchTemplates` still work unchanged against the new host.
- Produce a manual rollout checklist (data/config changes the user must apply — not executed by this plan).

### Out of Scope
- Updating any licensee's stored `whatsappUrl`/`whatsappToken` in the database — data change, not code; global CLAUDE.md prohibits executing DB changes directly. Delivered as a checklist instead (task-06).
- Other messenger plugins (`YCloud.ts`, `Pabbly.ts`) — issue #3346 and this investigation are specific to 360dialog.
- 360dialog's newer BSUID/username identifier system — mentioned in vendor docs as a separate, broader migration; not required to restore basic send/receive functionality.
- Multi-webhook (`/multi_webhook`) or WABA-level webhook configuration — current code only uses the single phone-number-level webhook, which is unaffected.

## Kill Criteria

- If the Phase 1 investigation finds that Cloud API provides **no** way to send a first message to a never-contacted number at all (not even with error-handling as a fallback) — stop Phase 2's contact-validation task and escalate to the user; this would mean some licensees are structurally blocked, not just degraded.
- If 360dialog's actual (not documented) response shape for `GET {whatsappUrl}{mediaId}` cannot be confirmed before implementation (no sandbox access, docs ambiguous) — stop task-04, document the gap, and ask the user whether to proceed with a best-effort implementation flagged as unverified, or wait for sandbox access.

## Phases

| Phase | Name | Tasks | Dependencies | Description |
|-------|------|-------|--------------|-------------|
| 1 | Investigation | task-01 | None | Decide the contact-validation replacement strategy before touching `sendMessage`'s contact path |
| 2 | Core Migration | task-02, task-03, task-04 | Phase 1 (task-03 only) | Fix endpoint paths and flows in `Dialog.ts`; sequential because all three tasks touch the same file |
| 3 | Verification & Rollout | task-05, task-06 | Phase 2 | Regression-test the unchanged endpoints and produce the manual rollout checklist |

## Task Summary

| Task Path | Title | Phase | Status | Depends On |
|-----------|-------|-------|--------|------------|
| phase-1/task-01-contact-validation-investigation | Investigate & decide Cloud API contact-validation strategy | 1 | not-started | — |
| phase-2/task-02-sendmessage-endpoint-path | Fix sendMessage endpoint path | 2 | not-started | — |
| phase-2/task-03-contact-validation-implementation | Implement decided contact-validation strategy | 2 | not-started | phase-1/task-01-contact-validation-investigation, phase-2/task-02-sendmessage-endpoint-path |
| phase-2/task-04-media-download-migration | Migrate downloadMedia/getMediaUrl to two-step flow | 2 | not-started | phase-2/task-03-contact-validation-implementation |
| phase-3/task-05-webhook-templates-regression | Add regression tests for setWebhook/searchTemplates | 3 | not-started | phase-2/task-04-media-download-migration |
| phase-3/task-06-rollout-checklist-and-kb | Write manual rollout checklist + KB index update | 3 | not-started | phase-3/task-05-webhook-templates-regression |

**Note on sequencing**: task-02, task-03, and task-04 are logically about different functions, but all three modify `Dialog.ts` and `Dialog.spec.ts`. Per PR Strategy `single` and to avoid merge conflicts, they are chained sequentially rather than run in parallel, even though task-02 and task-04 have no *logical* dependency on each other.

## Branch Convention

Pattern: `plan/dialog-cloud-api-migration/{task-path}`

Example branches:
- `plan/dialog-cloud-api-migration/phase-1/task-01-contact-validation-investigation`
- `plan/dialog-cloud-api-migration/phase-2/task-02-sendmessage-endpoint-path`

Base branch: `main`

## Key Files

| File/Directory | Relevance |
|----------------|-----------|
| `src/app/plugins/messengers/Dialog.ts` | Primary file — all endpoint/flow changes land here |
| `src/app/plugins/messengers/Dialog.spec.ts` | Existing spec (2659 lines); regression + new test stubs land here |
| `src/app/plugins/messengers/Base.ts:118,253-258` | Calls `getMediaUrl(mediaId, whatsappUrl, whatsappToken, contact)` — signature must stay compatible |
| `src/types/index.ts:197` | `whatsappUrl` field definition on the inbox type |
| `docs/kb/research/` | Destination for the contact-validation decision doc (task-01) and migration summary (task-06) |
| `docs/kb/README.md` | KB index — must be updated when new research docs are added |

## Risks

- Licensee data (`whatsappUrl`) not yet pointing at `waba-v2.360dialog.io` in production — Mitigation: this plan doesn't touch data; task-06 delivers an explicit manual checklist, and code is written to work correctly once the data is correct, not to assume it already is.
- Cloud API contact-validation behavior is not officially documented — Mitigation: task-01 gates task-03; if unresolved, escalate per Kill Criteria rather than guess.
- `D360-API-KEY` values generated before migration may be rejected by Cloud API — Mitigation: documented in task-06's rollout checklist as a per-licensee action item, out of code scope.
- `GET {whatsappUrl}{mediaId}` response shape (lookaside URL field name) not independently verified against a live call — Mitigation: task-04 requires confirming the shape against 360dialog's official reference before finalizing; add defensive error logging if the shape doesn't match expectations.

## Success Criteria

- [ ] `sendMessage` posts to `{whatsappUrl}messages`, with a test asserting the exact URL
- [ ] `getMediaUrl`/`downloadMedia` implements the two-step Cloud API flow with test coverage, including an unexpected-host error path
- [ ] `setWebhook`/`searchTemplates` verified unchanged via new URL-asserting regression tests
- [ ] Contact-validation decision documented in `docs/kb/research/` and implemented in `sendMessage`/`getWaIdContact`
- [ ] `npx jest` and `npx eslint .` pass clean
- [ ] `docs/kb/README.md` index updated for any new research docs
- [ ] Manual rollout checklist delivered to the user (whatsappUrl/token data update, D360-API-KEY regeneration) — not executed by this plan
- [ ] No regressions in existing message-kind payload tests

## References

- **JIRA Epic**: N/A
- **Weekly Plan Brief**: N/A
- **Related Plans**: None
- **Rock Alignment**: N/A
- **Source Issue**: [#3346](https://github.com/costafacchini/atendio/issues/3346) (filed by an automated third-party tool; technical claim independently verified during planning)
