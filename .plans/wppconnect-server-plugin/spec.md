# Feature Specification: Wppconnect-Server WhatsApp Plugin

**Plan**: wppconnect-server-plugin
**Created**: 2026-11-04
**Status**: Final
**Input**: Implementar um novo plugin de messenger para o "wppconnect-server" (API REST self-hosted que envelopa o wppconnect), como alternativa ao Baileys. Diferente do plano `wppconnect-plugin`, este NÃO roda Puppeteer no nosso processo — o `wppconnect-server` é um serviço externo que expõe sua própria API REST de sessão/QR/envio. Deve reaproveitar o padrão de plugin HTTP já usado por Dialog/Utalk (campos `whatsappUrl`/`whatsappToken` já existentes no Inbox), e o webhook genérico já existente para mensagens recebidas. Fora de escopo: hospedar/operar a instância do wppconnect-server; integração com o plano `wppconnect-plugin` (lib embutida).

---

## User Stories *(mandatory)*

### Story 1 — Admin connects an Inbox to an external wppconnect-server instance (P1)

An admin configures an Inbox with `whatsappDefault: 'wppconnect-server'`, `whatsappUrl` pointing at their self-hosted `wppconnect-server` instance, and `whatsappToken` as that instance's session secret key, then authenticates via QR code proxied through our app.

**Why this priority**: Without a working connection flow, no message can be sent or received — this is the MVP slice.

**Independent Test**: Configure an Inbox with the three fields above, call the QR endpoint, confirm the response proxies a QR payload obtained from the external `wppconnect-server` instance's own session API.

**Acceptance Scenarios**:

1. **Given** an Inbox with `whatsappDefault: 'wppconnect-server'`, `whatsappUrl`, and `whatsappToken` set, **When** `POST /resources/inboxes/:id/wppconnect-server-qr` is called, **Then** the plugin calls the external instance's session-start endpoint and the response contains `{ qr: '<string>' }`.
2. **Given** an Inbox whose external session is already connected, **When** the QR endpoint is called, **Then** the response is `{ connected: true, message: 'Já conectado' }`.
3. **Given** an Inbox whose `whatsappDefault` is not `'wppconnect-server'`, **When** the QR endpoint is called, **Then** the response is `{ message: 'Inbox não usa Wppconnect Server' }`.
4. **Given** an Inbox missing `whatsappUrl` or `whatsappToken` while `whatsappDefault` is `'wppconnect-server'`, **When** the QR endpoint is called, **Then** the response indicates missing configuration rather than throwing an unhandled error.
5. **Given** an Inbox with `whatsappDefault: 'wppconnect-server'`, **When** `GET /resources/inboxes/:id/wppconnect-server-status` is called, **Then** the response reflects the external instance's real session status as `{ connected: true|false }`.

---

### Story 2 — Receiving and sending text messages via wppconnect-server (P1)

The external `wppconnect-server` instance is configured (outside this app) to forward inbound WhatsApp events to our existing generic messenger webhook; outgoing messages queued with `destination: 'to-messenger'` are delivered by calling the external instance's send-message REST endpoint.

**Why this priority**: Core value of the plugin.

**Independent Test**: POST a `wppconnect-server`-shaped webhook payload to the existing `POST /v1/messenger/message/?token=<apiToken>` endpoint and confirm `WppconnectServer.responseToMessages()` creates a Contact/Message; create an outgoing `Message` and confirm `WppconnectServer.sendMessage()` calls the external send-message endpoint with the configured `whatsappUrl`/`whatsappToken`.

**Acceptance Scenarios**:

1. **Given** the existing generic webhook route, **When** a `wppconnect-server`-shaped inbound event is posted, **Then** `IngestMessengerMessage` queues it and `WppconnectServer.responseToMessages()` parses it into a Contact/Message exactly as the Baileys/Dialog/Utalk plugins do for their own shapes — no new route is introduced.
2. **Given** a `Message` with `kind: 'text'` and `destination: 'to-messenger'` on a `wppconnect-server`-configured Inbox, **When** the send-message job runs, **Then** `WppconnectServer.sendMessage(messageId, url, token)` POSTs to the external instance and sets `sended: true` on success.
3. **Given** the external instance returns an error response, **When** `sendMessage()` is called, **Then** `Message.error` is populated and `sended` remains falsy — mirrors `Utalk.ts`'s error-handling branch.

---

### Story 3 — Department-level and Licensee-level QR parity (P2)

Mirrors the `wppconnect-plugin`'s Story 3 — Department and legacy Licensee-level flows get equivalent QR/status endpoints.

**Why this priority**: Feature parity with Baileys/Wppconnect so admin flows aren't provider-specific.

**Independent Test**: Call `POST /resources/departments/:id/wppconnect-server-qr` for a Department with no dedicated Inbox and confirm it falls back to the Licensee's `wppconnect-server`-configured Inbox.

**Acceptance Scenarios**:

1. **Given** a Department linked directly to a `wppconnect-server` Inbox, **When** its QR endpoint is called, **Then** it delegates to the Inbox-level use case.
2. **Given** a Department with no dedicated Inbox but whose Licensee has a `wppconnect-server` Inbox, **When** the Department QR endpoint is called, **Then** it resolves that Inbox.

