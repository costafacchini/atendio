# Feature Specification: 360dialog Cloud API Migration (Dialog messenger plugin)

**Plan**: dialog-cloud-api-migration
**Created**: 2026-10-29
**Status**: Final
**Input**: Issue #3346 — `waba.360dialog.io` (360dialog On-Premise API) was switched off by the vendor on 2025-10-23. `src/app/plugins/messengers/Dialog.ts` must migrate to the 360dialog Cloud API (`waba-v2.360dialog.io`). Scope confirmed by user as full migration, not just the `downloadMedia` line cited in the issue.

---

## User Stories *(mandatory)*

### Story 1 — Restore outbound message sending (P1)

Licensees using the Dialog (360dialog) messenger plugin can no longer send any WhatsApp message, because `sendMessage` posts to a path format (`v1/messages/`) that does not exist on the Cloud API (`/messages`, no `v1/` prefix, no trailing slash). This is the highest-severity story: it blocks all outbound traffic for every licensee on this plugin.

**Why this priority**: Total outage of outbound messaging for any licensee whose inbox has been (or will be) pointed at the Cloud API host.

**Independent Test**: Mock `request.post` and call `Dialog#sendMessage` directly; assert the call target path, independent of media/contact-validation work.

**Acceptance Scenarios**:

1. **Given** a licensee inbox with `whatsappUrl` pointing at the Cloud API host and a valid `D360-API-KEY`, **When** a text message is sent via `sendMessage`, **Then** the request POSTs to `{whatsappUrl}messages` (no `v1/` prefix, no trailing slash) and a `201` response marks the message `sended`.
2. **Given** the same setup, **When** a template, interactive, file, or location message is sent, **Then** the corrected endpoint is used and the existing payload-building logic per message kind is unchanged.
3. **Given** the API returns a non-201 status, **When** `sendMessage` processes the response, **Then** the existing error-logging/persistence behavior (`messageToSend.error`) continues to work against the new endpoint.

---

### Story 2 — Restore inbound media download (P2)

`downloadMedia` hardcodes `https://waba.360dialog.io` and ignores the configurable `whatsappUrl`. Even after the host is fixed, the On-Premise single-GET-returns-binary flow no longer exists on Cloud API: retrieving media is now a two-step flow (resolve a `lookaside.fbsbx.com` URL, then download by swapping that host for `waba-v2.360dialog.io`).

**Why this priority**: Breaks inbound file messages (image/video/audio/document) specifically — the point called out in issue #3346 — but does not block text messaging, so it ranks below Story 1.

**Independent Test**: Unit-test `getMediaUrl`/`downloadMedia` in isolation with mocked `request.get`/`request.download` responses; does not require Story 1 or Story 4 to be implemented first.

**Acceptance Scenarios**:

1. **Given** a `mediaId` and valid token, **When** `getMediaUrl` is called, **Then** it issues a GET to `{whatsappUrl}{mediaId}` (no `v1/media/` prefix) to resolve the Meta `lookaside` URL. [NEEDS CLARIFICATION: exact JSON response shape of this endpoint — field name holding the lookaside URL — is not confirmed from docs alone; verify against official 360dialog reference or a sandbox call before finalizing the implementation.]
2. **Given** the lookaside URL response, **When** downloading the binary, **Then** the code replaces the `lookaside.fbsbx.com` host with `waba-v2.360dialog.io` and GETs `/whatsapp_business/attachments/` with the original `mid`/`ext`/`hash` query parameters.
3. **Given** the binary is downloaded, **When** `getMediaUrl` completes, **Then** it uploads to S3 and returns a presigned URL exactly as before — the `uploadFile`/`S3` contract does not change.

---

### Story 3 — Keep webhook and template management working (P3)

`setWebhook` (`v1/configs/webhook`) and `searchTemplates`/`getTemplates` (`v1/configs/templates`) already use paths that remain unchanged on the Cloud API per 360dialog's docs — only the host needs to resolve to `waba-v2.360dialog.io`. These are not reported broken; this story is about adding regression coverage, not a redesign.

**Why this priority**: Lowest risk/urgency — no code change expected, just verification, so it can trail the higher-severity stories.

**Independent Test**: Add assertions on the exact URL passed to `request.post`/`request.get` for these two functions against the Cloud API host.

**Acceptance Scenarios**:

1. **Given** `whatsappUrl` is set to the Cloud API host, **When** `setWebhook` runs, **Then** it POSTs to `{whatsappUrl}v1/configs/webhook` unchanged.
2. **Given** `whatsappUrl` is set to the Cloud API host, **When** `searchTemplates` runs, **Then** it GETs `{whatsappUrl}v1/configs/templates` unchanged.

---

### Story 4 — Decide and implement a Cloud-API-compatible contact-validation strategy (P2)

`getWaIdContact` calls `v1/contacts/` with `force_check` to validate a phone number and obtain a `wa_id` before the first send. No confirmed Cloud API equivalent exists; 360dialog's own guidance is to send directly to the E.164 number and handle delivery errors from the `/messages` response instead of pre-validating. `sendMessage` only calls `getWaIdContact` when `contact.waId` is missing (first-ever message to that contact), so this silently affects every *new* contact once the On-Premise host is gone.

**Why this priority**: Not a total outage (only affects contacts without a stored `waId` yet), but high uncertainty — must be decided deliberately, not guessed at implementation time.

