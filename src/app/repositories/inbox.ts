import { v4 as uuidv4 } from 'uuid'
import { RepositoryMemory, PrismaRepository } from './repository'
import { IInbox } from '../../types'
import { getPrismaClient } from '../../config/postgres'
import { tryGetActiveRepositories } from './activeState'

class InboxRepositoryMemory extends RepositoryMemory<IInbox> {}

class PrismaInboxDatabaseRepository extends PrismaRepository<IInbox> {
  delegate() {
    return getPrismaClient().inbox
  }
  protected fkFields() {
    return ['licensee']
  }

  async create(fields: Partial<IInbox> = {}): Promise<IInbox> {
    const withToken = (fields as any).inboxToken ? fields : { ...fields, inboxToken: uuidv4() }
    return await super.create(withToken)
  }
}

// Factory for backward-compatibility with specs that call new InboxRepositoryDatabase().
// Returns the active shared instance when memory repos are installed.

function InboxRepositoryDatabase(this: any): any {
  const active = tryGetActiveRepositories()
  if (active) return active.inboxRepository
  return new InboxRepositoryMemory()
}
InboxRepositoryDatabase.prototype = InboxRepositoryMemory.prototype

export { InboxRepositoryDatabase, InboxRepositoryMemory, PrismaInboxDatabaseRepository }
