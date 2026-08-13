# Task: Migrate Baileys use cases to check inbox

**Plan**: licensee-plugin-fields-to-inbox
**Phase**: 2
**Task ID (phase-local)**: task-03
**Task Path**: phase-2/task-03-baileys-use-cases
**Spec References**: Story 3 (P3), FR-004
**Depends On**: phase-1/task-01-admin-layer
**JIRA**: N/A

## Objective

Replace `licensee.whatsappDefault !== 'baileys'` guards in `GetBaileysQr`, `GetBaileysStatus`, `SyncBaileysDirectory`, and related use cases with checks on the relevant inbox record instead.

## Context

The following use cases currently check `licensee.whatsappDefault` to decide whether to proceed:
- `src/app/usecases/licensees/GetBaileysQr.ts` — line ~24: `if (!licensee || licensee.whatsappDefault !== 'baileys')`
- `src/app/usecases/licensees/GetBaileysStatus.ts` — similar guard
- `src/app/usecases/licensees/SyncBaileysDirectory.ts` — similar
- `src/app/usecases/licensees/SyncBaileysDirectoryForDepartment.ts` — may check via department/inbox already
- `src/app/usecases/licensees/GetBaileysQrForDepartment.ts` — may already use inbox
- `src/app/usecases/licensees/GetBaileysStatusForDepartment.ts` — may already use inbox
- `src/app/usecases/licensees/SetDialogWebhook.ts` — check for dialog references

Inbox-scoped counterparts already exist: `GetBaileysQrForInbox`, `GetBaileysStatusForInbox`, `SyncBaileysDirectoryForInbox`. The licensee-scoped ones may be deprecated, but first verify if they are still called by any routes.

Check `src/app/routes/` to see if licensee-scoped Baileys routes still exist and which use cases they call.

If the licensee-scoped routes are still live (called by the Dashboard before task-05 fixes the client), update the use cases to:
1. Load the first messenger inbox for the licensee with `whatsappDefault='baileys'`
2. Use that inbox for the guard check and socket operation

If the licensee-scoped routes are dead, remove them from the router and mark use cases as deprecated (to be cleaned up in Phase 3 or a future task).

## Before You Start

- [ ] Switch to main and pull: `git switch main && git pull --rebase origin main`
- [ ] Verify phase-1/task-01-admin-layer is complete
- [ ] Check this task's `status.md` — must be `not-started`
- [ ] Read `src/app/usecases/licensees/GetBaileysQr.ts` and `GetBaileysStatus.ts`
- [ ] Search routes for licensee-scoped Baileys endpoints: `grep -r "baileys" src/app/routes/ --include="*.ts"`
- [ ] Run `npx jest --testPathPattern="GetBaileys|SyncBaileys|SetDialog" --passWithNoTests` to establish baseline
- [ ] Mark this task `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/usecases/licensees/GetBaileysQr.ts` | modify | Replace licensee.whatsappDefault guard with inbox guard |
| `src/app/usecases/licensees/GetBaileysStatus.ts` | modify | Same |
| `src/app/usecases/licensees/SyncBaileysDirectory.ts` | modify | Same |
| `src/app/usecases/licensees/SyncBaileysDirectoryForDepartment.ts` | investigate + modify if needed | May already use inbox |
| `src/app/usecases/licensees/GetBaileysQrForDepartment.ts` | investigate + modify if needed | |
| `src/app/usecases/licensees/GetBaileysStatusForDepartment.ts` | investigate + modify if needed | |
| `src/app/usecases/licensees/SetDialogWebhook.ts` | investigate + modify if needed | |
| Tests for the above use cases | modify | Update fixture data and assertions |

### Do NOT Modify

- `src/app/services/**` — owned by phase-2/task-04-services-factories
- `client/src/**` — owned by phase-2/task-05-frontend-ui
- `prisma/schema.prisma` — owned by phase-3/task-06-schema-types

## Implementation Steps

### Step 1: Audit current guards

Read each Baileys use case and note exactly which line checks `licensee.whatsappDefault`.

### Step 2: Check if inbox is already available

In GetBaileysQr, is an inbox already loaded? If yes, use `inbox.whatsappDefault`. If not, the use case likely receives a `licenseeId` — use `inboxRepository.find({ licensee: licenseeId, kind: 'messenger' })` to find the first baileys inbox.

### Step 3: Update each use case guard

Replace:
```typescript
if (!licensee || licensee.whatsappDefault !== 'baileys') { return error }
```
With:
```typescript
const inbox = await inboxRepository.findFirst({ licensee: licenseeId, kind: 'messenger', whatsappDefault: 'baileys' })
if (!inbox) { return error }
```

Inject `inboxRepository` into the use case constructor if not already present.

### Step 4: Update tests

Update specs to pass inbox fixtures instead of (or in addition to) licensee fixtures with whatsappDefault set.

### Step 5: Verify

```bash
npx jest --testPathPattern="GetBaileys|SyncBaileys|SetDialog" --passWithNoTests
```

## Testing

**Spec scenarios covered**:
- [ ] Scenario: Given inbox with `whatsappDefault='dialog'`, When GetBaileysQr is called, Then 422 error — `src/app/usecases/licensees/GetBaileysQr.spec.ts`
- [ ] Scenario: Given inbox with `whatsappDefault='baileys'`, When GetBaileysQr is called, Then QR returned — `src/app/usecases/licensees/GetBaileysQr.spec.ts`

**Additional verification**:
- [ ] All Baileys use case specs pass
- [ ] Existing tests still pass
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

No KB/doc updates required — straightforward guard migration.

## Completion Criteria

- [ ] All Baileys use cases check inbox.whatsappDefault, not licensee.whatsappDefault
- [ ] Tests updated and passing
- [ ] Changes committed to `plan/licensee-plugin-fields-to-inbox/phase-2/task-03-baileys-use-cases`
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- phase-2/task-04-services-factories runs in parallel. Do not touch service files.
- phase-2/task-05-frontend-ui runs in parallel. Do not touch client files.
