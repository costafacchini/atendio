# Task: Department Admin Form + QR Panel

**Plan**: Wppconnect-Server WhatsApp Plugin
**Phase**: 3
**Task ID (phase-local)**: task-05
**Task Path**: phase-3/task-05-department-admin-ui
**Spec References**: Story 4 (P2), FR-006
**Depends On**: phase-2/task-03-department-qr-status
**JIRA**: N/A

## Objective

Render a `DepartmentWppconnectServerPanel` on the Department form, mirroring `DepartmentBaileysPanel`, for QR pairing and status against the external `wppconnect-server` instance.

## Context

Same caveat as `.plans/wppconnect-plugin/phase-3/task-07-department-admin-ui`: the Department form has no `whatsappDefault` dropdown — panels are rendered unconditionally once `departmentId` exists, relying on the backend use case to resolve gracefully when the provider isn't configured for that Department. Follow this existing pattern as-is.

`client/src/services/department.ts` functions take `{ id: departmentId }`-shaped params, not bare strings — preserve that convention for the new functions.

## Before You Start

- [ ] Switch to the planning/base branch and pull the latest plan state: `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-2/task-03-department-qr-status`'s `status.md` shows `complete`
- [ ] Check this task's `status.md` — if already `in-progress` or `complete`, stop and investigate
- [ ] Read `client/src/pages/Departments/scenes/Form/index.tsx`, `Edit/DepartmentBaileysPanel.tsx`, and `client/src/services/department.ts` in full
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `client/src/services/department.ts` | modify | Add `getDepartmentWppconnectServerQr`, `getDepartmentWppconnectServerStatus` |
| `client/src/services/department.spec.ts` | modify | Add coverage |
| `client/src/pages/Departments/scenes/Edit/DepartmentWppconnectServerPanel.tsx` | create | Mirrors `DepartmentBaileysPanel.tsx`, no sync button |
| `client/src/pages/Departments/scenes/Form/index.tsx` | modify | Render the new panel alongside existing ones |
| `client/src/i18n/locales/pt.json` | modify | Add `departments.wppconnectServer.*` keys |
| `client/src/i18n/locales/en.json` | modify | Same keys in English |

### Do NOT Modify

- `client/src/pages/Departments/scenes/Edit/DepartmentBaileysPanel.tsx` — reference only
- `client/src/pages/Inboxes/**` — owned by task-04
- Any `.plans/wppconnect-plugin` Department UI files, even if already merged — independent plugin, additive only

## Implementation Steps

### Step 1: Client service functions

Add `getDepartmentWppconnectServerStatus({ id })` / `getDepartmentWppconnectServerQr({ id })` to `department.ts`, pointed at the task-03 routes.

### Step 2: `DepartmentWppconnectServerPanel.tsx`

Copy `DepartmentBaileysPanel.tsx`'s structure, swap service calls, remove sync-related code.

### Step 3: Form wiring

Render `<DepartmentWppconnectServerPanel departmentId={departmentId} isActive={initialValues.active} />` alongside the existing panel renders in `Departments/scenes/Form/index.tsx`.

### Step 4: i18n keys

Add `departments.wppconnectServer.*` keys mirroring `departments.baileys.*`.

## Testing

**Spec scenarios covered**:
- [ ] Scenario: Given the Department form / When rendered / Then `DepartmentWppconnectServerPanel` renders alongside existing panels — `client/src/services/department.spec.ts:TODO` (service-level, consistent with the existing lack of component-level specs for sibling panels)

**Additional verification**:
- [ ] `department.spec.ts` covers the two new service functions
- [ ] Manual verification: open a Department's edit screen, confirm all panels render without throwing when no provider is configured
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

- [ ] No KB/doc updates required in this task — covered in task-06.

## Completion Criteria

- [ ] `DepartmentWppconnectServerPanel` created and rendered
- [ ] Client service tests pass
- [ ] Changes committed to `plan/wppconnect-server-plugin/phase-3/task-05-department-admin-ui` branch
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- task-04 (Inbox UI) is a separate file tree — no overlap.
