# Task: KB Usage Guide + Deployment Doc

**Plan**: Wppconnect-Server WhatsApp Plugin
**Phase**: 4
**Task ID (phase-local)**: task-06
**Task Path**: phase-4/task-06-kb-docs
**Spec References**: Success Criteria (overall plan documentation)
**Depends On**: phase-3/task-04-inbox-admin-ui, phase-3/task-05-department-admin-ui
**JIRA**: N/A

## Objective

Write `docs/kb/features/wppconnect-server-whatsapp-guide.md` documenting the plugin's usage (config, QR auth, send/receive via the existing generic webhook) **and** the external deployment prerequisite — how to stand up a `wppconnect-server` instance separately, since this app does not provision it.

## Context

`docs/kb/features/baileys-whatsapp-guide.md` is the structural template for the usage-flow sections. Unlike that guide, this one must also cover:
- The external instance as a hard prerequisite (not part of this repo's Dockerfile/Procfile/Heroku dynos) — link to `wppconnect-server`'s own deployment instructions rather than duplicating them.
- The exact REST API and webhook payload shapes confirmed in task-01 (FR-009/FR-010) — write down what was actually verified, not the originally-hypothesized route names if they turned out to differ.
- Why `whatsappToken`/`whatsappUrl` are visible for this provider (unlike Baileys/Wppconnect) and what they map to on the external instance (session secret key / base URL).

## Before You Start

- [ ] Switch to the planning/base branch and pull the latest plan state: `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-3/task-04-inbox-admin-ui` and `phase-3/task-05-department-admin-ui` `status.md` both show `complete`
- [ ] Check this task's `status.md` — if already `in-progress` or `complete`, stop and investigate
- [ ] Read `docs/kb/features/baileys-whatsapp-guide.md` and `docs/kb/features/dialog-360dialog-cloud-api-migration.md`
- [ ] Read task-01's `status.md` for the confirmed FR-009/FR-010 findings
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `docs/kb/features/wppconnect-server-whatsapp-guide.md` | create | New usage + deployment-prerequisite guide |
| `docs/kb/README.md` | modify | Add row to the Features table |

### Do NOT Modify

- `docs/kb/features/baileys-whatsapp-guide.md`, `wppconnect-whatsapp-guide.md` (if `.plans/wppconnect-plugin` merged) — reference only

## Implementation Steps

### Step 1: Write the guide

Cover: external instance prerequisite and link; Inbox config (`whatsappDefault: 'wppconnect-server'`, `whatsappUrl`, `whatsappToken`); QR auth flow with the actual confirmed endpoint paths; Department/Licensee parity endpoints; sending (existing message-queue flow, no changes needed there); receiving (point at the existing generic webhook route, with the actual confirmed `wppconnect-server` payload shape as an example, mirroring the Baileys guide's "Required body shape" section); Troubleshooting table covering at least: external instance unreachable, QR timeout, session invalidated on the external side.

### Step 2: Update the KB index

Add a row to `docs/kb/README.md`'s Features table.

### Step 3: Run `check-kb-index`

Per `AGENTS.md`'s auto-trigger table.

## Testing

**Spec scenarios covered**: None — documentation-only task.

**Additional verification**:
- [ ] All documented endpoint paths and payload shapes match the actual merged implementation and the confirmed FR-009/FR-010 findings, not the original hypothesis
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

- [ ] `docs/kb/features/wppconnect-server-whatsapp-guide.md` created
- [ ] `docs/kb/README.md` Features table updated
- [ ] `check-kb-index` run after this task's changes

## Completion Criteria

- [ ] Guide published and indexed, including the external deployment prerequisite
- [ ] Plan overview's Success Criteria checklist for documentation marked complete
- [ ] Changes committed to `plan/wppconnect-server-plugin/phase-4/task-06-kb-docs` branch
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- Final task in the plan — no parallel siblings.
