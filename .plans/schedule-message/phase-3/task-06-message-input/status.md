# Status: Schedule UI in MessageInput

**Current Status**: complete
**Last Updated**: 2026-08-24
**Agent**: claude-sonnet-4-6
**Branch**: plan/schedule-message/phase-3/task-06-message-input
**PR**: —

## Status History

| Timestamp | Status | Agent | Notes |
|-----------|--------|-------|-------|
| 2026-08-24 | not-started | — | Task created (plan revised) |
| 2026-08-24T14:55:00Z | complete | claude-sonnet-4-6 | All 5 stubs filled; 9/9 tests pass; TS clean |

## Blockers
None

## Artifacts
- `client/src/pages/Chat/components/MessageInput.tsx` — added onSchedule prop, schedule toggle/picker/button
- `client/src/pages/Chat/components/MessageInput.spec.tsx` — filled 5 todo stubs
- `client/src/pages/Chat/styles.module.scss` — added .inputRow, .scheduleRow, .schedulePicker, .scheduleBtn, .clockBtn
- `client/src/i18n/locales/pt.json` — added scheduleToggleAriaLabel, scheduleDateAriaLabel, scheduleSubmitLabel
- `client/src/i18n/locales/en.json` — same keys in English

## Adaptations
None
