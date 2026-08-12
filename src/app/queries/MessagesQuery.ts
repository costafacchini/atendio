import { IRepository } from '@repositories/repository'
import { IMessage } from '../../types'

interface IMessageQueryRepository extends IRepository<IMessage> {
  findManyMessages(opts: {
    createdAtStart?: Date | string
    createdAtEnd?: Date | string
    licensee?: string
    contact?: string
    kind?: string
    destination?: string
    sended?: boolean
    sortField?: string
    sortOrder?: number | string
    page?: number
    limit?: number
  }): Promise<IMessage[]>
  countManyMessages(opts: {
    createdAtStart?: Date | string
    createdAtEnd?: Date | string
    licensee?: string
    contact?: string
    kind?: string
    destination?: string
    sended?: boolean
  }): Promise<number>
}

interface SortClause {
  field: string
  order: number | string
}

class MessagesQuery {
  messageRepository: IMessageQueryRepository | undefined
  pageClause: number | undefined
  limitClause: number | undefined
  startDateClause: Date | string | undefined
  endDateClause: Date | string | undefined
  licenseeClause: string | undefined
  contactClause: string | undefined
  kindClause: string | undefined
  destinationClause: string | undefined
  sendedClause: boolean | undefined
  sortByClause: SortClause | undefined

  constructor({ messageRepository }: { messageRepository?: IMessageQueryRepository } = {}) {
    this.messageRepository = messageRepository
  }

  page(value: number) {
    this.pageClause = value
  }

  limit(value: number) {
    this.limitClause = value
  }

  filterByCreatedAt(startDate: Date | string, endDate: Date | string) {
    this.startDateClause = startDate
    this.endDateClause = endDate
  }

  filterByLicensee(value: string) {
    this.licenseeClause = value
  }

  filterByContact(value: string) {
    this.contactClause = value
  }

  filterByKind(value: string) {
    this.kindClause = value
  }

  filterByDestination(value: string) {
    this.destinationClause = value
  }

  filterBySended(value: boolean) {
    this.sendedClause = value
  }

  sortBy(field: string, order: number | string) {
    this.sortByClause = { field, order }
  }

  async all(): Promise<IMessage[]> {
    return await this.messageRepository!.findManyMessages({
      createdAtStart: this.startDateClause,
      createdAtEnd: this.endDateClause,
      licensee: this.licenseeClause,
      contact: this.contactClause,
      kind: this.kindClause,
      destination: this.destinationClause,
      sended: this.sendedClause,
      sortField: this.sortByClause?.field ?? 'createdAt',
      sortOrder: this.sortByClause?.order ?? -1,
      page: this.pageClause,
      limit: this.limitClause,
    })
  }

  async count(): Promise<number> {
    return await this.messageRepository!.countManyMessages({
      createdAtStart: this.startDateClause,
      createdAtEnd: this.endDateClause,
      licensee: this.licenseeClause,
      contact: this.contactClause,
      kind: this.kindClause,
      destination: this.destinationClause,
      sended: this.sendedClause,
    })
  }
}

export { MessagesQuery }
