# Environment Variables Reference

**Last Updated**: 2026-08-12
**Context**: Canonical reference for all environment variables consumed by the application.
Load this document when adding new env vars, auditing `.env.example`, or setting up a new environment.

---

## Core Application

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | — | Runtime mode. `production` enables secure cookies and disables debug output. |
| `PORT` | No | `5000` | Port the Express server listens on. |
| `SECRET` | Yes | — | JWT signing secret. Used to sign auth tokens and protect API routes. |
| `DEFAULT_USER` | Yes (first boot) | — | Email of the admin user created on first startup. |
| `DEFAULT_PASSWORD` | Yes (first boot) | — | Password of the admin user created on first startup. |

---

## Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string. Format: `postgresql://user:pass@host:port/db?schema=public` |
| `RUN_POSTGRES_TESTS` | No | — | Set to `1` to enable integration tests that require a live Postgres connection. |
| `MONGODB_URI` | No | — | MongoDB connection string. Only required by the backup service (`Backup.ts`). |

---

## Redis

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | Yes | — | Redis connection URL. Used by BullMQ queues and Socket.IO adapter. |
| `REDIS_TLS_URL` | No | — | TLS Redis URL (e.g. Heroku Redis). Takes precedence over `REDIS_URL` when set. |
| `RUN_REDIS_TESTS` | No | — | Set to `1` to enable integration tests that require a live Redis connection. |

---

## Storage

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STORAGE_PROVIDER` | No | `s3` | File storage backend. `local` writes to disk; `s3` uploads to AWS S3. |
| `LOCAL_STORAGE_PATH` | No | `/app/uploads` | Absolute path for local file storage. Only used when `STORAGE_PROVIDER=local`. |
| `APP_URL` | No | `http://localhost:5001` | Base URL used by `LocalStorage` to build public file URLs. |
| `AWS_ACCESS_KEY_ID` | No* | — | AWS credentials for S3 and the backup service. *Required when `STORAGE_PROVIDER=s3` or `ENABLE_BACKUPS=true`. |
| `AWS_SECRET_ACCESS_KEY` | No* | — | AWS credentials. See `AWS_ACCESS_KEY_ID`. |
| `AWS_DEFAULT_REGION` | No | `us-east-1` | AWS region for S3 client and ECS scaler. |
| `AWS_BUCKET_NAME` | No* | — | S3 bucket name for file uploads. *Required when `STORAGE_PROVIDER=s3`. |

---

## Feature Flags

All flags are disabled unless explicitly set to `'true'`.

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_MESSENGERS` | `false` | Enables messenger jobs (WhatsApp, Telegram, etc.) in the worker. |
| `ENABLE_CHATS` | `false` | Enables chat platform jobs (RocketChat, etc.) in the worker. |
| `ENABLE_CHATBOTS` | `false` | Enables chatbot jobs in the worker. |
| `ENABLE_BACKUPS` | `false` | Enables the scheduled MongoDB backup job. |
| `ENABLE_RESET_JOBS` | `false` | Enables scheduled job reset/maintenance tasks. |
| `ENABLE_BAILEYS_SOCKET` | `false` | Enables Baileys (WhatsApp) socket endpoints in the API. |
| `DONT_SEND_MESSAGE_TO_CHAT` | `false` | Disables outbound messages to chat platforms (dry-run mode for chats). |
| `DONT_SEND_MESSAGE_TO_MESSENGER` | `false` | Disables outbound messages to messenger platforms (dry-run mode for messengers). |

---

## Job Queue / Worker

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JOB_LOCK_TTL_MS` | No | `120000` | How long a job lock is held before expiring (Trafficlight). |
| `JOB_LOCK_RETRY_DELAY_MS` | No | `100` | Delay between lock acquisition retries (Trafficlight). |

---

