import { IRepository } from '@repositories/repository'
import { ILicensee } from '../../types'

interface ILicenseeQueryRepository extends IRepository<ILicensee> {
  findManyLicensees(opts: {
    chatDefault?: string
    chatbotDefault?: string
    whatsappDefault?: string
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
  chatClause: string | undefined
  chatbotClause: string | undefined
  whatsappClause: string | undefined
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

  filterByChatDefault(value: string) {
    this.chatClause = value
  }

  filterByChatbotDefault(value: string) {
    this.chatbotClause = value
  }

  filterByWhatsappDefault(value: string) {
    this.whatsappClause = value
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
      chatDefault: this.chatClause,
      chatbotDefault: this.chatbotClause,
      whatsappDefault: this.whatsappClause,
      active: this.expressionActive ? true : undefined,
      expression: this.expressionClause,
      excludedIds: this.excludedIdsClause,
      page: this.pageClause,
      limit: this.limitClause,
    })
  }
}

export { LicenseesQuery }
