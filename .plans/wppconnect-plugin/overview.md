# Plan: Wppconnect WhatsApp Plugin

**Status**: not-started
**Created**: 2026-11-04
**Last Updated**: 2026-11-04
**Assigned Dev**: Alan Costa Facchini
**PR Strategy**: single
**Spec**: [spec.md](spec.md) — 4 user stories · 13 acceptance scenarios · 4 success criteria

## Objective

Add a `@wppconnect-team/wppconnect`-based WhatsApp messenger plugin — a Puppeteer-driven alternative to the existing Baileys plugin — selectable per Inbox/Department/Licensee via `whatsappDefault: 'wppconnect'`, following the exact `MessengersBase` plugin architecture.

## Scope

### In Scope
- `Wppconnect.ts` plugin extending `MessengersBase` (text send/receive, QR auth), mirroring `src/app/plugins/messengers/Baileys.ts`
- `@wppconnect-team/wppconnect` dependency (version looked up at implementation time per project convention — never pinned from memory)
- Reuse of the existing `WhatsappSession` Prisma model/repository for session persistence — no schema migration
- `case 'wppconnect'` in `src/app/plugins/messengers/factory.ts` and wiring in `src/app/runtime/dependencies.ts`
- Inbox-level QR/status usecases, routes, and controller methods mirroring `GetBaileysQrForInbox`/`GetBaileysStatusForInbox`
- Department-level and Licensee-level QR/status usecases mirroring the Baileys equivalents
- Admin UI: `wppconnect` dropdown option in Inbox and Department forms, `InboxWppconnectPanel.tsx` / `DepartmentWppconnectPanel.tsx` mirroring the Baileys panels, client service functions
- Dockerfile changes to install the system libraries required for headless Chromium
- Tests mirroring `Baileys.spec.ts` / `GetBaileysQrForInbox.spec.ts` patterns
- KB doc `docs/kb/features/wppconnect-whatsapp-guide.md` mirroring `baileys-whatsapp-guide.md`, plus KB index update

### Out of Scope
- Heroku Chrome buildpack setup — current production target is Heroku (`docs/kb/features/deploy-heroku.md`); this plan covers only the Docker/Fly.io path. Going live on Heroku with this plugin requires a follow-up buildpack task.
- Persistent socket monitor (`ENABLE_BAILEYS_SOCKET`-equivalent) — webhook-driven inbound only in this plan, same staged approach as `baileys-socket-monitor` was for Baileys.
- Group sync/directory (`baileys-groups-directory`-equivalent).
- Media messages beyond text.
- Multi-session per licensee/inbox.
- Any integration with `wppconnect-server` — tracked separately in `.plans/wppconnect-server-plugin/`.
- Migrating existing Baileys licensees to Wppconnect.

## Kill Criteria
- If headless Chromium cannot launch reliably inside the project's Docker image within acceptable memory limits during task-01's spike.
- If `@wppconnect-team/wppconnect`'s session/token persistence format cannot be adapted to the existing `WhatsappSession` JSON columns without a structural rewrite (see spec FR-010).
- If WhatsApp bans/rate-limits the Puppeteer-based connection method significantly more aggressively than Baileys during manual verification.

## Phases

| Phase | Name | Tasks | Dependencies | Description |
|-------|------|-------|--------------|-------------|
| 1 | Infra & Plugin Core | task-01, task-02 | None | Verify headless Chromium runs in Docker; build the `Wppconnect` plugin core |
| 2 | Backend Surface | task-03, task-04, task-05 | Phase 1 | Inbox, Department, and Licensee QR/status endpoints |
| 3 | Admin UI | task-06, task-07 | Phase 2 | Inbox and Department form wiring + QR panels |
| 4 | Docs | task-08 | Phase 3 | KB usage guide + index update |

## Task Summary

| Task Path | Title | Phase | Status | Depends On |
|-----------|-------|-------|--------|------------|
| phase-1/task-01-docker-chromium-infra | Docker Chromium Infra Spike | 1 | not-started | — |
| phase-1/task-02-wppconnect-plugin-core | Wppconnect Plugin Core | 1 | not-started | phase-1/task-01-docker-chromium-infra |
| phase-2/task-03-inbox-qr-status | Inbox QR/Status Endpoints | 2 | not-started | phase-1/task-02-wppconnect-plugin-core |
| phase-2/task-04-department-qr-status | Department QR/Status Endpoints | 2 | not-started | phase-2/task-03-inbox-qr-status |
| phase-2/task-05-licensee-qr-route | Licensee-Level QR Route Parity | 2 | not-started | phase-2/task-03-inbox-qr-status |
| phase-3/task-06-inbox-admin-ui | Inbox Admin Form + QR Panel | 3 | not-started | phase-2/task-03-inbox-qr-status |
| phase-3/task-07-department-admin-ui | Department Admin Form + QR Panel | 3 | not-started | phase-2/task-04-department-qr-status |
| phase-4/task-08-kb-docs | KB Usage Guide + Index Update | 4 | not-started | phase-3/task-06-inbox-admin-ui, phase-3/task-07-department-admin-ui |

**Parallelizable**: task-04 and task-05 (both depend only on task-03); task-06 can start as soon as task-03 is done, in parallel with task-04/task-05.

