# Task: Department QR/Status Endpoints

**Plan**: Wppconnect WhatsApp Plugin
**Phase**: 2
**Task ID (phase-local)**: task-04
**Task Path**: phase-2/task-04-department-qr-status
**Spec References**: Story 3 (P2), FR-005
**Depends On**: phase-2/task-03-inbox-qr-status
**JIRA**: N/A

## Objective

Expose `POST /resources/departments/:id/wppconnect-qr` and `GET /resources/departments/:id/wppconnect-status`, mirroring `GetBaileysQrForDepartment`/`GetBaileysStatusForDepartment`, so a Department (with or without a dedicated Inbox) can connect via Wppconnect.

## Context

`src/app/usecases/licensees/GetBaileysQrForDepartment.ts` is the reference: if `department.inbox` is set, it delegates to `getBaileysQrForInbox.execute(department.inbox)`; otherwise it looks up the Licensee's Inbox with `whatsappDefault: 'baileys'` directly. This duplication (hardcoded provider string, duplicated not-configured message) is intentional — it matches the existing per-provider pattern rather than generalizing across providers (see plan Risks).

Routes live in `src/app/routes/resources-routes.ts` lines 225-227 (`departments/:id/baileys-qr`, `baileys-status`, `baileys-sync`). Controller methods live in `src/app/controllers/DepartmentsController.ts`.

## Before You Start

- [ ] Switch to the planning/base branch and pull the latest plan state: `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-2/task-03-inbox-qr-status`'s `status.md` shows `complete`
- [ ] Check this task's `status.md` — if already `in-progress` or `complete`, stop and investigate
- [ ] Read `src/app/usecases/licensees/GetBaileysQrForDepartment.ts`, `GetBaileysStatusForDepartment.ts`, and their `.spec.ts` files
- [ ] Confirm `GetWppconnectQrForInbox`/`GetWppconnectStatusForInbox` (task-03) are available for delegation
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/usecases/licensees/GetWppconnectQrForDepartment.ts` | create | Mirrors `GetBaileysQrForDepartment.ts` |
| `src/app/usecases/licensees/GetWppconnectQrForDepartment.spec.ts` | create | — |
| `src/app/usecases/licensees/GetWppconnectStatusForDepartment.ts` | create | Mirrors `GetBaileysStatusForDepartment.ts` |
| `src/app/usecases/licensees/GetWppconnectStatusForDepartment.spec.ts` | create | — |
| `src/app/routes/resources-routes.ts` | modify | Add `departments/:id/wppconnect-qr`, `wppconnect-status` |
| `src/app/routes/resources-routes.spec.ts` | modify | Add route-level coverage |
| `src/app/controllers/DepartmentsController.ts` | modify | Add `wppconnectQr`/`wppconnectStatus` methods |
| `src/app/controllers/DepartmentsController.spec.ts` | modify | Add coverage |
| `src/app/runtime/dependencies.ts` | modify | Wire the two new use cases |

### Do NOT Modify

- `src/app/routes/resources-routes.ts` Inbox route block — owned by task-03 (already merged by the time this task starts)
- `src/app/usecases/licensees/GetBaileysQrForDepartment.ts`, `GetBaileysStatusForDepartment.ts` — reference only

## Implementation Steps

### Step 1: `GetWppconnectQrForDepartment` use case

Copy `GetBaileysQrForDepartment.ts`'s structure: delegate to `getWppconnectQrForInbox.execute(department.inbox)` when `department.inbox` is set; otherwise look up the Licensee's Inbox with `whatsappDefault: 'wppconnect'` and build the plugin directly. Swap error messages to `'Licensee não usa Wppconnect'`.

### Step 2: `GetWppconnectStatusForDepartment` use case

Copy `GetBaileysStatusForDepartment.ts`'s equivalent structure.

### Step 3: Controller + routes

Add `wppconnectQr`/`wppconnectStatus` to `DepartmentsController.ts` and the two routes in `resources-routes.ts`, matching the existing `authorize('admin', 'super')` middleware on the Baileys department routes.

### Step 4: Wire dependencies

In `dependencies.ts`, construct the two new use cases, injecting `getWppconnectQrForInbox` for delegation (mirrors how `getBaileysQrForDepartment` injects `getBaileysQrForInbox`).

## Testing

**Spec scenarios covered**:
- [ ] Scenario: Given a Department linked to a Wppconnect Inbox / When QR requested / Then delegates to Inbox-level use case — `src/app/usecases/licensees/GetWppconnectQrForDepartment.spec.ts:TODO`
- [ ] Scenario: Given a Department with no Inbox but Licensee has a Wppconnect Inbox / When QR requested / Then resolves that Inbox — `src/app/usecases/licensees/GetWppconnectQrForDepartment.spec.ts:TODO`

**Additional verification**:
- [ ] `DepartmentsController.spec.ts` covers both new methods
- [ ] `resources-routes.spec.ts` covers both new routes
- [ ] Existing Baileys department tests still pass
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

- [ ] No KB/doc updates required in this task — covered in task-08.

## Completion Criteria

- [ ] Both use cases, controller methods, and routes implemented and wired
- [ ] All spec acceptance scenarios for Story 3 (Department-related) pass
- [ ] Changes committed to `plan/wppconnect-plugin/phase-2/task-04-department-qr-status` branch
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- Runs in parallel with task-05 — both modify `dependencies.ts`; keep additions localized and rebase before merging to avoid overlapping hunks.
- task-07 (Department admin UI) depends on this task's route contract.
