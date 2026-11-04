# Feature Specification: Wppconnect WhatsApp Plugin

**Plan**: wppconnect-plugin
**Created**: 2026-11-04
**Status**: Final
**Input**: Implementar um novo plugin de messenger "Wppconnect" (lib `@wppconnect-team/wppconnect`, Node/TS, baseada em Puppeteer) seguindo o mesmo padrão arquitetural do plugin Baileys existente. Deve estender `MessengersBase`, registrar no factory com `whatsappDefault: 'wppconnect'`, persistir sessão por licensee/inbox reaproveitando o padrão `WhatsappSession`, expor endpoint de QR code análogo ao do Baileys, e opção no formulário admin. Cobrir infra de Chromium (Dockerfile) como risco/tarefa explícita. Fora de escopo: multi-sessão, mídia além de texto, integração com wppconnect-server.

---

## User Stories *(mandatory)*

### Story 1 — Admin connects an Inbox via Wppconnect QR code (P1)

An admin sets an Inbox's `whatsappDefault` to `"wppconnect"` and authenticates it by scanning a QR code, the same way they already do for Baileys today.

**Why this priority**: Without a working QR-based connection flow, no message can be sent or received — this is the MVP slice.

**Independent Test**: Set `whatsappDefault: 'wppconnect'` on an Inbox, call the QR endpoint, confirm a QR string is returned and that calling it again after a simulated successful connection returns `{ connected: true }`.

**Acceptance Scenarios**:

1. **Given** an Inbox with `whatsappDefault: 'wppconnect'` and no existing `WhatsappSession`, **When** `POST /resources/inboxes/:id/wppconnect-qr` is called, **Then** the response contains `{ qr: '<string>' }`.
2. **Given** an Inbox already connected (valid session tokens persisted), **When** `POST /resources/inboxes/:id/wppconnect-qr` is called, **Then** the response is `{ connected: true, message: 'Já conectado' }`.
3. **Given** an Inbox whose `whatsappDefault` is not `'wppconnect'`, **When** `POST /resources/inboxes/:id/wppconnect-qr` is called, **Then** the response is `{ message: 'Inbox não usa Wppconnect' }`.
4. **Given** an Inbox with `whatsappDefault: 'wppconnect'`, **When** `GET /resources/inboxes/:id/wppconnect-status` is called, **Then** the response reflects the real connection state as `{ connected: true|false }`.

---

### Story 2 — Receiving and sending text messages via Wppconnect (P1)

Once connected, incoming WhatsApp text messages are ingested into the existing Contact/Message pipeline, and outgoing messages queued with `destination: 'to-messenger'` are delivered through the Wppconnect session.

**Why this priority**: Core value of the plugin — without send/receive, the QR connection alone is useless.

**Independent Test**: Simulate an incoming message event through `Wppconnect.responseToMessages()` and confirm a `Contact` and `Message` are created; create a `Message` with `destination: 'to-messenger'` and confirm `Wppconnect.sendMessage()` marks it `sended: true`.

**Acceptance Scenarios**:

1. **Given** a connected Wppconnect session, **When** an inbound text message event is received, **Then** a `Contact` is created/updated and a `Message` is created with `destination` set to `to-chat` or `to-chatbot` based on `contact.talkingWithChatBot`.
2. **Given** a `Message` with `kind: 'text'` and `destination: 'to-messenger'`, **When** the send-message job runs, **Then** `Wppconnect.sendMessage()` delivers the message and sets `sended: true`.
3. **Given** a send failure (e.g. number not registered on WhatsApp), **When** `sendMessage()` is called, **Then** the `Message.error` field is populated and `sended` remains falsy.

---

### Story 3 — Department-level and Licensee-level QR parity (P2)

Admins managing a Department (without a dedicated Inbox) or a legacy Licensee-level WhatsApp config can also connect via Wppconnect, mirroring the existing Baileys Department/Licensee QR endpoints.

**Why this priority**: Required for feature parity with Baileys so existing admin flows (Department form, Licensee onboarding) are not WhatsApp-provider-specific.

**Independent Test**: Call `POST /resources/departments/:id/wppconnect-qr` for a Department with no dedicated Inbox and confirm it falls back to the Licensee's Wppconnect-configured Inbox, matching `GetBaileysQrForDepartment` behavior.

**Acceptance Scenarios**:

1. **Given** a Department linked directly to a Wppconnect Inbox, **When** `POST /resources/departments/:id/wppconnect-qr` is called, **Then** it delegates to the Inbox-level QR use case and returns the same shape.
2. **Given** a Department with no dedicated Inbox but whose Licensee has a Wppconnect Inbox, **When** the Department QR endpoint is called, **Then** it resolves that Inbox and returns a QR.
3. **Given** a Licensee with a legacy (non-Inbox-scoped) Wppconnect configuration, **When** `POST /resources/licensees/:id/wppconnect-qr` is called, **Then** the response shape matches the existing Baileys licensee-level endpoint.

---

### Story 4 — Admin UI exposes Wppconnect as a connection option (P2)

The Inbox and Department admin forms let an admin pick "Wppconnect" from the WhatsApp provider dropdown, hide the token/URL fields (not applicable — session-based like Baileys), and show a QR panel.

