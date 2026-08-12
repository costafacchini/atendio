import { IRepository } from '@repositories/repository'
import { IContact } from '../../types'

interface IContactQueryRepository extends IRepository<IContact> {
  findManyContacts(opts: {
    type?: string
    talkingWithChatBot?: boolean
    licensee?: string
    expression?: string
    startDate?: Date | string
    endDate?: Date | string
    isGroup?: boolean
    updatedAtStart?: Date | string
    updatedAtEnd?: Date | string
    page?: number
    limit?: number
  }): Promise<IContact[]>
}

class ContactsQuery {
  contactRepository: IContactQueryRepository | undefined
  pageClause: number | undefined
  limitClause: number | undefined
  typeClause: string | undefined
  talkingWithChatbotClause: boolean | undefined
  licenseeClause: string | undefined
  expressionClause: string | undefined
  startDateClause: Date | string | undefined
  endDateClause: Date | string | undefined
  isGroupClause: boolean | undefined
  updatedAtStartClause: Date | string | undefined
  updatedAtEndClause: Date | string | undefined

  constructor({ contactRepository }: { contactRepository?: IContactQueryRepository } = {}) {
    this.contactRepository = contactRepository
  }

  page(value: number) {
    this.pageClause = value
  }

  limit(value: number) {
    this.limitClause = value
  }

  filterByType(value: string) {
    this.typeClause = value
  }

  filterByTalkingWithChatbot(value: boolean) {
    this.talkingWithChatbotClause = value
  }

  filterByLicensee(value: string) {
    this.licenseeClause = value
  }

  filterByExpression(value: string) {
    this.expressionClause = value
  }

  filterIntervalWaStartChat(startDate: Date | string, endDate: Date | string) {
    this.startDateClause = startDate
    this.endDateClause = endDate
  }

  filterWaStartChatLessThan(endDate: Date | string) {
    this.endDateClause = endDate
  }

  filterByIsGroup(value: boolean) {
    this.isGroupClause = value
  }

  filterByUpdatedAtStart(value: Date | string) {
    this.updatedAtStartClause = value
  }

  filterByUpdatedAtEnd(value: Date | string) {
    this.updatedAtEndClause = value
  }

  async all(): Promise<IContact[]> {
    return await this.contactRepository!.findManyContacts({
      type: this.typeClause,
      talkingWithChatBot: this.talkingWithChatbotClause,
      licensee: this.licenseeClause,
      expression: this.expressionClause,
      startDate: this.startDateClause,
      endDate: this.endDateClause,
      isGroup: this.isGroupClause,
      updatedAtStart: this.updatedAtStartClause,
      updatedAtEnd: this.updatedAtEndClause,
      page: this.pageClause,
      limit: this.limitClause,
    })
  }
}

export { ContactsQuery }
