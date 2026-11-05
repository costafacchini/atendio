# Status: Inbox Admin Form + QR Panel

**Current Status**: complete
**Last Updated**: 2026-11-05
**Agent**: Claude
**Branch**: plan/wppconnect-server-plugin/phase-3/task-04-inbox-admin-ui
**PR**: — (PR Strategy: single — opened after the full plan completes)

## Status History

| Timestamp | Status | Agent | Notes |
|-----------|--------|-------|-------|
| 2026-11-04 | not-started | — | Task created |
| 2026-11-05 | in-progress | Claude | Branch created (stacked on task-03), starting implementation |
| 2026-11-05 | complete | Claude | Dropdown option, panel, client service + i18n wired; Vitest + tsc green (pre-existing unrelated TS errors untouched) |

## Blockers

None

## Artifacts

- `client/src/pages/Inboxes/scenes/Edit/InboxWppconnectServerPanel.tsx`
- `client/src/pages/Inboxes/scenes/Form/index.tsx` (dropdown option, `isWppconnectServerMessenger`, panel render — `showWhatsappCredentials` intentionally NOT excluding this provider, per spec FR-006)
- `client/src/pages/Inboxes/scenes/Edit/index.spec.tsx` (2 new tests)
- `client/src/services/inbox.ts` / `.spec.ts` (`getInboxWppconnectServerStatus`, `getInboxWppconnectServerQr`)
- `client/src/i18n/locales/pt.json` / `en.json` (`inboxes.wppconnectServer.*`)
- Branch: `plan/wppconnect-server-plugin/phase-3/task-04-inbox-admin-ui` (stacked on task-03's branch, pushed)

## Adaptations

### Deviation 1: QR rendered as `<img>`, not `QRCodeSVG`
- **Task file said**: base the panel on `InboxBaileysPanel.tsx`'s structure.
- **Reality**: task-01's confirmed findings show `wppconnect-server`'s `qrcode` field is already a `data:image/png;base64,...` string (server-rendered), unlike Baileys' raw QR payload that needs client-side rendering via `QRCodeSVG`.
- **Action taken**: `InboxWppconnectServerPanel` renders `<img src={qr} />` directly instead of importing `qrcode.react`.

### Deviation 2: no dedicated `Form/index.spec.tsx`
- **Task file said**: add/extend a form-level spec for the credentials-visibility scenario.
- **Reality**: no `Form/index.spec.tsx` exists in this codebase; form behavior is tested through the `Edit`/`New` wrapper pages' specs (see `Edit/index.spec.tsx`'s existing Baileys-panel tests).
- **Action taken**: Added the two new scenarios (panel renders; credentials stay visible) to the existing `Edit/index.spec.tsx`, matching the established convention.
