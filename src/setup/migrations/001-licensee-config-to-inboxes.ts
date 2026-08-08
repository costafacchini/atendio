// This migration has been superseded by the MongoDB → PostgreSQL migration (2026-08-08).
// MongoDB and all Mongoose models have been removed. Inbox data now lives in PostgreSQL
// and is managed through PrismaInboxDatabaseRepository.
//
// This file is kept as a historical record. It is safe to delete.

export async function migrate(): Promise<void> {
  // no-op: migration complete
}
