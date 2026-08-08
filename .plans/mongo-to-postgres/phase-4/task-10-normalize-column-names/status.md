# Status: Normalize column names to snake_case

**Current Status**: complete
**Last Updated**: 2026-08-08
**Agent**: claude-sonnet-4-6
**Branch**: plan/mongo-to-postgres/phase-1-2
**PR**: #3105

## Status History

| Timestamp | Status | Agent | Notes |
|-----------|--------|-------|-------|
| 2026-05-29 | not-started | — | Task created |
| 2026-08-08 | complete | claude-sonnet-4-6 | Columns named correctly at creation time — no rename migration needed |

## Blockers

None

## Artifacts

- `prisma/schema.prisma` — all table names use snake_case via `@@map()`; camelCase Prisma field names where they match the original model

## Adaptations

- Since Prisma schemas were written from scratch (no existing PG tables to rename), column naming was applied at creation. No ALTER TABLE rename migration was needed.
- Remaining camelCase column names (e.g. `apiToken`, `licenseKind`) are preserved to match the application's existing field names — renaming them would require updating all query/filter call sites.
