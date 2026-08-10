// MongoDB has been removed from this project (Prisma/PostgreSQL is now the sole data store).
// This file is kept as a stub so that spec files that import mongoServer still compile.
// connect() and disconnect() are no-ops because all specs now use in-memory repositories.

class MongoServerTest {
  async connect() {
    // no-op: specs use RepositoryMemory — no database connection required
  }

  async disconnect() {
    // no-op
  }
}

export { MongoServerTest }
