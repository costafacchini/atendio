import('../app/repositories/index')

import createError from 'http-errors'
import express from 'express'
import { createAdapter } from '@socket.io/redis-adapter'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import { logger as appLogger } from '../app/helpers/logger'
import { connect } from './database'
import { enableCors } from './cors'
import { routes } from './routes'
import { helmetConfig } from './security'
import http from 'http'
import { Server } from 'socket.io'
import { redisConnection } from './redis'
import Rollbar from 'rollbar'
import { frontendDistDir, widgetDistDir } from './frontend-paths'
import { expressErrorHandler } from '@appsignal/nodejs'
import jwt from 'jsonwebtoken'

const app = express()

app.set('trust proxy', 1)

app.use(helmet(helmetConfig() as any))

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: false }))
app.use(cookieParser())
app.use(logger('dev'))
connect()

app.use(express.static(frontendDistDir))
app.use(
  express.static(widgetDistDir, {
    setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
  }),
)

if (process.env.STORAGE_PROVIDER === 'local') {
  const localStoragePath = process.env.LOCAL_STORAGE_PATH ?? '/app/uploads'
  app.use('/uploads', express.static(localStoragePath))
}

enableCors(app)
routes(app)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404))
})

app.use(expressErrorHandler())

// error handler
if (process.env.ROLLBAR_ACCESS_TOKEN) {
  const rollbar = new Rollbar({
    accessToken: process.env.ROLLBAR_ACCESS_TOKEN,
    captureUncaught: true,
    captureUnhandledRejections: true,
  })

  app.use(rollbar.errorHandler())
} else {
  app.use(function (err: any, req: any, res: any, _next: any) {
    const status = err.status || 500
    appLogger.error('Unhandled error', err)
    res.status(status).json({ message: status < 500 ? err.message : 'Erro interno do servidor.' })
  })
}

const SECRET = process.env.SECRET as string

const LICENSEE_ID_REGEX = /^\d+$/

const server = http.createServer(app)

const io = new Server(server)

// Sub client must be a separate connection — subscribe mode blocks other commands
const subClient = redisConnection.duplicate()
io.adapter(createAdapter(redisConnection, subClient))

io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) return next(new Error('Authentication required'))
  jwt.verify(token, SECRET, (err: any) => {
    if (err) return next(new Error('Invalid token'))
    next()
  })
})

io.on('connection', (socket) => {
  socket.on('join-licensee', (licenseeId: string) => {
    if (typeof licenseeId === 'string' && LICENSEE_ID_REGEX.test(licenseeId)) {
      socket.join(`licensee:${licenseeId}`)
    }
  })
})

export { server, io }
