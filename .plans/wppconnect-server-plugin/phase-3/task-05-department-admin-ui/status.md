# Status: Department Admin Form + QR Panel

**Current Status**: complete
**Last Updated**: 2026-11-05
**Agent**: Claude
**Branch**: plan/wppconnect-server-plugin/phase-3/task-05-department-admin-ui
**PR**: — (PR Strategy: single — opened after the full plan completes)

## Status History

| Timestamp | Status | Agent | Notes |
|-----------|--------|-------|-------|
| 2026-11-04 | not-started | — | Task created |
| 2026-11-05 | in-progress | Claude | Branch created (stacked on task-04), starting implementation |
| 2026-11-05 | complete | Claude | Panel + service + i18n wired alongside DepartmentBaileysPanel; Vitest + tsc green |

## Blockers

None

## Artifacts

- `client/src/pages/Departments/scenes/Edit/DepartmentWppconnectServerPanel.tsx`
- `client/src/pages/Departments/scenes/Form/index.tsx` (renders the new panel alongside `DepartmentBaileysPanel`, same `departmentId &&` guard)
- `client/src/pages/Departments/scenes/Edit/index.spec.tsx` (1 new test + mock wiring)
- `client/src/services/department.ts` / `.spec.ts` (`getDepartmentWppconnectServerStatus`, `getDepartmentWppconnectServerQr`)
- `client/src/i18n/locales/pt.json` / `en.json` (`departments.wppconnectServer.*`)
- Branch: `plan/wppconnect-server-plugin/phase-3/task-05-department-admin-ui` (stacked on task-04's branch, pushed)

## Adaptations

### Deviation 1: added `getDepartmentWppconnectServerStatus` mock to the existing Edit spec's `mount()` helper
- **Task file said**: add a component-level test for the new panel.
- **Reality**: `Edit/index.spec.tsx` uses `vi.mock('../../../../services/department')` (full auto-mock) — without an explicit `mockResolvedValue`, the new panel's `useEffect` calling `.then()` on an auto-mocked (non-promise-returning) function would throw.
- **Action taken**: Added `(getDepartmentWppconnectServerStatus as any).mockResolvedValue({ data: { connected: false } })` to the shared `mount()` helper, same as the existing `getDepartmentBaileysStatus` mock, so all tests using `mount()` stay stable.

### Deviation 2: same QR rendering approach as task-04
- Mirrors task-04's deviation: QR rendered via `<img src={qr} />`, not `qrcode.react`, per task-01's confirmed `wppconnect-server` QR response shape (base64 data URL).
