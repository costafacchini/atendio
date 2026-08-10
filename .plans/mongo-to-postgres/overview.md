# Plan: MongoDB → PostgreSQL Migration

**Status**: complete
**Created**: 2026-05-29
**Last Updated**: 2026-08-08
**Estimated Demo Date**: TBD
**Assigned Dev**: Alan
**Assigned QA**: unassigned

## Objective

Migrate all persistent data from MongoDB (Mongoose) to PostgreSQL (Prisma) using a safe dual-write strategy: each table is added to Postgres alongside Mongo, writes are mirrored to both stores, and reads are shifted to Postgres only after data is validated. Mongoose is removed only after all models have been migrated and validated.

## Prerequisite

**`remove-pdv` plan must be complete before executing Phase 3+.**
Remove-pdv deletes Cart, Order, Product, Integrationlog, and Backgroundjob — migrating those models would waste effort. Phase 1–2 (infra + Licensee pilot) can start once remove-pdv Phase 1 is merged, but Phase 3+ task execution must wait until remove-pdv is fully complete.

### Prerequisite State

- `remove-pdv` — complete (2026-06-05); Cart, Order, Product, Integrationlog, Backgroundjob deleted
- `js-to-ts` — complete (2026-05-31); all source files are `.ts`
- `setores` — complete (2026-07-17); Inbox and Department models, repos, and routes added
- `type-backend` — complete (2026-08-07); all domain interfaces in `src/types/index.ts`; `IRepository<T>` typed in `repository.ts` — PrismaRepository must implement it

## Scope

### In Scope
- Install Prisma ORM + PostgreSQL driver
- Provision and wire PostgreSQL connection (dev + production env vars)
- Migrate 11 models to PostgreSQL via Prisma: Licensee, User, Contact, Message, Room, Template, Trigger, WhatsappSession, Body, Inbox, Department
- Migrate Trafficlight to **Redis** (native TTL via `EXPIREAT`; reuses existing BullMQ Redis connection)
- Dual-write adapter at the repository layer (writes to Mongo + Postgres simultaneously; reads from Mongo during migration window)
- Bulk data sync scripts per model (Mongo → Postgres)
- Validation report: record counts, spot-check field integrity, FK consistency
- Gradual read shift: flip reads to Postgres per model after validation passes
- Remove Mongoose dependency and all Database* repository implementations after full cutover
- Update CI, env templates, and health-check endpoint

### Out of Scope
- Migrating Cart, Order, Product, Integrationlog, Backgroundjob — removed by `remove-pdv` plan
- Migrating Licensee virtual URL fields to Postgres computed columns — virtuals stay computed in the application layer
- MongoDB-specific query operators in tests (RepositoryMemory is preserved unchanged)

## Kill Criteria

- If bulk sync reveals >0.1% data loss or corruption in any model after 3 retry attempts — stop and investigate before proceeding to read flip.
- If dual-write latency on any endpoint exceeds 200ms p99 increase over baseline — pause and optimise before expanding to more tables.
- If Heroku Postgres addon is unavailable or provisioning fails — escalate before writing any application code.
- If `remove-pdv` plan is never completed — this plan's Phase 3 and beyond are blocked; reassess scope.

## Phases

| Phase | Name | Tasks | Dependencies | Description |
|-------|------|-------|--------------|-------------|
| 1 | Infrastructure | task-01, task-02 | Prerequisite: remove-pdv Phase 1 merged | Install Prisma, configure PG connection, establish dual-write pattern and base classes |
| 2 | Pilot Migration — Licensee | task-03 | Phase 1 complete | Migrate the root entity (Licensee) as a live pilot to validate the full dual-write → sync → validate cycle |
| 3 | Domain Table Migrations | task-04, task-05, task-06, task-07 | Phase 2 complete; remove-pdv fully complete | Parallel migration of all remaining 11 models using the established pattern |
| 4 | Cutover & Cleanup | task-08, task-09, task-10, task-11 | Phase 3 complete | Bulk-sync production data, validate integrity, flip reads to Postgres, remove Mongoose, normalize column names to snake_case, resync FKs to native PG IDs |

