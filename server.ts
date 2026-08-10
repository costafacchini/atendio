import 'dotenv/config'
import './instrument'
import debug from 'debug'
import { server } from './src/config/http'
import('./src/app/websockets/index')

if (process.env.NODE_ENV === 'production') {
  import('newrelic')
}

const errorDebug = debug('atendio:server')

const PORT = process.env.PORT || '5000'

server.listen(PORT)
server.on('error', onError)

if (process.env.ENABLE_BAILEYS_SOCKET === 'true') {
  import('./src/app/runtime/dependencies').then(({ createRuntimeDependencies }) => {
    const { bootBaileysSocketSessions } = createRuntimeDependencies()
    bootBaileysSocketSessions().catch((err: any) => {
      console.error('Baileys boot: erro ao iniciar sockets', err)
    })
  })
}

server.on('listening', onListening)

function onError(error: any) {
  if (error.syscall !== 'listen') {
    throw error
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT

  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges')
      process.exit(1)
      break
    case 'EADDRINUSE':
      console.error(bind + ' is already in use')
      process.exit(1)
      break
    default:
      throw error
  }
}

function onListening() {
  const addr = server.address()
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'PORT ' + (addr as any).port
  errorDebug('Listening on ' + bind)
}
