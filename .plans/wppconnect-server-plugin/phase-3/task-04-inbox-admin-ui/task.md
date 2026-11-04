# Task: Inbox Admin Form + QR Panel

**Plan**: Wppconnect-Server WhatsApp Plugin
**Phase**: 3
**Task ID (phase-local)**: task-04
**Task Path**: phase-3/task-04-inbox-admin-ui
**Spec References**: Story 4 (P2), FR-006
**Depends On**: phase-2/task-02-inbox-qr-status
**JIRA**: N/A

## Objective

Add `'wppconnect-server'` to the Inbox form's WhatsApp provider dropdown, keep the token/URL fields **visible** (unlike Baileys/Wppconnect), and render a new `InboxWppconnectServerPanel` for QR pairing and status.

## Context

`client/src/pages/Inboxes/scenes/Form/index.tsx` line 58: `const showWhatsappCredentials = isMessenger && values.whatsappDefault !== '' && !isBaileys` (and, if `.plans/wppconnect-plugin` has already merged, `&& !isWppconnect` too). **Do not add `wppconnect-server` to this exclusion list** — per spec FR-006, `whatsappToken`/`whatsappUrl` must stay visible and required for this provider, same as `dialog`/`utalk`/`ycloud`/`pabbly`.

The QR panel is still needed because, unlike Dialog/Utalk (which require no interactive pairing step), `wppconnect-server` needs an initial QR scan. Base `InboxWppconnectServerPanel` on `InboxBaileysPanel.tsx`'s structure (status check on mount + "Gerar QR Code" button), but its service calls hit the new `wppconnect-server-qr`/`wppconnect-server-status` routes from task-02.

## Before You Start

- [ ] Switch to the planning/base branch and pull the latest plan state: `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-2/task-02-inbox-qr-status`'s `status.md` shows `complete`
- [ ] Check this task's `status.md` — if already `in-progress` or `complete`, stop and investigate
- [ ] Read `client/src/pages/Inboxes/scenes/Form/index.tsx` and `Edit/InboxBaileysPanel.tsx` in full
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `client/src/services/inbox.ts` | modify | Add `getInboxWppconnectServerQr`, `getInboxWppconnectServerStatus` |
| `client/src/services/inbox.spec.ts` | modify | Add coverage |
| `client/src/pages/Inboxes/scenes/Edit/InboxWppconnectServerPanel.tsx` | create | QR + status panel, no sync button |
| `client/src/pages/Inboxes/scenes/Form/index.tsx` | modify | Add dropdown option; render the panel; do NOT add to the credentials-hiding condition |
| `client/src/i18n/locales/pt.json` | modify | Add `inboxes.wppconnectServer.*` keys |
| `client/src/i18n/locales/en.json` | modify | Same keys in English |

### Do NOT Modify

- `client/src/pages/Inboxes/scenes/Edit/InboxBaileysPanel.tsx` — reference only
- `client/src/pages/Departments/**` — owned by task-05
- Any `.plans/wppconnect-plugin` Inbox UI files — independent plugin, keep this provider's option additive only

## Implementation Steps

### Step 1: Client service functions

Add `getInboxWppconnectServerStatus(inboxId)` / `getInboxWppconnectServerQr(inboxId)` to `client/src/services/inbox.ts`, following the `getInboxBaileysStatus`/`getInboxBaileysQr` pattern, pointed at the task-02 routes.

### Step 2: `InboxWppconnectServerPanel.tsx`

Copy `InboxBaileysPanel.tsx`'s structure, swap service calls, remove sync-related code.

### Step 3: Form wiring

Add `<option value='wppconnect-server'>Wppconnect Server</option>` to the dropdown. Add `const isWppconnectServerMessenger = inboxId && isMessenger && values.whatsappDefault === 'wppconnect-server'` and render `<InboxWppconnectServerPanel inboxId={inboxId} isActive={isWppconnectServerMessenger} />`. Confirm (and add a regression test if none exists) that `showWhatsappCredentials` evaluates `true` when `whatsappDefault === 'wppconnect-server'`.

### Step 4: i18n keys

Add `inboxes.wppconnectServer.*` keys mirroring `inboxes.baileys.*`.

## Testing

**Spec scenarios covered**:
- [ ] Scenario: Given the Inbox form / When `whatsappDefault` is `'wppconnect-server'` / Then token/URL fields remain visible — `client/src/pages/Inboxes/scenes/Form/index.spec.tsx:TODO` (create or extend)
- [ ] Scenario: Given an Inbox with `whatsappDefault: 'wppconnect-server'` and persisted `id` / When Edit screen loads / Then `InboxWppconnectServerPanel` renders and calls the status endpoint — `client/src/services/inbox.spec.ts:TODO`

**Additional verification**:
- [ ] `inbox.spec.ts` covers the two new service functions
- [ ] Manual verification against a real/staging `wppconnect-server` instance if available (cannot be automated in CI)
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

- [ ] No KB/doc updates required in this task — covered in task-06.

## Completion Criteria

- [ ] Dropdown option added; credentials remain visible for this provider
- [ ] `InboxWppconnectServerPanel.tsx` created and wired
- [ ] Client service tests pass
- [ ] Changes committed to `plan/wppconnect-server-plugin/phase-3/task-04-inbox-admin-ui` branch
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- task-05 (Department UI) is a separate file tree — no overlap.
