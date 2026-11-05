# Plan: Wppconnect-Server WhatsApp Plugin

**Status**: not-started
**Created**: 2026-11-04
**Last Updated**: 2026-11-04
**Assigned Dev**: Alan Costa Facchini
**PR Strategy**: single
**Spec**: [spec.md](spec.md) — 4 user stories · 12 acceptance scenarios · 4 success criteria

## Objective

Add a `wppconnect-server`-based WhatsApp messenger plugin — an HTTP-client plugin (same architectural family as `Dialog`/`Utalk`) that talks to a self-hosted, externally-operated `wppconnect-server` instance via its own REST API, using the existing `whatsappUrl`/`whatsappToken` Inbox fields. No Puppeteer/Chromium runs inside this app's process.

## Scope

### In Scope
- `WppconnectServer.ts` plugin extending `MessengersBase`, mirroring `src/app/plugins/messengers/Utalk.ts`'s HTTP-client shape
- `case 'wppconnect-server'` in `src/app/plugins/messengers/factory.ts`
- Reuse of the existing `whatsappUrl`/`whatsappToken` Inbox fields — no schema changes
- Reuse of the existing generic webhook route (`POST /v1/messenger/message`) for inbound — no new webhook route
- Inbox/Department/Licensee-level QR/status usecases, routes, and controller methods that call the external `wppconnect-server` instance's own session REST API
- Admin UI: `wppconnect-server` dropdown option showing (not hiding) `whatsappToken`/`whatsappUrl`, plus a QR panel
- Tests mirroring `Utalk.spec.ts`/`Dialog.spec.ts` and the Baileys usecase spec patterns
- KB doc `docs/kb/features/wppconnect-server-whatsapp-guide.md`, including the external deployment prerequisite (how to stand up `wppconnect-server` separately)

### Out of Scope
- Deploying, hosting, or operating the `wppconnect-server` instance itself — documented as an external prerequisite only.
- Any code sharing with the `wppconnect-plugin` (embedded-library) plan — fully independent, tracked separately.
- Media messages beyond text.
- Multi-session per licensee/inbox.
- Group sync/directory.

## Kill Criteria
- If `wppconnect-server`'s actual documented REST API (session/QR/send-message endpoints — spec FR-009) differs materially from what's assumed here in a way that requires redesigning the plugin contract, discovered during task-01.
- If the target `wppconnect-server` version's webhook payload shape (FR-010) cannot be mapped onto the existing `MessengersBase.responseToMessages()` contract without a structural rewrite.
- If requiring a second, independently-operated service is rejected as an unacceptable ops burden before implementation starts.

## Phases

| Phase | Name | Tasks | Dependencies | Description |
|-------|------|-------|--------------|-------------|
| 1 | Plugin Core | task-01 | None | `WppconnectServer.ts` HTTP-client plugin + factory registration |
| 2 | Backend Surface | task-02, task-03 | Phase 1 | Inbox and Department/Licensee QR/status endpoints |
| 3 | Admin UI | task-04, task-05 | Phase 2 | Inbox and Department form wiring + QR panels |
| 4 | Docs | task-06 | Phase 3 | KB usage guide + external deployment prerequisite doc |

## Task Summary

| Task Path | Title | Phase | Status | Depends On |
|-----------|-------|-------|--------|------------|
| phase-1/task-01-plugin-core | Wppconnect-Server Plugin Core | 1 | not-started | — |
| phase-2/task-02-inbox-qr-status | Inbox QR/Status Endpoints | 2 | not-started | phase-1/task-01-plugin-core |
| phase-2/task-03-department-qr-status | Department & Licensee QR/Status Endpoints | 2 | not-started | phase-2/task-02-inbox-qr-status |
| phase-3/task-04-inbox-admin-ui | Inbox Admin Form + QR Panel | 3 | not-started | phase-2/task-02-inbox-qr-status |
| phase-3/task-05-department-admin-ui | Department Admin Form + QR Panel | 3 | not-started | phase-2/task-03-department-qr-status |
| phase-4/task-06-kb-docs | KB Usage Guide + Deployment Doc | 4 | not-started | phase-3/task-04-inbox-admin-ui, phase-3/task-05-department-admin-ui |

