import { IRepository } from '@repositories/repository'
import { ILicensee } from '../../types'

interface ILicenseeQueryRepository extends IRepository<ILicensee> {
  findManyLicensees(opts: {
    chatbotDefault?: string
    active?: boolean
    expression?: string
    excludedIds?: string[]
    page?: number
    limit?: number
  }): Promise<ILicensee[]>
}

class LicenseesQuery {
  licenseeRepository: ILicenseeQueryRepository | undefined
  pageClause: number | undefined
  limitClause: number | undefined
  chatbotClause: string | undefined
  expressionClause: string | undefined
  expressionActive: boolean | undefined
  excludedIdsClause: string[] | undefined

  constructor({ licenseeRepository }: { licenseeRepository?: ILicenseeQueryRepository } = {}) {
    this.licenseeRepository = licenseeRepository
  }

  page(value: number) {
    this.pageClause = value
  }

  limit(value: number) {
    this.limitClause = value
  }

  filterByChatbotDefault(value: string) {
    this.chatbotClause = value
  }

  filterByExpression(value: string) {
    this.expressionClause = value
  }

  filterByActive() {
    this.expressionActive = true
  }

  filterExcludeLicensees(ids: string[]) {
    this.excludedIdsClause = ids
  }

  async all(): Promise<ILicensee[]> {
    return await this.licenseeRepository!.findManyLicensees({
      chatbotDefault: this.chatbotClause,
      active: this.expressionActive ? true : undefined,
      expression: this.expressionClause,
      excludedIds: this.excludedIdsClause,
      page: this.pageClause,
      limit: this.limitClause,
    })
  }
}

export { LicenseesQuery }
