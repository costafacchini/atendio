# atend.io

atend.io is an integration hub for WhatsApp, chat platforms, and chatbots.
It receives inbound webhooks, persists the raw payloads, processes them through BullMQ
workers, and routes outbound messages to the configured provider plugins.

## Current Status

This is an active refactoring codebase. The backend and frontend still run locally, and
the repo now also includes a scripted smoke workflow for pre-deploy verification.

Main runtime pieces:

- Express API in [server.ts](server.ts)
- BullMQ worker in [worker.ts](worker.ts)
- React + Vite frontend in [client](client)
- MongoDB, Redis, and RabbitMQ for local/dev infrastructure

## Stack

- Node.js `24.x` (`.tool-versions` currently pins `24.5.0`)
- TypeScript `5.x` (`strict: true` on both backend and client)
- Yarn `1.22.x`
- Express `5`
- Mongoose + MongoDB
- BullMQ + Redis
- React `19` + Vite
- Jest for backend tests
- Vitest for frontend tests

## Requirements

- `node` `24.x`
- `yarn`
- `docker` with `docker compose`
- `asdf` is optional, but the repo already includes `.tool-versions`

## Setup

1. Install dependencies:

```bash
yarn install
cd client && yarn install
```

2. Create the backend env file:

```bash
cp .env.example .env
```

3. Fill the required values in `.env`, especially:

- `SECRET`
- `DEFAULT_USER`
- `DEFAULT_PASSWORD`
- AWS variables if you need backup/storage flows

See [docs/kb/architecture/env-vars.md](docs/kb/architecture/env-vars.md) for a full reference of all environment variables.

## Local Development

### Backend + Worker

```bash
yarn dev
```

What this does:

- starts Docker infra through `docker compose up -d`
- runs the Express server with `nodemon`
- runs the worker with `nodemon`

If you only want one side:

```bash
yarn dev:server
yarn dev:worker
```

The production-style server entrypoint is:

```bash
yarn start
```

### Frontend

```bash
cd client
yarn start
```

Notes:

- the frontend uses Vite, not CRA
- Vite defaults to `http://127.0.0.1:5173`
- `/login` and `/resources` are proxied to `API_PROXY_TARGET`
- if `API_PROXY_TARGET` is unset, Vite falls back to `http://127.0.0.1:5001`

### Infra Only

If you want the supporting services without starting the app process through `yarn dev`:

```bash
docker compose up -d
```

This starts:

- `mongo`
- `mongo-express`
- `redis`
- `rabbitmq`

## Pre-Deploy Local Smoke Workflow

The repo includes a hybrid smoke workflow that runs the backend stack in Docker and the
frontend on the host, then verifies the core app flows without hitting real providers.

```bash
cp .env.smoke.example .env.smoke
yarn smoke:start
yarn smoke:check
yarn smoke:stop
```

What it verifies:

- frontend responds
- `POST /login` works
- authenticated `/resources` access works
- `messenger -> worker -> chat` flow works against local provider doubles
- `chat -> worker -> messenger` flow works against local provider doubles

See [docs/kb/features/local-smoke-workflow.md](docs/kb/features/local-smoke-workflow.md)
for the full topology and troubleshooting notes.

## Scripts

### Root Scripts

| Command | Purpose |
|---------|---------|
| `yarn start` | Start only the Express server |
| `yarn build` | Compile TypeScript (`tsc`), copy assets, install frontend deps, build Vite app |
| `yarn dev` | Run backend server and worker in parallel |
| `yarn dev:server` | Run only the backend server with Docker infra |
| `yarn dev:worker` | Run only the worker |
| `yarn typecheck` | Run `tsc --noEmit` on the backend tsconfig |
| `yarn test` | Run backend Jest tests without coverage |
| `yarn test:ci` | Run backend Jest tests with coverage collection |
| `yarn test:coverage` | Run backend Jest coverage locally |
| `yarn watch` | Run backend Jest in watch mode |
| `yarn linter` | Lint backend `.ts` files under `src/app`, `src/config`, and `src/setup` |
| `yarn smoke:start` | Start the smoke topology and seed demo data |
| `yarn smoke:check` | Verify the smoke flows end to end |
| `yarn smoke:stop` | Stop the smoke topology |

### Frontend Scripts

| Command | Purpose |
|---------|---------|
| `cd client && yarn start` | Start the Vite dev server |
| `cd client && yarn build` | Build the frontend |
| `cd client && yarn test` | Run frontend Vitest tests once |
| `cd client && yarn test:watch` | Run frontend Vitest in watch mode |

## Deployment

The scaler process supports multiple providers via the `DEPLOY_PROVIDER` env var.
Set it before starting the `scaler` process type.

| `DEPLOY_PROVIDER` | Description |
|-------------------|-------------|
| `heroku` | Heroku Formation API — scales dyno quantities per process type |
| `fly` | Fly.io Machines API — starts/stops pre-created worker machines |
| `ecs` | AWS ECS `UpdateService` — adjusts `desiredCount` on the worker service |
| `fake` (default) | No-op — logs scale decisions without calling any provider API |

Provider-specific setup:

- [Heroku](docs/kb/features/deploy-heroku.md)
- [Fly.io](docs/kb/features/deploy-fly.md)
- [AWS ECS](docs/kb/features/deploy-ecs.md)

## Architecture Notes

- Incoming provider webhooks hit `/api/v1/*`
- Controllers enqueue or persist the inbound payloads
- BullMQ workers process the domain flow asynchronously
- Plugins in `src/app/plugins` adapt each provider
- The admin/resource API lives under `/resources/*`

Related docs:

- [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- [docs/kb/architecture/project-overview.md](docs/kb/architecture/project-overview.md)
- [docs/kb/architecture/job-queue-system.md](docs/kb/architecture/job-queue-system.md)

## Repository Layout

```text
src/
  app/
    controllers/
    helpers/
    jobs/
    plugins/
    queries/
    repositories/
    routes/
    services/
  config/
  setup/
client/
```

## Backups

### Gzip

```bash
# Backup
mongodump --uri="{uri}" --gzip --out="{path}"

# Restore
mongorestore --uri="{uri}" --gzip --drop "{path}"
```

## Refactoring Themes

The main ongoing improvement areas in this repo are:

- reducing MongoDB coupling (target: migrate to PostgreSQL/Prisma)
- removing the PDV domain (cart, PagarMe, Pedidos10) before the DB migration
- tightening testability around queues and integrations
- cleaning up legacy plugins and unused code paths
- narrowing `any` types across backend and client (see `type-backend` / `type-client` plans)