---

### Story 4 — Admin UI exposes wppconnect-server as a connection option (P2)

Unlike Baileys/Wppconnect, this provider is HTTP-credential-based like Dialog/Utalk — the admin form must show (not hide) `whatsappToken`/`whatsappUrl`, plus a QR panel for the initial session pairing.

**Why this priority**: Required for non-technical admin usage.

**Independent Test**: Render the Inbox form, select `wppconnect-server`, confirm `whatsappToken`/`whatsappUrl` fields are visible and required, and the QR panel renders.

**Acceptance Scenarios**:

1. **Given** the Inbox form, **When** `whatsappDefault` is set to `'wppconnect-server'`, **Then** `whatsappToken`/`whatsappUrl` fields remain visible (same behavior as `'dialog'`/`'utalk'`/`'ycloud'`/`'pabbly'`, unlike `'baileys'`/`'wppconnect'`).
2. **Given** an Inbox with `whatsappDefault: 'wppconnect-server'` and persisted `id`, **When** the Edit screen loads, **Then** `InboxWppconnectServerPanel` renders and calls the status endpoint.

---

### Edge Cases

- What happens when the external `wppconnect-server` instance is unreachable (DNS/network failure)? → `sendMessage`/QR calls must catch the network error and populate `Message.error` / return a clear non-200-crashing response, mirroring `request.ts`'s existing `catch` branch (returns `{ status: 500, data: '<error message>' }` rather than throwing).
- What if the external instance's API version doesn't match the endpoint paths assumed by this plugin? → Documented as a verification step before implementation (see FR-010); not silently swallowed.
- What if the webhook payload shape from a given `wppconnect-server` version differs from the one assumed here? → `parseMessage`/`parseContactData` must return `null` gracefully (same convention as `Utalk.parseMessage` for unrecognized events) rather than throwing.

---

## Functional Requirements *(mandatory)*

- **FR-001**: System MUST provide a `WppconnectServer` class implementing the full `MessengersBase` abstract contract.
- **FR-002**: System MUST register `case 'wppconnect-server'` in `src/app/plugins/messengers/factory.ts`.
- **FR-003**: System MUST reuse the existing `whatsappUrl`/`whatsappToken` Inbox fields — no new database fields or migration.
- **FR-004**: System MUST reuse the existing generic webhook route (`POST /v1/messenger/message/?token=<apiToken>` and its `IngestMessengerMessage` pipeline) for inbound messages — no new webhook route.
- **FR-005**: System MUST expose `POST/GET /resources/inboxes/:id/wppconnect-server-qr|status`, plus Department and Licensee-level equivalents, calling out to the external instance's own session REST API rather than managing session state locally.
- **FR-006**: Admin UI MUST show (not hide) `whatsappToken`/`whatsappUrl` for `whatsappDefault === 'wppconnect-server'`.
- **FR-007**: `sendMessage` MUST use the existing `request` service (`src/app/services/request.ts`) for HTTP calls, matching the `Utalk.ts`/`Dialog.ts` convention.
- **FR-008**: System MUST support plain text messages only in this plan's scope.

*Marked for clarification:*

- **FR-009**: The exact `wppconnect-server` REST route paths and payload shapes for session start/status/QR/send-message [NEEDS CLARIFICATION: verify against the target deployed version's own API documentation/Swagger during task-01 — commonly documented as `/api/{session}/{secretKey}/generate-token`, `/api/{session}/start-session`, `/api/{session}/status-session`, `/api/{session}/send-message`, but this must be confirmed against the actual instance before finalizing, not assumed from general knowledge].
- **FR-010**: The exact inbound webhook payload shape `wppconnect-server` sends when configured to forward events to an external URL [NEEDS CLARIFICATION: verify during task-01 against the target version's webhook configuration docs].

---

## Success Criteria *(mandatory)*

- **SC-001**: An admin can connect a `wppconnect-server`-configured Inbox end-to-end (QR scan → `connected: true`) against a real `wppconnect-server` instance without touching code.
- **SC-002**: A text message sent to a connected number appears as a `Message` record through the existing generic webhook, with no new route added.
- **SC-003**: No regression in existing Baileys/Dialog/Utalk/YCloud/Pabbly/Wppconnect plugin tests.
- **SC-004**: No Puppeteer/Chromium dependency is added to this app's own process or Docker image by this plan.

---

## Assumptions

- A `wppconnect-server` instance is operated as an external service (its own deployment, e.g. its own Docker container) — this plan documents the integration contract but does not provision or deploy that instance.
- One `wppconnect-server` "session" per `(licensee, inbox)`, identified by a session name derived from the Inbox/Licensee id — exact naming convention to be finalized in task-01 against FR-009.
- Media messages, and any feature not already present in the Dialog/Utalk pattern, are out of scope.
- This plan is fully independent of `.plans/wppconnect-plugin` — no shared code between the embedded-library plugin and this HTTP-client plugin beyond `MessengersBase`.
