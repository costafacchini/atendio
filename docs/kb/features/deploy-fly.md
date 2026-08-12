# Deploy — Fly.io

**Last Updated**: 2026-08-12
**Context**: Steps to deploy atendio on Fly.io with the multi-provider scaler.

> **Note**: The `FlyScaler` implementation has not been tested in a live Fly.io production environment.
> Treat this as a validated design; verify machine IDs and API behaviour in a staging app first.

---

## Prerequisites

- `flyctl` installed and authenticated (`fly auth login`)
- A Fly Postgres cluster or external PostgreSQL
- A Fly Redis (Upstash) instance or external Redis
- An S3 bucket for file uploads

---

## Architecture on Fly.io

On Fly.io, each process type from the Heroku `Procfile` maps to a separate Fly **machine**:

| Role | Machine |
|------|---------|
| `web` | Always-on machine running the Express API + SPA |
| `scaler` | Always-on machine running `tsx scaler.ts` |
| `worker` × N | Pre-created machines stopped/started by the scaler |

The `FlyScaler` uses the Fly Machines REST API to start/stop worker machines by ID.
Worker machine IDs are pre-created once and stored in `FLY_WORKER_MACHINE_IDS`.

---

## Required env vars

```bash
# Infrastructure
REDIS_URL=redis://...
DATABASE_URL=postgres://...

# Scaler
DEPLOY_PROVIDER=fly
FLY_APP_NAME=your-fly-app
FLY_API_TOKEN=...             # fly tokens create deploy
FLY_WORKER_MACHINE_IDS=machine-id-1,machine-id-2,...,machine-id-15

# App
SECRET=...
APP_URL=https://your-fly-app.fly.dev
NODE_ENV=production
WORKER_MAX=15
```

---

## Deploy steps

```bash
# 1. Create the Fly app
fly apps create your-fly-app

# 2. Provision Postgres
fly postgres create --name your-fly-app-db
fly postgres attach your-fly-app-db --app your-fly-app

# 3. Provision Redis (Upstash)
fly ext redis create --app your-fly-app

# 4. Set secrets
fly secrets set DEPLOY_PROVIDER=fly
fly secrets set FLY_APP_NAME=your-fly-app
fly secrets set FLY_API_TOKEN=$(fly tokens create deploy -a your-fly-app)
# (set remaining secrets)

# 5. Deploy web + scaler
fly deploy

# 6. Run migrations
fly ssh console --command "npx prisma migrate deploy"

# 7. Pre-create worker machines (repeat for each worker slot you need)
for i in $(seq 1 15); do
  fly machine create --app your-fly-app \
    --image registry.fly.io/your-fly-app:latest \
    --region gru \
    --vm-size shared-cpu-1x \
    --env "ROLE=worker" \
    --command "node --require source-map-support/register dist/worker.js"
done

# 8. Collect the machine IDs
fly machines list --app your-fly-app

# 9. Store IDs as a comma-separated secret
fly secrets set FLY_WORKER_MACHINE_IDS=id1,id2,...,id15
```

---

## fly.toml example

```toml
app = "your-fly-app"
primary_region = "gru"

[build]

[[services]]
  internal_port = 5000
  protocol = "tcp"

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [services.concurrency]
    hard_limit = 200
    soft_limit = 150

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"
```

---

## Scaler tuning

Same env vars as Heroku — see the `WORKER_MAX`, `BACKLOG_STEP`, `UP_COOLDOWN_MS` etc. listed in `deploy-heroku.md`.

The key difference: `WORKER_MAX` must equal the number of machine IDs in `FLY_WORKER_MACHINE_IDS`.

---

## Notes

- Fly machines take a few seconds to start; factor this into `UP_COOLDOWN_MS`.
- Worker machines should be stopped (not destroyed) when idle — the scaler calls `stop`, not `destroy`.
- The `start-combined.sh` script is for single-machine local use only; worker machines run `dist/worker.js` directly.
