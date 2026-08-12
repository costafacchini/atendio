# Plan: Prisma Dashboard & Rooms Migration

**Status**: complete
**Created**: 2026-08-12
**Last Updated**: 2026-08-12
**Assigned Dev**: Alan
**PR Strategy**: single
**Spec**: [spec.md](spec.md) — 4 user stories · 16 acceptance scenarios · 5 success criteria

## Objective

Replace all Mongoose `.model()` API calls in `DashboardController` and `RoomsController` with dedicated PostgreSQL/Prisma repository methods, completing the Prisma migration for the analytics and rooms layers.

## Scope

### In Scope
- Add `count(params)` to `PrismaRepository` base class
- Add analytics query methods to `PrismaMessageDatabaseRepository` (group-by-day, group-by-hour, avg queue time, avg messages per room, last message per room, paginated find)
- Add query methods to `PrismaRoomDatabaseRepository` (findById, close, findOpenForContact, findForLicensee, findManyPaged, avgDuration)
- Add `findIds(params)` to `PrismaContactDatabaseRepository`
- Add `findIds(params)` to `PrismaDepartmentDatabaseRepository` (JSON array filter for users)
- Rewrite `DashboardController` — all 10 endpoints use repository methods
- Rewrite `RoomsController` — all 4 action methods use repository methods
- Update `DashboardController.spec.ts` and `RoomsController.spec.ts` to mock repository methods instead of `.model()`
- Add tests to Prisma integration spec files for all new repository methods

### Out of Scope
- `RepositoryMemory` implementations — unchanged
- Prisma schema migrations — all columns already exist
- Redis caching logic in `DashboardController._cached()` — unchanged
- Any other controller not listed above

## Kill Criteria

- If any new `$queryRaw` query requires a Prisma schema migration to work — stop, assess schema change, update plan
- If the `Department.users` JSON format is not an array (e.g. a hash/object) — stop, confirm format with Alan before writing the filter

## Phases

| Phase | Name | Tasks | Dependencies | Description |
|-------|------|-------|--------------|-------------|
| 1 | Repository Layer | task-01, task-02, task-03, task-04 | None | Add Prisma-native query methods to each repository; all 4 tasks are independent (different files) |
| 2 | Controller Layer | task-05, task-06 | Phase 1 complete | Rewrite both controllers and their specs to use the new repository API |

## Task Summary

| Task Path | Title | Phase | Status | Depends On |
|-----------|-------|-------|--------|------------|
| phase-1/task-01-base-count-licensee-contact | Base count + Licensee & Contact query methods | 1 | complete | — |
| phase-1/task-02-message-analytics | Message analytics repository methods | 1 | complete | — |
| phase-1/task-03-room-queries | Room query methods | 1 | complete | — |
| phase-1/task-04-department-findids | Department findIds (JSON array filter) | 1 | complete | — |
| phase-2/task-05-dashboard-controller | Rewrite DashboardController | 2 | complete | phase-1/task-01, phase-1/task-02, phase-1/task-03 |
| phase-2/task-06-rooms-controller | Rewrite RoomsController | 2 | complete | phase-1/task-02, phase-1/task-03, phase-1/task-04 |

## Branch Convention

Base branch: `feature/prisma-migration`

All task work happens on `feature/prisma-migration`. No per-task branches — the feature branch is the delivery unit for this plan.

## Key Files

| File/Directory | Relevance |
|----------------|-----------|
| `src/app/repositories/repository.ts` | Base `PrismaRepository` — task-01 adds `count()` here |
| `src/app/repositories/licensee.ts` | `PrismaLicenseeDatabaseRepository` — task-01 |
| `src/app/repositories/contact.ts` | `PrismaContactDatabaseRepository` — task-01 |
| `src/app/repositories/message.ts` | `PrismaMessageDatabaseRepository` — task-02 |
| `src/app/repositories/room.ts` | `PrismaRoomDatabaseRepository` — task-03 |
| `src/app/repositories/department.ts` | `PrismaDepartmentDatabaseRepository` — task-04 |
| `src/app/controllers/DashboardController.ts` | Primary controller to rewrite — task-05 |
| `src/app/controllers/RoomsController.ts` | Primary controller to rewrite — task-06 |
| `src/app/controllers/DashboardController.spec.ts` | Currently mocks `.model()` — task-05 rewrites it |
| `src/app/controllers/RoomsController.spec.ts` | Currently mocks `.model()` — task-06 rewrites it |
| `src/app/repositories/message.prisma.spec.ts` | Integration tests for new message methods — task-02 |
| `src/app/repositories/room.prisma.spec.ts` | Integration tests for new room methods — task-03 |
| `src/app/repositories/contact.prisma.spec.ts` | Integration tests for `findIds` — task-01 |
| `src/app/repositories/licensee.prisma.spec.ts` | Integration tests for `count` — task-01 |
| `src/app/repositories/department.prisma.spec.ts` | Integration tests for `findIds` — task-04 |
| `prisma/schema.prisma` | Reference only — no changes needed |

## Risks

- `$queryRaw` SQL correctness — Mitigation: each query tested via Prisma integration spec (RUN_POSTGRES_TESTS=1) before the controller task runs
- `Department.users` JSON format unknown at plan time — Mitigation: kill criterion; task-04 verifies format from existing data before writing filter
- `DashboardController.spec.ts` covers many edge cases with Mongoose mock chains — Mitigation: task-05 rewrites stubs in the same spec file, preserving scenario coverage

## Success Criteria

- [x] SC-001: All 10 dashboard endpoints return 200 with correct shape
- [x] SC-002: GET /rooms, GET /rooms/:id/messages, POST /rooms/:id/close work end-to-end
- [x] SC-003: Zero `.model()` calls remain in DashboardController and RoomsController
- [x] SC-004: All tests pass; new tests cover every new repository method and controller action
- [x] SC-005: `npx eslint` reports 0 errors on changed files

## References

- **JIRA Epic**: N/A
- **Related Plans**: [mongo-to-postgres](../mongo-to-postgres/overview.md) — this plan completes the controller layer that mongo-to-postgres left unfinished
- **Rock Alignment**: N/A
