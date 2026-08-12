import { IRepository } from '@repositories/repository'
import { IMessage } from '../../types'

interface IMessageSendedRepository extends IRepository<IMessage> {
  findSended(startDate: Date | string, endDate: Date | string, licenseeId: string): Promise<IMessage[]>
}

class MessagesSendedQuery {
  startDate: Date | string
  endDate: Date | string
  licenseeId: string
  messageRepository: IMessageSendedRepository | undefined

  constructor(
    startDate: Date | string,
    endDate: Date | string,
    licenseeId: string,
    { messageRepository }: { messageRepository?: IMessageSendedRepository } = {},
  ) {
    this.startDate = startDate
    this.endDate = endDate
    this.licenseeId = licenseeId
    this.messageRepository = messageRepository
  }

  async all(): Promise<IMessage[]> {
    return await this.messageRepository!.findSended(this.startDate, this.endDate, this.licenseeId)
  }
}

export { MessagesSendedQuery }
