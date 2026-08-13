# Local Smoke Workflow

**Last Updated**: 2026-04-23
**Context**: Running the app locally in a hybrid smoke topology before deploys, without browser E2E automation or real third-party provider side effects.

## Overview

This repo now has a hybrid smoke workflow:

- Docker runs Mongo, Redis, RabbitMQ, the Express app, the BullMQ worker, and local
  fake provider endpoints.
- The Vite frontend stays on the host for easy manual inspection.
- Smoke data is deterministic and recreated on every `smoke:start`.
- The smoke verifier drives the real webhook and queue pipeline, then checks the local
  provider doubles for the outbound side effects.

## Commands

1. Copy the smoke env file if you want local overrides:

```bash
cp .env.smoke.example .env.smoke
```

2. Start the smoke topology:

```bash
yarn smoke:start
```

3. Run the smoke verifier:

```bash
yarn smoke:check
```

4. Stop the topology:

```bash
yarn smoke:stop
```

## What `smoke:start` Does

- Starts `mongo`, `redis`, `rabbitmq`, `app`, `worker`, and `smoke-mocks` with:
  - `docker compose --env-file <resolved smoke env> -f docker-compose.smoke.yml up -d --build`
- Seeds smoke data inside the running `app` container
- Starts the Vite frontend on the host with `API_PROXY_TARGET` pointing at the exposed app port
- Writes the frontend PID to `tmp/smoke/frontend.pid`
- Writes frontend logs to `tmp/smoke/frontend.log`

## What `smoke:check` Verifies

- The host frontend responds with HTML
- `POST /login` succeeds with the seeded smoke admin
- `GET /resources/users/:email` succeeds with the issued JWT
- `POST /api/v1/messenger/message?token=...` is accepted and eventually causes an outbound Chatwoot send to be captured by the local mock
- `POST /api/v1/chat/message?token=...` is accepted and eventually causes an outbound YCloud send to be captured by the local mock

## Seeded Smoke Data

The smoke seed recreates:

- one super-admin user (credentials defined in the smoke seed script)
- one demo licensee using the fixed `chatwoot + ycloud` pair
- one contact with a prelinked Chatwoot contact id and source id
- one open room so the chat outbound path can send immediately
- two example messages
- one trigger
- one template
- one cart
- one backgroundjob

## Networking Notes

- `API_PROXY_TARGET` is host-facing and should usually stay `http://127.0.0.1:5001`
- `PORT` in the smoke env file is the host-facing app port; the containerized Express app
  still listens on port `5000`
- `MONGODB_URI`, `REDIS_URL`, `CLOUDAMQP_URL`, `SMOKE_CHAT_URL`, `SMOKE_MESSENGER_URL`, and `SMOKE_CHATBOT_URL` in the smoke env file are container-facing values used by `app` and `worker`
- The seeded licensee uses the container service URLs for Chatwoot and YCloud, not host localhost URLs
- The smoke env file explicitly pins `ENABLE_CHATS=true`, `ENABLE_MESSENGERS=true`,
  `DONT_SEND_MESSAGE_TO_CHAT=false`, and `DONT_SEND_MESSAGE_TO_MESSENGER=false` so the
  workflow does not inherit no-send flags from the repo root `.env`

## Local Provider Doubles

The smoke mocks live in `src/scripts/smoke/` and expose:

- Chatwoot-compatible capture on `http://127.0.0.1:3101`
- YCloud-compatible capture on `http://127.0.0.1:3102`
- Chatbot-compatible capture on `http://127.0.0.1:3103`

Each mock also exposes:

- `GET /_smoke/health`
- `GET /_smoke/state`
- `POST /_smoke/reset`

These endpoints are used by `smoke:check` to verify the queue-driven flows without
talking to any real provider.
