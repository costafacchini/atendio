import { connectPostgres } from './postgres'
import { logger } from '../app/helpers/logger'

async function connect() {
  try {
    await connectPostgres()
  } catch (err: any) {
    logger.error(`PostgreSQL connection failed: ${err.message}`)
    throw err
  }
}

export { connect }
