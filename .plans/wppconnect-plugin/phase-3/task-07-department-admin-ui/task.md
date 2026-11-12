# Task: Department Admin Form + QR Panel

**Plan**: Wppconnect WhatsApp Plugin
**Phase**: 3
**Task ID (phase-local)**: task-07
**Task Path**: phase-3/task-07-department-admin-ui
**Spec References**: Story 4 (P2), FR-007
**Depends On**: phase-2/task-04-department-qr-status
**JIRA**: N/A

## Objective

Render a `DepartmentWppconnectPanel` on the Department form, mirroring `DepartmentBaileysPanel`, so an admin can see Wppconnect connection status and generate a QR for a Department.

## Context

Unlike the Inbox form, the Department form (`client/src/pages/Departments/scenes/Form/index.tsx`) has **no `whatsappDefault` dropdown** — a Department just picks an `inbox` (see lines ~125-140), and `DepartmentBaileysPanel` is rendered **unconditionally** once `departmentId` exists (line 152: `{departmentId && <DepartmentBaileysPanel departmentId={departmentId} isActive={initialValues.active} />}`). The panel itself calls `getDepartmentBaileysStatus` unconditionally and relies on the backend (`GetBaileysStatusForDepartment`) to gracefully resolve `connected: false` when the Department isn't actually using Baileys.

This is a pre-existing, slightly unusual pattern (no client-side gating by provider) — **follow it as-is** rather than introducing a new conditional; redesigning how Department forms gate provider-specific panels is out of this plan's scope. The practical effect: both `DepartmentBaileysPanel` and the new `DepartmentWppconnectPanel` will render side by side on every Department's edit screen, each independently resolving to "not connected" if that provider isn't configured for the Department.

`client/src/services/department.ts` lines 28-38 define `getDepartmentBaileysStatus`, `getDepartmentBaileysQr`, `syncDepartmentBaileys`, each taking `{ id: departmentId }`-shaped objects (not a bare string, unlike the Inbox service functions — note this inconsistency and preserve it for the new functions to match existing call-site expectations).

## Before You Start

- [ ] Switch to the planning/base branch and pull the latest plan state: `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-2/task-04-department-qr-status`'s `status.md` shows `complete`
- [ ] Check this task's `status.md` — if already `in-progress` or `complete`, stop and investigate
- [ ] Read `client/src/pages/Departments/scenes/Form/index.tsx`, `Edit/DepartmentBaileysPanel.tsx`, and `client/src/services/department.ts` in full
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `client/src/services/department.ts` | modify | Add `getDepartmentWppconnectQr`, `getDepartmentWppconnectStatus` |
| `client/src/services/department.spec.ts` | modify | Add coverage |
| `client/src/pages/Departments/scenes/Edit/DepartmentWppconnectPanel.tsx` | create | Mirrors `DepartmentBaileysPanel.tsx`, no sync button |
| `client/src/pages/Departments/scenes/Form/index.tsx` | modify | Render the new panel alongside `DepartmentBaileysPanel` |
| `client/src/i18n/locales/pt.json` | modify | Add `departments.wppconnect.*` keys mirroring `departments.baileys.*` |
| `client/src/i18n/locales/en.json` | modify | Same keys in English |

### Do NOT Modify

- `client/src/pages/Departments/scenes/Edit/DepartmentBaileysPanel.tsx` — reference only
- `client/src/pages/Inboxes/**` — owned by task-06

## Implementation Steps

### Step 1: Client service functions

In `client/src/services/department.ts`, add `getDepartmentWppconnectStatus({ id })` / `getDepartmentWppconnectQr({ id })` following the exact object-param shape of the Baileys equivalents, pointed at the routes added in task-04.

### Step 2: `DepartmentWppconnectPanel.tsx`

Copy `DepartmentBaileysPanel.tsx`, rename identifiers, swap the imported service functions, and remove the sync button/state — group sync is out of scope.

### Step 3: Form wiring

In `Departments/scenes/Form/index.tsx`, import `DepartmentWppconnectPanel` and render it right after the existing `DepartmentBaileysPanel` line, same `departmentId &&` guard and `isActive={initialValues.active}` prop.

### Step 4: i18n keys

Add `departments.wppconnect.*` keys mirroring `departments.baileys.*`.

## Testing

**Spec scenarios covered**:
- [ ] Scenario: Given the Department form, **When** `whatsappDefault` is `'wppconnect'` **Then** `DepartmentWppconnectPanel` renders analogous to `DepartmentBaileysPanel` — `client/src/services/department.spec.ts:TODO` (service-level; no existing component-level spec for `DepartmentBaileysPanel` to extend, per current repo convention)

**Additional verification**:
- [ ] `department.spec.ts` covers `getDepartmentWppconnectQr`/`getDepartmentWppconnectStatus` call the correct URLs with headers
- [ ] Manual verification: open a Department's edit screen, confirm both panels render without throwing when neither provider is configured
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

- [ ] No KB/doc updates required in this task — covered in task-08.

## Completion Criteria

- [ ] `DepartmentWppconnectPanel` created and rendered on the Department form
- [ ] Client service tests pass
- [ ] Changes committed to `plan/wppconnect-plugin/phase-3/task-07-department-admin-ui` branch
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- task-06 (Inbox UI) is a separate file tree — no overlap.
