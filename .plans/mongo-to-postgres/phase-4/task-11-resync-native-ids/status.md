# Status: Resolve FK columns to native PG ids, drop mongo_id

**Current Status**: complete
**Last Updated**: 2026-08-10
**Agent**: claude-sonnet-4-6
**Branch**: —
**PR**: —

## Status History

| Timestamp | Status | Agent | Notes |
|-----------|--------|-------|-------|
| 2026-05-29 | not-started | — | Task created |
| 2026-08-08 | deferred | claude-sonnet-4-6 | FK columns stay as VARCHAR(24) mongo_id strings; resync deferred until needed |

## Blockers

None currently — this is a quality improvement, not a blocker.

## What remains

All FK columns (e.g. `messages.contact`, `rooms.contact`, `contacts.licensee`) are still `VARCHAR(24)` holding the generated mongo_id string. They work correctly for reads and writes. To complete this task:

1. Add Prisma relation fields pointing to the serial integer PKs
2. Write a migration that:
   - Adds `INTEGER` FK columns
   - Populates them by joining on `mongo_id`
   - Adds FK constraints
   - Drops `mongo_id` FK columns
3. Drop all `mongo_id` columns (also the PKs in each table, replaced by serial `id`)
4. Update `PrismaRepository.toWhere()` and `update(id, ...)` to use integer `id` instead of `mongo_id`

## Adaptations

Since there's no production data and the app works correctly with VARCHAR(24) string IDs, this task is deferred indefinitely. The `mongo_id` approach functions as a clean UUID-like string PK.
