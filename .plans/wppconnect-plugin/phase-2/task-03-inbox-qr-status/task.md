# Task: Inbox QR/Status Endpoints

**Plan**: Wppconnect WhatsApp Plugin
**Phase**: 2
**Task ID (phase-local)**: task-03
**Task Path**: phase-2/task-03-inbox-qr-status
**Spec References**: Story 1 (P1), FR-004
**Depends On**: phase-1/task-02-wppconnect-plugin-core
**JIRA**: N/A

## Objective

Expose `POST /resources/inboxes/:id/wppconnect-qr` and `GET /resources/inboxes/:id/wppconnect-status`, mirroring `GetBaileysQrForInbox`/`GetBaileysStatusForInbox` exactly, so an Inbox configured with `whatsappDefault: 'wppconnect'` can be authenticated and its connection state checked.

## Context

`src/app/usecases/licensees/GetBaileysQrForInbox.ts` is the reference: it loads the Inbox, confirms `inbox.whatsappDefault === 'baileys'`, builds the plugin via `createMessengerPlugin(licensee, { inbox })`, calls `plugin.getQrCode()`, and returns `{ qr }` or `{ connected: true, message: 'Já conectado' }`. `GetBaileysStatusForInbox.ts` (sibling file) checks connection state without generating a new QR — read it alongside this one.

Routes live in `src/app/routes/resources-routes.ts` lines 234-236 (`inboxes/:id/baileys-qr`, `baileys-status`, `baileys-sync`) — add `wppconnect-qr`/`wppconnect-status` next to them, skipping a `wppconnect-sync` equivalent (group sync is out of scope per the plan overview).

Controller methods live in `src/app/controllers/InboxesController.ts` (`baileysQr`/`baileysStatus`, see lines ~50-130) — add `wppconnectQr`/`wppconnectStatus` following the exact same try/catch and status-code conventions (408 on QR timeout, 500 on status errors, 200 otherwise).

Dependency wiring happens in `src/app/runtime/dependencies.ts` (lines ~115-128 show `getBaileysQrForInbox`/`getBaileysStatusForInbox` construction) — add the Wppconnect equivalents there, reusing `createMessengerPlugin` (no new socket-manager equivalent needed — Wppconnect's `getQrCode` is self-contained per task-02, unlike Baileys' optional persistent-socket hook).

## Before You Start

- [ ] Switch to the planning/base branch and pull the latest plan state: `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-1/task-02-wppconnect-plugin-core`'s `status.md` shows `complete`
- [ ] Check this task's `status.md` — if already `in-progress` or `complete`, stop and investigate
- [ ] Read `src/app/usecases/licensees/GetBaileysQrForInbox.ts`, `GetBaileysStatusForInbox.ts`, and their `.spec.ts` files
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/usecases/licensees/GetWppconnectQrForInbox.ts` | create | Mirrors `GetBaileysQrForInbox.ts` |
| `src/app/usecases/licensees/GetWppconnectQrForInbox.spec.ts` | create | — |
| `src/app/usecases/licensees/GetWppconnectStatusForInbox.ts` | create | Mirrors `GetBaileysStatusForInbox.ts` |
| `src/app/usecases/licensees/GetWppconnectStatusForInbox.spec.ts` | create | — |
| `src/app/routes/resources-routes.ts` | modify | Add `inboxes/:id/wppconnect-qr`, `wppconnect-status` |
| `src/app/routes/resources-routes.spec.ts` | modify | Add route-level coverage |
| `src/app/controllers/InboxesController.ts` | modify | Add `wppconnectQr`, `wppconnectStatus` methods |
| `src/app/controllers/InboxesController.spec.ts` | modify | Add coverage |
| `src/app/runtime/dependencies.ts` | modify | Wire the two new use cases |

### Do NOT Modify

- `src/app/usecases/licensees/GetBaileysQrForInbox.ts`, `GetBaileysStatusForInbox.ts` — reference only
- `src/app/plugins/messengers/Wppconnect.ts` — owned by task-02, already merged

## Implementation Steps

### Step 1: `GetWppconnectQrForInbox` use case

Copy the structure of `GetBaileysQrForInbox.ts`, swapping the `whatsappDefault` check to `'wppconnect'` and the not-configured message to `'Inbox não usa Wppconnect'`. Drop the `startBaileysSocket` fire-and-forget branch — Wppconnect has no persistent-socket feature in this plan's scope.

### Step 2: `GetWppconnectStatusForInbox` use case

Copy `GetBaileysStatusForInbox.ts`'s structure for the `{ connected: boolean }` response shape.

### Step 3: Controller methods

Add `wppconnectQr`/`wppconnectStatus` to `InboxesController.ts`, bound in the constructor exactly like `baileysQr`/`baileysStatus` (see the `this.baileysQr = this.baileysQr.bind(this)` pattern).

### Step 4: Routes

Add the two routes in `resources-routes.ts` next to the existing `inboxes/:id/baileys-*` block, with the same `authorize('admin', 'super')` middleware.

### Step 5: Wire dependencies

In `dependencies.ts`, construct `getWppconnectQrForInbox`/`getWppconnectStatusForInbox` and export them for controller injection, following the existing `getBaileysQrForInbox` pattern (no `socketManager`/`startBaileysSocket` needed).

## Testing

**Spec scenarios covered**:
- [ ] Scenario: Given no session / When QR requested / Then `{ qr }` returned — `src/app/usecases/licensees/GetWppconnectQrForInbox.spec.ts:TODO`
- [ ] Scenario: Given already connected / When QR requested / Then `{ connected: true, message: 'Já conectado' }` — `src/app/usecases/licensees/GetWppconnectQrForInbox.spec.ts:TODO`
- [ ] Scenario: Given `whatsappDefault !== 'wppconnect'` / When QR requested / Then `{ message: 'Inbox não usa Wppconnect' }` — `src/app/usecases/licensees/GetWppconnectQrForInbox.spec.ts:TODO`
- [ ] Scenario: Given connected/disconnected session / When status requested / Then `{ connected: true|false }` — `src/app/usecases/licensees/GetWppconnectStatusForInbox.spec.ts:TODO`

**Additional verification**:
- [ ] `InboxesController.spec.ts` covers both new controller methods (success + error paths)
- [ ] `resources-routes.spec.ts` covers both new routes require `authorize('admin', 'super')`
- [ ] Existing Baileys route/controller tests still pass
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

- [ ] No KB/doc updates required in this task — covered in task-08.

## Completion Criteria

- [ ] Both use cases, controller methods, and routes implemented and wired
- [ ] All spec acceptance scenarios for Story 1 pass
- [ ] Changes committed to `plan/wppconnect-plugin/phase-2/task-03-inbox-qr-status` branch
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- task-04 and task-05 both depend on this task and will add sibling use cases in the same `src/app/usecases/licensees/` directory and sibling routes in `resources-routes.ts` — this task must merge first to avoid route-file conflicts.
- task-06 (Inbox admin UI) depends on this task's route contract (`{ qr }` / `{ connected }` shapes) being stable before building the client panel against it.
