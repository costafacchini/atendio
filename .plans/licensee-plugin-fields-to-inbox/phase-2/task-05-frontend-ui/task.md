# Task: Fix Navbar + Dashboard gates to use inbox

**Plan**: licensee-plugin-fields-to-inbox
**Phase**: 2
**Task ID (phase-local)**: task-05
**Task Path**: phase-2/task-05-frontend-ui
**Spec References**: Story 1 (P1), FR-001, FR-002
**Depends On**: phase-1/task-02-frontend-forms
**JIRA**: N/A

## Objective

Fix the Navbar chat menu gate and Dashboard Baileys QR card to read from inbox records instead of the Licensee record — making them visible to admin users who have the correct inbox configured.

## Context

**Current bug** (confirmed in investigation):
- `client/src/pages/Navbar/index.tsx:79` — gates chat menu on `effectiveLicensee?.chatDefault === 'local'` (reads from Licensee which is now empty)
- `client/src/pages/Dashboard/index.tsx:52-56` — gates Baileys card on `activeLicensee.whatsappDefault === 'baileys'` (same issue)
- `client/src/pages/Dashboard/cards/BaileysSetupCard.tsx` — calls licensee-scoped Baileys endpoints; needs to switch to inbox-scoped API

**Solution pattern**:
1. Load inboxes for the current licensee from the API (inboxes endpoint already exists)
2. Gate Navbar chat on: `inboxes.some(i => i.kind === 'chat')`
3. Gate Dashboard Baileys card on: `inboxes.some(i => i.whatsappDefault === 'baileys')`
4. Pass the matching inbox to `BaileysSetupCard` so it uses inbox-scoped API endpoints (`/resources/inboxes/:id/baileys-qr`, `/resources/inboxes/:id/baileys-status`)

Inbox-scoped Baileys API endpoints already exist on the backend (`GetBaileysQrForInbox`, `GetBaileysStatusForInbox`).

Check which API service methods exist in `client/src/services/` for fetching inboxes.

## Before You Start

- [ ] Switch to main and pull: `git switch main && git pull --rebase origin main`
- [ ] Verify phase-1/task-02-frontend-forms is complete
- [ ] Check this task's `status.md` — must be `not-started`
- [ ] Read `client/src/pages/Navbar/index.tsx` (gate logic around line 79)
- [ ] Read `client/src/pages/Dashboard/index.tsx` (gate logic around lines 52-56)
- [ ] Read `client/src/pages/Dashboard/cards/BaileysSetupCard.tsx`
- [ ] Check `client/src/services/` for existing inbox service methods
- [ ] Run `npx jest --testPathPattern="Navbar|Dashboard" --passWithNoTests` to establish baseline
- [ ] Mark this task `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `client/src/pages/Navbar/index.tsx` | modify | Gate chat menu on inbox kind='chat' |
| `client/src/pages/Dashboard/index.tsx` | modify | Gate Baileys card on inbox whatsappDefault='baileys' |
| `client/src/pages/Dashboard/cards/BaileysSetupCard.tsx` | modify | Use inbox-scoped API endpoints |
| `client/src/services/inbox.ts` (or equivalent) | modify | Add fetchInboxes method if missing |
| Tests for the above | modify | Update mocks to use inbox data |

### Do NOT Modify

- `client/src/pages/Licensees/**` — owned by phase-1/task-02-frontend-forms (already complete by the time this runs)
- `src/app/usecases/**` — backend, owned by task-03/task-04
- `client/src/types/licensee.ts` — owned by phase-3/task-06-schema-types

## Implementation Steps

### Step 1: Find or create inbox fetch in client services

Check if `client/src/services/inbox.ts` exists and has a method to fetch inboxes for the current licensee. If not, add one following existing service patterns.

### Step 2: Load inboxes in Navbar

In `client/src/pages/Navbar/index.tsx`:
1. Fetch inboxes for the current licensee (on mount or from a shared context)
2. Replace the `effectiveLicensee?.chatDefault === 'local'` gate with:
   ```tsx
   inboxes.some(inbox => inbox.kind === 'chat')
   ```

### Step 3: Load inboxes in Dashboard

In `client/src/pages/Dashboard/index.tsx`:
1. Fetch inboxes for the current licensee
2. Find the baileys inbox: `const baileysInbox = inboxes.find(i => i.whatsappDefault === 'baileys')`
3. Replace the `activeLicensee.whatsappDefault === 'baileys'` gate with `!!baileysInbox`
4. Pass `baileysInbox` to `BaileysSetupCard`

### Step 4: Update BaileysSetupCard

In `client/src/pages/Dashboard/cards/BaileysSetupCard.tsx`:
1. Accept an `inbox` prop (with `id` and relevant fields)
2. Replace licensee-scoped API calls with inbox-scoped:
   - QR: `GET /resources/inboxes/:inboxId/baileys-qr`
   - Status: `GET /resources/inboxes/:inboxId/baileys-status`

Verify the inbox-scoped endpoint paths against backend routes in `src/app/routes/`.

### Step 5: Update tests

Update Navbar and Dashboard specs to mock inbox data instead of licensee plugin fields.

### Step 6: Verify

```bash
npx jest --testPathPattern="Navbar|Dashboard|BaileysSetupCard" --passWithNoTests
```

## Testing

**Spec scenarios covered**:
- [ ] Scenario: Given licensee with chat inbox, When admin logs in, Then Navbar chat menu is visible — `client/src/pages/Navbar/index.spec.tsx`
- [ ] Scenario: Given licensee with no chat inbox, When admin logs in, Then Navbar chat menu is hidden — `client/src/pages/Navbar/index.spec.tsx`
- [ ] Scenario: Given licensee with baileys inbox, When admin visits Dashboard, Then Baileys QR card is visible — `client/src/pages/Dashboard/index.spec.tsx`
- [ ] Scenario: Given licensee with no messenger inbox, When admin visits Dashboard, Then no Baileys card — `client/src/pages/Dashboard/index.spec.tsx`

**Additional verification**:
- [ ] Navbar and Dashboard specs pass
- [ ] BaileysSetupCard uses inbox-scoped API URLs
- [ ] Existing tests still pass
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

No KB/doc updates required — the Inbox concept KB (if it exists) already describes the inbox entity.

## Completion Criteria

- [ ] Navbar chat gate reads from inbox records
- [ ] Dashboard Baileys gate reads from inbox records
- [ ] BaileysSetupCard uses inbox-scoped API
- [ ] All frontend tests pass
- [ ] Changes committed to `plan/licensee-plugin-fields-to-inbox/phase-2/task-05-frontend-ui`
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- phase-2/task-03-baileys-use-cases and task-04-services-factories run in parallel — do not touch backend files.
- This task depends on task-02 completing first (frontend forms cleanup).
