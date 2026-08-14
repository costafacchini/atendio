# Plan: Remove Plugin Fields from Licensee — Migrate to Inbox

**Status**: complete
**Created**: 2026-08-13
**Last Updated**: 2026-08-13
**Assigned Dev**: Alan Costa Facchini
**PR Strategy**: single
**Spec**: [spec.md](spec.md) — 4 user stories · 10 acceptance scenarios · 5 success criteria

## Objective

Remove the 7 plugin fields (`chatDefault`, `chatUrl`, `chatKey`, `chatIdentifier`, `whatsappDefault`, `whatsappToken`, `whatsappUrl`) from the `Licensee` model entirely and migrate every consumer (services, use cases, UI gates, forms, factories) to read from the `Inbox` model instead — fixing broken UI gates and completing the inbox-concept migration.

## Scope

### In Scope
- Remove 7 fields from Prisma `Licensee` schema (migration)
- Remove from `ILicensee` TypeScript interface and client types
- Update `LicenseesQuery`, `LicenseesController`, `CreateLicensee`, `UpdateLicensee` to drop these fields
- Migrate 8 services + template importer + 2 plugin factories to read from Inbox
- Migrate Baileys use cases (`GetBaileysQr`, `GetBaileysStatus`, `SyncBaileysDirectory`) to check inbox, not licensee
- Fix Navbar chat gate to check inbox records
- Fix Dashboard Baileys card gate to check inbox records; switch to inbox-scoped API
- Remove `ChatPanel` and `WhatsAppPanel` from Licensee form/wizard

### Out of Scope
- Adding new inbox management UI — out of scope (Inbox already has its own CRUD)
- Migrating existing licensee plugin field data — not needed (columns are empty post-onboarding)
- Changing the Inbox model schema — already has all 7 fields
- Changing `OnboardAccount` — already creates Inboxes (done in prior session)

## Kill Criteria

- If `licensee.whatsappDefault` / `licensee.chatDefault` turn out to be written by any code path other than onboarding (which already migrated), stop Phase 3 schema removal until that path is migrated.
- If a Prisma migration reveals non-null data in the 7 licensee columns, halt and audit the data.

## Phases

| Phase | Name | Tasks | Dependencies | Description |
|-------|------|-------|--------------|-------------|
| 1 | Safe Removals | task-01, task-02 | None | Remove plugin fields from admin layer + licensee forms (no services affected) |
| 2 | Consumer Migration | task-03, task-04, task-05 | Phase 1 | Migrate Baileys use cases, services/factories, and frontend UI gates |
| 3 | Schema Cleanup | task-06 | Phase 2 | Drop 7 columns from Prisma schema + TypeScript types |

## Task Summary

| Task Path | Title | Phase | Status | Depends On |
|-----------|-------|-------|--------|------------|
| phase-1/task-01-admin-layer | Remove plugin fields from admin CRUD layer | 1 | complete | — |
| phase-1/task-02-frontend-forms | Remove ChatPanel + WhatsAppPanel from Licensee forms | 1 | complete | — |
| phase-2/task-03-baileys-use-cases | Migrate Baileys use cases to check inbox | 2 | complete | phase-1/task-01-admin-layer |
| phase-2/task-04-services-factories | Migrate services + factories to read from inbox | 2 | complete | phase-1/task-01-admin-layer |
| phase-2/task-05-frontend-ui | Fix Navbar + Dashboard gates to use inbox | 2 | complete | phase-1/task-02-frontend-forms |
| phase-3/task-06-schema-types | Drop 7 fields from Prisma schema + TS types | 3 | complete | phase-2/task-03-baileys-use-cases, phase-2/task-04-services-factories, phase-2/task-05-frontend-ui |

## Branch Convention

Pattern: `plan/licensee-plugin-fields-to-inbox/{task-path}`

Example branches:
- `plan/licensee-plugin-fields-to-inbox/phase-1/task-01-admin-layer`
- `plan/licensee-plugin-fields-to-inbox/phase-2/task-04-services-factories`

Base branch: `main`

## Key Files

| File/Directory | Relevance |
|----------------|-----------|
| `prisma/schema.prisma` | Licensee model — 7 fields to remove in Phase 3 |
| `src/types/index.ts` | `ILicensee` interface — 7 fields to remove in Phase 3 |
| `src/app/queries/LicenseesQuery.ts` | Filters on plugin fields — Phase 1 |
| `src/app/usecases/licensees/CreateLicensee.ts` | ALLOWED_FIELDS includes plugin fields — Phase 1 |
| `src/app/usecases/licensees/UpdateLicensee.ts` | ALLOWED_FIELDS includes plugin fields — Phase 1 |
| `src/app/usecases/licensees/GetBaileysQr.ts` | Checks `licensee.whatsappDefault` — Phase 2 |
| `src/app/usecases/licensees/GetBaileysStatus.ts` | Checks `licensee.whatsappDefault` — Phase 2 |
| `src/app/services/ChatMessage.ts` | Reads `licensee.chatUrl`/`chatKey` — Phase 2 |
| `src/app/services/MessengerMessage.ts` | Reads `licensee.whatsappUrl`/`whatsappToken` — Phase 2 |
| `src/app/services/CloseChat.ts` | Reads licensee plugin fields — Phase 2 |
| `src/app/plugins/messengers/factory.ts` | Falls back to `licensee.whatsappDefault` — Phase 2 |
| `src/app/plugins/chats/factory.ts` | Falls back to `licensee.chatDefault` — Phase 2 |
| `client/src/pages/Navbar/index.tsx` | Gates chat menu on `licensee.chatDefault` — Phase 2 |
| `client/src/pages/Dashboard/index.tsx` | Gates Baileys card on `licensee.whatsappDefault` — Phase 2 |
| `client/src/pages/Licensees/scenes/Form/panels/ChatPanel.tsx` | Remove in Phase 1 |
| `client/src/pages/Licensees/scenes/Form/panels/WhatsAppPanel.tsx` | Remove in Phase 1 |
| `client/src/pages/Licensees/scenes/New/LicenseeWizard.tsx` | Remove chat/WA steps — Phase 1 |
| `client/src/pages/SignIn/OnboardingModal.tsx` | Remove plugin fields from form — Phase 1 |
| `client/src/types/licensee.ts` | Client ILicensee type — Phase 3 |

## Risks

- Services with no inbox FK on room/message may fail to resolve inbox — verify each service has an access path to inbox before migrating.
- Dashboard Baileys API switch from licensee-scoped to inbox-scoped endpoints changes URL — verify inbox-scoped endpoints exist and are tested.
- Phase 3 Prisma migration runs `ALTER TABLE DROP COLUMN` — must verify columns are truly empty before running in production.

## Success Criteria

- [ ] All existing tests pass after each phase
- [ ] `yarn typecheck` zero errors after Phase 3
- [ ] Admin with baileys inbox sees Baileys card on Dashboard
- [ ] Admin with chat inbox sees chat option in Navbar
- [ ] Prisma migration runs cleanly
- [ ] No regressions in message routing, chat, or WhatsApp flows
- [ ] Required KB / documentation updates are complete or explicitly marked not needed

## References

- **JIRA Epic**: N/A
- **Weekly Plan Brief**: N/A
- **Related Plans**: [Inbox Concept](../inbox-concept/overview.md) (completed — established inbox entity and FK on rooms/messages)
- **Rock Alignment**: N/A
