# Deploy — Heroku

**Last Updated**: 2026-08-12
**Context**: Steps to deploy atendio on Heroku with the multi-provider scaler.

---

## Prerequisites

- Heroku CLI installed and logged in (`heroku login`)
- A PostgreSQL addon (Heroku Postgres or external)
- A Redis addon (Heroku Data for Redis or external)
- An S3 bucket for file uploads

---

## Process types

The `Procfile` defines the following process types:

| Type | Purpose |
|------|---------|
| `web` | Express API + serves the React SPA |
| `scaler` | Reads queue backlog, scales worker dynos up/down |
| `worker`–`worker15` | BullMQ workers (enabled/disabled by the scaler) |

The scaler targets Heroku using the Formation API. Each `workerN` type in `WORKER_TYPES` is a separate dyno type that the scaler sets to quantity `0` or `1`.

---

## Required env vars

```bash
# Infrastructure
REDIS_URL=redis://...
DATABASE_URL=postgres://...

# Scaler
DEPLOY_PROVIDER=heroku
HEROKU_APP_NAME=your-app-name
HEROKU_TOKEN=your-heroku-api-token   # heroku authorizations:create
WORKER_TYPES=worker,worker2,worker3,worker4,worker5,worker6,worker7,worker8,worker9,worker10,worker11,worker12,worker13,worker14,worker15

# App
SECRET=...
APP_URL=https://your-app.herokuapp.com
NODE_ENV=production
```

---

## Deploy steps

```bash
# 1. Create the app
heroku create your-app-name

# 2. Add addons
heroku addons:create heroku-postgresql:essential-0
heroku addons:create heroku-redis:mini

# 3. Set env vars
heroku config:set DEPLOY_PROVIDER=heroku
heroku config:set HEROKU_APP_NAME=your-app-name
heroku config:set HEROKU_TOKEN=$(heroku authorizations:create -d "scaler" --short)
heroku config:set WORKER_TYPES=worker,worker2,...,worker15
# (set remaining vars)

# 4. Deploy
git push heroku main

# 5. Run migrations
heroku run npx prisma migrate deploy

# 6. Scale initial dynos
heroku ps:scale web=1 scaler=1 worker=1
```

---

## Scaler tuning

| Env var | Default | Description |
|---------|---------|-------------|
| `WORKER_MAX` | 15 | Upper bound for active workers |
| `BACKLOG_STEP` | 100 | Jobs per queue needed to add one worker |
| `UP_COOLDOWN_MS` | 60000 | Min time between scale-up events |
| `DOWN_COOLDOWN_MS` | 900000 | Min time between scale-down events |
| `TRANSFORM_WEIGHT` | 0.8 | Score multiplier for transform queues |
| `EXTERNAL_WEIGHT` | 1.0 | Score multiplier for external queues |
| `TZ` | America/Sao_Paulo | Timezone for the nightly minimum |
| `SCALER_INTERVAL_MS` | 60000 | How often the scaler checks the queue |

---

## Notes

- Generate a Heroku token with `heroku authorizations:create -d "scaler" --short`.
- The scaler process must stay running — do not scale it to 0.
- The `release` phase in the `Procfile` runs `prisma migrate deploy` automatically on each deploy.
