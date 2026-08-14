import { ChatsBase } from './Base'
import { emitToLicensee } from '../../services/socketEmitter'
import { ILicensee, IContact, IRoom } from '../../../types'
import { IRepository } from '../../repositories/repository'

class LocalChat extends ChatsBase {
  _roomRepository: IRepository<any>

  constructor(
    licensee: ILicensee,
    { roomRepository, ...dependencies }: { roomRepository?: IRepository<any>; [key: string]: unknown } = {},
  ) {
    super(licensee, dependencies)
    this._roomRepository = roomRepository!
  }

  action(_responseBody?: any) {
    return 'send-message-to-messenger'
  }

  async sendMessage(messageId: string): Promise<void> {
    const message = await this.messageRepository.findFirst({ _id: messageId })
    if (!message) return
    const contactId = (message.contact as any)?._id ?? String(message.contact)
    const messageContact = (await this.contactRepository.findFirst({ _id: contactId })) as IContact
    if (!messageContact) return

    const roomRepo = this._roomRepository as any
    let room = await roomRepo.findOpenForContact(messageContact._id)
    if (!room) {
      room = await this._roomRepository.create({
        contact: messageContact._id,
        status: 'pending',
        department: message.department,
      })
    }

    message.room = room._id
    message.sended = true
    await this.messageRepository.save(message)

    emitToLicensee(this.licensee._id, 'new-room-message', {
      roomId: room._id.toString(),
      messageId: message._id.toString(),
      licenseeId: this.licensee._id.toString(),
      text: message.text ?? null,
      kind: message.kind,
      destination: message.destination,
      createdAt: message.createdAt instanceof Date ? message.createdAt.toISOString() : message.createdAt,
      sended: message.sended,
      contact: { id: messageContact._id?.toString(), name: messageContact.name },
    })
  }

  async parseMessage(body: any) {
    if (!body?.roomId || !body?.text) {
      this.messageParsed = null
      return
    }

    const room = await this._roomRepository.findFirst({ _id: body.roomId })
    if (!room || room.closed) {
      this.messageParsed = null
      return
    }

    const contact = await this.contactRepository.findFirst({ _id: room.contact })
    if (!contact) {
      this.messageParsed = null
      return
    }

    this.messageParsed = {
      contact,
      room,
      action: this.action(),
      messages: [{ kind: 'text', text: { body: body.text }, senderName: body.agentName ?? null }],
    }
  }

  async closeChat(messageId: any) {
    const message = await this.messageRepository.findFirst({ _id: messageId }, ['contact', 'room'])
    if (!message?.room) return []
    const messageRoom = message.room as IRoom

    const room = await this._roomRepository.findFirst({ _id: messageRoom._id })
    room.status = 'closed'
    await this._roomRepository.save(room)

    return []
  }
}

export { LocalChat }