**Why this priority**: Without UI wiring, the feature is only reachable via raw API calls, which blocks non-technical admin usage.

**Independent Test**: Render the Inbox form, select `wppconnect` from the dropdown, confirm `whatsappToken`/`whatsappUrl` fields are hidden and the QR panel renders.

**Acceptance Scenarios**:

1. **Given** the Inbox form, **When** `whatsappDefault` is set to `'wppconnect'`, **Then** the `whatsappToken`/`whatsappUrl` fields are hidden, same as for `'baileys'`.
2. **Given** an Inbox with `whatsappDefault: 'wppconnect'` and `id` already persisted, **When** the Edit screen loads, **Then** `InboxWppconnectPanel` renders and calls the status endpoint.
3. **Given** the Department form, **When** `whatsappDefault` is set to `'wppconnect'`, **Then** `DepartmentWppconnectPanel` renders analogous to `DepartmentBaileysPanel`.

---

### Edge Cases

- What happens when the headless Chromium process crashes mid-session? → `sendMessage` must catch the error, set `Message.error`, and not leave a zombie browser process (mirrors the Baileys `finally { socket.end() }` pattern using Puppeteer's `browser.close()`).
- How does the system handle a QR request timing out because Chromium failed to launch (e.g. missing system libraries in the container)? → Must reject with a clear error distinguishable from "WhatsApp didn't respond," to speed up infra debugging.
- What if two QR requests for the same Inbox arrive concurrently? → Out of scope for this plan; same known limitation already accepted for Baileys (no request-level locking).
- What happens to messages sent while session tokens are stale/revoked? → Mirrors Baileys' 401 handling: clear stored session tokens so the next status check reflects disconnected.

---

## Functional Requirements *(mandatory)*

- **FR-001**: System MUST provide a `Wppconnect` class implementing the full `MessengersBase` abstract contract (`parseMessage`, `parseContactData`, `parseMessageStatus`, `contactWithDifferentData`, `shouldUpdateWaStartChat`, `sendMessage`).
- **FR-002**: System MUST register `case 'wppconnect'` in `src/app/plugins/messengers/factory.ts`, instantiating `Wppconnect` with the same dependency shape as `Baileys`.
- **FR-003**: System MUST persist Wppconnect session data in the existing `WhatsappSession` Prisma model (`creds`/`keys` JSON columns), scoped by `(licensee, inbox)` — no schema migration.
- **FR-004**: System MUST expose `POST /resources/inboxes/:id/wppconnect-qr` and `GET /resources/inboxes/:id/wppconnect-status`, mirroring the response shapes of the Baileys equivalents.
- **FR-005**: System MUST expose Department-level and Licensee-level QR/status endpoints mirroring `GetBaileysQrForDepartment`/`GetBaileysStatusForDepartment` and the Licensee-level Baileys route.
- **FR-006**: System MUST NOT require `whatsappToken`/`whatsappUrl` when `whatsappDefault === 'wppconnect'` (same relaxation already in place for `'baileys'` — verify no stricter validator exists before assuming this is free).
- **FR-007**: Admin UI (Inbox and Department forms) MUST offer `'wppconnect'` as a dropdown option and hide `whatsappToken`/`whatsappUrl` fields when selected.
- **FR-008**: The Docker image used for this app MUST have the system libraries required to launch headless Chromium (Puppeteer's bundled Chromium or equivalent).
- **FR-009**: System MUST support sending and receiving plain text messages only in this plan's scope; non-text payloads are ignored, matching Baileys' initial-scope behavior.

*Marked for clarification:*

- **FR-010**: The exact `@wppconnect-team/wppconnect` session-token persistence API (file-based token store vs. in-memory callback) [NEEDS CLARIFICATION: verify against the installed library's README/type defs during task-02 — do not assume the Baileys `creds`/`keys` shape transfers 1:1].

---

## Success Criteria *(mandatory)*

- **SC-001**: An admin can connect a Wppconnect-configured Inbox end-to-end (QR scan → `connected: true`) without touching code.
- **SC-002**: A text message sent to a connected Wppconnect number appears as a `Message` record within the same job-queue latency as the existing Baileys flow.
- **SC-003**: `docker build` succeeds and a Wppconnect session can launch headless Chromium inside the built container image.
- **SC-004**: No regression in existing Baileys/Dialog/Utalk/YCloud/Pabbly plugin tests.

---

## Assumptions

- Chromium runs headless inside the existing Node 24 Docker image; no separate container/service is introduced (that approach is the subject of the separate `wppconnect-server-plugin` plan).
- Heroku (current production target per `docs/kb/features/deploy-heroku.md`) is **not** covered by this plan's infra task — only the Docker/Fly.io path is. Deploying this plugin to the current Heroku production environment requires a Chrome buildpack, to be handled as a follow-up before go-live there.
- One session per `(licensee, inbox)`, matching the existing `WhatsappSession` unique scope — no multi-session support.
- Media messages, persistent-socket inbound (`ENABLE_BAILEYS_SOCKET`-style), and group sync/directory are explicitly out of scope, consistent with how those were added to Baileys as separate follow-up plans (`baileys-socket-monitor`, `baileys-groups-directory`).
