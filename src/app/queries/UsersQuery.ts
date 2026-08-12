import { IRepository } from '@repositories/repository'
import { IUser } from '../../types'

interface IUserQueryRepository extends IRepository<IUser> {
  findManyUsers(opts: { licensee?: string; expression?: string; page?: number; limit?: number }): Promise<IUser[]>
}

class UsersQuery {
  userRepository: IUserQueryRepository | undefined
  pageClause: number | undefined
  limitClause: number | undefined
  licenseeClause: string | undefined
  expressionClause: string | undefined

  constructor({ userRepository }: { userRepository?: IUserQueryRepository } = {}) {
    this.userRepository = userRepository
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

  async all(): Promise<IUser[]> {
    return await this.userRepository!.findManyUsers({
      licensee: this.licenseeClause,
      expression: this.expressionClause,
      page: this.pageClause,
      limit: this.limitClause,
    })
  }
}

export { UsersQuery }
