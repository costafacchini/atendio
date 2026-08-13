# Task: Remove ChatPanel + WhatsAppPanel from Licensee forms

**Plan**: licensee-plugin-fields-to-inbox
**Phase**: 1
**Task ID (phase-local)**: task-02
**Task Path**: phase-1/task-02-frontend-forms
**Spec References**: Story 4 (P4), FR-009
**Depends On**: None
**JIRA**: N/A

## Objective

Remove `ChatPanel` and `WhatsAppPanel` from the Licensee create wizard, edit form, `OnboardingModal`, `SelectLicenseeModal`, and `SelectLicenseesWithFilter` — these plugin configuration fields are now managed through the Inbox UI, not the Licensee form.

## Context

The Licensee form currently has panels for configuring chat and WhatsApp plugin settings. Since onboarding now creates Inbox records instead of writing to Licensee, these panels are dead UI that would write to columns being removed.

Files to update:
- `client/src/pages/Licensees/scenes/Form/panels/ChatPanel.tsx` — DELETE or leave empty
- `client/src/pages/Licensees/scenes/Form/panels/WhatsAppPanel.tsx` — DELETE or leave empty
- `client/src/pages/Licensees/scenes/Form/index.tsx` — remove panel imports/renders
- `client/src/pages/Licensees/scenes/New/LicenseeWizard.tsx` — remove chat/WA wizard steps
- `client/src/pages/SignIn/OnboardingModal.tsx` — remove plugin field inputs from the client-side onboarding form (the backend already creates Inboxes; the form should not collect these fields)
- `client/src/components/SelectLicenseeModal/index.tsx` — remove any plugin field references
- `client/src/components/SelectLicenseesWithFilter/index.tsx` — remove plugin field references
- `client/src/factories/licensee.ts` — remove plugin fields from client factory builder

Do NOT touch the Navbar or Dashboard — those are Phase 2 (task-05).
Do NOT touch `client/src/types/licensee.ts` — that is Phase 3.

## Before You Start

- [ ] Switch to main and pull: `git switch main && git pull --rebase origin main`
- [ ] Verify no dependent tasks (this is Phase 1, no deps)
- [ ] Check this task's `status.md` — must be `not-started`
- [ ] Read `client/src/pages/Licensees/scenes/New/LicenseeWizard.tsx` and `client/src/pages/SignIn/OnboardingModal.tsx` to understand current wizard steps
- [ ] Run `npx jest --testPathPattern="Licensee|OnboardingModal|SelectLicensee" --passWithNoTests` to establish baseline
- [ ] Mark this task `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `client/src/pages/Licensees/scenes/Form/panels/ChatPanel.tsx` | delete or gut | No longer needed |
| `client/src/pages/Licensees/scenes/Form/panels/WhatsAppPanel.tsx` | delete or gut | No longer needed |
| `client/src/pages/Licensees/scenes/Form/index.tsx` | modify | Remove panel imports + renders |
| `client/src/pages/Licensees/scenes/New/LicenseeWizard.tsx` | modify | Remove chat/WhatsApp wizard steps |
| `client/src/pages/SignIn/OnboardingModal.tsx` | modify | Remove plugin field inputs |
| `client/src/components/SelectLicenseeModal/index.tsx` | modify | Remove plugin field references |
| `client/src/components/SelectLicenseesWithFilter/index.tsx` | modify | Remove plugin field references |
| `client/src/factories/licensee.ts` | modify | Remove plugin fields from factory |
| Frontend tests for the above | modify | Remove plugin field fixture data |

### Do NOT Modify

- `client/src/pages/Navbar/index.tsx` — owned by phase-2/task-05-frontend-ui
- `client/src/pages/Dashboard/index.tsx` — owned by phase-2/task-05-frontend-ui
- `client/src/types/licensee.ts` — owned by phase-3/task-06-schema-types
- `src/**` — backend files owned by task-01, task-03, task-04

## Implementation Steps

### Step 1: Identify panel usage

Search for where ChatPanel and WhatsAppPanel are imported and rendered:

```bash
grep -r "ChatPanel\|WhatsAppPanel" client/src/ --include="*.tsx" -l
```

### Step 2: Remove panels from Form

In `client/src/pages/Licensees/scenes/Form/index.tsx`, remove the ChatPanel and WhatsAppPanel imports and any JSX that renders them.

### Step 3: Update LicenseeWizard

In `client/src/pages/Licensees/scenes/New/LicenseeWizard.tsx`, remove the wizard steps that collect chat and WhatsApp configuration. Update step numbering/navigation accordingly.

### Step 4: Update OnboardingModal

In `client/src/pages/SignIn/OnboardingModal.tsx`, remove input fields for plugin configuration (`chatDefault`, `chatUrl`, `chatKey`, `chatIdentifier`, `whatsappDefault`, `whatsappToken`, `whatsappUrl`). The backend creates Inboxes automatically via `OnboardAccount.createInboxes()`.

### Step 5: Update SelectLicenseeModal and SelectLicenseesWithFilter

Remove any plugin field references from these components (they may reference licensee.chatDefault or whatsappDefault for display).

### Step 6: Update client factory

In `client/src/factories/licensee.ts`, remove the 7 plugin fields from the factory's default attributes.

### Step 7: Update frontend tests

Find and update test files that set plugin fields on licensee fixtures:

```bash
grep -r "chatDefault\|whatsappDefault\|chatUrl\|whatsappUrl\|chatKey\|whatsappToken\|chatIdentifier" \
  client/src/ --include="*.spec.tsx" --include="*.test.tsx" -l
```

### Step 8: Verify

```bash
npx jest --testPathPattern="Licensee|OnboardingModal|SelectLicensee" --passWithNoTests
```

## Testing

**Spec scenarios covered**:
- [ ] Scenario: Given super admin on Licensee new form, When wizard renders, Then no ChatPanel or WhatsAppPanel steps are shown — `client/src/pages/Licensees/scenes/New/LicenseeWizard.spec.tsx`
- [ ] Scenario: Given super admin on Licensee edit form, When form renders, Then no chat/WhatsApp fields are present — `client/src/pages/Licensees/scenes/Form/index.spec.tsx`

**Additional verification**:
- [ ] `npx jest` passes for all updated frontend specs
- [ ] Existing tests still pass
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

No KB/doc updates required — removing form panels is self-evident from the Inbox-concept migration.

## Completion Criteria

- [ ] ChatPanel and WhatsAppPanel no longer rendered in any Licensee form or wizard
- [ ] OnboardingModal no longer collects plugin fields
- [ ] Client factory no longer sets plugin fields
- [ ] All frontend tests pass
- [ ] Changes committed to `plan/licensee-plugin-fields-to-inbox/phase-1/task-02-frontend-forms`
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- phase-1/task-01-admin-layer works on backend files only. No overlap.
- phase-2/task-05-frontend-ui will modify Navbar and Dashboard — do not touch those files.
