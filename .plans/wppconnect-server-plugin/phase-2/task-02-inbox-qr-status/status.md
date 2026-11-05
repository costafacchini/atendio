# Status: Inbox QR/Status Endpoints

**Current Status**: complete
**Last Updated**: 2026-11-05
**Agent**: Claude
**Branch**: plan/wppconnect-server-plugin/phase-2/task-02-inbox-qr-status
**PR**: — (PR Strategy: single — opened after the full plan completes)

## Status History

| Timestamp | Status | Agent | Notes |
|-----------|--------|-------|-------|
| 2026-11-04 | not-started | — | Task created |
| 2026-11-05 | in-progress | Claude | Branch created, starting implementation |
| 2026-11-05 | complete | Claude | Use cases, controller methods, routes wired; tests + lint + typecheck + full suite green |

## Blockers

None

## Artifacts

- `src/app/usecases/licensees/GetWppconnectServerQrForInbox.ts` (+ `.spec.ts`)
- `src/app/usecases/licensees/GetWppconnectServerStatusForInbox.ts` (+ `.spec.ts`)
- `src/app/controllers/InboxesController.ts` (`wppconnectServerQr`, `wppconnectServerStatus`) (+ `.spec.ts` coverage)
- `src/app/routes/resources-routes.ts` (`POST/GET /inboxes/:id/wppconnect-server-qr|status`) (+ `.spec.ts` coverage)
- `src/app/runtime/dependencies.ts` (`getWppconnectServerQrForInbox`, `getWppconnectServerStatusForInbox` exported for task-03's Department-level delegation)
- Branch: `plan/wppconnect-server-plugin/phase-2/task-02-inbox-qr-status` (stacked on task-01's branch, pushed)

## Pre-existing bug found (NOT fixed — out of this task's scope, unrelated provider)

While reading `src/app/routes/resources-routes.ts` to see how `GetBaileysQrForDepartment`'s `getBaileysQrForInbox` dependency is wired into `DepartmentsController`, found that **`resources-routes.ts` never passes `getBaileysQrForInbox` / `getBaileysStatusForInbox` / `syncBaileysDirectoryForInbox` into `new DepartmentsController({...})`**, even though `DepartmentsController`'s constructor destructures and uses them. In production, any Department with `department.inbox` set that calls the Baileys QR/status endpoints would hit `this.getBaileysQrForInbox.execute is not a function` (undefined). This is a pre-existing bug in the Baileys Department route, unrelated to `wppconnect-server` — not fixed here per the bug-discovery protocol ("pre-existing, doesn't block, log and continue"). **Action for task-03**: when wiring `DepartmentsController` for `wppconnect-server`, make sure `getWppconnectServerQrForInbox`/`getWppconnectServerStatusForInbox` ARE correctly passed at the `resources-routes.ts` call site, so this new provider doesn't repeat the same gap.

## Adaptations

### Deviation 1: branched from task-01's branch, not from `main`
- **Task file said**: standard pre-flight is to branch from the base branch (`main`).
- **Reality**: `WppconnectServer.getQrCode`/`getConnectionStatus` (task-01) do not exist on `main` yet — PR Strategy is `single`, so task-01 won't merge until the whole plan completes. Branching from `main` here would make this task's use cases reference methods that don't exist.
- **Action taken**: Branched `plan/wppconnect-server-plugin/phase-2/task-02-inbox-qr-status` from `plan/wppconnect-server-plugin/phase-1/task-01-plugin-core` instead of `main`. All task branches in this plan will stack sequentially; the final single PR (opened at plan completion) will cover the combined diff against `main`.
