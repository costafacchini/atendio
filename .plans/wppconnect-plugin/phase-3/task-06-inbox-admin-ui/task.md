# Task: Inbox Admin Form + QR Panel

**Plan**: Wppconnect WhatsApp Plugin
**Phase**: 3
**Task ID (phase-local)**: task-06
**Task Path**: phase-3/task-06-inbox-admin-ui
**Spec References**: Story 4 (P2), FR-007
**Depends On**: phase-2/task-03-inbox-qr-status
**JIRA**: N/A

## Objective

Add `'wppconnect'` to the Inbox form's WhatsApp provider dropdown, hide the token/URL fields when selected, and render a new `InboxWppconnectPanel` that authenticates via QR and shows connection status — mirroring the existing Baileys wiring exactly.

## Context

`client/src/pages/Inboxes/scenes/Form/index.tsx`:
- Line 57: `const isBaileys = values.whatsappDefault === 'baileys'`
- Line 58: `const showWhatsappCredentials = isMessenger && values.whatsappDefault !== '' && !isBaileys`
- Line 62: `const isBaileysMessenger = inboxId && isMessenger && isBaileys`
- Line 128: `<option value='baileys'>Baileys</option>` in the `whatsappDefault` `<select>`
- `InboxBaileysPanel` is imported and rendered conditionally further down keyed off `isBaileysMessenger` (confirm exact render line when editing — read the full file before changing).

`client/src/pages/Inboxes/scenes/Edit/InboxBaileysPanel.tsx` is the reference panel: fetches status on mount via `getInboxBaileysStatus`, shows a "Gerar QR Code" / "Sincronizar" flow via `getInboxBaileysQr`. **Omit the sync button and `syncInboxBaileys` call** — group sync is out of scope for this plan.

`client/src/services/inbox.ts` lines 34-44 define `getInboxBaileysStatus`, `getInboxBaileysQr`, `syncInboxBaileys` — add `getInboxWppconnectStatus`/`getInboxWppconnectQr` following the same `api().get/post(...)` pattern, pointed at the routes added in task-03.

## Before You Start

- [ ] Switch to the planning/base branch and pull the latest plan state: `git switch main && git pull --rebase origin main`
- [ ] Verify `phase-2/task-03-inbox-qr-status`'s `status.md` shows `complete`
- [ ] Check this task's `status.md` — if already `in-progress` or `complete`, stop and investigate
- [ ] Read `client/src/pages/Inboxes/scenes/Form/index.tsx` in full
- [ ] Read `client/src/pages/Inboxes/scenes/Edit/InboxBaileysPanel.tsx` and `client/src/services/inbox.ts` in full
- [ ] Read `client/src/services/inbox.spec.ts` for the existing test pattern
- [ ] Mark this task `in-progress` in `status.md` before proceeding

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `client/src/services/inbox.ts` | modify | Add `getInboxWppconnectQr`, `getInboxWppconnectStatus` |
| `client/src/services/inbox.spec.ts` | modify | Add coverage mirroring the Baileys service tests |
| `client/src/pages/Inboxes/scenes/Edit/InboxWppconnectPanel.tsx` | create | Mirrors `InboxBaileysPanel.tsx`, no sync button |
| `client/src/pages/Inboxes/scenes/Form/index.tsx` | modify | Add dropdown option, `isWppconnect`/`isWppconnectMessenger` flags, render the panel |
| `client/src/i18n/locales/pt.json` | modify | Add `inboxes.wppconnect.*` keys mirroring `inboxes.baileys.*` |
| `client/src/i18n/locales/en.json` | modify | Same keys in English |

### Do NOT Modify

- `client/src/pages/Inboxes/scenes/Edit/InboxBaileysPanel.tsx` — reference only
- `client/src/pages/Departments/**` — owned by task-07

## Implementation Steps

### Step 1: Client service functions

In `client/src/services/inbox.ts`, add:
```ts
function getInboxWppconnectStatus(inboxId: string) {
  return api().get(`resources/inboxes/${inboxId}/wppconnect-status`, { headers: headers() })
}
function getInboxWppconnectQr(inboxId: string) {
  return api().post(`resources/inboxes/${inboxId}/wppconnect-qr`, { headers: headers() })
}
```
Export both.

### Step 2: `InboxWppconnectPanel.tsx`

Copy `InboxBaileysPanel.tsx`, rename identifiers, swap the imported service functions, and remove the sync button/state (`syncLoading`, `syncResult`, `syncError`, and the "Sincronizar Grupos" button) since group sync is out of scope.

### Step 3: Form wiring

In `Inboxes/scenes/Form/index.tsx`:
- Add `const isWppconnect = values.whatsappDefault === 'wppconnect'`
- Change `showWhatsappCredentials` to also exclude `isWppconnect`: `isMessenger && values.whatsappDefault !== '' && !isBaileys && !isWppconnect`
- Add `const isWppconnectMessenger = inboxId && isMessenger && isWppconnect`
- Add `<option value='wppconnect'>Wppconnect</option>` to the dropdown, after the `baileys` option
- Render `<InboxWppconnectPanel inboxId={inboxId} isActive={isWppconnectMessenger} />` next to the existing `InboxBaileysPanel` render call

### Step 4: i18n keys

Add `inboxes.wppconnect.title`, `checking`, `connected`, `reconnect`, `generateQr`, `qrError` keys to both locale files, mirroring the `inboxes.baileys.*` keys exactly.

## Testing

**Spec scenarios covered**:
- [ ] Scenario: Given the Inbox form / When `whatsappDefault` is `'wppconnect'` / Then token/URL fields are hidden — `client/src/pages/Inboxes/scenes/Form/index.spec.tsx:TODO` (create if no existing form spec covers this; otherwise extend)
- [ ] Scenario: Given an Inbox with `whatsappDefault: 'wppconnect'` and persisted `id` / When Edit screen loads / Then `InboxWppconnectPanel` renders and calls the status endpoint — `client/src/services/inbox.spec.ts:TODO`

**Additional verification**:
- [ ] `inbox.spec.ts` covers `getInboxWppconnectQr`/`getInboxWppconnectStatus` call the correct URLs with headers, mirroring the existing Baileys service test block
- [ ] Manual verification: run `yarn run dev`, open an Inbox, select Wppconnect, confirm token/URL fields hide and the panel renders (cannot be automated — no live WhatsApp account in CI)
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

- [ ] No KB/doc updates required in this task — covered in task-08.

## Completion Criteria

- [ ] Dropdown option, conditional field hiding, and panel rendering implemented
- [ ] `InboxWppconnectPanel.tsx` created without a sync button
- [ ] Client service tests pass
- [ ] Changes committed to `plan/wppconnect-plugin/phase-3/task-06-inbox-admin-ui` branch
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- Runs in parallel with task-04/task-05 (backend) — this task only needs task-03's route contract, not task-04/05's.
- task-07 (Department UI) is a separate file tree (`client/src/pages/Departments/**`) — no overlap.
