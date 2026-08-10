import { QueryBuilder, IQueryableRepository } from './QueryBuilder'
import { stringifyObjectIds } from '@repositories/repository'
import { ILicensee } from '../../types'

class LicenseesQuery {
  licenseeRepository: IQueryableRepository<ILicensee> | undefined
  pageClause: number | undefined
  limitClause: number | undefined
  chatClause: string | undefined
  chatbotClause: string | undefined
  whatsappClause: string | undefined
  expressionClause: string | undefined
  expressionActive: boolean | undefined
  excludedIdsClause: string[] | undefined

  constructor({ licenseeRepository }: { licenseeRepository?: IQueryableRepository<ILicensee> } = {}) {
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
    const query = new QueryBuilder(this.licenseeRepository!.model())
    query.sortBy('createdAt', 1)

    if (this.pageClause) query.page(this.pageClause, this.limitClause!)

    if (this.chatClause) query.filterBy('chatDefault', this.chatClause)

    if (this.chatbotClause) query.filterBy('chatbotDefault', this.chatbotClause)

    if (this.whatsappClause) query.filterBy('whatsappDefault', this.whatsappClause)

    if (this.expressionActive) query.filterBy('active', this.expressionActive)

    if (this.expressionClause) query.filterByExpression(['name', 'email', 'phone'], this.expressionClause)

    const chainedQuery = query.getQuery()

    if (this.excludedIdsClause?.length) {
      chainedQuery.where('_id').nin(this.excludedIdsClause)
    }

    const docs = await chainedQuery.lean().exec()
    return docs.map(stringifyObjectIds)
  }
}

export { LicenseesQuery }
