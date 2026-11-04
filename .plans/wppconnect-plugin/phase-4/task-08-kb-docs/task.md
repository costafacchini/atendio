# Task: KB Usage Guide + Index Update

**Plan**: Wppconnect WhatsApp Plugin
**Phase**: 4
**Task ID (phase-local)**: task-08
**Task Path**: phase-4/task-08-kb-docs
**Spec References**: Success Criteria (overall plan documentation)
**Depends On**: phase-3/task-06-inbox-admin-ui, phase-3/task-07-department-admin-ui
**JIRA**: N/A

## Objective

Write `docs/kb/features/wppconnect-whatsapp-guide.md` documenting the full Wppconnect plugin flow (config, QR auth, send/receive, Docker/Chromium requirements), and register it in `docs/kb/README.md`.

## Context

`docs/kb/features/baileys-whatsapp-guide.md` is the direct template: Step 1 (configure Licensee/Inbox), Step 2 (QR auth), Step 3 (sending), Step 4 (receiving via webhook), Session Persistence, Full Flow Summary, Troubleshooting. Mirror this structure, but:
- Omit the "Group Sync & Directory" and "Persistent Socket Monitor" sections entirely — out of scope for this plan.
- Add a new section documenting the Docker/Chromium requirement discovered in task-01 (the specific system packages added to the `Dockerfile`, and the explicit note that Heroku production is NOT yet supported without an additional buildpack).

`docs/kb/README.md`'s "Features" table (see the `baileys-whatsapp-guide` row) is where the new doc must be indexed, following the `check-kb-index` convention referenced in `AGENTS.md`.

## Before You Start

- [ ] Switch to the planning/base branch and pull the latest plan state: `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-3/task-06-inbox-admin-ui` and `phase-3/task-07-department-admin-ui` `status.md` both show `complete`
- [ ] Check this task's `status.md` — if already `in-progress` or `complete`, stop and investigate
- [ ] Read `docs/kb/features/baileys-whatsapp-guide.md` in full
- [ ] Read `docs/kb/README.md` to confirm current index structure
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `docs/kb/features/wppconnect-whatsapp-guide.md` | create | New usage guide |
| `docs/kb/README.md` | modify | Add row to the Features table |

### Do NOT Modify

- `docs/kb/features/baileys-whatsapp-guide.md` — reference only

## Implementation Steps

### Step 1: Write the guide

Document, with real endpoint paths and request/response shapes verified against the merged code from tasks 01-07 (do not guess — read the actual implementation files for exact field names and status codes): Inbox config, QR auth flow, Department/Licensee parity endpoints, sending/receiving text messages, session persistence (what's actually stored in `WhatsappSession` for Wppconnect per task-02's FR-010 resolution), the Docker/Chromium requirement, and a Troubleshooting table covering at least: QR timeout, Chromium launch failure, session invalidated.

### Step 2: Update the KB index

Add a row to `docs/kb/README.md`'s Features table, same format as the `baileys-whatsapp-guide` row.

### Step 3: Run `check-kb-index`

Per `AGENTS.md`'s auto-trigger table ("Modified KB files" → `check-kb-index`), run this skill to confirm the index stays consistent.

## Testing

**Spec scenarios covered**: None — documentation-only task.

**Additional verification**:
- [ ] All documented endpoint paths, request bodies, and response shapes match the actual merged implementation (manually cross-checked against the route/controller/usecase files, not assumed)
- [ ] `pre-commit-check` passes (no code changes expected, but confirms no stray diffs)

## Documentation / KB Updates

- [ ] `docs/kb/features/wppconnect-whatsapp-guide.md` created
- [ ] `docs/kb/README.md` Features table updated
- [ ] `check-kb-index` run after this task's changes

## Completion Criteria

- [ ] Guide published and indexed
- [ ] Plan overview's Success Criteria checklist for documentation marked complete
- [ ] Changes committed to `plan/wppconnect-plugin/phase-4/task-08-kb-docs` branch
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- Final task in the plan — no parallel siblings.