## Task Summary

| Task Path | Title | Phase | Status | Depends On |
|-----------|-------|-------|--------|------------|
| phase-1/task-01-prisma-setup | Install & configure Prisma + PostgreSQL | 1 | not-started | — |
| phase-1/task-02-dual-write-pattern | DualWriteRepository pattern + PrismaRepository base | 1 | not-started | — |
| phase-2/task-03-licensee-pg | Migrate Licensee to PostgreSQL (pilot) | 2 | not-started | phase-1/task-01-prisma-setup, phase-1/task-02-dual-write-pattern |
| phase-3/task-04-user-contact-pg | Migrate User + Contact + Inbox to PostgreSQL | 3 | not-started | phase-2/task-03-licensee-pg |
| phase-3/task-05-room-template-trigger-pg | Migrate Room + Template + Trigger + Department to PostgreSQL | 3 | not-started | phase-2/task-03-licensee-pg |
| phase-3/task-06-whatsappsession-body-trafficlight-pg | Migrate WhatsappSession + Body + Trafficlight to PostgreSQL | 3 | not-started | phase-2/task-03-licensee-pg |
| phase-3/task-07-message-pg | Migrate Message to PostgreSQL | 3 | not-started | phase-2/task-03-licensee-pg |
| phase-4/task-08-bulk-sync-validate | Bulk-sync all models Mongo→PG + integrity validation | 4 | not-started | phase-3/task-04-user-contact-pg, phase-3/task-05-room-template-trigger-pg, phase-3/task-06-whatsappsession-body-trafficlight-pg, phase-3/task-07-message-pg |
| phase-4/task-09-flip-reads-remove-mongo | Flip reads to Postgres, remove Mongoose | 4 | not-started | phase-4/task-08-bulk-sync-validate |
| phase-4/task-10-normalize-column-names | Normalize column names to snake_case | 4 | not-started | phase-4/task-09-flip-reads-remove-mongo |
| phase-4/task-11-resync-native-ids | Resolve FK columns to native PG ids, drop mongo_id | 4 | not-started | phase-4/task-10-normalize-column-names |

## Branch Convention

Pattern: `plan/mongo-to-postgres/{task-path}`

Example branches:
- `plan/mongo-to-postgres/phase-1/task-01-prisma-setup`
- `plan/mongo-to-postgres/phase-3/task-07-message-pg`

Base branch: `main`

## Key Files

| File/Directory | Relevance |
|----------------|-----------|
| `src/config/database.ts` | Current Mongo connect; will add Prisma connect alongside |
| `src/config/mongo.ts` | Mongo server class; removed in Phase 4 |
| `src/app/repositories/repository.ts` | Base Repository + RepositoryMemory + `IRepository<T>`; add PrismaRepository here |
| `src/app/repositories/index.ts` | Registry of all concrete repos; updated per phase |
| `src/app/runtime/dependencies.ts` | Wires concrete repos into use cases; updated per phase |
| `src/app/models/*.ts` | Mongoose models; all removed in Phase 4 |
| `src/app/repositories/licensee.ts` | Pilot repository — first dual-write target |
| `prisma/schema.prisma` | Created in task-01; grown through every Phase 3 task |
| `prisma/migrations/` | Auto-generated migration files |
| `src/scripts/sync-mongo-to-pg.ts` | Bulk sync script written in task-08 |
| `.env.example` | Updated in task-01 with DATABASE_URL |

## Architectural Decisions

### ID Strategy
Every Postgres table gets a native **`id SERIAL PRIMARY KEY`** (auto-increment integer). A separate **`mongo_id VARCHAR(24) UNIQUE NOT NULL`** column stores the MongoDB `_id` for cross-reference during the migration window.

During Phase 1–3 (dual-write), FK reference columns (e.g. `contacts.licensee`) are `VARCHAR(24)` and hold the Mongo ObjectId of the referenced document — no per-write FK lookup is required in the adapter.