## Branch Convention

Pattern: `plan/wppconnect-plugin/{task-path}`

Example branches:
- `plan/wppconnect-plugin/phase-1/task-01-docker-chromium-infra`
- `plan/wppconnect-plugin/phase-2/task-03-inbox-qr-status`

Base branch: `main`

## Key Files

| File/Directory | Relevance |
|----------------|-----------|
| `src/app/plugins/messengers/Base.ts` | Abstract base class — `MessengersBase`, all abstract methods must be implemented |
| `src/app/plugins/messengers/Baileys.ts` | Primary reference implementation — session lifecycle, QR flow, send/receive pattern to mirror |
| `src/app/plugins/messengers/factory.ts` | Add `case 'wppconnect'` |
| `src/app/repositories/whatsappsession.ts` | Existing session repository — reused as-is |
| `prisma/schema.prisma` (`model WhatsappSession`, `model Inbox`) | Confirms no migration needed — `creds`/`keys` are generic `Json?`, `whatsappDefault` is an unconstrained `String` |
| `src/app/usecases/licensees/GetBaileysQrForInbox.ts`, `GetBaileysStatusForInbox.ts` | Reference use cases for Inbox-level QR/status |
| `src/app/usecases/licensees/GetBaileysQrForDepartment.ts`, `GetBaileysStatusForDepartment.ts` | Reference use cases for Department-level QR/status (hardcoded to `'baileys'` today — new ones needed, not generalized, to match existing per-provider duplication pattern) |
| `src/app/runtime/dependencies.ts` | Dependency graph wiring — add Wppconnect equivalents alongside the existing Baileys wiring (lines ~95-150) |
| `src/app/routes/resources-routes.ts` | Add `wppconnect-qr`/`wppconnect-status` routes (lines ~216-236 show the existing Baileys route block) |
| `src/app/controllers/InboxesController.ts`, `DepartmentsController.ts`, `LicenseesController.ts` | Add controller methods mirroring `baileysQr`/`baileysStatus` |
| `client/src/pages/Inboxes/scenes/Form/index.tsx` (line 128), `client/src/pages/Departments/scenes/Form/index.tsx` | Add `'wppconnect'` dropdown option |
| `client/src/pages/Inboxes/scenes/Edit/InboxBaileysPanel.tsx`, `client/src/pages/Departments/scenes/Edit/DepartmentBaileysPanel.tsx` | Reference panels to mirror for Wppconnect |
| `client/src/services/inbox.ts`, `client/src/services/department.ts` | Add `getInboxWppconnectQr`/`getInboxWppconnectStatus` client functions |
| `Dockerfile` | Add Chromium system dependencies to the `runner` stage |
| `docs/kb/features/baileys-whatsapp-guide.md` | Reference doc to mirror for `wppconnect-whatsapp-guide.md` |

## Risks

- Puppeteer/Chromium memory footprint per session is significantly higher than a Baileys WebSocket — mitigated by validating resource usage in task-01's spike before building on top of it.
- `node:24-slim` is a minimal base image; Chromium's system library requirements (`libnss3`, `libatk1.0-0`, `libxss1`, etc.) must be installed explicitly in the Docker `runner` stage — missing one causes a cryptic Puppeteer launch failure, not a clear error.
- Heroku is the current production deploy target and is NOT covered by this plan (see Out of Scope) — shipping this plugin to Heroku requires a separate buildpack task before go-live there.
- `GetBaileysQrForDepartment`/`GetBaileysStatusForDepartment` hardcode `whatsappDefault: 'baileys'` and literal Portuguese error strings rather than being generic — the new Wppconnect use cases duplicate this pattern rather than refactoring the Baileys ones, per the project's "minimal diff, no drive-by refactors" convention. A future plan could generalize both providers behind one use case if duplication becomes a maintenance burden.

## Success Criteria

- [ ] `Wppconnect.ts` implements all abstract methods from `MessengersBase`
- [ ] `factory.ts` instantiates `Wppconnect` for `whatsappDefault === 'wppconnect'`
- [ ] `POST /resources/inboxes/:id/wppconnect-qr` and `GET /resources/inboxes/:id/wppconnect-status` behave per spec Story 1
- [ ] Department and Licensee QR/status endpoints behave per spec Story 3
- [ ] Inbox and Department admin forms expose `wppconnect` and render the QR panel per spec Story 4
- [ ] `docker build` succeeds with Chromium launchable inside the built image
- [ ] `Wppconnect.spec.ts` and usecase specs cover all spec acceptance scenarios
- [ ] All existing tests pass (no regressions in Baileys/Dialog/Utalk/YCloud/Pabbly plugins)
- [ ] `npx eslint .` passes clean
- [ ] `docs/kb/features/wppconnect-whatsapp-guide.md` created and `docs/kb/README.md` index updated

## References

- **JIRA Epic**: N/A
- **Weekly Plan Brief**: N/A
- **Related Plans**: [.plans/baileys-plugin](../baileys-plugin/overview.md) (architectural precedent), [.plans/wppconnect-server-plugin](../wppconnect-server-plugin/overview.md) (sibling plan, independent scope)
- **Rock Alignment**: N/A
