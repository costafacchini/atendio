# Task: Migrate services + plugin factories to read from inbox

**Plan**: licensee-plugin-fields-to-inbox
**Phase**: 2
**Task ID (phase-local)**: task-04
**Task Path**: phase-2/task-04-services-factories
**Spec References**: Story 2 (P2), FR-003, FR-005
**Depends On**: phase-1/task-01-admin-layer
**JIRA**: N/A

## Objective

Migrate 8 services, the template importer, and 2 plugin factories so they read plugin credentials (`chatUrl`, `chatKey`, `whatsappUrl`, `whatsappToken`, etc.) from the inbox record rather than the licensee record.

## Context

Services currently read from `licensee.whatsappUrl`, `licensee.whatsappToken`, `licensee.chatUrl`, `licensee.chatKey`. After the onboarding migration, those licensee fields are empty — messages fail to route.

Files to migrate:
- `src/app/services/ChatMessage.ts`
- `src/app/services/MessengerMessage.ts`
- `src/app/services/CloseChat.ts`
- `src/app/services/ChatbotMessage.ts`
- `src/app/services/ChatbotTransfer.ts`
- `src/app/services/ResetChats.ts`
- `src/app/services/ResetChatbots.ts`
- `src/app/services/SendMessageToMessenger.ts`
- `src/app/plugins/importers/template/index.ts`
- `src/app/plugins/messengers/factory.ts` — currently `inbox?.whatsappDefault || licensee.whatsappDefault`
- `src/app/plugins/chats/factory.ts` — currently `inbox?.chatDefault || licensee.chatDefault`

Each service has access to a `room` or `message` domain object which already has an `inbox` FK (established by the inbox-concept plan). The service can use this to load the inbox record.

**Pattern to follow**: The inbox is already available in most services as a parameter or can be loaded via `inboxRepository.findById(room.inbox)`. Read plugin credentials from `inbox.chatUrl`, `inbox.chatKey`, `inbox.whatsappUrl`, `inbox.whatsappToken` instead of `licensee.*`.

For the plugin factories, remove the `|| licensee.whatsappDefault` fallback — inbox should always be present.

## Before You Start

- [ ] Switch to main and pull: `git switch main && git pull --rebase origin main`
- [ ] Verify phase-1/task-01-admin-layer is complete
- [ ] Check this task's `status.md` — must be `not-started`
- [ ] Read `src/app/services/ChatMessage.ts` and `src/app/services/MessengerMessage.ts` to understand the current inbox/licensee access pattern
- [ ] Run `npx jest --testPathPattern="ChatMessage|MessengerMessage|CloseChat|ChatbotMessage|ChatbotTransfer|ResetChats|ResetChatbots|SendMessageToMessenger|factory" --passWithNoTests` to establish baseline
- [ ] Mark this task `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/services/ChatMessage.ts` | modify | Read credentials from inbox |
| `src/app/services/MessengerMessage.ts` | modify | Read credentials from inbox |
| `src/app/services/CloseChat.ts` | modify | Read credentials from inbox |
| `src/app/services/ChatbotMessage.ts` | modify | Read credentials from inbox |
| `src/app/services/ChatbotTransfer.ts` | modify | Read credentials from inbox |
| `src/app/services/ResetChats.ts` | modify | Read credentials from inbox |
| `src/app/services/ResetChatbots.ts` | modify | Read credentials from inbox |
| `src/app/services/SendMessageToMessenger.ts` | modify | Read credentials from inbox |
| `src/app/plugins/importers/template/index.ts` | modify | Remove licensee fallback |
| `src/app/plugins/messengers/factory.ts` | modify | Remove `|| licensee.whatsappDefault` fallback |
| `src/app/plugins/chats/factory.ts` | modify | Remove `|| licensee.chatDefault` fallback |
| Tests for each of the above | modify | Update fixtures |

### Do NOT Modify

- `src/app/usecases/licensees/GetBaileysQr.ts` — owned by phase-2/task-03-baileys-use-cases
- `client/src/**` — owned by phase-2/task-05-frontend-ui
- `prisma/schema.prisma` — owned by phase-3/task-06-schema-types

## Implementation Steps

### Step 1: Audit each service

For each service, identify:
- Where it currently reads `licensee.whatsappUrl`, `licensee.chatUrl`, etc.
- Whether `inbox` is already a parameter or must be loaded via `inboxRepository`

Run:
```bash
grep -n "licensee\.\(whatsappUrl\|whatsappToken\|chatUrl\|chatKey\|chatDefault\|whatsappDefault\|chatIdentifier\)" \
  src/app/services/*.ts src/app/plugins/importers/template/index.ts
```

### Step 2: Add inbox loading where missing

If a service has `room` but not `inbox`, load it:
```typescript
const inbox = await inboxRepository.findById(room.inbox)
```

If a service has `message`, use `message.room` then load room's inbox.

If inbox is null (no inbox FK), log a warning and return early rather than crashing.

### Step 3: Replace licensee field reads with inbox field reads

Replace `licensee.whatsappUrl` → `inbox.whatsappUrl`
Replace `licensee.whatsappToken` → `inbox.whatsappToken`
Replace `licensee.chatUrl` → `inbox.chatUrl`
Replace `licensee.chatKey` → `inbox.chatKey`

### Step 4: Update plugin factories

In `src/app/plugins/messengers/factory.ts`:
```typescript
// Before: const plugin = inbox?.whatsappDefault || licensee.whatsappDefault
// After:  const plugin = inbox?.whatsappDefault
```

Same pattern in `src/app/plugins/chats/factory.ts`.

### Step 5: Update tests

Update spec fixtures to provide inbox records with the needed credentials instead of (or in addition to) licensee records.

```bash
grep -r "whatsappUrl\|whatsappToken\|chatUrl\|chatKey" src/app/services/ --include="*.spec.ts" -l
```

### Step 6: Verify

```bash
npx jest --testPathPattern="ChatMessage|MessengerMessage|CloseChat|ChatbotMessage|ChatbotTransfer|ResetChats|ResetChatbots|SendMessageToMessenger|factory" --passWithNoTests
```

## Testing

**Spec scenarios covered**:
- [ ] Scenario: Given messenger inbox with whatsappUrl/whatsappToken, When inbound WhatsApp message arrives, Then MessengerMessage reads credentials from inbox — `src/app/services/MessengerMessage.spec.ts`
- [ ] Scenario: Given chat inbox with chatUrl/chatKey, When inbound chat message arrives, Then ChatMessage reads credentials from inbox — `src/app/services/ChatMessage.spec.ts`
- [ ] Scenario: Given room with inbox, When CloseChat triggered, Then close request uses inbox credentials — `src/app/services/CloseChat.spec.ts`

**Additional verification**:
- [ ] All 8 service specs pass
- [ ] Plugin factory specs pass
- [ ] Existing tests still pass
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

No KB/doc updates required — implementation follows the established inbox-concept pattern.

## Completion Criteria

- [ ] All 8 services read credentials from inbox, not licensee
- [ ] Plugin factories no longer fall back to licensee fields
- [ ] All tests pass
- [ ] Changes committed to `plan/licensee-plugin-fields-to-inbox/phase-2/task-04-services-factories`
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- phase-2/task-03-baileys-use-cases runs in parallel — do not touch GetBaileysQr/Status/Sync files.
- phase-2/task-05-frontend-ui runs in parallel — do not touch client files.
