# Wppconnect Server v2 WhatsApp Plugin — Usage Guide

**Last Updated**: 2026-11-05
**Context**: Step-by-step guide for configuring a Licensee/Inbox to use the `wppconnect-server-v2` WhatsApp plugin — an HTTP-client plugin (same family as `Dialog`/`Utalk`) that talks to a self-hosted, externally-operated [`wppconnect-server`](https://github.com/wppconnect-team/wppconnect-server) instance. Unlike the Baileys and Wppconnect plugins, **no Puppeteer/Chromium runs inside this app's process** — all WhatsApp Web automation happens on the external instance.

---

## Naming: why "v2"

The upstream project is called **`wppconnect-server`** (no version in its own name) and follows semver. This app's plugin identifier (`whatsappDefault` value, route segment, class name) is **`wppconnect-server-v2`**, pinned to upstream's **major version** — because it's self-hosted, different licensees could be running different major versions of `wppconnect-server` at the same time, and a breaking API change upstream shouldn't silently break already-configured Inboxes. If `wppconnect-server` ever ships a `v3` with a breaking change to the endpoints this plugin depends on (`generate-token`, `start-session`, `status-session`, `send-message`), implement a new `wppconnect-server-v3` plugin alongside this one rather than modifying it in place.

This implementation was verified against `wppconnect-server` release **v2.10.76** (2026-11-05) — see `.plans/wppconnect-server-plugin/phase-1/task-01-plugin-core/status.md` for the full verification notes.

---

## Overview

`wppconnect-server` is a self-hosted REST API that wraps the `@wppconnect-team/wppconnect` library. This app's `WppconnectServerV2` plugin (`src/app/plugins/messengers/WppconnectServerV2.ts`) is a thin HTTP client: it calls the external instance's own session/QR/send-message endpoints, and reuses this app's existing generic messenger webhook for inbound messages. No new database table or schema change was needed — the plugin reuses the existing `whatsappUrl`/`whatsappToken` Inbox fields (same fields Dialog/Utalk/YCloud/Pabbly already use).

---

## Prerequisite — Deploy `wppconnect-server` separately

This app does **not** provision or host the `wppconnect-server` instance. It must be deployed independently (e.g. its own Docker container, VM, or managed host) before any of the steps below work — use a `2.x` release. See the [`wppconnect-server` repository](https://github.com/wppconnect-team/wppconnect-server) for its own deployment instructions. You will need:

- The instance's base URL (e.g. `https://my-wppconnect-server.example.com`) — this is the Inbox's `whatsappUrl`.
- A session bearer **token**, obtained once from the instance's own `POST /api/{session}/{secretkey}/generate-token` endpoint (using the instance's `SECRET_KEY` environment variable) — this token is the Inbox's `whatsappToken`. Generating this token is a one-time manual step against the external instance; this app does not automate it.
- A **session name** — this app derives it deterministically as `atendio-inbox-{inboxId}` (see `sessionNameFor()` in `WppconnectServerV2.ts`). You do not need to configure this yourself; it's computed from the Inbox's own ID.

> **Session naming caveat**: the session name is derived from the Inbox's database ID. If an Inbox is deleted and recreated, it gets a new ID and therefore a new session name — you will need to re-authenticate (new QR scan) even if reusing the same WhatsApp number.

---

## Step 1 — Configure the Inbox

Set `whatsappDefault` to `"wppconnect-server-v2"`, and fill in `whatsappUrl` and `whatsappToken` as described above.

```http
POST /api/v1/resources/inboxes
x-access-token: <jwt-token>
Content-Type: application/json

{
  "name": "WhatsApp via Wppconnect Server",
  "licensee": "<licensee-id>",
  "kind": "messenger",
  "whatsappDefault": "wppconnect-server-v2",
  "whatsappUrl": "https://my-wppconnect-server.example.com",
  "whatsappToken": "<token-from-generate-token>"
}
```

**Unlike Baileys/Wppconnect**, `whatsappToken`/`whatsappUrl` ARE required for this provider (same as Dialog/Utalk/YCloud/Pabbly) — they are not hidden in the admin form.

---

## Step 2 — Authenticate via QR Code

### Endpoints

| Scope | Method | Path |
|-------|--------|------|
| Inbox | `POST` | `/api/v1/resources/inboxes/:id/wppconnect-server-v2-qr` |
| Inbox | `GET` | `/api/v1/resources/inboxes/:id/wppconnect-server-v2-status` |
| Department | `POST` | `/api/v1/resources/departments/:id/wppconnect-server-v2-qr` |
| Department | `GET` | `/api/v1/resources/departments/:id/wppconnect-server-v2-status` |
| Licensee (legacy) | `POST` | `/api/v1/resources/licensees/:id/wppconnect-server-v2-qr` |
| Licensee (legacy) | `GET` | `/api/v1/resources/licensees/:id/wppconnect-server-v2-status` |

Department-level QR delegates to the Inbox-level use case when the Department has a linked Inbox; otherwise it resolves the Licensee's `wppconnect-server-v2`-configured Inbox directly — same fallback pattern as Baileys.

### What happens internally

1. The plugin calls the external instance's `POST /api/{session}/start-session` with `{ waitQrCode: false }`.
2. It then calls `GET /api/{session}/status-session` to read the current session state.
3. If `status === 'CONNECTED'`, the response is `{ connected: true, message: "Já conectado" }`.
4. Otherwise, if a `qrcode` is present in the response, it's returned as `{ qr: "<data-url>" }`.

### Response shapes

| Condition | Body |
|-----------|------|
| QR generated | `{ "qr": "data:image/png;base64,..." }` |
| Already connected | `{ "connected": true, "message": "Já conectado" }` |
| Inbox not configured for this provider | `{ "message": "Inbox não usa Wppconnect Server v2" }` |
| Missing `whatsappUrl`/`whatsappToken` | `{ "message": "Configuração incompleta: whatsappUrl e whatsappToken são obrigatórios" }` |

### Rendering the QR code

**Important**: unlike Baileys (which returns a raw QR string meant for a client-side QR renderer like `qrcode.react`), `wppconnect-server`'s `qrcode` field is **already a base64 `data:image/png;base64,...` image** — render it directly:

```jsx
<img src={qrResponse.qr} alt="QR Code" />
```

The admin UI (`InboxWppconnectServerV2Panel.tsx` / `DepartmentWppconnectServerV2Panel.tsx`) does exactly this.

---

## Step 3 — Sending a WhatsApp Message

Sending follows the exact same message-queue flow as every other messenger plugin — no new API surface:

1. Create a `Message` with `destination: 'to-messenger'` on a `wppconnect-server-v2`-configured Inbox.
2. The `send-message-to-messenger` BullMQ job calls `WppconnectServerV2.sendMessage(messageId, inbox.whatsappUrl, inbox.whatsappToken)`.
3. The plugin POSTs to the external instance's `POST /api/{session}/send-message` with:

```json
{
  "phone": ["5511990283745"],
  "isGroup": false,
  "message": "Hello from atendio"
}
```

> **`phone` must be an array**, even for a single recipient — `wppconnect-server`'s own Swagger documentation shows it as a bare string, but the actual controller source (`messageController.ts`) iterates it as an array. This plugin sends `[phone]`.

Only plain text messages (`kind: 'text'`) are supported in this initial scope — other kinds are logged and ignored, same limitation as the Baileys/Wppconnect plugins.

---

## Step 4 — Receiving Incoming Messages

**No new webhook route was added.** `wppconnect-server` must be configured (on its own side, via its `start-session` `webhook` field or its global `WEBHOOK_URL` config) to forward inbound events to this app's existing generic endpoint:

```
POST https://<your-app>/api/v1/messenger/message/?token=<licensee.apiToken>
```

### Expected payload shape

The plugin's `parseMessage`/`parseContactData` expect the raw event shape `wppconnect-server` sends, which is the underlying `wppconnect` library's `onMessage` payload merged with `{ event, session }`:

```json
{
  "event": "onmessage",
  "session": "atendio-inbox-42",
  "id": "true_5511990283745@c.us_ABC123",
  "from": "5511990283745@c.us",
  "fromMe": false,
  "type": "chat",
  "body": "Olá, quero fazer um pedido!",
  "notifyName": "Nome do Contato"
}
```

| Field | Required | Description |
|-------|----------|--------------|
| `event` | Yes | Only `"onmessage"` is processed; other events (`onack`, `onpresencechanged`, etc.) are ignored. |
| `fromMe` | No | Must be `false` (or absent) — messages from the connected account itself are ignored. |
| `type` | Yes | Only `"chat"` (plain text) is processed in this initial scope. |
| `body` | Yes* | The message text. |
| `from` | Yes | Sender JID (`@c.us` for individuals, `@g.us` for groups) — stripped to derive the contact's phone number via `NormalizePhone`. |
| `notifyName` | No | Contact display name. Falls back to `sender.pushname`/`sender.name`, then the phone number. |

> Delivery/read receipts (`onack` events) are **not** handled in this initial scope — mirrors the same limitation already accepted for the Utalk plugin.

---

## Full Flow Summary

```
1. Deploy wppconnect-server (2.x) separately; generate-token once to get a bearer token.

2. Configure Inbox: whatsappDefault = "wppconnect-server-v2", whatsappUrl, whatsappToken

3. Authenticate:
   POST /api/v1/resources/inboxes/:id/wppconnect-server-v2-qr
   → plugin calls external start-session + status-session
   → render the returned base64 QR image → user scans → session lives on the external instance

4. Configure wppconnect-server's own webhook to point at:
   POST /api/v1/messenger/message/?token=<licensee.apiToken>

5. Receive an incoming message:
   wppconnect-server POSTs its onmessage event to the webhook above
   → Body saved → "messenger-message" job queued
   → WppconnectServerV2.responseToMessages(body)
      → Contact created/updated, Message created with destination "to-chat" or "to-chatbot"

6. Send an outgoing message:
   Create Message with destination "to-messenger"
   → "send-message-to-messenger" BullMQ job
   → WppconnectServerV2.sendMessage() → POST {whatsappUrl}/api/{session}/send-message
```

---

## Troubleshooting

| Symptom | Likely cause | Action |
|---------|-------------|--------|
| `/wppconnect-server-v2-qr` returns `{ message: 'Configuração incompleta...' }` | `whatsappUrl` or `whatsappToken` not set on the Inbox | Set both fields — unlike Baileys/Wppconnect, this provider requires them |
| `/wppconnect-server-v2-qr` returns `{ message: 'Inbox não usa Wppconnect Server v2' }` | `whatsappDefault` is not `"wppconnect-server-v2"` | Update Inbox config |
| QR generated but never shows "connected" | External instance's session expired before scan, or network issue between this app and the external instance | Retry; check the external instance's own logs |
| Messages not received | `wppconnect-server`'s own webhook config doesn't point at this app's `/messenger/message` endpoint | Verify the external instance's webhook/`WEBHOOK_URL` configuration |
| Outgoing message stuck with `sended: false` | External instance unreachable, or send-message returned a non-201 status | Check `message.error` field; verify the external instance is up and the session is still `CONNECTED` |
| Session lost after recreating an Inbox | Session name (`atendio-inbox-{inboxId}`) changed because the Inbox got a new ID | Re-authenticate via QR for the new Inbox |
| Everything configured but nothing works | The external instance is running a `wppconnect-server` major version other than `2.x` | This plugin was only verified against `2.x` (release `v2.10.76`) — a `v3` instance may use breaking API changes this plugin doesn't handle; a `wppconnect-server-v3` plugin would need to be implemented separately |

---

## Known Limitations

- No embedded session persistence in this app — all session state lives on the external `wppconnect-server` instance. If that instance loses its session store, only its own backup/restore practices can recover it.
- Media messages beyond plain text are not supported in this initial scope.
- Group sync/directory (like the Baileys `baileys-groups-directory` feature) is not implemented for this provider.
- Delivery/read receipts (`onack`) are not mapped to `Message.sendedAt`/`deliveredAt`/`readAt`.
- This plugin targets `wppconnect-server` major version 2 only — a future major version requires a new, separately-versioned plugin (see "Naming: why v2" above).
