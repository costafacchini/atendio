import { IRepository } from '@repositories/repository'
import { ITemplate } from '../../types'

interface ITemplateQueryRepository extends IRepository<ITemplate> {
  findManyTemplates(opts: {
    licensee?: string
    expression?: string
    page?: number
    limit?: number
  }): Promise<ITemplate[]>
}

class TemplatesQuery {
  templateRepository: ITemplateQueryRepository | undefined
  pageClause: number | undefined
  limitClause: number | undefined
  licenseeClause: string | undefined
  expressionClause: string | undefined

  constructor({ templateRepository }: { templateRepository?: ITemplateQueryRepository } = {}) {
    this.templateRepository = templateRepository
  }

  page(value: number) {
    this.pageClause = value
  }

  limit(value: number) {
    this.limitClause = value
  }

  filterByLicensee(value: string) {
    this.licenseeClause = value
  }

  filterByExpression(value: string) {
    this.expressionClause = value
  }

  async all(): Promise<ITemplate[]> {
    return await this.templateRepository!.findManyTemplates({
      licensee: this.licenseeClause,
      expression: this.expressionClause,
      page: this.pageClause,
      limit: this.limitClause,
    })
  }
}

export { TemplatesQuery }
