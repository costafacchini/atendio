# Task: ConversationPanel file rendering

**Plan**: Local Chat — File Sending
**Phase**: 3
**Task ID (phase-local)**: task-07
**Task Path**: phase-3/task-07-conversation-panel-rendering
**Spec References**: Story 2 (P2), FR-008 — Scenarios S5, S6, S7, S8
**Depends On**: None
**JIRA**: N/A

## Objective

Replace the placeholder `message.url ? '[arquivo]' : '[mensagem]'` in `ConversationPanel.tsx` with proper file rendering: `<img>` for images, `<video>` for video, `<audio>` for audio, and `<a download>` for all other types.

## Context

`ConversationPanel.tsx` (line 109) currently renders:
```tsx
{message.text || (message.url ? '[arquivo]' : '[mensagem]')}
```

The rendering must use the same type-detection helpers as the backend: `isPhoto`, `isVideo`, `isMidia`, `isVoice` from `src/app/helpers/Files.ts`. These are backend files — the client has no dependency on them. Either:
1. Copy the four regex functions into a client-side utility `client/src/helpers/files.ts` (preferred — avoids coupling), or
2. Import directly if the client resolves backend paths via tsconfig paths.

Preferred: create a thin client-side copy `client/src/helpers/files.ts` with the same four functions and matching tests. This decouples the frontend from the backend helpers.

**Rendering rules** (applied when `message.kind === 'file'` and `message.url` is non-null):
| Type | Element |
|------|---------|
| `isPhoto(url)` | `<img src={url} alt={fileName ?? 'arquivo'} style={{ maxWidth: '100%' }} />` |
| `isVideo(url)` | `<video src={url} controls style={{ maxWidth: '100%' }} />` |
| `isMidia(url)` or `isVoice(url)` | `<audio src={url} controls />` |
| fallback | `<a href={url} download={fileName ?? true}>{fileName ?? 'Baixar arquivo'}</a>` |

Text messages continue to render as before (`message.text`).

`message.url` on the client type `IMessage` is `string | null`. Guard against null before calling file helpers.

## Before You Start

- [ ] `git switch plan/local-chat-files && git pull --rebase origin plan/local-chat-files`
- [ ] Read `client/src/pages/Chat/components/ConversationPanel.tsx` in full
- [ ] Read `src/app/helpers/Files.ts` — copy the four regex functions verbatim
- [ ] Read `client/src/pages/Chat/components/ConversationPanel.spec.tsx` in full — understand existing test setup
- [ ] Read `client/src/types/message.ts` — confirm `url: string | null` and `fileName: string | null`
- [ ] Mark this task `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `client/src/pages/Chat/components/ConversationPanel.tsx` | modify | Replace placeholder with file rendering |
| `client/src/pages/Chat/components/ConversationPanel.spec.tsx` | modify | Implement S5-S8 stubs |
| `client/src/helpers/files.ts` | create | Client-side copy of isPhoto/isVideo/isMidia/isVoice |

### Do NOT Modify

- `src/app/helpers/Files.ts` — backend file, do not touch
- `client/src/pages/Chat/components/MessageInput.tsx` — owned by task-06
- `client/src/pages/Chat/index.tsx` — owned by task-08

## Implementation Steps

### Step 1: Create client-side file helpers

Create `client/src/helpers/files.ts`:

```ts
export function isPhoto(url: string): boolean {
  return !!url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\W|$)/i)
}

export function isVideo(url: string): boolean {
  return !!url.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv|3gp|m4v|mpg|mpeg)(\W|$)/i)
}

export function isMidia(url: string): boolean {
  return !!url.match(/\.(aac|mp3|ogg|wma|alac|flac|wav|mpga)(\W|$)/i)
}

export function isVoice(url: string): boolean {
  return !!url.match(/\.(opus|oga)(\W|$)/i)
}
```

### Step 2: Add renderFileMessage helper to ConversationPanel

Import the helpers and add a helper function before the component:

```ts
import { isPhoto, isVideo, isMidia, isVoice } from '../../../helpers/files'

function renderFileMessage(url: string, fileName: string | null) {
  if (isPhoto(url)) return <img src={url} alt={fileName ?? 'arquivo'} style={{ maxWidth: '100%' }} />
  if (isVideo(url)) return <video src={url} controls style={{ maxWidth: '100%' }} />
  if (isMidia(url) || isVoice(url)) return <audio src={url} controls />
  return <a href={url} download={fileName ?? true}>{fileName ?? 'Baixar arquivo'}</a>
}
```

### Step 3: Replace placeholder in message rendering

In the `bubbleText` span, replace:
```tsx
{message.text || (message.url ? '[arquivo]' : '[mensagem]')}
```
with:
```tsx
{message.kind === 'file' && message.url
  ? renderFileMessage(message.url, message.fileName)
  : message.text || '[mensagem]'}
```

## Testing

**Spec scenarios covered**:
- [ ] Scenario S5: Given file message with image url, When rendered, Then `<img>` shown — `client/src/pages/Chat/components/ConversationPanel.spec.tsx`
- [ ] Scenario S6: Given file message with video url, When rendered, Then `<video>` shown — `client/src/pages/Chat/components/ConversationPanel.spec.tsx`
- [ ] Scenario S7: Given file message with audio url, When rendered, Then `<audio>` shown — `client/src/pages/Chat/components/ConversationPanel.spec.tsx`
- [ ] Scenario S8: Given file message with non-media url, When rendered, Then `<a download>` shown — `client/src/pages/Chat/components/ConversationPanel.spec.tsx`

**Additional verification**:
- [ ] Text messages still render as before (no regression)
- [ ] `cd client && npx vitest run client/src/pages/Chat/components/ConversationPanel.spec.tsx`
- [ ] `cd client && yarn typecheck` passes

## Documentation / KB Updates

- [ ] No KB/doc updates required.

## Completion Criteria

- [ ] `renderFileMessage` renders img/video/audio/anchor correctly by extension
- [ ] Stubs for S5, S6, S7, S8 are implemented and passing
- [ ] Existing `ConversationPanel.spec.tsx` tests still pass
- [ ] `cd client && yarn typecheck` passes
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- task-05, task-06 run in parallel — neither touches `ConversationPanel.tsx`.
