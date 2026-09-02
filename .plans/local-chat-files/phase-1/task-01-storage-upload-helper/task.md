# Task: Storage upload helper

**Plan**: Local Chat — File Sending
**Phase**: 1
**Task ID (phase-local)**: task-01
**Task Path**: phase-1/task-01-storage-upload-helper
**Spec References**: FR-003 (storage provider abstraction for Buffer input)
**Depends On**: None
**JIRA**: N/A

## Objective

Create `src/app/plugins/storage/upload.ts` — a thin function that receives a `Buffer`, `fileName`, and `contact` object, selects LocalStorage or S3 based on `STORAGE_PROVIDER`, uploads the file, and returns the public URL.

## Context

Both existing storage plugins (`Local.ts`, `S3.ts`) currently accept base64 strings internally. For the upload route (task-02) we receive a `Buffer` from multer. Rather than converting Buffer → base64 → back to Buffer inside the plugin, this helper writes directly:

- **LocalStorage**: `fs.writeFileSync(fullPath, buffer)` (already accepts Buffer)
- **S3**: `PutObjectCommand.Body` accepts `Buffer` natively

The helper must use `STORAGE_PROVIDER` env var (`'local'` or `'s3'`). Default is `'local'`.

Path structure follows existing plugins:
- LocalStorage: `{year}-{month}-{day}/{contact.number}/{fileName}` → served at `{APP_URL}/uploads/...`
- S3: `{year}-{month}-{day}/{contact.number}/{fileName}` → public S3 URL

Reference: `src/app/plugins/storage/Local.ts` and `src/app/plugins/storage/S3.ts`.

## Before You Start

- [ ] Switch to `main` and pull: `git switch main && git pull --rebase origin main`
- [ ] Create plan branch: `git switch -c plan/local-chat-files`
- [ ] Read `src/app/plugins/storage/Local.ts` — understand path construction and presignedUrl
- [ ] Read `src/app/plugins/storage/S3.ts` — understand bucket path and PutObjectCommand usage
- [ ] Read `src/app/helpers/Files.ts` — the upload helper does NOT validate file type (that's the route's job)
- [ ] Mark this task `in-progress` in `status.md`

## File Ownership

| File | Action | Notes |
|------|--------|-------|
| `src/app/plugins/storage/upload.ts` | create | New upload adapter function |

### Do NOT Modify

- `src/app/plugins/storage/Local.ts` — read-only reference
- `src/app/plugins/storage/S3.ts` — read-only reference
- `src/app/routes/resources-routes.ts` — owned by task-02
- `src/app/plugins/chats/LocalChat.ts` — owned by task-03

## Implementation Steps

### Step 1: Implement the upload function

Create `src/app/plugins/storage/upload.ts`:

```ts
import fs from 'fs'
import path from 'path'
import mime from 'mime-types'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { logger } from '../../helpers/logger'

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER ?? 'local'
const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH ?? '/app/uploads'
const APP_URL = process.env.APP_URL ?? 'http://localhost:5001'

function buildRelativePath(contactNumber: string, fileName: string): string {
  const d = new Date()
  const folder = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  return path.join(folder, contactNumber, fileName)
}

async function uploadFileLocal(buffer: Buffer, relativePath: string): Promise<string> {
  const fullPath = path.join(LOCAL_STORAGE_PATH, relativePath)
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(fullPath, buffer)
  logger.info(`LocalStorage: file saved at ${fullPath}`)
  return `${APP_URL}/uploads/${relativePath}`
}

async function uploadFileS3(buffer: Buffer, fileName: string, relativePath: string): Promise<string> {
  const s3 = new S3Client({
    region: process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
    ...(process.env.AWS_ENDPOINT_URL && {
      endpoint: process.env.AWS_ENDPOINT_URL,
      forcePathStyle: true,
    }),
  })
  const bucket = process.env.AWS_BUCKET_NAME as string
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: relativePath,
    Body: buffer,
    ACL: 'public-read',
    ContentType: mime.lookup(fileName) || 'application/octet-stream',
  }))
  const endpoint = process.env.AWS_ENDPOINT_URL
  if (endpoint) return `${endpoint}/${bucket}/${relativePath}`
  return `https://${bucket}.s3.amazonaws.com/${relativePath}`
}

export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  contact: { number: string },
): Promise<string> {
  const relativePath = buildRelativePath(contact.number, fileName)
  if (STORAGE_PROVIDER === 's3') return uploadFileS3(buffer, fileName, relativePath)
  return uploadFileLocal(buffer, relativePath)
}
```

`mime-types` is already a transitive dependency (used by `S3.ts`) — verify it's in `package.json` before adding it.

### Step 2: Verify mime-types availability

```bash
grep '"mime-types"' package.json
```

If absent: `npm show mime-types version` → add at that version.

## Testing

**Spec scenarios covered**:
- This task has no direct acceptance scenario — it is an internal helper consumed by task-02 and task-03.

**Additional verification**:
- [ ] `yarn typecheck` passes with the new file
- [ ] `yarn linter` passes with the new file
- [ ] No existing tests broken

## Documentation / KB Updates

- [ ] No KB/doc updates required. Pattern is straightforward — if the implementation is non-obvious, run `document-solution` after task-03 is merged.

## Completion Criteria

- [ ] `src/app/plugins/storage/upload.ts` exists and compiles with `strict: true`
- [ ] `uploadFile(buffer, fileName, contact)` returns a URL string for both `STORAGE_PROVIDER=local` and `STORAGE_PROVIDER=s3` branches
- [ ] `yarn typecheck` passes
- [ ] `yarn linter` passes
- [ ] Status updated in `status.md`
