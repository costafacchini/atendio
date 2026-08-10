import { RepositoryMemory, PrismaRepository } from './repository'
import { IBody } from '../../types'
import { getPrismaClient } from '../../config/postgres'
import { tryGetActiveRepositories } from './activeState'

class BodyRepositoryMemory extends RepositoryMemory<IBody> {}

class PrismaBodyDatabaseRepository extends PrismaRepository<IBody> {
  delegate() {
    return getPrismaClient().body
  }
  protected fkFields() {
    return ['licensee', 'department', 'inbox']
  }
}

// Factory for backward-compatibility with specs that call new BodyRepositoryDatabase().
// Returns the active shared instance when memory repos are installed.

function BodyRepositoryDatabase(this: any): any {
  const active = tryGetActiveRepositories()
  if (active) return active.bodyRepository
  return new BodyRepositoryMemory()
}
BodyRepositoryDatabase.prototype = BodyRepositoryMemory.prototype

export { BodyRepositoryDatabase, BodyRepositoryMemory, PrismaBodyDatabaseRepository }
