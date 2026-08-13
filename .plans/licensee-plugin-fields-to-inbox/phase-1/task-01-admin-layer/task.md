# Task: Remove plugin fields from admin CRUD layer

**Plan**: licensee-plugin-fields-to-inbox
**Phase**: 1
**Task ID (phase-local)**: task-01
**Task Path**: phase-1/task-01-admin-layer
**Spec References**: Story 4 (P4), FR-006
**Depends On**: None
**JIRA**: N/A

## Objective

Remove all references to the 7 plugin fields (`chatDefault`, `chatUrl`, `chatKey`, `chatIdentifier`, `whatsappDefault`, `whatsappToken`, `whatsappUrl`) from the backend admin CRUD layer: query filters, controller serialization, use case allowed fields, and the backend licensee factory.

## Context

The 7 plugin fields are currently referenced in:
- `src/app/queries/LicenseesQuery.ts` — filter/selection fields
- `src/app/controllers/LicenseesController.ts` — response serialization
- `src/app/usecases/licensees/CreateLicensee.ts` — ALLOWED_FIELDS or equivalent whitelist
- `src/app/usecases/licensees/UpdateLicensee.ts` — same
- `src/app/factories/licensee.ts` — backend factory builder

This task does NOT touch the Prisma schema (Phase 3) or TypeScript types (Phase 3) — those will fail typecheck until Phase 3 removes the fields. The goal here is to stop reading/writing them at the application layer so Phase 3's schema removal is a clean drop.

Test files that cover these areas: check `__tests__/` or `spec/` directories near each file.

## Before You Start

- [ ] Switch to main and pull: `git switch main && git pull --rebase origin main`
- [ ] Verify no dependent tasks (this is Phase 1, no deps)
- [ ] Check this task's `status.md` — must be `not-started`
- [ ] Read `src/app/queries/LicenseesQuery.ts` and `src/app/usecases/licensees/CreateLicensee.ts` to understand current field lists
- [ ] Run `npx jest --testPathPattern="licensee" --passWithNoTests` to establish baseline
- [ ] Mark this task `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/queries/LicenseesQuery.ts` | modify | Remove plugin fields from query filters/select |
| `src/app/controllers/LicenseesController.ts` | modify | Remove plugin fields from serialized response |
| `src/app/usecases/licensees/CreateLicensee.ts` | modify | Remove plugin fields from ALLOWED_FIELDS |
| `src/app/usecases/licensees/UpdateLicensee.ts` | modify | Remove plugin fields from ALLOWED_FIELDS |
| `src/app/factories/licensee.ts` | modify | Remove plugin fields from factory builder |
| Tests for the above files | modify | Remove fixture references to plugin fields |

### Do NOT Modify

- `prisma/schema.prisma` — owned by phase-3/task-06-schema-types
- `src/types/index.ts` — owned by phase-3/task-06-schema-types
- `client/src/**` — owned by phase-1/task-02-frontend-forms and phase-2/task-05-frontend-ui

## Implementation Steps

### Step 1: Update LicenseesQuery

In `src/app/queries/LicenseesQuery.ts`, identify any select/filter logic that references the 7 plugin fields and remove them. These fields will no longer be queried from the licensee table.

### Step 2: Update LicenseesController

In `src/app/controllers/LicenseesController.ts`, remove the 7 plugin fields from any response serialization or explicit field picks. The controller should not return these fields in licensee responses.

### Step 3: Update CreateLicensee and UpdateLicensee

In each use case, locate the ALLOWED_FIELDS constant (or equivalent field whitelist) and remove the 7 plugin field names. The use cases must reject or ignore those keys if passed in a request body.

### Step 4: Update backend licensee factory

In `src/app/factories/licensee.ts`, remove the plugin fields from the factory's build function. Fixtures using this factory in tests should be updated to not set these fields.

### Step 5: Update tests

Search for test files that reference `chatDefault`, `chatUrl`, `chatKey`, `chatIdentifier`, `whatsappDefault`, `whatsappToken`, `whatsappUrl` on licensee fixtures and remove those attributes.

```bash
grep -r "chatDefault\|whatsappDefault\|chatUrl\|whatsappUrl\|chatKey\|whatsappToken\|chatIdentifier" \
  --include="*.spec.ts" --include="*.test.ts" -l src/
```

### Step 6: Verify

```bash
npx jest --testPathPattern="licensee|LicenseesQuery|CreateLicensee|UpdateLicensee" --passWithNoTests
```

## Testing

**Spec scenarios covered**:
- [ ] Scenario: Given super admin on Licensee edit form, When form renders, Then no chat/WhatsApp fields are present — `src/app/usecases/licensees/UpdateLicensee.spec.ts`
- [ ] Scenario: Given plugin fields in create request body, When CreateLicensee runs, Then plugin fields are ignored — `src/app/usecases/licensees/CreateLicensee.spec.ts`

**Additional verification**:
- [ ] `npx jest` passes for all licensee-related specs
- [ ] Existing tests still pass
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

No KB/doc updates required — this is an internal refactor removing dead write paths.

## Completion Criteria

- [ ] 7 plugin fields no longer appear in LicenseesQuery, LicenseesController, CreateLicensee, UpdateLicensee, or backend licensee factory
- [ ] All licensee-related tests pass
- [ ] Changes committed to `plan/licensee-plugin-fields-to-inbox/phase-1/task-01-admin-layer`
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- phase-1/task-02-frontend-forms works on client-side files. No overlap.
- Do not touch `prisma/schema.prisma` or `src/types/index.ts` — those are Phase 3.
