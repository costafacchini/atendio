# Status: Migrate Licensee to PostgreSQL (pilot)

**Current Status**: complete
**Last Updated**: 2026-08-08
**Agent**: claude-sonnet-4-6
**Branch**: plan/mongo-to-postgres/phase-1-2
**PR**: —

## Status History

| Timestamp | Status | Agent | Notes |
|-----------|--------|-------|-------|
| 2026-05-29 | not-started | — | Task created |
| 2026-08-08 | in-progress | claude-sonnet-4-6 | Execution started on consolidated branch |
| 2026-08-08 | complete | claude-sonnet-4-6 | All criteria met; 2792 tests pass (1 pre-existing failure in messenger.spec.ts) |

## Blockers

None

## Artifacts

- `prisma/schema.prisma` — Licensee model added (44 fields, maps to `licensees` table)
- `prisma/migrations/20260808000000_add_licensee/migration.sql` — hand-authored migration SQL (no live DB needed for generation)
- `src/app/repositories/licensee.ts` — `PrismaLicenseeDatabaseRepository` added; overrides `delegate()` → `getPrismaClient().licensee`; `create()`/`save()` apply whatsappUrl defaults mirror Mongoose pre-save hook
- `src/app/runtime/dependencies.ts` — `licenseeRepository` wired via `DualWriteRepository(Mongo, Prisma)`
- `src/scripts/sync-licensee.ts` — one-shot bulk sync from Mongo → PG; safe to re-run (upsert on mongo_id)
- `src/app/repositories/licensee.prisma.spec.ts` — 9 integration tests; skipped unless `RUN_POSTGRES_TESTS=1`
- `.github/workflows/config.yml` — added `prisma generate`, `prisma migrate deploy` steps and `RUN_POSTGRES_TESTS=1` env

## Adaptations

- `prisma generate` required before tests can run (CI step added); import path changed to `../../generated/prisma/client` to allow Jest resolution without an `index.ts`
- Integration tests gated on `RUN_POSTGRES_TESTS=1` (not just `DATABASE_URL`) because `.env` has a placeholder DATABASE_URL that would trigger tests against a non-running DB
- `whatsappUrl` defaults applied in `applyWhatsappUrl()` helper (mirrors Mongoose pre-save hook behaviour); extracted to `WHATSAPP_URLS` constant to avoid magic strings