**Independent Test**: The investigation/decision (Phase 1) can be completed and documented independently of any code change; the implementation task consumes that decision.

**Acceptance Scenarios**:

1. **Given** no confirmed Cloud API contact-validation endpoint exists, **When** the investigation task completes, **Then** a documented decision exists (e.g., "drop the pre-check, send directly using the E.164 number, treat `wa_id` as the number itself until the first real response assigns one, handle delivery errors from the `/messages` response") recorded in `docs/kb/research/`.
2. **Given** the decision is implemented, **When** a contact without a stored `waId` sends/receives its first message, **Then** `sendMessage` no longer calls the removed `v1/contacts` endpoint and instead follows the decided strategy.
3. **Given** the Cloud API `/messages` response indicates an invalid/unknown recipient, **When** `sendMessage` processes that response, **Then** the existing error-logging path (`messageToSend.error` / `logger.error`) still captures the failure in a way equivalent to today's "contact is invalid" logging.

---

### Edge Cases

- What happens when a licensee's `whatsappUrl` still points at `https://waba.360dialog.io/` (data not yet migrated)? Out of code scope — this plan does not write to the database; Phase 3 produces a manual rollout checklist instead (global CLAUDE.md: never execute DB changes, instructions only).
- How does the code handle a lookaside URL whose host isn't exactly `lookaside.fbsbx.com` (format drift)? Must fail loudly (explicit `logger.error` with the unexpected URL) rather than silently mis-downloading.
- What if the licensee's `D360-API-KEY` was not regenerated after migrating the number to Cloud API hosting (old keys are rejected per 360dialog docs)? Out of code scope — documented in the Phase 3 rollout checklist.

---

## Functional Requirements *(mandatory)*

- **FR-001**: `sendMessage` MUST POST to `{whatsappUrl}messages` instead of `{whatsappUrl}v1/messages/`.
- **FR-002**: `getMediaUrl`/`downloadMedia` MUST resolve media via the two-step Cloud API flow (GET `{whatsappUrl}{mediaId}` to resolve a lookaside URL, then GET the host-swapped `waba-v2.360dialog.io/whatsapp_business/attachments/` URL) instead of the hardcoded On-Premise host, and MUST stop ignoring the `whatsappUrl` parameter it currently receives but discards.
- **FR-003**: `setWebhook` and `searchTemplates` paths MUST remain `v1/configs/webhook` and `v1/configs/templates` — verified by new regression tests asserting the exact request URL against the Cloud API host, not changed in implementation unless verification proves otherwise.
- **FR-004**: The contact-validation strategy replacing `v1/contacts` `force_check` MUST be explicitly investigated and documented (Phase 1) before `sendMessage`'s contact-validation code path is changed (Phase 2). [NEEDS CLARIFICATION: 360dialog's exact behavior when sending to a never-contacted number on Cloud API is not officially documented in the sources found during planning; the investigation task must confirm via 360dialog's official reference docs, support, or a sandbox call before implementation.]
- **FR-005**: All new/changed request flows MUST continue to authenticate via the `D360-API-KEY` header — no change to the auth scheme.
- **FR-006**: Existing message-kind payload builders (text/template/interactive/file/location in `sendMessage`, and `parseComponents`/`parseTemplates`) MUST NOT change their request body shape — only endpoint paths/hosts and the contact-validation step change.
- **FR-007**: This plan MUST NOT write to the database (e.g., updating licensees' stored `whatsappUrl`/`whatsappToken`). Any such change is delivered as a manual checklist for the user to execute.

---

## Success Criteria *(mandatory)*

- **SC-001**: `sendMessage`, `setWebhook`, and `searchTemplates` have explicit test assertions on the exact request URL/path used (not just mocked response handling), proving they target the Cloud API shape.
- **SC-002**: New unit tests cover the two-step media download flow, including the lookaside-host-swap and an unexpected-host error path.
- **SC-003**: A documented decision for contact validation exists under `docs/kb/research/` before any `sendMessage`/`getWaIdContact` code implementing it is merged.
- **SC-004**: `npx jest` and `npx eslint .` pass clean on the full affected test suite (`Dialog.spec.ts` and any service specs touching `whatsappUrl`/360dialog fixtures) after the migration.
- **SC-005**: No behavior change to message-kind payload shapes — existing passing tests for text/template/interactive/file/location sending continue to pass unmodified in their assertions (only the input `url` fixture value and any new path assertions change).

---

## Assumptions

- 360dialog keeps the same `D360-API-KEY` auth header scheme for the Cloud API (confirmed via official docs during planning).
- `v1/configs/webhook` and `v1/configs/templates` paths are unchanged on the Cloud API per 360dialog docs (confirmed via web research during planning, not verified against a live sandbox call).
- Each affected licensee's `whatsappUrl`/`whatsappToken` data will be updated to the Cloud API host/new key out-of-band by the user — this plan's code must work correctly once that data is correct, but does not perform or script that data migration (no DB writes; global CLAUDE.md constraint).
- Scope is limited to `src/app/plugins/messengers/Dialog.ts` and its direct spec — other messenger plugins (`YCloud.ts`, `Pabbly.ts`) are out of scope; issue #3346 is specific to 360dialog.
- Issue #3346 itself was filed by an automated third-party tool (not a maintainer); its technical claim about `waba.360dialog.io` being switched off was independently verified against 360dialog's own docs during planning.