In Phase 4 **task-11** (final task), a resync script:
1. Resolves every FK `VARCHAR(24)` column to the corresponding Postgres integer `id` by joining on `mongo_id`
2. Alters the FK column types from `VARCHAR(24)` to `INTEGER`
3. Adds proper FK constraints pointing at the integer PKs
4. Drops all `mongo_id` columns

After task-10, MongoDB ObjectIds are fully gone from Postgres.

### JSONB Columns
The following fields are stored as JSONB (not normalized tables):
- `Contact.credit_cards` — rarely queried by field; array of card objects
- `Licensee.productFractionals`, `Licensee.pedidos10_integration` — internal integration blobs
- `WhatsappSession.creds`, `WhatsappSession.keys` — Baileys credential objects
- `Body.content` — raw incoming webhook payload
- `Template.headerParams`, `Template.bodyParams`, `Template.footerParams` — small param arrays

### Virtual Fields
Licensee virtual URL fields (`urlChatWebhook`, `urlWhatsappWebhook`, etc.) are NOT stored in Postgres. They are computed in the application layer (PrismaLicenseeRepository or a dedicated helper) exactly as they were as Mongoose virtuals.

### Pre-save Hooks
Mongoose pre-save hooks encode business logic (phone normalization in Contact, whatsappUrl defaults in Licensee). These move into the PrismaRepository `create`/`update` method overrides for each model.

### FK Constraints During Migration
No PostgreSQL FK constraints are enforced during Phase 1–3. All FK reference columns are `VARCHAR(24)` holding Mongo ObjectId strings — no constraint, no lookup overhead. Real integer FK constraints are added in **task-11** after all data is in Postgres and the resync converts FK columns to `INTEGER`.

### Trafficlight — Redis, not PostgreSQL
Trafficlight records are short-lived TTL tokens with no FK references. They are migrated to **Redis** in task-06 rather than PostgreSQL. Redis `EXPIREAT` directly replaces MongoDB's TTL index — no cleanup job needed. The BullMQ `ioredis` client is reused, so no new infrastructure is required. Trafficlight is excluded from the Prisma schema, bulk-sync scripts, column-normalization task, and FK-resync task.

## Risks

- **Dual-write latency** — Two DB writes per request. Mitigation: fire-and-forget Postgres write (async, non-blocking) during pilot; promote to blocking write only after latency is confirmed acceptable.
- **Data drift during migration window** — Mongo and Postgres can diverge if the async write fails silently. Mitigation: add error logging for failed Postgres writes; the daily bulk-sync in task-08 catches drift.
- **Schema mismatch for JSONB fields** — Mongo allows any shape; Postgres JSONB accepts it but type safety is lost. Mitigation: add Zod/runtime validation for critical JSONB fields in task-08 validation report.
- **Trafficlight records never expiring** — No TTL in PG. Mitigation: add a cleanup cron in task-06 using node-cron or pg_cron.
- **Heroku Postgres addon provisioning** — requires manual CLI step. Mitigation: documented in task-01 setup instructions.

## Success Criteria

- [ ] All 11 Prisma models have a schema definition and migration (`id SERIAL`, `mongo_id VARCHAR(24)`); Trafficlight is in Redis
- [ ] Dual-write is active for all 11 Prisma models in the production deploy; Trafficlight wired directly to Redis
- [ ] Bulk sync script runs without errors; counts match between Mongo and Postgres for the 11 Prisma models (Trafficlight excluded — ephemeral)
- [ ] All reads have been flipped to Postgres with no regression in existing tests
- [ ] Mongoose and mongoose package are fully removed from `package.json` and all source files
- [ ] `npx jest` passes with 0 failures after Mongoose removal
- [ ] All FK columns converted from `VARCHAR(24)` to `INTEGER` with FK constraints in place
- [ ] All `mongo_id` columns dropped from every table
- [ ] `DATABASE_URL` is provisioned in Heroku production environment
- [ ] No regressions in existing functionality

## References

- **JIRA Epic**: N/A
- **Weekly Plan Brief**: N/A
- **Related Plans**: [Remove PDV](../remove-pdv/overview.md) — must complete before Phase 3; [JS → TypeScript](../js-to-ts/overview.md) — can start after this plan completes
- **Rock Alignment**: N/A
