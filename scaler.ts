import 'dotenv/config'
import { queueServer } from './src/config/queue.js'
import { createScalerProvider } from './src/app/scalers/ScalerFactory.js'

/**
 * Env vars required:
 * - REDIS_URL
 * - DEPLOY_PROVIDER: heroku | fly | ecs | fake
 *
 * Provider-specific vars (see docs/kb/features/deploy-*.md):
 *   heroku: HEROKU_APP_NAME, HEROKU_TOKEN, WORKER_TYPES
 *   fly:    FLY_APP_NAME, FLY_API_TOKEN, FLY_WORKER_MACHINE_IDS
 *   ecs:    ECS_CLUSTER, ECS_SERVICE, AWS_DEFAULT_REGION
 *
 * Optional tuning vars:
 * - SCALER_INTERVAL_MS  (default 60000)
 * - WORKER_MAX          (default inferred from provider config)
 * - BACKLOG_STEP        (default 100)
 * - UP_COOLDOWN_MS      (default 60000)
 * - DOWN_COOLDOWN_MS    (default 900000)
 * - TRANSFORM_WEIGHT    (default 0.8)
 * - EXTERNAL_WEIGHT     (default 1.0)
 * - TZ                  (default America/Sao_Paulo)
 */

const { REDIS_URL } = process.env

if (!REDIS_URL) {
  console.error('Missing required env var: REDIS_URL')
  process.exit(1)
}

const provider = createScalerProvider()

const INTERVAL_MS = Number(process.env.SCALER_INTERVAL_MS ?? 60_000)
const TIMEZONE = process.env.TZ ?? 'America/Sao_Paulo'
const WORKER_MAX = Number(process.env.WORKER_MAX ?? 15)
const BACKLOG_STEP = Number(process.env.BACKLOG_STEP ?? 100)
const UP_COOLDOWN_MS = Number(process.env.UP_COOLDOWN_MS ?? 60_000)
const DOWN_COOLDOWN_MS = Number(process.env.DOWN_COOLDOWN_MS ?? 900_000)
const TRANSFORM_WEIGHT = Number(process.env.TRANSFORM_WEIGHT ?? 0.8)
const EXTERNAL_WEIGHT = Number(process.env.EXTERNAL_WEIGHT ?? 1.0)

const TRANSFORM_QUEUES = ['chat-message', 'close-chat', 'messenger-message']
const EXTERNAL_QUEUES = ['send-message-to-chat', 'send-message-to-messenger']

// ---------- BullMQ backlog ----------

async function getQueueBacklog(queue: any) {
  const counts = await queue.getJobCounts('wait', 'delayed', 'prioritized', 'paused')
  return (counts.wait ?? 0) + (counts.delayed ?? 0) + (counts.prioritized ?? 0) + (counts.paused ?? 0)
}

async function getAllBacklogs() {
  const queuesWithWorkerEnabled = queueServer.queues.filter((queue) => queue.workerEnabled == true)
  const pairs = await Promise.all(
    queuesWithWorkerEnabled.map(async (queue) => [queue.name, await getQueueBacklog(queue.bull)]),
  )
  return Object.fromEntries(pairs)
}

// ---------- Scoring ----------

function computeScore(backlogs: Record<string, number>) {
  const transform = TRANSFORM_QUEUES.reduce((sum, q) => sum + (backlogs[q] ?? 0), 0)
  const external = EXTERNAL_QUEUES.reduce((sum, q) => sum + (backlogs[q] ?? 0), 0)
  const score = external * EXTERNAL_WEIGHT + transform * TRANSFORM_WEIGHT
  return { transform, external, score }
}

function getCurrentWorkerMin() {
  const formatter = new Intl.DateTimeFormat('en-US', { hour: '2-digit', hour12: false, timeZone: TIMEZONE })
  const hour = Number(formatter.format(new Date()))
  const isNight = hour >= 21 || hour < 5
  return isNight ? 0 : 1
}

function desiredWorkers(score: number, workerMin: number) {
  const desired = workerMin + Math.floor(score / BACKLOG_STEP)
  return Math.max(workerMin, Math.min(WORKER_MAX, desired))
}

// ---------- Cooldown + step-down ----------

let lastScaleAt = 0

function canScale(now: number, current: number, next: number) {
  if (next === current) return false
  const cooldown = next > current ? UP_COOLDOWN_MS : DOWN_COOLDOWN_MS
  return now - lastScaleAt >= cooldown
}

function applyStepDown(current: number, desired: number) {
  return desired < current ? current - 1 : desired
}

// ---------- Tick ----------

async function tick() {
  const startedAt = Date.now()

  const backlogs = await getAllBacklogs()
  const { transform, external, score } = computeScore(backlogs)

  const workerMin = getCurrentWorkerMin()
  const desired = desiredWorkers(score, workerMin)
  const current = await provider.getCurrentWorkerCount()
  const now = Date.now()

  const target = applyStepDown(current, desired)

  const meta = {
    current,
    desired,
    target,
    workerMin,
    score,
    external,
    transform,
    backlogs,
    elapsed_ms: now - startedAt,
  }

  if (!canScale(now, current, target)) {
    console.log('[scaler] no-scale (cooldown or no change)', JSON.stringify(meta))
    return
  }

  await provider.setWorkerCount(target)
  lastScaleAt = now

  console.log('[scaler] scaled', JSON.stringify(meta))
}

// ---------- Main ----------

async function main() {
  console.log(
    `[scaler] started provider=${process.env.DEPLOY_PROVIDER ?? 'fake'} interval=${INTERVAL_MS}ms timezone=${TIMEZONE} max=${WORKER_MAX} step=${BACKLOG_STEP}`,
  )

  while (true) {
    try {
      await tick()
    } catch (err) {
      console.error('[scaler] error', err)
    }
    await new Promise((r) => setTimeout(r, INTERVAL_MS))
  }
}

main()
