import { IRepository } from '@repositories/repository'
import { IMessage } from '../../types'

interface IMessageFailedRepository extends IRepository<IMessage> {
  findFailed(startDate: Date | string, endDate: Date | string, licenseeId: string): Promise<IMessage[]>
}

class MessagesFailedQuery {
  startDate: Date | string
  endDate: Date | string
  licenseeId: string
  messageRepository: IMessageFailedRepository | undefined

  constructor(
    startDate: Date | string,
    endDate: Date | string,
    licenseeId: string,
    { messageRepository }: { messageRepository?: IMessageFailedRepository } = {},
  ) {
    this.startDate = startDate
    this.endDate = endDate
    this.licenseeId = licenseeId
    this.messageRepository = messageRepository
  }

  async all(): Promise<IMessage[]> {
    return await this.messageRepository!.findFailed(this.startDate, this.endDate, this.licenseeId)
  }
}

export { MessagesFailedQuery }
