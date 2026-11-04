# Task: Department & Licensee QR/Status Endpoints

**Plan**: Wppconnect-Server WhatsApp Plugin
**Phase**: 2
**Task ID (phase-local)**: task-03
**Task Path**: phase-2/task-03-department-qr-status
**Spec References**: Story 3 (P2), FR-005
**Depends On**: phase-2/task-02-inbox-qr-status
**JIRA**: N/A

## Objective

Expose Department-level (`POST/GET /resources/departments/:id/wppconnect-server-qr|status`) and legacy Licensee-level (`POST/GET /resources/licensees/:id/wppconnect-server-qr|status`) endpoints, mirroring `GetBaileysQrForDepartment`/`GetBaileysStatusForDepartment` and `GetBaileysQr`/`GetBaileysStatus`.

## Context

Both reference groups duplicate the provider check per-provider rather than generalizing (see `.plans/wppconnect-plugin/phase-2/task-04-department-qr-status/task.md` for the identical rationale already established for the sibling `wppconnect` provider) — follow the same duplication pattern here for consistency across all three WhatsApp providers added this quarter.

`GetBaileysQrForDepartment.ts`: delegates to the Inbox-level use case when `department.inbox` is set; otherwise resolves the Licensee's Inbox with the matching `whatsappDefault` directly. `GetBaileysQr.ts` (Licensee-level, no Department): resolves the Licensee's Inbox directly, no delegation.

## Before You Start

- [ ] Switch to the planning/base branch and pull the latest plan state: `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-2/task-02-inbox-qr-status`'s `status.md` shows `complete`
- [ ] Check this task's `status.md` — if already `in-progress` or `complete`, stop and investigate
- [ ] Read `src/app/usecases/licensees/GetBaileysQrForDepartment.ts`, `GetBaileysStatusForDepartment.ts`, `GetBaileysQr.ts`, `GetBaileysStatus.ts`, and their `.spec.ts` files
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/usecases/licensees/GetWppconnectServerQrForDepartment.ts` | create | — |
| `src/app/usecases/licensees/GetWppconnectServerQrForDepartment.spec.ts` | create | — |
| `src/app/usecases/licensees/GetWppconnectServerStatusForDepartment.ts` | create | — |
| `src/app/usecases/licensees/GetWppconnectServerStatusForDepartment.spec.ts` | create | — |
| `src/app/usecases/licensees/GetWppconnectServerQr.ts` | create | Licensee-level |
| `src/app/usecases/licensees/GetWppconnectServerQr.spec.ts` | create | — |
| `src/app/usecases/licensees/GetWppconnectServerStatus.ts` | create | Licensee-level |
| `src/app/usecases/licensees/GetWppconnectServerStatus.spec.ts` | create | — |
| `src/app/routes/resources-routes.ts` | modify | Add Department and Licensee `wppconnect-server-qr|status` routes |
| `src/app/routes/resources-routes.spec.ts` | modify | Add route-level coverage |
| `src/app/controllers/DepartmentsController.ts` | modify | Add `wppconnectServerQr`/`wppconnectServerStatus` methods |
| `src/app/controllers/DepartmentsController.spec.ts` | modify | Add coverage |
| `src/app/controllers/LicenseesController.ts` | modify | Add `getWppconnectServerQr`/`getWppconnectServerStatus` methods |
| `src/app/controllers/LicenseesController.spec.ts` | modify | Add coverage |
| `src/app/runtime/dependencies.ts` | modify | Wire all four new use cases |

### Do NOT Modify

- Files owned by task-02 (Inbox use cases/routes/controller) — already merged, only imported/delegated to here

## Implementation Steps

### Step 1: Department use cases

Copy `GetBaileysQrForDepartment.ts`/`GetBaileysStatusForDepartment.ts`, delegating to `getWppconnectServerQrForInbox`/`getWppconnectServerStatusForInbox` (task-02) when `department.inbox` is set, with the Licensee-Inbox fallback otherwise. Error message: `'Licensee não usa Wppconnect Server'`.

### Step 2: Licensee-level use cases

Copy `GetBaileysQr.ts`/`GetBaileysStatus.ts` directly (no Department involved).

### Step 3: Controllers + routes

Add the methods and routes for both Department and Licensee scopes, matching existing middleware conventions for each route group.

### Step 4: Wire dependencies

Construct all four use cases in `dependencies.ts`.

## Testing

**Spec scenarios covered**:
- [ ] Scenario: Given a Department linked to a `wppconnect-server` Inbox / When QR requested / Then delegates to Inbox-level use case — `src/app/usecases/licensees/GetWppconnectServerQrForDepartment.spec.ts:TODO`
- [ ] Scenario: Given a Department with no Inbox but Licensee has a `wppconnect-server` Inbox / When QR requested / Then resolves that Inbox — `src/app/usecases/licensees/GetWppconnectServerQrForDepartment.spec.ts:TODO`

**Additional verification**:
- [ ] `DepartmentsController.spec.ts` and `LicenseesController.spec.ts` cover all new methods
- [ ] `resources-routes.spec.ts` covers all new routes
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

- [ ] No KB/doc updates required in this task — covered in task-06.

## Completion Criteria

- [ ] All four use cases, controller methods, and routes implemented and wired
- [ ] All spec acceptance scenarios for Story 3 pass
- [ ] Changes committed to `plan/wppconnect-server-plugin/phase-2/task-03-department-qr-status` branch
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- task-05 (Department admin UI) depends on this task's route contract.
- Runs after task-02 merges to avoid `dependencies.ts`/`resources-routes.ts` conflicts.
