import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const smokeDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(smokeDir, '../../..')
const smokeComposeFiles = Object.freeze([path.join(projectRoot, 'docker-compose.smoke.yml')])
const smokeFrontendPidFile = path.join(projectRoot, 'tmp', 'smoke', 'frontend.pid')
const smokeFrontendLogFile = path.join(projectRoot, 'tmp', 'smoke', 'frontend.log')

const DEFAULT_SMOKE_ENV = Object.freeze({
  appPort: 5001,
  clientPort: 5173,
  apiProxyTarget: 'http://127.0.0.1:5001',
  mongoUri: 'mongodb://root:pwk372ew@127.0.0.1:27017/atendio?authSource=admin',
  redisUrl: 'redis://127.0.0.1:6379',
  rabbitUrl: 'amqp://guest:guest@127.0.0.1:5672',
  licenseeName: 'Smoke Licensee',
  licenseeApiToken: 'smoke-licensee-token',
  chatProvider: 'chatwoot',
  chatUrl: 'http://127.0.0.1:3101/api/v1/',
  chatIdentifier: '1001',
  chatKey: 'smoke-chat-token',
  messengerProvider: 'ycloud',
  messengerUrl: 'http://127.0.0.1:3102',
  messengerToken: 'smoke-messenger-token',
  messengerPhone: '5511999999999',
  chatbotUrl: 'http://127.0.0.1:3103',
  chatbotToken: 'smoke-chatbot-token',
})

function readString(env, name, fallback) {
  return env[name] || fallback
}

function readFirstString(env, names, fallback) {
  for (const name of names) {
    if (env[name]) {
      return env[name]
    }
  }

  return fallback
}

function readNumber(env, name, fallback) {
  const value = env[name]
  if (!value) {
    return fallback
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

function withTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`
}

function withoutTrailingSlash(value) {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

function buildSmokeEnv(env = process.env) {
  const appPort = readNumber(env, 'SMOKE_APP_PORT', readNumber(env, 'PORT', DEFAULT_SMOKE_ENV.appPort))
  const clientPort = readNumber(env, 'SMOKE_CLIENT_PORT', readNumber(env, 'CLIENT_PORT', DEFAULT_SMOKE_ENV.clientPort))
  const apiProxyTarget = withoutTrailingSlash(
    readFirstString(env, ['API_PROXY_TARGET', 'VITE_API_PROXY_TARGET'], `http://127.0.0.1:${appPort}`),
  )

  return Object.freeze({
    appPort,
    clientPort,
    apiProxyTarget,
    mongoUri: readString(env, 'MONGODB_URI', DEFAULT_SMOKE_ENV.mongoUri),
    redisUrl: readString(env, 'REDIS_URL', DEFAULT_SMOKE_ENV.redisUrl),
    rabbitUrl: readString(env, 'CLOUDAMQP_URL', DEFAULT_SMOKE_ENV.rabbitUrl),
    licenseeName: readString(env, 'SMOKE_LICENSEE_NAME', DEFAULT_SMOKE_ENV.licenseeName),
    licenseeApiToken: readString(env, 'SMOKE_LICENSEE_API_TOKEN', DEFAULT_SMOKE_ENV.licenseeApiToken),
    chatProvider: readString(env, 'SMOKE_CHAT_PROVIDER', DEFAULT_SMOKE_ENV.chatProvider),
    chatUrl: withTrailingSlash(readString(env, 'SMOKE_CHAT_URL', DEFAULT_SMOKE_ENV.chatUrl)),
    chatIdentifier: readString(env, 'SMOKE_CHAT_IDENTIFIER', DEFAULT_SMOKE_ENV.chatIdentifier),
    chatKey: readString(env, 'SMOKE_CHAT_KEY', DEFAULT_SMOKE_ENV.chatKey),
    messengerProvider: readString(env, 'SMOKE_MESSENGER_PROVIDER', DEFAULT_SMOKE_ENV.messengerProvider),
    messengerUrl: withoutTrailingSlash(readString(env, 'SMOKE_MESSENGER_URL', DEFAULT_SMOKE_ENV.messengerUrl)),
    messengerToken: readString(env, 'SMOKE_MESSENGER_TOKEN', DEFAULT_SMOKE_ENV.messengerToken),
    messengerPhone: readString(env, 'SMOKE_MESSENGER_PHONE', DEFAULT_SMOKE_ENV.messengerPhone),
    chatbotUrl: withoutTrailingSlash(readString(env, 'SMOKE_CHATBOT_URL', DEFAULT_SMOKE_ENV.chatbotUrl)),
    chatbotToken: readString(env, 'SMOKE_CHATBOT_TOKEN', DEFAULT_SMOKE_ENV.chatbotToken),
  })
}

function resolveSmokeEnvFile(root = projectRoot) {
  const candidates = ['.env.smoke', '.env.smoke.example']

  for (const candidate of candidates) {
    const absolutePath = path.join(root, candidate)
    if (fs.existsSync(absolutePath)) {
      return absolutePath
    }
  }

  return path.join(root, '.env.smoke.example')
}

const smokeEnv = buildSmokeEnv()

export {
  DEFAULT_SMOKE_ENV,
  buildSmokeEnv,
  projectRoot,
  resolveSmokeEnvFile,
  smokeComposeFiles,
  smokeDir,
  smokeEnv,
  smokeFrontendLogFile,
  smokeFrontendPidFile,
}
