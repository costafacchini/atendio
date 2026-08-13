# Feature Specification: Remove Plugin Fields from Licensee — Migrate to Inbox

**Plan**: licensee-plugin-fields-to-inbox
**Created**: 2026-08-13
**Status**: Final
**Input**: Remove plugin fields (chatDefault, chatUrl, chatKey, chatIdentifier, whatsappDefault, whatsappToken, whatsappUrl) from the Licensee model entirely and migrate all consumers to read from Inbox instead.

---

## User Stories *(mandatory)*

### Story 1 — Admin user sees correct UI gates based on Inbox records (P1)

As an admin user, I want the Navbar chat menu option and the Dashboard Baileys QR card to appear when my licensee has a chat or WhatsApp inbox configured — so that the UI accurately reflects what is actually set up.

**Why this priority**: This is the root bug that triggered this plan. Onboarding now writes plugin fields to Inbox, not Licensee, so UI gates reading from Licensee show nothing.

**Independent Test**: Create a licensee with a chat inbox (`kind='chat'`) and a WhatsApp inbox (`kind='messenger', whatsappDefault='baileys'`). Log in as admin. The Navbar chat menu item should be visible and the Baileys QR card should appear on Dashboard.

**Acceptance Scenarios**:

1. **Given** a licensee with a chat inbox exists, **When** an admin logs in, **Then** the Navbar chat menu item is visible.
2. **Given** a licensee with no chat inbox, **When** an admin logs in, **Then** the Navbar chat menu item is hidden.
3. **Given** a licensee with a baileys messenger inbox, **When** an admin visits the Dashboard, **Then** the Baileys QR/status card is visible and uses inbox-scoped API endpoints.
4. **Given** a licensee with no messenger inbox, **When** an admin visits the Dashboard, **Then** no Baileys card is rendered.

---

### Story 2 — Plugin services route to correct provider URL/token from Inbox (P2)

As a system operator, I want ChatMessage, MessengerMessage, CloseChat, and related services to read chatUrl/chatKey/whatsappUrl/whatsappToken from the relevant Inbox record — so that messages are delivered using the correct credentials regardless of what the Licensee record contains.

**Why this priority**: Without this, inbound and outbound message routing breaks after the onboarding migration removes fields from Licensee.

**Independent Test**: Send an inbound WhatsApp message, verify it routes through the correct `whatsappUrl`/`whatsappToken` from the Inbox. Send a local chat message; verify it uses `chatUrl`/`chatKey` from the chat Inbox.

**Acceptance Scenarios**:

1. **Given** a messenger inbox with whatsappUrl/whatsappToken, **When** an inbound WhatsApp message arrives, **Then** MessengerMessage reads credentials from the inbox, not the licensee.
2. **Given** a chat inbox with chatUrl/chatKey, **When** an inbound chat message arrives, **Then** ChatMessage reads credentials from the inbox.
3. **Given** a room associated with an inbox, **When** CloseChat is triggered, **Then** the close request uses the inbox's credentials.

---

### Story 3 — Baileys use cases check inbox for plugin type, not licensee (P3)

As a system operator, I want GetBaileysQr, GetBaileysStatus, and SyncBaileysDirectory to refuse requests unless the targeted inbox has `whatsappDefault='baileys'` — so that only baileys inboxes trigger socket operations.

**Why this priority**: Correctness gate — prevents baileys socket operations for non-baileys inboxes.

**Independent Test**: Call GetBaileysQr for an inbox with `whatsappDefault='dialog'`; expect 422. Call for a baileys inbox; expect QR response.

**Acceptance Scenarios**:

1. **Given** a messenger inbox with `whatsappDefault='dialog'`, **When** GetBaileysQr is called for it, **Then** a 422 error is returned.
2. **Given** a messenger inbox with `whatsappDefault='baileys'`, **When** GetBaileysQr is called, **Then** the QR is returned.

---

### Story 4 — Licensee admin forms no longer expose plugin fields (P4)

As a super admin, I want the Licensee create/edit form and wizard to not show ChatPanel or WhatsAppPanel — those fields are now configured per-Inbox through the Inbox management UI.

**Why this priority**: UX cleanup and data integrity — prevents writing stale data to licensee columns that will be removed.

**Independent Test**: Open Licensee new/edit form. Verify no chat or WhatsApp configuration inputs appear.

**Acceptance Scenarios**:

1. **Given** super admin on Licensee new form, **When** the wizard renders, **Then** no ChatPanel or WhatsAppPanel steps are shown.
2. **Given** super admin on Licensee edit form, **When** the form renders, **Then** no chat/WhatsApp fields are present.

---

### Edge Cases

- What if a room has no inbox FK? Services should fall back gracefully (log warning, skip send) rather than crash.
- What if a licensee has multiple chat inboxes? Services should use the inbox associated with the specific room/message context.
- What if inbox is null/undefined in plugin factory? Return null plugin (current behavior), do not throw.

---

## Functional Requirements *(mandatory)*

- **FR-001**: The Navbar chat menu item MUST be gated on the presence of at least one inbox with `kind='chat'` for the current licensee.
- **FR-002**: The Dashboard Baileys card MUST be gated on the presence of at least one inbox with `whatsappDefault='baileys'` for the current licensee.
- **FR-003**: ChatMessage, MessengerMessage, CloseChat, ChatbotMessage, ChatbotTransfer, ResetChats, ResetChatbots, and SendMessageToMessenger MUST read plugin credentials from the Inbox record, not the Licensee.
- **FR-004**: GetBaileysQr, GetBaileysStatus, and SyncBaileysDirectory MUST check `inbox.whatsappDefault === 'baileys'`, not `licensee.whatsappDefault`.
- **FR-005**: Plugin factories (messengers/factory.ts, chats/factory.ts) MUST NOT fall back to licensee fields when inbox is present.
- **FR-006**: LicenseesQuery, LicenseesController, CreateLicensee, and UpdateLicensee MUST NOT read or write the 7 plugin fields on Licensee.
- **FR-007**: The Prisma Licensee schema MUST NOT contain the 7 plugin fields after Phase 3.
- **FR-008**: ILicensee TypeScript interface MUST NOT contain the 7 plugin fields after Phase 3.
- **FR-009**: The Licensee create/edit form and wizard MUST NOT render ChatPanel or WhatsAppPanel.

---

## Success Criteria *(mandatory)*

- **SC-001**: All existing tests pass after each phase with no regressions.
- **SC-002**: `yarn typecheck` reports zero errors after Phase 3.
- **SC-003**: `npx jest` green after each task.
- **SC-004**: Admin user with baileys inbox sees Baileys card on Dashboard and chat inbox sees chat in Navbar.
- **SC-005**: Prisma migration removes 7 columns from licensees table cleanly with no data loss (those columns are empty post-onboarding migration).

---

## Assumptions

- Onboarding (`OnboardAccount`) already writes plugin config to Inbox — Licensee plugin fields are empty for all records created after the onboarding migration.
- Inbox records already have all 7 fields (`chatDefault`, `chatUrl`, `chatKey`, `chatIdentifier`, `whatsappDefault`, `whatsappToken`, `whatsappUrl`).
- Services can load the inbox by resolving the inbox FK already present on Message or Room domain objects.
- Licensee-scoped Baileys endpoints (`GetBaileysQr`, `GetBaileysStatus`) already have inbox-scoped counterparts (`GetBaileysQrForInbox`, etc.) — Phase 2 migrates callers.
- The 7 fields are not read anywhere outside the scope identified in this plan.
- No active data in the licensee plugin columns needs to be preserved (confirmed: post-onboarding migration those columns are empty).
