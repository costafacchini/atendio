import { RepositoryMemory, PrismaRepository } from './repository'
import { IWhatsappSession } from '../../types'
import { getPrismaClient } from '../../config/postgres'
import { tryGetActiveRepositories } from './activeState'

class WhatsappSessionRepositoryMemory extends RepositoryMemory<IWhatsappSession> {}

class PrismaWhatsappSessionDatabaseRepository extends PrismaRepository<IWhatsappSession> {
  delegate() {
    return getPrismaClient().whatsappSession
  }
}

// Factory for backward-compatibility with specs that call new WhatsappSessionRepositoryDatabase().
// Returns the active shared instance when memory repos are installed.

function WhatsappSessionRepositoryDatabase(this: any): any {
  const active = tryGetActiveRepositories()
  if (active) return active.whatsappSessionRepository
  return new WhatsappSessionRepositoryMemory()
}
WhatsappSessionRepositoryDatabase.prototype = WhatsappSessionRepositoryMemory.prototype

export { WhatsappSessionRepositoryDatabase, WhatsappSessionRepositoryMemory, PrismaWhatsappSessionDatabaseRepository }
