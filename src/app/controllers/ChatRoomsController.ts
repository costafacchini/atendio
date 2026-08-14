import { Request, Response } from 'express'
import { IRepository } from '@repositories/repository'
import { IUser, IRoom, IContact } from '../../types'
import { IngestChatMessage } from '../usecases/webhooks/IngestChatMessage'

class ChatRoomsController {
  userRepository: IRepository<IUser>
  roomRepository: IRepository<IRoom>
  contactRepository: IRepository<IContact>
  ingestChatMessage: IngestChatMessage

  constructor({
    userRepository,
    roomRepository,
    contactRepository,
    ingestChatMessage,
  }: {
    userRepository?: IRepository<IUser>
    roomRepository?: IRepository<IRoom>
    contactRepository?: IRepository<IContact>
    ingestChatMessage?: IngestChatMessage
  } = {}) {
    this.userRepository = userRepository!
    this.roomRepository = roomRepository!
    this.contactRepository = contactRepository!
    this.ingestChatMessage = ingestChatMessage!

    this.replyToRoom = this.replyToRoom.bind(this)
  }

  async replyToRoom(req: Request, res: Response) {
    try {
      const { roomId } = req.params
      const { text } = req.body
      const agentId = req.userId

      const [user, room] = await Promise.all([
        this.userRepository.findFirst({ _id: agentId }),
        this.roomRepository.findFirst({ _id: roomId }),
      ])

      if (!room || room.closed) {
        return res.status(404).json({ message: 'Conversa não encontrada ou encerrada.' })
      }

      const contact = await this.contactRepository.findFirst({ _id: String((room as any).contact) })
      const licenseeId = (contact?.licensee as any)?._id ?? contact?.licensee

      const inboxId = (room as any).inbox ? String((room as any).inbox) : null
      const body = { roomId, text, agentId, agentName: user?.name ?? null }
      await this.ingestChatMessage.execute({ body, licenseeId, inboxId })

      return res.status(200).json({ message: 'Mensagem enviada.' })
    } catch {
      res.status(500).json({ message: 'Erro interno do servidor.' })
    }
  }
}

export { ChatRoomsController }
