# Status: Drop 7 fields from Prisma schema + TypeScript types

**Current Status**: complete
**Last Updated**: 2026-08-13
**Agent**: claude-sonnet-4-6
**Branch**: task/licensee-06-schema-types
**PR**: part of single plan PR (to be created)

## Status History

| Timestamp | Status | Agent | Notes |
|-----------|--------|-------|-------|
| 2026-08-13 | not-started | — | Task created |
| 2026-08-13 | in-progress | claude-sonnet-4-6 | Cherry-picked prior task commits; fixing typecheck errors |
| 2026-08-13 | complete | claude-sonnet-4-6 | All typecheck errors resolved; commit 7a14af16 |

## Blockers

None

## Artifacts

- Branch: `task/licensee-06-schema-types`
- Commit: `7a14af16`
- Migration: `prisma/migrations/20260813151940_remove_licensee_plugin_fields/migration.sql`

## Adaptations

- Added `inbox` field to `ChatsBase` and `MessengersBase` constructors to thread inbox data into Chatwoot, Crisp, and all messenger plugins (replaces removed `this.licensee.chatKey`/`chatIdentifier`/`whatsappUrl`/`whatsappToken`)
- Updated chat and messenger factories to pass `inbox` in deps to all plugin constructors
- Added `inboxRepository` to GetBaileysQrForDepartment, GetBaileysStatusForDepartment, SyncBaileysDirectoryForDepartment in `dependencies.ts`
- Fixed `CloseChat.ts` implicit `any[]` type annotation
