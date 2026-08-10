# Project Overview — atend.io

**Last Updated**: 2026-06-01
**Context**: Read when working on any part of this codebase. Covers project purpose, folder layout, entry points, plugin architecture, API structure, and deployment.

---

## What This Project Is

atend.io is a WhatsApp-Chat-Chatbot integration platform. It routes messages between:
- **WhatsApp** providers (Dialog/360dialog, Twilio, etc.)
- **Chat platforms** (Crisp, Chatwoot, etc.)
- **Chatbot services** (Landbot, etc.)

It handles e-commerce flows: cart management, order processing, and payment integrations (PagarMe, Pedidos10).

**Important context**: This is a legacy codebase developed as a learning project. It has tight coupling between controllers and MongoDB and is used as a refactoring practice ground.

---

## Entry Points

| File | Purpose |
|------|---------|
| `server.ts` | HTTP server (Express 5) — REST API + Bull Board queue UI |
| `worker.ts` | BullMQ worker — async jobs with Redis-based distributed locking (Trafficlight) |
| `schedule-*.ts` | Maintenance scripts — backups, cart/chat resets, cleanup |

---

## Folder Structure

```
src/
├── app/
│   ├── controllers/     # Route handlers (bloated, tightly coupled to DB)
│   ├── models/          # Mongoose schemas (Contact, Licensee, Message, Cart, etc.)
│   ├── repositories/    # Partial abstraction layer over Mongoose models
│   ├── jobs/            # BullMQ job handlers (feature-flagged via env vars)
│   ├── plugins/         # Integration adapters
│   │   ├── messengers/  # WhatsApp providers (Dialog, Twilio, etc.)
│   │   ├── chats/       # Chat platforms (Crisp, Chatwoot, etc.)
│   │   ├── chatbots/    # Chatbot integrations (Landbot, etc.)
│   │   ├── carts/       # Cart formatting for different platforms
│   │   ├── payments/    # Payment gateways (PagarMe)
│   │   └── integrations/# External APIs (Pedidos10, Facebook)
│   ├── helpers/         # Utilities (phone normalization, emoji handling, fractional products)
│   ├── services/        # Business logic (limited usage due to controller bloat)
│   ├── routes/          # Express route definitions
│   └── websockets/      # Socket.io real-time updates
├── config/              # Database, Redis, Queue, HTTP server configs
└── setup/               # Test helpers (mongodb-memory-server, fixtures)
```

`client/` — React SPA with its own `package.json`.

---

## Module Aliases

Import via aliases configured in `package.json` (`_moduleAliases`) and `jest.config.mjs`:

`@models`, `@controllers`, `@helpers`, `@config`, `@plugins`, `@repositories`, `@queries`, `@reports`

Example: `import ChatMessage from '@models/ChatMessage'`

---

## Plugin Architecture

Each integration type (`messenger/chat/chatbot`) has a plugin directory. Plugins:
- Implement standard interfaces (e.g., `sendMessage`, `parseMessage`)
- Are selected at runtime based on `Licensee` config fields: `whatsappDefault`, `chatDefault`, `chatbotDefault`

---

## Message Flow

1. Webhook hits `/api/v1/{type}/message?token=LICENSEE_TOKEN`
2. Controller validates token, enqueues job to BullMQ
3. Worker acquires Trafficlight lock (contact or licensee scoped)
4. Job handler processes message, routes to other platforms
5. Follow-up jobs queued automatically (send replies, update chat state)
6. Lock released after job completion

---

## API Structure

### Resource API (`/resources/*`)
Admin endpoints — JWT auth via `x-access-token` header.
Resources: Users, Licensees, Contacts, Triggers, Templates, Messages.
See `API_DOCUMENTATION.md` for full reference.

### Integration API (`/api/v1/*`)
Webhook endpoints authenticated via `?token=LICENSEE_TOKEN`:
- `/chat/message`, `/chatbot/message`, `/messenger/message` — receive messages
- `/carts/*` — cart CRUD
- `/orders/*` — Pedidos10 integration
- `/backgroundjobs` — async job submission (e.g., PIX generation)

---

## Development Commands

```bash
# Backend
docker compose up -d          # Start MongoDB, Redis
cp .env.example .env
yarn dev                      # Server + worker (nodemon + docker)
yarn dev:server               # Server only
yarn dev:worker               # Worker only
yarn test                     # Jest (uses mongodb-memory-server)
yarn test:ci                  # CI mode with coverage
yarn linter                   # ESLint + Prettier
yarn typecheck                # tsc --noEmit (backend)

# Frontend
cd client
yarn start                    # Vite dev server at localhost:5173 (proxies to :5001)
yarn build
```

---

## Deployment (Heroku Procfile)

| Process | Description |
|---------|-------------|
| `web` | Single server process |
| `scaler` | Dynamic worker scaling by queue depth |
| `worker` x15 | Multiple worker processes for concurrency |

**Required env vars**: `MONGODB_URI`, `REDIS_URL`, `SECRET`, `AWS_*`, `PORT`

---

## Known Issues / Refactoring Goals

1. **Controller Bloat** — business logic mixed with routing, tightly coupled to Mongoose. Goal: extract use cases, introduce repositories consistently.
2. **Database Coupling** — direct Mongoose calls throughout, hard to test. Goal: abstract data layer behind repository interfaces.
3. **Type Coverage** — full TypeScript migration complete (`strict: true`); next step is replacing `any` with proper interfaces (see `type-backend` / `type-client` plans).
4. **Inconsistent Error Handling** — some routes throw, others return JSON errors.
5. **PDV Module** — point-of-sale code mixed in, should be extracted.

---

## Debugging Tips

- **Queue issues**: Bull Board at `http://localhost:5000/queue`
- **Lock timeouts**: adjust `JOB_LOCK_TTL_MS` (default 120s)
- **Message not routing**: verify Licensee config (`whatsappDefault`, `chatDefault`, etc.) and check job feature flags
- **Tests failing**: set `MONGOMS_DEBUG=0` to suppress mongodb-memory-server logs
