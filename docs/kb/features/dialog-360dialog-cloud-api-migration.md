# Dialog Plugin — 360dialog Cloud API Migration

**Last Updated**: 2026-10-30
**Context**: Issue #3346 — 360dialog switched off the On-Premise API (`waba.360dialog.io`) on 2025-10-23. The `Dialog` messenger plugin (`src/app/plugins/messengers/Dialog.ts`) was migrated to the Cloud API (`waba-v2.360dialog.io`). Read this before touching `Dialog.ts`, debugging a licensee's 360dialog integration, or onboarding a new 360dialog licensee.

---

## What changed in code

Plan: [`.plans/dialog-cloud-api-migration/overview.md`](../../../.plans/dialog-cloud-api-migration/overview.md) · Spec: [`spec.md`](../../../.plans/dialog-cloud-api-migration/spec.md)

| Function | Before (On-Premise) | After (Cloud API) |
|---|---|---|
| `sendMessage` | `POST {whatsappUrl}v1/messages/` | `POST {whatsappUrl}messages` |
| `getWaIdContact` (contact pre-check) | `POST {whatsappUrl}v1/contacts/` with `force_check` | **Removed.** No Cloud API equivalent exists. `sendMessage` now sends directly using `messageContact.waId \|\| messageContact.number`; invalid/unknown-contact errors are reported by the `/messages` response itself and handled by the existing generic error branch. See [`docs/kb/research/360dialog-cloud-api-contact-validation-2026.md`](../research/360dialog-cloud-api-contact-validation-2026.md) for the full decision rationale. |
| `downloadMedia` / `getMediaUrl` | Hardcoded `https://waba.360dialog.io/v1/media/{id}`, single GET returning the binary directly | Two-step: `GET {whatsappUrl}{mediaId}` resolves a `lookaside.fbsbx.com` URL, then the binary is downloaded by swapping that host for `waba-v2.360dialog.io` and GETing `/whatsapp_business/attachments/?mid=...&ext=...&hash=...`. An unexpected lookaside host logs an error and raises, instead of silently mis-downloading. |
| `setWebhook`, `searchTemplates`/`getTemplates` | `v1/configs/webhook`, `v1/configs/templates` | Unchanged — confirmed via 360dialog's official docs and regression-tested with explicit URL assertions. Only the host needs to resolve to the Cloud API. |
| Auth | `D360-API-KEY` header | Unchanged |

The `D360-API-KEY` header and `whatsappUrl`/`whatsappToken` per-inbox fields (`src/types/index.ts`) are unchanged — this was a protocol/endpoint migration, not a data model change.

---

## Manual rollout checklist (not executed by this plan)

Per global CLAUDE.md, this plan never writes to the database. The code above is inert for a licensee until its data is updated. **For each licensee using the Dialog (360dialog) messenger:**

1. Confirm in 360dialog's Hub whether that licensee's number has been migrated to Cloud API hosting.
2. If migrated: update that licensee's inbox `whatsappUrl` to `https://waba-v2.360dialog.io/` and **regenerate** `whatsappToken` (360dialog only honors the most recently generated API key on Cloud API — the old On-Premise key is rejected).
3. If not yet migrated on 360dialog's side: this licensee's integration remains broken regardless of this code change — coordinate the hosting-type migration with 360dialog first (see [360dialog's migration guide](https://docs.360dialog.com/partner/partner-hub/migrating-phone-numbers/hosting-type-change-on-premise-api-to-cloud-api)).
4. After updating a licensee's data, verify end-to-end:
   - Send a test outbound text message.
   - Send a test inbound image/file from a WhatsApp test number (exercises the two-step media download).
   - Confirm the webhook still fires (re-run `setWebhook` if 360dialog's migration reset it).

## Known unverified items (flagged during implementation, not blocking merge)

- **Cloud API error codes for invalid/first-contact sends** (1006 "unknown contact", 470 "session expired") were sourced from 360dialog's error-code reference during planning, not confirmed against a live sandbox call. If a licensee reports sends silently failing after migration, check the actual error body logged via `messageToSend.error` against these codes first.
- **First-time contact protocol**: 360dialog's Cloud API requires an approved **template** message to initiate contact with a number that has never messaged the licensee; free-form text only works within the 24h session window after the contact has messaged in. This is a behavioral difference from On-Premise (which could pre-validate any number) — not something this plan's code can route around, since it's a WhatsApp platform rule, not a 360dialog quirk.
- The `GET {whatsappUrl}{mediaId}` response shape (`url`, `mime_type`, `sha256`, `file_size`, `id`, `messaging_product`) was confirmed against 360dialog's official API reference with a full example response — not an assumption — but has not been exercised against a live sandbox call either.

## Sources

- [360dialog: Hosting Type Change — On-Premise API to Cloud API](https://docs.360dialog.com/partner/partner-hub/migrating-phone-numbers/hosting-type-change-on-premise-api-to-cloud-api)
- [360dialog Messaging API Reference — Messages](https://docs.360dialog.com/docs/messaging-api/api-reference/messages)
- [360dialog — Upload, retrieve or delete media](https://docs.360dialog.com/docs/messaging/media/upload-retrieve-or-delete-media)
- [360dialog — Webhook Configuration & Management](https://docs.360dialog.com/partner/integrations-and-api-development/webhook-events-and-setup/webhook-configuration-and-management)
- [360dialog — Templates](https://docs.360dialog.com/docs/resources/templates)
- [Source issue #3346](https://github.com/costafacchini/atendio/issues/3346) (filed by an automated third-party tool; technical claim independently verified during planning)
