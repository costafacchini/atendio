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

  async findManyTriggers({
    kind,
    licensee,
    expression,
    page,
    limit,
  }: {
    kind?: string
    licensee?: string
    expression?: string
    page?: number
    limit?: number
  }): Promise<ITrigger[]> {
    const params: any = {}
    if (kind) params.triggerKind = kind
    if (licensee) params.licensee = licensee
    if (expression) {
      const fields = ['name', 'expression', 'catalogMulti', 'catalogSingle', 'textReplyButton', 'messagesList', 'text']
      params.$or = fields.map((field) => ({ [field]: new RegExp(expression, 'i') }))
    }
    // Call RepositoryMemory.prototype.find directly to bypass TriggerRepositoryMemory.find's custom signature
    const records = (await RepositoryMemory.prototype.find.call(this, params)) as any[]
    const sorted = sortRecords(records, { createdAt: 'asc' })
    if (page == null || limit == null) return sorted
    return sorted.slice((page - 1) * limit, page * limit)
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

  protected fkFields() {
    return ['licensee']
  }

  async findManyTriggers({
    kind,
    licensee,
    expression,
    page,
    limit,
  }: {
    kind?: string
    licensee?: string
    expression?: string
    page?: number
    limit?: number
  }): Promise<ITrigger[]> {
    const where: any = {}
    if (kind) where.triggerKind = kind
    if (licensee) where.licensee = parseInt(String(licensee), 10)
    if (expression) {
      const fields = ['name', 'expression', 'catalogMulti', 'catalogSingle', 'textReplyButton', 'messagesList', 'text']
      where.OR = fields.map((field) => ({ [field]: { contains: expression, mode: 'insensitive' } }))
    }
    const query: any = { where, orderBy: { createdAt: 'asc' } }
    if (page != null && limit != null) {
      query.skip = (page - 1) * limit
      query.take = limit
    }
    const records = await getPrismaClient().trigger.findMany(query)
    return this.fromDBMany(records) as unknown as ITrigger[]
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
