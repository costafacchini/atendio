import { PrismaClient } from '../../generated/prisma/client'
import { logger } from '../app/helpers/logger'

let prisma: PrismaClient | null = null

function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

async function connectPostgres(): Promise<void> {
  const client = getPrismaClient()
  await client.$connect()
  logger.info('PostgreSQL connected')
}

async function disconnectPostgres(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
}

export { getPrismaClient, connectPostgres, disconnectPostgres }
