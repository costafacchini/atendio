# Feature Specification: File Sending in Local Chat

**Plan**: local-chat-files
**Created**: 2026-09-02
**Status**: Final
**Input**: Add the ability for agents to send files (images, video, audio, documents) to contacts in the Local Chat admin panel. Files are stored via the existing STORAGE_PROVIDER abstraction (LocalStorage or S3). Only the agent → customer direction is in scope.

---

## User Stories

### Story 1 — Agent attaches and sends a file in an open room (P1)

As an agent using the admin Chat panel, I want to attach a file from my device and send it in an open conversation so that the customer receives the file via the Local Chat socket.

**Why this priority**: This is the core user-facing feature — without this story, the entire plan delivers no value.

**Independent Test**: Can be verified by opening a conversation in the Chat panel, selecting a file via the attachment button, clicking Send, and confirming the file appears in the message list and the customer socket event carries `url` and `fileName`.

**Acceptance Scenarios**:

1. **Given** an agent has an open room selected in the Chat panel, **When** the agent clicks the attachment button (paperclip icon) and selects a valid file, **Then** the filename appears as a preview next to the input area.
2. **Given** an agent has a valid file selected, **When** the agent clicks Send, **Then** the file is uploaded to the configured storage and a message with `kind: 'file'`, `url`, and `fileName` is created in the room.
3. **Given** an agent selects a file whose extension is not in the accepted set (isPhoto / isVideo / isMidia / isVoice), **When** the agent clicks Send, **Then** the upload is rejected with HTTP 422 and no message is created.
4. **Given** an agent has sent a file message to an open room, **When** the customer's widget is connected via socket, **Then** the `new-room-message` event payload includes non-null `url` and `fileName` fields.

---

### Story 2 — File messages are rendered by media type (P2)

As an agent viewing a conversation, I want file messages to be rendered according to their media type so that I can preview images, play audio/video, or download documents.

**Why this priority**: The messaging infrastructure is useless if the receiving side only shows `[arquivo]`. This story completes the user journey end-to-end in the admin panel.

**Independent Test**: Can be verified by mocking a `kind: 'file'` message in the ConversationPanel test harness with different url extensions and asserting the correct HTML element is rendered.

**Acceptance Scenarios**:

5. **Given** a message with `kind: 'file'` and a url ending in `.jpg`, `.png`, `.gif`, or `.webp`, **When** rendered in the conversation list, **Then** an `<img>` element with the file url as `src` is shown inline.
6. **Given** a message with `kind: 'file'` and a url ending in `.mp4`, `.webm`, or similar video extension, **When** rendered, **Then** a `<video>` element with `controls` is shown.
7. **Given** a message with `kind: 'file'` and a url ending in `.mp3`, `.aac`, `.ogg`, or similar audio extension, **When** rendered, **Then** an `<audio>` element with `controls` is shown.
8. **Given** a message with `kind: 'file'` and a url with any other extension (e.g., `.pdf`, `.docx`), **When** rendered, **Then** an anchor tag with `download` attribute and the `fileName` as label is shown.

---

### Edge Cases

- What if the storage upload succeeds but the message creation fails? — The uploaded file URL is orphaned; no message is created and the agent sees an error.
- What if the room is closed when the agent attempts to upload? — The route must validate room status before accepting the upload (same check as replyToRoom).
- What if `url` or `fileName` is null in an incoming socket event? — The rendering layer must fall back gracefully (show `[arquivo]` only as last resort).

---

## Functional Requirements

- **FR-001**: The system MUST accept multipart/form-data file uploads on `POST /resources/rooms/:roomId/upload` with JWT auth (`x-access-token`).
- **FR-002**: The upload endpoint MUST reject files whose extension is not matched by `isPhoto`, `isVideo`, `isMidia`, or `isVoice` helpers with HTTP 422.
- **FR-003**: The system MUST store uploaded files using the provider selected by `STORAGE_PROVIDER` env var (LocalStorage or S3) and return a publicly accessible `url`.
- **FR-004**: `LocalChat.parseMessage` MUST accept a body with `url` + `fileName` (and no `text`) and produce a `kind: 'file'` message entry.
- **FR-005**: `LocalChat.sendMessage` MUST emit `url` and `fileName` in the `new-room-message` socket event payload.
- **FR-006**: The `ChatRoomsController.replyToRoom` endpoint MUST forward `kind`, `url`, and `fileName` from the request body to `IngestChatMessage`.
- **FR-007**: The `MessageInput` component MUST expose an `onSendFile(file: File)` prop and render an attachment button that triggers a hidden file input.
- **FR-008**: The `ConversationPanel` MUST render `kind: 'file'` messages as `<img>`, `<video>`, `<audio>`, or `<a download>` according to the url extension.

---

## Success Criteria

- **SC-001**: An agent can select a file, send it in an open room, and see the file message appear in the conversation list within one round-trip — upload + message create + socket emit.
- **SC-002**: The `new-room-message` socket event for a file message always carries a non-null `url` and `fileName`.
- **SC-003**: All 8 acceptance scenario test stubs are implemented and passing; existing `LocalChat`, `ChatRoomsController`, `MessageInput`, and `ConversationPanel` specs remain green.

---

## Assumptions

- Only the admin Chat panel (agent → customer) is in scope. Widget (customer → agent) file upload is out of scope.
- The `STORAGE_PROVIDER` env var selects `local` (default) or `s3`. No other providers.
- Accepted file types are exactly those detectable by the four helpers in `src/app/helpers/Files.ts`: isPhoto, isVideo, isMidia, isVoice.
- File size validation is out of scope for this plan.
- No thumbnail generation or virus scanning.
- The `department` field on type `IMessage` (client) may need to be renamed from `sector` to match the server type — this pre-existing mismatch is out of scope unless it blocks compilation.
