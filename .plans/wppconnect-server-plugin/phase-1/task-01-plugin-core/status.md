# Status: Wppconnect-Server Plugin Core

**Current Status**: complete
**Last Updated**: 2026-11-05
**Agent**: Claude
**Branch**: plan/wppconnect-server-plugin/phase-1/task-01-plugin-core
**PR**: — (PR Strategy: single — opened after the full plan completes)

## Status History

| Timestamp | Status | Agent | Notes |
|-----------|--------|-------|-------|
| 2026-11-04 | not-started | — | Task created |
| 2026-11-05 | in-progress | Claude | Branch created, starting implementation |
| 2026-11-05 | complete | Claude | `WppconnectServer.ts` implemented, registered in factory, tests + lint + typecheck + full suite green |

## Blockers

None

## Artifacts

- `src/app/plugins/messengers/WppconnectServer.ts`
- `src/app/plugins/messengers/WppconnectServer.spec.ts`
- `src/app/plugins/messengers/factory.ts` (`case 'wppconnect-server'`)
- `src/app/plugins/messengers/factory.spec.ts`
- Branch: `plan/wppconnect-server-plugin/phase-1/task-01-plugin-core` (pushed)

## FR-009 / FR-010 Findings (confirmed against `wppconnect-team/wppconnect-server` source on GitHub, not just its docs/swagger — the `send-message` body shape in the Swagger annotations is wrong, see below)

Verified by reading `src/routes/index.ts`, `src/middleware/auth.ts`, `src/controller/encryptController.ts`, `src/controller/sessionController.ts`, and `src/controller/messageController.ts` directly from the repo (not assumed from the earlier research pass).

**Auth**: `POST /api/{session}/{secretkey}/generate-token` (one-time, uses the instance's `SECRET_KEY` env) returns `{ status, session, token, full }`. All other routes use `Authorization: Bearer {token}` with the plain `{session}` in the URL — no need to send the `session:token` compound form. **Design decision**: since our `Inbox` model has only one `whatsappToken` field, `whatsappToken` stores this pre-generated bearer `token` (obtained once by the admin outside of this app, same convention as Dialog's API-key-in-`whatsappToken`), not the instance's master secret key. `whatsappUrl` is the instance's base URL.

**Session naming**: no existing convention to reuse — introduced `atendio-inbox-{inboxId}` (see `sessionNameFor()` in `WppconnectServer.ts`), deterministic per Inbox.

**QR / status** (`GET /api/{session}/status-session` and `POST /api/{session}/start-session`): both map to the same `getSessionState` handler shape: `{ status: 'CLOSED', qrcode: null }` when never started, or `{ status, qrcode, urlcode, version }` once started — **`qrcode` is already a base64 `data:image/png;base64,...` string**, not a raw QR payload like Baileys returns. Task-04 (admin UI) should render it with `<img src={qrcode} />`, not `QRCodeSVG`. `status === 'CONNECTED'` is the only "connected" value observed in the handler; any other value (e.g. `'CLOSED'`, `'QRCODE'`, `'INITIALIZING'`) is treated as not connected. Implemented as `WppconnectServer.getQrCode(url, token)` and `WppconnectServer.getConnectionStatus(url, token)` — task-02's use cases should call these plugin methods rather than re-implementing the HTTP calls.

**Send message** (`POST /api/{session}/send-message`): **the Swagger annotation's example (`phone: '5521999999999'`, a string) is misleading — the actual controller code (`for (const contato of phone)`) requires `phone` to be an array.** Implemented as `{ phone: [phone], isGroup, message }`. Success: HTTP `201`, `{ status: 'success', response: [...], mapper: 'return' }`. Error: HTTP `500`, `{ status: 'Error', message, error }`.

**Inbound webhook payload** (confirmed via `src/util/functions.ts#callWebHook` and `wppconnect-team/wppconnect`'s `Message` model): the instance POSTs `Object.assign({ event, session }, rawWppconnectMessage)` to the configured webhook URL. Relevant fields on the raw message: `id`, `body` (text), `type` (`'chat'` for plain text), `from` (sender JID, `@c.us`/`@g.us`), `fromMe` (boolean), `notifyName` (display name), `sender.pushname`/`sender.name` (fallback display name). `event` is `'onmessage'` for inbound chat messages — other events (`'onack'`, `'onpresencechanged'`, etc.) are ignored by `parseMessage`/`parseContactData` (return `null`), consistent with `Utalk.ts`'s defensive style.

**Not yet verified against a live instance**: delivery/read-receipt (`onack`) mapping is out of scope for this plan (mirrors `Utalk.parseMessageStatus` returning `null` always) — only confirmed from source, never exercised against a running `wppconnect-server`. Task-02/04 should flag during manual verification if a live instance's actual webhook differs from the source-code-derived shape documented here (e.g. a self-hosted operator running an older/forked version).

## Adaptations

### Deviation 1: `phone` is an array, not a string, in `send-message`
- **Task file said**: FR-009 asked to confirm the exact send-message payload shape before assuming anything.
- **Reality**: `wppconnect-server`'s own Swagger documentation examples show `phone` as a bare string, but the actual `messageController.ts` source iterates `phone` as an array (`for (const contato of phone)`). A plugin built against the documented example would silently iterate over each character of the phone number string instead of sending once.
- **Action taken**: Implemented `sendMessage` with `phone: [phone]` (single-element array), confirmed against source, not docs.

### Deviation 2: no shared plugin inbox field duplication
- **Task file said**: mirror `Baileys.ts`'s structure.
- **Reality**: `Baileys.ts` duplicates `this._inbox` alongside `MessengersBase`'s own `this.inbox` (needed because Baileys destructures `whatsappSessionRepository` before calling `super`). `WppconnectServer` has no extra dependency to destructure, so it relies directly on `this.inbox` from `MessengersBase` — simpler, no duplication.
- **Action taken**: No `_inbox` field; `sessionNameFor(this.inbox?._id)` used directly.

### Deviation 3 (post-implementation, before merge): plugin renamed to `WppconnectServerV2` / `wppconnect-server-v2`
- **Task file said**: implement under the identifier `wppconnect-server` / class `WppconnectServer`.
- **Reality**: after all 6 tasks completed, the user requested the identifier be version-pinned to the upstream `wppconnect-server` project's major version (verified release `v2.10.76`), so a future breaking upstream major version doesn't silently break this plugin — a new major version gets a new, separately-implemented plugin instead of modifying this one.
- **Action taken**: `WppconnectServer.ts` → `WppconnectServerV2.ts` (and the same rename across every file, route, `whatsappDefault` value, i18n key, and the KB guide — see `overview.md`'s "Post-implementation naming update" note). This file (`status.md`) was left as the historical record of the original implementation; the `Artifacts` list above refers to the pre-rename file names.
