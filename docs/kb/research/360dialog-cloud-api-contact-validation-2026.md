# Research: 360dialog Cloud API Contact Validation Strategy — 2026

**Last Updated**: 2026-10-29
**Context**: Phase 1 investigation for the dialog-cloud-api-migration plan (issue #3346). Deciding what replaces `getWaIdContact`'s `v1/contacts` `force_check` validation when migrating from On-Premise API to Cloud API.

---

## Decision: Option A (Send-Direct)

**Selected**: Drop the pre-check entirely. `sendMessage` must POST to `/messages` directly using the contact's stored phone number (in E.164 format) as the recipient. On a `/messages` error response indicating invalid/unknown contact, log it exactly like today's "contact is invalid" case (reuse `messageToSend.error` + `logger.error`).

---

## Rationale

### 1. v1/contacts Endpoint Not Available on Cloud API

360dialog's official migration documentation and API reference do **not** document a `/v1/contacts` endpoint on the Cloud API host (`waba-v2.360dialog.io`). The examples and error-handling guidance reference:
- **On-Premise API**: `https://waba.360dialog.io/v1/contacts` (now deprecated/offline as of 2025-10-23)
- **Cloud API**: `https://waba-v2.360dialog.io/messages` (primary endpoint)

The transition guidance states: "Make sure you are calling the correct endpoint: `https://waba-v2.360dialog.io/messages`" with no mention of a v1/contacts equivalent for Cloud API.

### 2. Cloud API's Architectural Model: Error-Driven Validation

360dialog's Cloud API documentation ("Before sending a message" best practices) explicitly states:

> "Trying to send messages (other than template-based messages) to users who have not sent in a message is one of the most common errors."

The recommended approach is:
- Send the message directly to the E.164 phone number via `/messages`
- Handle delivery errors asynchronously through webhook callbacks
- The system will return error codes (e.g., **error 1006** "Resource not found - unknown contact") if the recipient is invalid

This is fundamentally different from the On-Premise model, which pre-validated before sending.

### 3. wa_id Retrieval from Response

On Cloud API, when a message is successfully sent:
- The response includes a `contacts` array with `wa_id` field
- This `wa_id` can be stored for future use (reducing per-send overhead)
- For failed sends, no `wa_id` is returned, and the error handler must decide retry/logging strategy

### 4. First-Time Contact Protocol

For messaging contacts who have never engaged:
- **Best practice**: Send an approved **template message** first to initiate the conversation
- **Free-form text**: Only after the recipient has messaged back or within 24h of received message
- **Error 470**: "Session expired" — indicates 24h window has closed

The pre-check concept becomes moot because the message type (template vs. free-form) gates the ability to send anyway.

---

## Implementation Spec for task-03

### Changes to `sendMessage` (lines 296–307)

**Current behavior**:
```typescript
let waId = messageContact.waId
if (!waId) {
  const waContact = await getWaIdContact(messageContact.number, url, token)
  if (waContact.valid) {
    waId = waContact.waId
  } else {
    logger.error(`A mensagem não foi enviada para a Dialog pois o contato não é válido ${JSON.stringify(waContact.data)}`)
    return
  }
}
```

**New behavior**:
1. Use `messageContact.number` directly (no pre-check).
2. Convert phone number to E.164 format (verify existing NormalizePhone helper produces E.164; if not, adapt).
3. POST to `{whatsappUrl}messages` (not `{whatsappUrl}v1/messages/`) with the number as recipient.
4. On success (201 status), extract `wa_id` from the response's `contacts[0].wa_id` field and store it for future use (update contact record).
5. On error response (non-201 status):
   - If error code 1006 (unknown contact) or 470 (session expired): Log with full error details and mark message as failed (set `messageToSend.error`).
   - For other errors: Log and mark failed.
   - **Do not throw**; the error already flows to the callback system.

### Removal

Remove the `getWaIdContact` function entirely (lines 12–28 in `Dialog.ts`).

### Dependencies

- No new dependencies.
- Existing `logger.error` and `messageToSend.error` handling paths remain unchanged.

---

## Error Codes Observed in Cloud API

| Code | Meaning | Action |
|------|---------|--------|
| 1006 | "Resource not found - unknown contact" | Contact invalid; log error, mark message failed. |
| 470 | "Session expired" | 24-hour window closed; send template first. Log error, mark message failed. |
| 400 | "Bad request" | Malformed payload (e.g., invalid E.164 format). Inspect and fix payload structure. |
| 403 | "Forbidden" | Account blocked or insufficient balance. Log error, mark failed. |
| 500 | "Internal server error" | 360dialog server issue; message may be retried by queue system. |

See [360dialog Error Code Reference](https://docs.360dialog.com/docs/support/api-error-message-list).

---

## Unverified / Flagged

- **E.164 normalization**: The existing `NormalizePhone` helper must produce E.164 format strings (`+<country_code><number>`, no spaces/dashes). **Verify in task-03** that this helper's output matches 360dialog's expectations; if not, wrap or replace it.
- **Live behavior**: This strategy has **not been tested against a live Cloud API sandbox**. Confirm the error codes and response shapes (particularly the `contacts[0].wa_id` field location in success responses) before merging to production. 360dialog's sandbox docs should be consulted during task-03 implementation.

---

## Comparison with On-Premise API

| Aspect | On-Premise API | Cloud API |
|--------|---|---|
| Pre-check endpoint | `POST {url}v1/contacts/` with `force_check: true` | None documented; validation happens on send |
| Contact validation | Synchronous call before sending | Async via `/messages` response or webhook callback |
| Error on invalid contact | 200 response with `status: 'invalid'` in body | Non-201 HTTP status (400, 403, etc.) or error in webhook callback |
| wa_id retrieval | From pre-check response | From successful message response |
| First contact protocol | Can validate any number before sending | Template message required for first contact |

---

## Sources

- [360dialog Migration: On-Premise API to Cloud API](https://docs.360dialog.com/docs/waba-basics/waba-integration/onprem-to-cloudapi-migration)
- [360dialog Hosting Type Change](https://docs.360dialog.com/partner/waba-management/migrating-phone-numbers/hosting-type-change-on-premise-api-to-cloud-api)
- [360dialog Messaging API Reference - Messages Endpoint](https://docs.360dialog.com/docs/messaging-api/api-reference/messages)
- [360dialog Best Practices: Before Sending a Message](https://docs.360dialog.com/docs/messaging/best-practices)
- [360dialog Error Code Reference](https://docs.360dialog.com/docs/support/api-error-message-list)
- [360dialog Contacts and Location Messages](https://docs.360dialog.com/docs/messaging/contacts-and-location-messages)
