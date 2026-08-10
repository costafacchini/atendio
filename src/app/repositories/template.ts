import { RepositoryMemory, PrismaRepository, matchesFilter } from './repository'
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
