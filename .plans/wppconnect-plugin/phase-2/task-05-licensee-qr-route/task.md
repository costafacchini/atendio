# Task: Licensee-Level QR Route Parity

**Plan**: Wppconnect WhatsApp Plugin
**Phase**: 2
**Task ID (phase-local)**: task-05
**Task Path**: phase-2/task-05-licensee-qr-route
**Spec References**: Story 3 (P2), FR-005
**Depends On**: phase-2/task-03-inbox-qr-status
**JIRA**: N/A

## Objective

Expose `POST /resources/licensees/:id/wppconnect-qr` and `GET /resources/licensees/:id/wppconnect-status`, mirroring the existing legacy Licensee-level Baileys routes (`GetBaileysQr.ts`/`GetBaileysStatus.ts`), for Licensees not using the newer Inbox-scoped config.

## Context

`src/app/usecases/licensees/GetBaileysQr.ts` and `GetBaileysStatus.ts` are the reference — they look up the Licensee's `messenger`-kind Inbox with `whatsappDefault: 'baileys'` directly (no Department involved) and return `{ qr }` / `{ message: 'Já conectado' }` or `{ connected: boolean }`. Routes are `src/app/routes/resources-routes.ts` lines 216-218 (`licensees/:id/baileys-status`, `baileys-qr`, `baileys-sync`). Controller methods are `getBaileysQr`/`getBaileysStatus` in `src/app/controllers/LicenseesController.ts` (lines 182-197+).

Note the subtle response difference from the Inbox-level use case: `GetBaileysQr.execute()` returns `{ message: 'Já conectado' }` (no `connected: true` key) when already connected, while `GetBaileysQrForInbox.execute()` returns `{ connected: true, message: 'Já conectado' }`. Preserve this existing inconsistency for the Wppconnect equivalents rather than "fixing" it — the client code at this layer only reads `.message`/`.qr`, and silently changing a legacy response shape is out of this plan's scope.

## Before You Start

- [ ] Switch to the planning/base branch and pull the latest plan state: `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-2/task-03-inbox-qr-status`'s `status.md` shows `complete`
- [ ] Check this task's `status.md` — if already `in-progress` or `complete`, stop and investigate
- [ ] Read `src/app/usecases/licensees/GetBaileysQr.ts`, `GetBaileysStatus.ts`, and their `.spec.ts` files
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/usecases/licensees/GetWppconnectQr.ts` | create | Mirrors `GetBaileysQr.ts` |
| `src/app/usecases/licensees/GetWppconnectQr.spec.ts` | create | — |
| `src/app/usecases/licensees/GetWppconnectStatus.ts` | create | Mirrors `GetBaileysStatus.ts` |
| `src/app/usecases/licensees/GetWppconnectStatus.spec.ts` | create | — |
| `src/app/routes/resources-routes.ts` | modify | Add `licensees/:id/wppconnect-qr`, `wppconnect-status` |
| `src/app/routes/resources-routes.spec.ts` | modify | Add route-level coverage |
| `src/app/controllers/LicenseesController.ts` | modify | Add `getWppconnectQr`/`getWppconnectStatus` methods |
| `src/app/controllers/LicenseesController.spec.ts` | modify | Add coverage |
| `src/app/runtime/dependencies.ts` | modify | Wire the two new use cases |

### Do NOT Modify

- `src/app/usecases/licensees/GetBaileysQr.ts`, `GetBaileysStatus.ts` — reference only
- Any files owned by task-04 (Department routes/controller) — runs in parallel, touches a different route block and a different controller file

## Implementation Steps

### Step 1: `GetWppconnectQr` use case

Copy `GetBaileysQr.ts`'s structure, swapping `whatsappDefault: 'baileys'` to `'wppconnect'` and the message to `'Licensee não usa Wppconnect'`. Omit the `ENABLE_BAILEYS_SOCKET` branch — not applicable.

### Step 2: `GetWppconnectStatus` use case

Copy `GetBaileysStatus.ts`'s structure.

### Step 3: Controller + routes

Add `getWppconnectQr`/`getWppconnectStatus` to `LicenseesController.ts` and the two routes in `resources-routes.ts`, matching the existing `authorize` middleware (or its absence, matching the Baileys licensee routes exactly — verify whether they currently require `authorize` before copying).

### Step 4: Wire dependencies

Construct the two new use cases in `dependencies.ts`.

## Testing

**Spec scenarios covered**:
- [ ] Scenario: Given a legacy Licensee config / When QR requested / Then response shape matches the existing Baileys licensee-level endpoint — `src/app/usecases/licensees/GetWppconnectQr.spec.ts:TODO`

**Additional verification**:
- [ ] `LicenseesController.spec.ts` covers both new methods
- [ ] `resources-routes.spec.ts` covers both new routes
- [ ] Existing Baileys licensee-level tests still pass
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

- [ ] No KB/doc updates required in this task — covered in task-08.

## Completion Criteria

- [ ] Both use cases, controller methods, and routes implemented and wired
- [ ] Spec acceptance scenario for Story 3 (Licensee-level parity) passes
- [ ] Changes committed to `plan/wppconnect-plugin/phase-2/task-05-licensee-qr-route` branch
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- Runs in parallel with task-04 — both modify `dependencies.ts` and `resources-routes.ts`; keep hunks localized to this task's specific route block and rebase before merging.
