# Task: Wppconnect Plugin Core

**Plan**: Wppconnect WhatsApp Plugin
**Phase**: 1
**Task ID (phase-local)**: task-02
**Task Path**: phase-1/task-02-wppconnect-plugin-core
**Spec References**: Story 1 (P1), Story 2 (P1), FR-001, FR-002, FR-003, FR-006, FR-009, FR-010
**Depends On**: phase-1/task-01-docker-chromium-infra
**JIRA**: N/A

## Objective

Implement `Wppconnect.ts`, a `MessengersBase` subclass that connects via `@wppconnect-team/wppconnect`, persists its session in the existing `WhatsappSession` table, and supports QR authentication plus plain-text send/receive. Register it in the messenger factory.

## Context

`src/app/plugins/messengers/Baileys.ts` is the direct architectural reference: it extends `MessengersBase` (`src/app/plugins/messengers/Base.ts`), implements `parseMessageStatus`, `parseMessage`, `parseContactData`, `contactWithDifferentData`, `shouldUpdateWaStartChat`, `sendMessage`, and `getQrCode`. It lazy-imports the underlying library inside each method (`await import('@whiskeysockets/baileys')`) rather than at module top level — follow the same lazy-import convention for `@wppconnect-team/wppconnect` so the heavy dependency isn't loaded for licensees using other providers.

Session persistence today uses the `WhatsappSession` Prisma model (`prisma/schema.prisma` lines 182-192: `licensee Int`, `inbox Int?`, `creds Json?`, `keys Json?`) via `src/app/repositories/whatsappsession.ts`. These field names are Baileys-flavored but are generic JSON columns — reuse them as-is for Wppconnect's session token payload rather than adding new columns. **Before assuming a specific shape, read the installed `@wppconnect-team/wppconnect` package's TypeScript types and README (`node_modules/@wppconnect-team/wppconnect/`) to confirm its actual session-token persistence API** (FR-010) — do not assume it mirrors Baileys' `{ creds, keys }` shape.

`factory.ts` (`src/app/plugins/messengers/factory.ts`) switches on `inbox?.whatsappDefault` and instantiates the matching plugin class with `{ ...dependencies, inbox }`.

## Before You Start

- [ ] Switch to the planning/base branch and pull the latest plan state: `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-1/task-01-docker-chromium-infra`'s `status.md` shows `complete`
- [ ] Check this task's `status.md` — if already `in-progress` or `complete`, stop and investigate
- [ ] Read `src/app/plugins/messengers/Baileys.ts` and `src/app/plugins/messengers/Base.ts` in full
- [ ] Read `node_modules/@wppconnect-team/wppconnect`'s type definitions and README for the actual `create()` / session-token API — do not guess
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/plugins/messengers/Wppconnect.ts` | create | Plugin class |
| `src/app/plugins/messengers/Wppconnect.spec.ts` | create | Unit tests, mirrors `Baileys.spec.ts` |
| `src/app/plugins/messengers/factory.ts` | modify | Add `case 'wppconnect'` |
| `src/app/plugins/messengers/factory.spec.ts` | modify | Add coverage for the new case |

### Do NOT Modify

- `src/app/plugins/messengers/Baileys.ts` — reference only, not touched by this plan
- `prisma/schema.prisma` — no migration needed; reuse existing `WhatsappSession` columns

## Implementation Steps

### Step 1: Scaffold `Wppconnect.ts`

Create the class extending `MessengersBase`, constructor accepting `whatsappSessionRepository` and `inbox` dependencies exactly like `Baileys.ts` (lines 11-34).

### Step 2: Implement `parseContactData` / `parseMessage` / `parseMessageStatus`

Map the actual `@wppconnect-team/wppconnect` inbound message event shape (confirmed from its type defs in Before You Start) to the same `this.contactData` / `this.messageData` / `this.messageStatus` internal shape `MessengersBase.responseToMessages` expects (see `Base.ts` lines 100-115 and 154-270 for the consumer contract). Use `NormalizePhone` for phone extraction, matching `Baileys.ts` lines 92-124.

### Step 3: Implement session load/save using `WhatsappSessionRepository`

Mirror `loadOrCreateSession` (`Baileys.ts` lines 137-147), adapting the serialize/deserialize step to whatever `@wppconnect-team/wppconnect` actually expects for a resumable session (per FR-010 verification) instead of Baileys' `BufferJSON` scheme.

### Step 4: Implement `getQrCode(timeoutMs = 15000)`

Open a Wppconnect session with `catchQR` (or the equivalent callback found in Before You Start) wired to resolve the returned Promise with the QR payload; resolve with `null` if already connected; reject on timeout — mirror the external contract of `Baileys.getQrCode` (`Baileys.ts` lines 366-438) exactly, since `GetWppconnectQrForInbox` (task-03) will call it the same way `GetBaileysQrForInbox` calls `Baileys.getQrCode`.

### Step 5: Implement `sendMessage(messageId, url?, token?)`

Load the message and contact, ensure a connected session, send plain text only (reject/log unsupported kinds exactly like `Baileys.ts` lines 231-234), and close/release the Puppeteer browser in a `finally` block to avoid leaking processes — mirror `Baileys.ts` lines 246-308.

### Step 6: Register in `factory.ts`

Add `case 'wppconnect': return new Wppconnect(licensee, deps)` alongside the existing cases.

## Testing

**Spec scenarios covered**:
- [ ] Scenario: Given an Inbox with no session / When QR requested / Then a QR string is returned — `src/app/plugins/messengers/Wppconnect.spec.ts:TODO` (pending)
- [ ] Scenario: Given an already-connected session / When QR requested / Then `null`/connected is returned — `src/app/plugins/messengers/Wppconnect.spec.ts:TODO` (pending)
- [ ] Scenario: Given an inbound text event / When `responseToMessages` runs / Then Contact + Message are created — `src/app/plugins/messengers/Wppconnect.spec.ts:TODO` (pending)
- [ ] Scenario: Given a queued outgoing text Message / When `sendMessage` runs / Then `sended: true` — `src/app/plugins/messengers/Wppconnect.spec.ts:TODO` (pending)
- [ ] Scenario: Given a send failure / When `sendMessage` runs / Then `Message.error` is populated — `src/app/plugins/messengers/Wppconnect.spec.ts:TODO` (pending)

**Additional verification**:
- [ ] `factory.spec.ts` covers `whatsappDefault: 'wppconnect'` instantiating `Wppconnect`
- [ ] Existing Baileys/Dialog/Utalk/YCloud/Pabbly plugin tests still pass
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

- [ ] No KB/doc updates required in this task — full usage guide is written in task-08 once the end-to-end flow (including UI) is verified.

## Completion Criteria

- [ ] `Wppconnect.ts` implements every abstract method from `MessengersBase`
- [ ] `factory.ts` instantiates `Wppconnect` for `whatsappDefault === 'wppconnect'`
- [ ] `Wppconnect.spec.ts` covers all scenarios listed above with real assertions (no pending stubs remain)
- [ ] Changes committed to `plan/wppconnect-plugin/phase-1/task-02-wppconnect-plugin-core` branch
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- task-03 depends on `Wppconnect.getQrCode()`'s external contract matching `Baileys.getQrCode()` — do not change that method's resolve/reject shape without updating task-03's expectations.