## Scaler

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEPLOY_PROVIDER` | No | `fake` | Selects the scaler provider. One of: `heroku`, `fly`, `ecs`, `fake`. |
| `WORKER_MAX` | No | `15` | Maximum number of concurrent worker processes the scaler will activate. |
| `BACKLOG_STEP` | No | `100` | Number of queued jobs per additional worker. e.g. 200 jobs → 2 extra workers at step 100. |
| `SCALER_INTERVAL_MS` | No | `60000` | How often (ms) the scaler reads the queue and evaluates scaling. |
| `UP_COOLDOWN_MS` | No | `60000` | Minimum time (ms) between scale-up events. |
| `DOWN_COOLDOWN_MS` | No | `900000` | Minimum time (ms) between scale-down events (15 min default). |
| `TRANSFORM_WEIGHT` | No | `0.8` | Score multiplier for transform queues (`chat-message`, `close-chat`, `messenger-message`). |
| `EXTERNAL_WEIGHT` | No | `1.0` | Score multiplier for external queues (`send-message-to-chat`, `send-message-to-messenger`). |
| `TZ` | No | `America/Sao_Paulo` | Timezone used to determine nightly worker minimum (0 workers between 21h–05h). |

### Scaler — Heroku provider (`DEPLOY_PROVIDER=heroku`)

| Variable | Required | Description |
|----------|----------|-------------|
| `HEROKU_APP_NAME` | Yes | The Heroku application name. |
| `HEROKU_TOKEN` | Yes | Heroku API token with formation write access. Generate with `heroku authorizations:create`. |
| `WORKER_TYPES` | Yes | Comma-separated list of Heroku process types managed by the scaler. e.g. `worker,worker2,...,worker15`. |

### Scaler — Fly.io provider (`DEPLOY_PROVIDER=fly`)

| Variable | Required | Description |
|----------|----------|-------------|
| `FLY_APP_NAME` | Yes | The Fly.io application name. |
| `FLY_API_TOKEN` | Yes | Fly deploy token. Generate with `fly tokens create deploy`. |
| `FLY_WORKER_MACHINE_IDS` | Yes | Comma-separated list of pre-created Fly machine IDs for worker processes. |

### Scaler — AWS ECS provider (`DEPLOY_PROVIDER=ecs`)

| Variable | Required | Description |
|----------|----------|-------------|
| `ECS_CLUSTER` | Yes | ECS cluster name (e.g. `atendio-cluster`). |
| `ECS_SERVICE` | Yes | ECS service name for workers (e.g. `atendio-worker`). |
| `AWS_DEFAULT_REGION` | No | AWS region. Shared with the S3 storage config. Defaults to `us-east-1`. |

---

## Observability / Monitoring

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOG_LEVEL` | No | `info` | Logger verbosity. One of: `debug`, `info`, `warn`, `error`, `fatal`. |
| `ROLLBAR_ACCESS_TOKEN` | No | — | Rollbar server-side token. Error reporting is disabled when unset. |
| `NEW_RELIC_LICENSE_KEY` | No | — | New Relic license key. APM is disabled when unset. |
| `APPSIGNAL_PUSH_API_KEY` | No | — | AppSignal push key. Read by the AppSignal agent automatically from the environment. |
| `SENTRY_DSN` | No | — | Sentry DSN. Error reporting and `captureException` are disabled when unset. |

---

## Frontend / Vite (client)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `API_PROXY_TARGET` | No | `http://127.0.0.1:5001` | Vite dev server proxy target for `/login` and `/resources`. Local dev only. |
| `SKIP_PREFLIGHT_CHECK` | No | — | Set to `true` on Heroku to suppress CRA preflight. Likely a legacy leftover. |

---

## Notes

- All boolean feature flags are compared as strings: `=== 'true'` or `== 'true'`. Set them to the string `'true'`, not `1`.
- `REDIS_TLS_URL` takes precedence over `REDIS_URL` in `src/config/redis.ts` — if both are set, TLS wins.
- Scaler provider vars are only validated at startup when the matching `DEPLOY_PROVIDER` is selected. Missing vars for an inactive provider are silently ignored.
