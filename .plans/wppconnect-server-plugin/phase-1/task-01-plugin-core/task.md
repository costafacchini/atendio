# Task: Wppconnect-Server Plugin Core

**Plan**: Wppconnect-Server WhatsApp Plugin
**Phase**: 1
**Task ID (phase-local)**: task-01
**Task Path**: phase-1/task-01-plugin-core
**Spec References**: Story 1 (P1), Story 2 (P1), FR-001, FR-002, FR-007, FR-008, FR-009, FR-010
**Depends On**: None
**JIRA**: N/A

## Objective

Implement `WppconnectServer.ts`, an HTTP-client `MessengersBase` subclass that sends plain-text messages through a self-hosted `wppconnect-server` instance's REST API and parses its inbound webhook payload shape. Register it in the messenger factory. Also verify, against the actual target `wppconnect-server` version's API docs, the exact endpoint paths and payload shapes this task and later tasks rely on (spec FR-009/FR-010) — do not assume commonly-cited route names are correct without checking.

## Context

`src/app/plugins/messengers/Utalk.ts` is the direct structural reference: a plain class (no session repository, no Puppeteer) implementing `parseMessageStatus`/`parseMessage`/`parseContactData`/`contactWithDifferentData`/`shouldUpdateWaStartChat`, and `sendMessage(messageId, url, token)` that loads the message, builds a request body, and calls `request.post(...)` (`src/app/services/request.ts`), then updates `message.sended`/`message.error` based on the response.

`wppconnect-server`'s commonly documented REST surface (per its public docs as of this plan's creation) includes session endpoints under `/api/{session}/...` (generate-token, start-session, status-session, qrcode-session) and a `/api/{session}/send-message` endpoint, each guarded by a bearer token obtained from `generate-token`. **Treat this as a starting hypothesis only** — the actual deployed instance's Swagger/API docs are the source of truth; confirm exact paths, auth header format, and request/response field names before finalizing the implementation (FR-009). Likewise confirm the actual webhook payload shape it sends for inbound messages (FR-010) before writing `parseMessage`/`parseContactData`.

The existing generic webhook pipeline (`src/app/usecases/webhooks/IngestMessengerMessage.ts`) is provider-agnostic — it just persists the raw body and queues a job; `WppconnectServer.responseToMessages()` is where the actual payload shape is interpreted, exactly like `Utalk.parseMessage` does for Utalk's shape.

## Before You Start

- [ ] Switch to the planning/base branch and pull the latest plan state: `git switch main && git pull --rebase origin main`
- [ ] Check this task's `status.md` — if already `in-progress` or `complete`, stop and investigate
- [ ] Read `src/app/plugins/messengers/Utalk.ts`, `Dialog.ts`, and `Base.ts` in full
- [ ] Confirm the target `wppconnect-server` version's actual REST API and webhook payload shape against its own documentation before writing parser/client code
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/plugins/messengers/WppconnectServer.ts` | create | Plugin class |
| `src/app/plugins/messengers/WppconnectServer.spec.ts` | create | Unit tests, mirrors `Utalk.spec.ts` |
| `src/app/plugins/messengers/factory.ts` | modify | Add `case 'wppconnect-server'` |
| `src/app/plugins/messengers/factory.spec.ts` | modify | Add coverage for the new case |

### Do NOT Modify

- `src/app/plugins/messengers/Utalk.ts`, `Dialog.ts` — reference only
- `src/app/plugins/messengers/Wppconnect.ts` (if `.plans/wppconnect-plugin` has already merged by the time this runs) — unrelated, independent plugin

## Implementation Steps

### Step 1: Scaffold `WppconnectServer.ts`

Extend `MessengersBase`, constructor matching `Utalk.ts`'s minimal dependency shape (`messageRepository` plus whatever `Base.ts` already requires — no session repository needed).

### Step 2: Implement `parseContactData` / `parseMessage` / `parseMessageStatus`

Map the confirmed `wppconnect-server` webhook event shape (from Before You Start) to `this.contactData`/`this.messageData`/`this.messageStatus`, following `Utalk.parseMessage`'s defensive style (return `null` for unrecognized/outbound events rather than throwing).

### Step 3: Implement `sendMessage(messageId, url, token)`

Load the message via `messageRepository`, build the request body per the confirmed send-message endpoint contract, call `request.post(...)` with the session/auth details derived from `url`/`token` (the Inbox's `whatsappUrl`/`whatsappToken`), and set `sended: true` or `error` based on the response — mirror `Utalk.ts` lines 157-185 exactly for the success/failure branching.

### Step 4: Register in `factory.ts`

Add `case 'wppconnect-server': return new WppconnectServer(licensee, deps)`.

## Testing

**Spec scenarios covered**:
- [ ] Scenario: Given the existing generic webhook route / When a `wppconnect-server`-shaped inbound event is posted / Then a Contact/Message is created — `src/app/plugins/messengers/WppconnectServer.spec.ts:TODO`
- [ ] Scenario: Given a queued outgoing text Message / When `sendMessage` runs / Then `sended: true` — `src/app/plugins/messengers/WppconnectServer.spec.ts:TODO`
- [ ] Scenario: Given the external instance returns an error / When `sendMessage` runs / Then `Message.error` is populated — `src/app/plugins/messengers/WppconnectServer.spec.ts:TODO`

**Additional verification**:
- [ ] `factory.spec.ts` covers `whatsappDefault: 'wppconnect-server'` instantiating `WppconnectServer`
- [ ] Existing plugin tests (Baileys/Dialog/Utalk/YCloud/Pabbly, and Wppconnect if merged) still pass
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

- [ ] No KB/doc updates required in this task — full usage guide (including the FR-009/FR-010 findings) is written in task-06 once the end-to-end flow is verified.

## Completion Criteria

- [ ] `WppconnectServer.ts` implements every abstract method from `MessengersBase`
- [ ] `factory.ts` instantiates `WppconnectServer` for `whatsappDefault === 'wppconnect-server'`
- [ ] `WppconnectServer.spec.ts` covers all scenarios listed above with real assertions
- [ ] The confirmed REST API and webhook payload shapes (FR-009/FR-010) are recorded in this task's `status.md` so task-02 doesn't need to rediscover them
- [ ] Changes committed to `plan/wppconnect-server-plugin/phase-1/task-01-plugin-core` branch
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- task-02 depends on the confirmed session/QR API shape recorded by this task — do not let task-02 start until this task's findings are documented in `status.md`.
