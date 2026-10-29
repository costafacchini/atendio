# Task: Write manual rollout checklist + KB index update

**Plan**: dialog-cloud-api-migration
**Phase**: 3
**Task ID (phase-local)**: task-06
**Task Path**: phase-3/task-06-rollout-checklist-and-kb
**Spec References**: FR-007, SC-004
**Depends On**: phase-3/task-05-webhook-templates-regression
**JIRA**: N/A

## Objective

Produce the manual, non-code checklist the user must run to actually activate this migration in production (since this plan never writes to the database — FR-007), and close out KB bookkeeping for the whole plan.

## Context

Global CLAUDE.md: "Never execute DB changes, provide instructions only." This plan's code changes are inert until each affected licensee's inbox record has `whatsappUrl` pointing at `https://waba-v2.360dialog.io/` and a `whatsappToken` regenerated after that licensee's number was migrated to Cloud API hosting on 360dialog's side (per https://docs.360dialog.com/partner/partner-hub/migrating-phone-numbers/hosting-type-change-on-premise-api-to-cloud-api: "In Cloud, only the most recent API Key will work"). This task documents that gap explicitly rather than leaving it implicit.

## Before You Start

- [ ] Switch to the base branch and pull latest: `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-3/task-05-webhook-templates-regression`'s `status.md` shows `complete`
- [ ] Re-read `status.md` from task-01, task-03, and task-04 to capture any adaptations/unverified assumptions they flagged
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `docs/kb/features/dialog-360dialog-cloud-api-migration.md` | create | Migration summary + manual rollout checklist |
| `docs/kb/README.md` | modify | Add the new doc under "Features"; confirm the Research-table row from task-01 is still accurate |

### Do NOT Modify

- `src/app/plugins/messengers/Dialog.ts` / `Dialog.spec.ts` — no code changes in this task

## Implementation Steps

### Step 1: Run the full verification suite

```bash
npx jest
npx eslint .
```
Confirm everything is green across the whole repo, not just `Dialog.spec.ts` — other specs reference `whatsappUrl`/`waba.360dialog.io` fixtures (`src/app/services/SendMessageToMessenger.spec.ts`, `ChatMessage.spec.ts`, `MessengerMessage.spec.ts`, `ChatbotMessage.spec.ts`) and should be checked for the same stale-host issue; update their fixture hosts to `waba-v2.360dialog.io` if they assert on the URL (most only pass it through as an opaque fixture — verify case by case, do not assume).

### Step 2: Write the KB doc

Create `docs/kb/features/dialog-360dialog-cloud-api-migration.md` (format: **Last Updated**, **Context**, content — match existing docs like `docs/kb/features/deploy-heroku.md`). Include:
- One-paragraph summary of what changed in code (links to this plan's `overview.md` and `spec.md`).
- **Manual rollout checklist** (explicitly instructions for the user/ops to execute, not something this plan executes):
  1. For each licensee using the Dialog (360dialog) messenger: confirm in 360dialog's Hub whether that number has been migrated to Cloud API hosting.
  2. If migrated: update that licensee's inbox `whatsappUrl` to `https://waba-v2.360dialog.io/` and regenerate + store a new `whatsappToken` (old On-Premise API keys are rejected by Cloud API).
  3. If not yet migrated on 360dialog's side: that licensee's integration remains broken regardless of this code change — coordinate the hosting-type migration with 360dialog first.
  4. After updating data for a licensee, verify end-to-end: send a test outbound text message, send a test inbound image from a WhatsApp test number, and confirm the webhook still fires (re-run `setWebhook` if 360dialog's migration reset it).
- Any unresolved/unverified items flagged by task-01 (contact-validation decision), task-03 (implementation deviations), or task-04 (media response shape confirmation status) — surface them here so they're visible to whoever executes the rollout, not buried in individual task status files.

### Step 3: Update the KB index

Add the new doc under `docs/kb/README.md`'s "Features" table. Run `check-kb-index`.

## Testing

**Spec scenarios covered**:
- [ ] N/A — this task is documentation/checklist, not a code behavior change

**Additional verification**:
- [ ] `npx jest` passes for the full suite
- [ ] `npx eslint .` passes clean for the full repo
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

- [ ] `docs/kb/features/dialog-360dialog-cloud-api-migration.md` created
- [ ] `docs/kb/README.md` updated (Features table, and Research table cross-checked)
- [ ] `check-kb-index` run

## Completion Criteria

- [ ] Full repo test suite and lint are green
- [ ] Rollout checklist doc exists, explicit that it is manual/not executed by this plan (FR-007)
- [ ] All unresolved items from task-01/03/04 are surfaced in the rollout doc
- [ ] Changes committed to `plan/dialog-cloud-api-migration/phase-3/task-06-rollout-checklist-and-kb` branch
- [ ] Status updated in `status.md`
- [ ] Overview `overview.md` Success Criteria checklist reviewed and checked off where true (per the mistake-log entry on reconciling plan Done-When criteria before marking a plan complete)

## Conflict Avoidance Notes

- Last task in the plan — no downstream tasks depend on this one.
