# Task: Inbox QR/Status Endpoints

**Plan**: Wppconnect-Server WhatsApp Plugin
**Phase**: 2
**Task ID (phase-local)**: task-02
**Task Path**: phase-2/task-02-inbox-qr-status
**Spec References**: Story 1 (P1), FR-005
**Depends On**: phase-1/task-01-plugin-core
**JIRA**: N/A

## Objective

Expose `POST /resources/inboxes/:id/wppconnect-server-qr` and `GET /resources/inboxes/:id/wppconnect-server-status`, proxying the external `wppconnect-server` instance's own session REST API (confirmed in task-01), so an Inbox configured with `whatsappDefault: 'wppconnect-server'` can be authenticated.

## Context

Structurally this mirrors `GetBaileysQrForInbox.ts`/`GetBaileysStatusForInbox.ts` (`src/app/usecases/licensees/`), but the QR/status check is an **HTTP call to the external instance** (using the Inbox's `whatsappUrl`/`whatsappToken`) instead of opening an in-process socket. Use the `request` service (`src/app/services/request.ts`) directly, or add a small helper method on `WppconnectServer` (e.g. `getQrCode(url, token)`/`getStatus(url, token)`) that the use case calls via `createMessengerPlugin` — follow whichever shape task-01 already established for consistency (check `WppconnectServer.ts` before deciding).

Routes mirror `src/app/routes/resources-routes.ts` lines 234-236 (Inbox Baileys route block). Controller methods mirror `InboxesController.ts`'s `baileysQr`/`baileysStatus`.

## Before You Start

- [ ] Switch to the planning/base branch and pull the latest plan state: `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-1/task-01-plugin-core`'s `status.md` shows `complete` and read its recorded FR-009/FR-010 findings
- [ ] Check this task's `status.md` — if already `in-progress` or `complete`, stop and investigate
- [ ] Read `src/app/usecases/licensees/GetBaileysQrForInbox.ts`, `GetBaileysStatusForInbox.ts`, and `src/app/plugins/messengers/WppconnectServer.ts` (from task-01)
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/usecases/licensees/GetWppconnectServerQrForInbox.ts` | create | — |
| `src/app/usecases/licensees/GetWppconnectServerQrForInbox.spec.ts` | create | — |
| `src/app/usecases/licensees/GetWppconnectServerStatusForInbox.ts` | create | — |
| `src/app/usecases/licensees/GetWppconnectServerStatusForInbox.spec.ts` | create | — |
| `src/app/routes/resources-routes.ts` | modify | Add `inboxes/:id/wppconnect-server-qr`, `wppconnect-server-status` |
| `src/app/routes/resources-routes.spec.ts` | modify | Add route-level coverage |
| `src/app/controllers/InboxesController.ts` | modify | Add `wppconnectServerQr`, `wppconnectServerStatus` methods |
| `src/app/controllers/InboxesController.spec.ts` | modify | Add coverage |
| `src/app/runtime/dependencies.ts` | modify | Wire the two new use cases |

### Do NOT Modify

- `src/app/usecases/licensees/GetBaileysQrForInbox.ts`, `GetBaileysStatusForInbox.ts` — reference only
- Any `.plans/wppconnect-plugin` files, even if that plan has merged — fully independent plugin

## Implementation Steps

### Step 1: `GetWppconnectServerQrForInbox` use case

Load the Inbox, confirm `whatsappDefault === 'wppconnect-server'` and that `whatsappUrl`/`whatsappToken` are both present (spec Scenario 4 — return a clear "missing configuration" message if not, rather than throwing). Call the external instance's session-start/QR endpoint (via `WppconnectServer`'s helper or `request` directly, per task-01's established shape) and return `{ qr }` or `{ connected: true, message: 'Já conectado' }`.

### Step 2: `GetWppconnectServerStatusForInbox` use case

Call the external instance's status endpoint, returning `{ connected: boolean }`.

### Step 3: Controller + routes

Add `wppconnectServerQr`/`wppconnectServerStatus` to `InboxesController.ts` and the two routes in `resources-routes.ts`, matching the existing `authorize('admin', 'super')` middleware.

### Step 4: Wire dependencies

Construct both use cases in `dependencies.ts`.

## Testing

**Spec scenarios covered**:
- [ ] Scenario: Given a configured Inbox / When QR requested / Then `{ qr }` from the external instance — `src/app/usecases/licensees/GetWppconnectServerQrForInbox.spec.ts:TODO`
- [ ] Scenario: Given already connected / When QR requested / Then `{ connected: true, message: 'Já conectado' }` — `src/app/usecases/licensees/GetWppconnectServerQrForInbox.spec.ts:TODO`
- [ ] Scenario: Given `whatsappDefault !== 'wppconnect-server'` / When QR requested / Then `{ message: 'Inbox não usa Wppconnect Server' }` — `src/app/usecases/licensees/GetWppconnectServerQrForInbox.spec.ts:TODO`
- [ ] Scenario: Given missing `whatsappUrl`/`whatsappToken` / When QR requested / Then a clear missing-configuration response, not a thrown error — `src/app/usecases/licensees/GetWppconnectServerQrForInbox.spec.ts:TODO`
- [ ] Scenario: Given connected/disconnected external session / When status requested / Then `{ connected: true|false }` — `src/app/usecases/licensees/GetWppconnectServerStatusForInbox.spec.ts:TODO`

**Additional verification**:
- [ ] `InboxesController.spec.ts` covers both new controller methods
- [ ] `resources-routes.spec.ts` covers both new routes
- [ ] Mocked HTTP failures (network error, external 4xx/5xx) are handled without unhandled rejections
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

- [ ] No KB/doc updates required in this task — covered in task-06.

## Completion Criteria

- [ ] Both use cases, controller methods, and routes implemented and wired
- [ ] All spec acceptance scenarios for Story 1 pass
- [ ] Changes committed to `plan/wppconnect-server-plugin/phase-2/task-02-inbox-qr-status` branch
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- task-03 depends on this task and adds sibling use cases/routes — must merge first.
- task-04 (Inbox admin UI) depends on this task's route contract being stable.
