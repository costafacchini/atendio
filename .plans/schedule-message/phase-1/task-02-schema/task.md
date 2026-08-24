# Task: Prisma Migration + IMessage Type

**Plan**: Schedule Message for Future Delivery
**Phase**: 1
**Task ID**: task-02
**Task Path**: phase-1/task-02-schema
**Spec References**: FR-005, SC-001
**Depends On**: None
**JIRA**: N/A

## Objective

Add `scheduledAt DateTime?` to the Prisma `Message` model, run the migration, and add `scheduledAt?: Date | null` to `IMessage` (backend) and the client `IMessage` type.

## Context

The `Message` model lives in `prisma/schema.prisma` at the `model Message` block (around line 208). The backend interface is `IMessage` in `src/types/index.ts`. The frontend type is `client/src/types/message.ts`.

This task must complete before task-03 (which reads `message.scheduledAt`) and task-04 (which queries by `scheduledAt`).

**Schema change note**: Adding a nullable column is safe for existing rows (they default to `null`). No data migration needed.

## Before You Start

- [ ] `git switch main && git pull --rebase origin main`
- [ ] Check `status.md` — stop if `in-progress` or `complete`
- [ ] Never execute DB changes directly — provide the migration command for the user to run
- [ ] Mark `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | modify | Add `scheduledAt DateTime?` to `Message` |
| `src/types/index.ts` | modify | Add `scheduledAt?: Date | null` to `IMessage` |
| `client/src/types/message.ts` | modify | Add `scheduledAt?: string | null` to frontend `IMessage` |

### Do NOT Modify

- `src/config/queue.ts` — owned by task-01
- Any repository or usecase file

## Implementation Steps

### Step 1: Add field to Prisma schema

In `prisma/schema.prisma`, inside the `model Message` block, add after `sendedAt`:

```prisma
scheduledAt    DateTime?
```

### Step 2: Generate and apply migration

Provide these commands for the user to run (do NOT run directly):

```bash
npx prisma migrate dev --name add_scheduled_at_to_messages
npx prisma generate
```

### Step 3: Update `IMessage` in `src/types/index.ts`

Add after `sendedAt`:

```ts
scheduledAt?: Date | null
```

### Step 4: Update client `IMessage`

In `client/src/types/message.ts`, add:

```ts
scheduledAt?: string | null
```

### Step 5: Typecheck

```bash
yarn typecheck
cd client && yarn typecheck
```

## Testing

- [ ] `yarn typecheck` (backend) passes
- [ ] `cd client && yarn typecheck` passes
- [ ] `npx jest` passes (existing tests unaffected by nullable column)

**Spec scenarios covered**: FR-005 (type exists and is nullable)

## Documentation / KB Updates

- [ ] No KB update required — schema change is self-evident from migration file.

## Completion Criteria

- [ ] `scheduledAt DateTime?` in Prisma schema
- [ ] Migration file generated
- [ ] `IMessage.scheduledAt` typed on both backend and frontend
- [ ] TypeScript clean on both sides
- [ ] `status.md` updated
