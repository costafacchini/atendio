// One-shot bulk sync: copies all Licensee documents from MongoDB to PostgreSQL.
// Run with: npx tsx src/scripts/sync-licensee.ts
// Safe to re-run — uses upsert on mongo_id.
import { connect as connectMongo } from '../config/mongo'
import { connectPostgres, disconnectPostgres } from '../config/postgres'
import { LicenseeRepositoryDatabase } from '../app/repositories/licensee'
import { PrismaLicenseeDatabaseRepository } from '../app/repositories/licensee'
import { logger } from '../app/helpers/logger'
import mongoose from 'mongoose'

async function main() {
  await connectMongo()
  await connectPostgres()

  const mongo = new LicenseeRepositoryDatabase()
  const pg = new PrismaLicenseeDatabaseRepository()

  const licensees = await mongo.find({})
  logger.info(`Syncing ${licensees.length} licensees to PostgreSQL`)

  let synced = 0
  let failed = 0

  for (const licensee of licensees) {
    try {
      await pg.save(licensee)
      synced++
    } catch (err: any) {
      logger.error(`Failed to sync licensee ${(licensee as any)._id}: ${err.message}`)
      failed++
    }
  }

  logger.info(`Done — synced: ${synced}, failed: ${failed}`)

  await mongoose.disconnect()
  await disconnectPostgres()
}

main().catch((err) => {
  logger.error(`sync-licensee failed: ${err.message}`)
  process.exit(1)
})
