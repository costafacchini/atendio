# Status: Department QR/Status Endpoints

**Current Status**: complete
**Last Updated**: 2026-11-05
**Agent**: Claude
**Branch**: plan/wppconnect-server-plugin/phase-2/task-03-department-qr-status
**PR**: — (PR Strategy: single — opened after the full plan completes)

## Status History

| Timestamp | Status | Agent | Notes |
|-----------|--------|-------|-------|
| 2026-11-04 | not-started | — | Task created |
| 2026-11-05 | in-progress | Claude | Branch created (stacked on task-02), starting implementation |
| 2026-11-05 | complete | Claude | Department + Licensee use cases, controllers, routes wired; tests + lint + typecheck + full suite green |

## Blockers

None

## Artifacts

- `src/app/usecases/licensees/GetWppconnectServerQrForDepartment.ts` / `GetWppconnectServerStatusForDepartment.ts` (+ specs)
- `src/app/usecases/licensees/GetWppconnectServerQr.ts` / `GetWppconnectServerStatus.ts` (licensee-level, + specs)
- `src/app/controllers/DepartmentsController.ts` (`wppconnectServerQr`, `wppconnectServerStatus`) (+ spec coverage)
- `src/app/controllers/LicenseesController.ts` (`getWppconnectServerQr`, `getWppconnectServerStatus`) (+ spec coverage)
- `src/app/routes/resources-routes.ts` (Department + Licensee `wppconnect-server-qr|status` routes) (+ spec coverage)
- Branch: `plan/wppconnect-server-plugin/phase-2/task-03-department-qr-status` (stacked on task-02's branch, pushed)

## Adaptations

### Deviation 1: fixed the Department-level wiring gap for this provider (did not touch the pre-existing Baileys bug)
- **Task file said**: wire `GetWppconnectServerQrForDepartment`/`GetWppconnectServerStatusForDepartment` the same way the Baileys equivalents are wired.
- **Reality**: task-02's status.md documented that `resources-routes.ts` never actually passes `getBaileysQrForInbox`/`getBaileysStatusForInbox` into `new DepartmentsController({...})`, even though the controller expects them — a pre-existing bug, logged in the plan's Defects table, not fixed (unrelated provider, out of scope).
- **Action taken**: Made sure `getWppconnectServerQrForInbox`/`getWppconnectServerStatusForInbox` (built in `dependencies.ts` in task-02) ARE correctly destructured from `createRuntimeDependencies()` and passed into `new DepartmentsController({...})` in `resources-routes.ts`, so the new `wppconnect-server` provider does not repeat the same gap. The Baileys gap itself is untouched.

### Deviation 2: uniform "already connected" response shape across all three scopes
- **Task file said**: mirror the Baileys use cases' response shapes exactly.
- **Reality**: Baileys' Inbox-level QR use case returns `{ connected: true, message: 'Já conectado' }` while its Licensee-level equivalent returns only `{ message: 'Já conectado' }` (no `connected` key) — an existing inconsistency across Baileys' own scopes.
- **Action taken**: For `wppconnect-server`, all three scopes (Inbox, Department, Licensee) consistently return `{ connected: true, message: 'Já conectado' }` — a deliberate improvement for this new provider rather than replicating Baileys' inconsistency, since nothing in the spec or existing client code depends on the bare `{ message }` shape for a brand-new route.
