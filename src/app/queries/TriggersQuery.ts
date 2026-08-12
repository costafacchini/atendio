import { IRepository } from '@repositories/repository'
import { ITrigger } from '../../types'

interface ITriggerQueryRepository extends IRepository<ITrigger> {
  findManyTriggers(opts: {
    kind?: string
    licensee?: string
    expression?: string
    page?: number
    limit?: number
  }): Promise<ITrigger[]>
}

class TriggersQuery {
  triggerRepository: ITriggerQueryRepository | undefined
  pageClause: number | undefined
  limitClause: number | undefined
  kindClause: string | undefined
  licenseeClause: string | undefined
  expressionClause: string | undefined

  constructor({ triggerRepository }: { triggerRepository?: ITriggerQueryRepository } = {}) {
    this.triggerRepository = triggerRepository
  }

  page(value: number) {
    this.pageClause = value
  }

  limit(value: number) {
    this.limitClause = value
  }

  filterByKind(value: string) {
    this.kindClause = value
  }

  filterByLicensee(value: string) {
    this.licenseeClause = value
  }

  filterByExpression(value: string) {
    this.expressionClause = value
  }

  async all(): Promise<ITrigger[]> {
    return await this.triggerRepository!.findManyTriggers({
      kind: this.kindClause,
      licensee: this.licenseeClause,
      expression: this.expressionClause,
      page: this.pageClause,
      limit: this.limitClause,
    })
  }
}

export { TriggersQuery }
