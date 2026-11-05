# Plan: Wppconnect-Server WhatsApp Plugin

**Status**: complete
**Created**: 2026-11-04
**Last Updated**: 2026-11-05
**Assigned Dev**: Alan Costa Facchini
**PR Strategy**: single
**Spec**: [spec.md](spec.md) — 4 user stories · 12 acceptance scenarios · 4 success criteria

## Objective

Add a `wppconnect-server`-based WhatsApp messenger plugin — an HTTP-client plugin (same architectural family as `Dialog`/`Utalk`) that talks to a self-hosted, externally-operated `wppconnect-server` instance via its own REST API, using the existing `whatsappUrl`/`whatsappToken` Inbox fields. No Puppeteer/Chromium runs inside this app's process.

> **Post-implementation naming update (2026-11-05, before merge)**: after all 6 tasks were implemented under the plugin identifier `wppconnect-server`, the user requested the identifier be version-pinned to the upstream `wppconnect-server` project's major version instead — since this is self-hosted, different licensees could run different major versions simultaneously, and a future breaking API change upstream shouldn't silently break already-configured Inboxes. Every class name, file name, route segment (`wppconnect-server-qr` → `wppconnect-server-v2-qr`), `whatsappDefault` value, i18n key, and the KB guide were renamed from `wppconnect-server` to **`wppconnect-server-v2`**, pinned to the verified upstream release `v2.10.76` (2026-11-05, major version 2). This plan's own folder path (`.plans/wppconnect-server-plugin/`) and the task files below were **not** renamed/rewritten — they remain the historical record of what was planned and built under the original identifier; the actual shipped identifier is `wppconnect-server-v2`, documented in `docs/kb/features/wppconnect-server-v2-whatsapp-guide.md`. A future `wppconnect-server-v3` plugin (for a breaking upstream major release) would be a new, separate plugin, not a modification of this one.

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
| phase-1/task-01-plugin-core | Wppconnect-Server Plugin Core | 1 | complete | — |
| phase-2/task-02-inbox-qr-status | Inbox QR/Status Endpoints | 2 | complete | phase-1/task-01-plugin-core |
| phase-2/task-03-department-qr-status | Department & Licensee QR/Status Endpoints | 2 | complete | phase-2/task-02-inbox-qr-status |
| phase-3/task-04-inbox-admin-ui | Inbox Admin Form + QR Panel | 3 | complete | phase-2/task-02-inbox-qr-status |
| phase-3/task-05-department-admin-ui | Department Admin Form + QR Panel | 3 | complete | phase-2/task-03-department-qr-status |
| phase-4/task-06-kb-docs | KB Usage Guide + Deployment Doc | 4 | complete | phase-3/task-04-inbox-admin-ui, phase-3/task-05-department-admin-ui |

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

- [x] `WppconnectServer.ts` implements all abstract methods from `MessengersBase`
- [x] `factory.ts` instantiates `WppconnectServer` for `whatsappDefault === 'wppconnect-server'`
- [x] Inbox/Department/Licensee QR/status endpoints behave per spec Stories 1 and 3
- [x] Inbound messages flow through the existing generic webhook with no new route added
- [x] Inbox and Department admin forms expose `wppconnect-server`, show (not hide) token/URL fields, and render the QR panel per spec Story 4
- [x] All existing tests pass (no regressions) — full backend suite (2693 tests) and client suite (338 tests) green as of task-05
- [x] `npx eslint .` passes clean on all touched backend files
- [x] `docs/kb/features/wppconnect-server-whatsapp-guide.md` created and `docs/kb/README.md` index updated

## Spec Success Criteria Verification

- **SC-001** (end-to-end QR connect without touching code): Met structurally — QR/status endpoints and admin UI are wired end-to-end. Not verified against a live `wppconnect-server` instance (none available in this environment); FR-009/FR-010 were verified against the public source code instead, per task-01.
- **SC-002** (text message round-trip through the existing webhook): Met — no new webhook route added; `WppconnectServer.responseToMessages()`/`sendMessage()` covered by unit tests.
- **SC-003** (no regression in existing plugin tests): Met — full test suite green after every task.
- **SC-004** (no Puppeteer/Chromium dependency added): Met — `WppconnectServer.ts` only uses the existing `request` HTTP service.

## Defects

| Found In | Description | Status | Notes |
|----------|-------------|--------|-------|
| task-02 | `resources-routes.ts` never passes `getBaileysQrForInbox`/`getBaileysStatusForInbox`/`syncBaileysDirectoryForInbox` into `new DepartmentsController({...})`, even though `DepartmentsController` destructures and uses them — pre-existing bug in the **Baileys** Department QR/status path, unrelated to this plan's `wppconnect-server` provider | Logged, not fixed (out of scope) | See `phase-2/task-02-inbox-qr-status/status.md` for detail. Confirmed in task-03 that the equivalent `wppconnect-server` wiring IS correct (`getWppconnectServerQrForInbox`/`getWppconnectServerStatusForInbox` are passed into `DepartmentsController`) — only the pre-existing Baileys gap remains unfixed. |

## References

- **JIRA Epic**: N/A
- **Weekly Plan Brief**: N/A
- **Related Plans**: [.plans/wppconnect-plugin](../wppconnect-plugin/overview.md) (sibling plan, independent scope — embedded library instead of external service)
- **Rock Alignment**: N/A
