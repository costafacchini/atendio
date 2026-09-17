# Task: Upload route + multer

**Plan**: Local Chat — File Sending
**Phase**: 2
**Task ID (phase-local)**: task-02
**Task Path**: phase-2/task-02-upload-route
**Spec References**: Story 1 (P1), FR-001, FR-002, FR-003 — Scenarios S2, S3
**Depends On**: phase-1/task-01-storage-upload-helper
**JIRA**: N/A

## Objective

Add `POST /resources/rooms/:roomId/upload` to `src/app/routes/resources-routes.ts`. The route accepts multipart/form-data, validates the file extension, uploads via the `uploadFile` helper from task-01, and returns `{ url, fileName }`.

## Context

`resources-routes.ts` is the existing Express router for JWT-authenticated admin endpoints. It already imports `authenticate` middleware and `createRuntimeDependencies`. The new route follows the same pattern as existing resource routes.

multer is the standard Express multipart middleware. Use `memoryStorage()` — this avoids disk writes at the HTTP layer and passes a `Buffer` directly to `uploadFile`. Avoid `diskStorage` to stay compatible with multi-dyno deploys.

File type validation uses the four helpers from `src/app/helpers/Files.ts`. Any file whose url-like name doesn't match any helper is rejected with 422 before the upload begins.

The route must verify the room exists and is not closed before accepting the upload (mirrors `replyToRoom`).

**IMPORTANT — multer CJS/ESM risk**: See mistake log 2026-04-21. Before installing multer, run a representative test that imports the route file to confirm Jest can resolve it. If Jest fails, add multer to `transformIgnorePatterns` in `jest.config.mjs`.

## Before You Start

- [ ] `git switch main && git pull --rebase origin main && git switch plan/local-chat-files`
- [ ] Verify task-01 `status.md` shows `complete`
- [ ] Read `src/app/routes/resources-routes.ts` — understand existing route/auth patterns
- [ ] Look up current multer version: `npm show multer version`
- [ ] Check multer CJS compatibility: `node -e "require('multer')"` after install
- [ ] Mark this task `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/routes/resources-routes.ts` | modify | Add upload route |
| `src/app/routes/resources-routes.spec.ts` | modify | Add test stubs for upload scenarios |
| `package.json` | modify | Add multer + @types/multer |

### Do NOT Modify

- `src/app/plugins/storage/upload.ts` — owned by task-01 (read-only)
- `src/app/plugins/chats/LocalChat.ts` — owned by task-03
- `src/app/controllers/ChatRoomsController.ts` — owned by task-04

## Implementation Steps

### Step 1: Install multer

```bash
npm show multer version   # get latest
npm show @types/multer version
```

Add both to `package.json` at the versions returned, then `yarn install`.

### Step 2: Add upload route

In `src/app/routes/resources-routes.ts`, after imports, add:

```ts
import multer from 'multer'
import { uploadFile } from '../plugins/storage/upload'
import { isPhoto, isVideo, isMidia, isVoice } from '../helpers/Files'

const upload = multer({ storage: multer.memoryStorage() })

function isAcceptedFile(fileName: string): boolean {
  return isPhoto(fileName) || isVideo(fileName) || isMidia(fileName) || isVoice(fileName)
}
```

Add the route (authenticated, before the catch-all):

```ts
router.post(
  '/rooms/:roomId/upload',
  authenticate,
  upload.single('file'),
  async (req: any, res: any) => {
    const { roomId } = req.params
    if (!req.file) return res.status(422).json({ message: 'No file provided.' })

    const { originalname, buffer } = req.file
    if (!isAcceptedFile(originalname)) {
      return res.status(422).json({ message: `File type not accepted: ${originalname}` })
    }

    const room = await roomRepository.findFirst({ _id: roomId })
    if (!room || room.closed) {
      return res.status(404).json({ message: 'Room not found or already closed.' })
    }

    const contactId = (room as any).contact?._id ?? String((room as any).contact)
    const contact = await contactRepository.findFirst({ _id: contactId })
    if (!contact) return res.status(404).json({ message: 'Contact not found.' })

    try {
      const url = await uploadFile(buffer, originalname, contact)
      return res.status(201).json({ url, fileName: originalname })
    } catch (err: any) {
      return res.status(500).json({ message: err.message })
    }
  },
)
```

`roomRepository` and `contactRepository` are already instantiated in the composition root of `resources-routes.ts`.

### Step 3: Verify Jest can import the modified route

```bash
npx jest src/app/routes/resources-routes.spec.ts --no-coverage 2>&1 | head -30
```

If multer causes a Jest import error, add to `jest.config.mjs`:
```js
transformIgnorePatterns: ['node_modules/(?!(multer)/)'],
```

## Testing

**Spec scenarios covered**:
- [ ] Scenario S2: Given agent selects valid file, When Send clicked, Then upload returns `{ url, fileName }` — `src/app/routes/resources-routes.spec.ts`
- [ ] Scenario S3: Given agent selects invalid file type, When Send clicked, Then 422 returned — `src/app/routes/resources-routes.spec.ts`

**Additional verification**:
- [ ] Route returns 404 when room is not found or is closed
- [ ] Route returns 422 when no file is provided
- [ ] `yarn typecheck` passes
- [ ] `yarn linter` passes
- [ ] `pre-commit-check` passes

## Documentation / KB Updates

- [ ] No KB/doc updates required for this task. If multer CJS workaround is needed, run `document-solution` with the fix for future reference.

## Completion Criteria

- [ ] `POST /resources/rooms/:roomId/upload` exists, is JWT-authenticated, and returns `{ url, fileName }` on success
- [ ] Invalid file types return 422
- [ ] Closed/missing rooms return 404
- [ ] Test stubs in `resources-routes.spec.ts` are listed in File Ownership
- [ ] `yarn typecheck` passes
- [ ] `yarn linter` passes
- [ ] Status updated in `status.md`

## Conflict Avoidance Notes

- task-03 and task-04 run in parallel with this task. They do not touch `resources-routes.ts`.
