import { RepositoryMemory, PrismaRepository, sortRecords } from './repository'
import _ from 'lodash'
import { requireDependency } from '../helpers/RequireDependency'
import { ITrigger } from '../../types'
import { getPrismaClient } from '../../config/postgres'
import { tryGetActiveRepositories } from './activeState'

class TriggerRepositoryMemory extends RepositoryMemory<ITrigger> {
  async find(params = {}, orderOrRelations = {}) {
    if (Array.isArray(orderOrRelations)) {
      return await super.find(params, orderOrRelations)
    }

    const records = await super.find(params)

    if (_.isEmpty(orderOrRelations)) {
      return records
    }

    return sortRecords(records, orderOrRelations)
  }
}

async function createTrigger(fields: any, { triggerRepository }: { triggerRepository?: any } = {}) {
  return await requireDependency(triggerRepository, 'triggerRepository', 'createTrigger').create(fields)
}

async function getAllTriggerBy(filters: any, order: any = {}, { triggerRepository }: { triggerRepository?: any } = {}) {
  return await requireDependency(triggerRepository, 'triggerRepository', 'getAllTriggerBy').find(filters, order)
}

class PrismaTriggerDatabaseRepository extends PrismaRepository<ITrigger> {
  delegate() {
    return getPrismaClient().trigger
  }
}

// Factory for backward-compatibility with specs that call new TriggerRepositoryDatabase().
// Returns the active shared instance when memory repos are installed.

function TriggerRepositoryDatabase(this: any): any {
  const active = tryGetActiveRepositories()
  if (active) return active.triggerRepository
  return new TriggerRepositoryMemory()
}
TriggerRepositoryDatabase.prototype = TriggerRepositoryMemory.prototype

export {
  TriggerRepositoryDatabase,
  TriggerRepositoryMemory,
  PrismaTriggerDatabaseRepository,
  createTrigger,
  getAllTriggerBy,
}
