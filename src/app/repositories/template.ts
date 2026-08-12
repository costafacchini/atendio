import { RepositoryMemory, PrismaRepository, matchesFilter, sortRecords } from './repository'
import { requireDependency } from '../helpers/RequireDependency'
import { ITemplate } from '../../types'
import { getPrismaClient } from '../../config/postgres'
import { tryGetActiveRepositories } from './activeState'

class TemplateRepositoryMemory extends RepositoryMemory<ITemplate> {
  async delete(params: any = {}) {
    const recordsToKeep = this.items.filter((item) => !matchesFilter(item, params ?? {}))
    this.items.splice(0, this.items.length, ...recordsToKeep)

    return await Promise.resolve({ acknowledged: true })
  }

  async findManyTemplates({
    licensee,
    expression,
    page,
    limit,
  }: {
    licensee?: string
    expression?: string
    page?: number
    limit?: number
  }): Promise<ITemplate[]> {
    const params: any = {}
    if (licensee) params.licensee = licensee
    if (expression) {
      params.$or = [{ name: new RegExp(expression, 'i') }, { namespace: new RegExp(expression, 'i') }]
    }
    const records = (await this.find(params)) as any[]
    const sorted = sortRecords(records, { createdAt: 'asc' })
    if (page == null || limit == null) return sorted
    return sorted.slice((page - 1) * limit, page * limit)
  }
}

async function destroyAllTemplates({ templateRepository }: { templateRepository?: any } = {}) {
  await requireDependency(templateRepository, 'templateRepository', 'destroyAllTemplates').delete({})
}

async function createTemplate(fields: any, { templateRepository }: { templateRepository?: any } = {}) {
  return await requireDependency(templateRepository, 'templateRepository', 'createTemplate').create(fields)
}

class PrismaTemplateDatabaseRepository extends PrismaRepository<ITemplate> {
  delegate() {
    return getPrismaClient().template
  }
  protected fkFields() {
    return ['licensee']
  }

  async findManyTemplates({
    licensee,
    expression,
    page,
    limit,
  }: {
    licensee?: string
    expression?: string
    page?: number
    limit?: number
  }): Promise<ITemplate[]> {
    const where: any = {}
    if (licensee) where.licensee = parseInt(String(licensee), 10)
    if (expression) {
      where.OR = [
        { name: { contains: expression, mode: 'insensitive' } },
        { namespace: { contains: expression, mode: 'insensitive' } },
      ]
    }
    const query: any = { where, orderBy: { createdAt: 'asc' } }
    if (page != null && limit != null) {
      query.skip = (page - 1) * limit
      query.take = limit
    }
    const records = await getPrismaClient().template.findMany(query)
    return this.fromDBMany(records) as ITemplate[]
  }
}

// Factory for backward-compatibility with specs that call new TemplateRepositoryDatabase().
// Returns the active shared instance when memory repos are installed.

function TemplateRepositoryDatabase(this: any): any {
  const active = tryGetActiveRepositories()
  if (active) return active.templateRepository
  return new TemplateRepositoryMemory()
}
TemplateRepositoryDatabase.prototype = TemplateRepositoryMemory.prototype

export {
  TemplateRepositoryDatabase,
  TemplateRepositoryMemory,
  PrismaTemplateDatabaseRepository,
  createTemplate,
  destroyAllTemplates,
}