**Parallelizable**: task-04 can start as soon as task-02 is done, in parallel with task-03.

## Branch Convention

Pattern: `plan/wppconnect-server-plugin/{task-path}`

Example branches:
- `plan/wppconnect-server-plugin/phase-1/task-01-plugin-core`
- `plan/wppconnect-server-plugin/phase-2/task-02-inbox-qr-status`

Base branch: `main`

## Key Files

| File/Directory | Relevance |
|----------------|-----------|
| `src/app/plugins/messengers/Base.ts` | Abstract base class — `MessengersBase` |
| `src/app/plugins/messengers/Utalk.ts` | Primary reference implementation — HTTP-client plugin shape (`sendMessage(messageId, url, token)` via `request.post`, webhook payload parsing) |
| `src/app/plugins/messengers/Dialog.ts` | Secondary reference for a more complex external-API plugin |
| `src/app/services/request.ts` | Generic HTTP client wrapper — `request.get/post(url, { headers, body })` |
| `src/app/plugins/messengers/factory.ts` | Add `case 'wppconnect-server'` |
| `src/app/usecases/webhooks/IngestMessengerMessage.ts` | Confirms the existing webhook pipeline is plugin-agnostic — reused unchanged |
| `src/app/usecases/licensees/GetBaileysQrForInbox.ts`, `GetBaileysQrForDepartment.ts`, `GetBaileysQr.ts` | Structural reference for the new QR/status use cases (HTTP calls to the external instance replace the in-process socket calls) |
| `src/app/runtime/dependencies.ts` | Wiring point for the new use cases |
| `src/app/routes/resources-routes.ts` | Add `wppconnect-server-qr`/`wppconnect-server-status` routes |
| `client/src/pages/Inboxes/scenes/Form/index.tsx` (line 58) | `showWhatsappCredentials` condition — `wppconnect-server` must NOT be added to the hide-list |
| `client/src/pages/Inboxes/scenes/Edit/InboxBaileysPanel.tsx` | Reference panel structure (QR render), adapted for an HTTP-based status check |
| `docs/kb/features/dialog-360dialog-cloud-api-migration.md` | Reference for documenting an external-API-backed plugin |

## Risks

- `wppconnect-server`'s actual REST API shape (FR-009) and webhook payload shape (FR-010) are not verified against a live instance as of plan creation — task-01 must confirm both against the target deployed version before writing the parser/client code, not assume the commonly-documented route names are exact.
- Operating a second, independently-deployed service adds ops burden (uptime, upgrades, session storage on that side) not covered by this plan.
- Unlike Baileys/Wppconnect, session state lives entirely on the external instance — if that instance loses its session store, this app has no record to recover from; only the external instance's own backup/restore practices apply.

## Success Criteria

- [ ] `WppconnectServer.ts` implements all abstract methods from `MessengersBase`
- [ ] `factory.ts` instantiates `WppconnectServer` for `whatsappDefault === 'wppconnect-server'`
- [ ] Inbox/Department/Licensee QR/status endpoints behave per spec Stories 1 and 3
- [ ] Inbound messages flow through the existing generic webhook with no new route added
- [ ] Inbox and Department admin forms expose `wppconnect-server`, show (not hide) token/URL fields, and render the QR panel per spec Story 4
- [ ] All existing tests pass (no regressions)
- [ ] `npx eslint .` passes clean
- [ ] `docs/kb/features/wppconnect-server-whatsapp-guide.md` created and `docs/kb/README.md` index updated

## References

- **JIRA Epic**: N/A
- **Weekly Plan Brief**: N/A
- **Related Plans**: [.plans/wppconnect-plugin](../wppconnect-plugin/overview.md) (sibling plan, independent scope — embedded library instead of external service)
- **Rock Alignment**: N/A
