import { replace } from '../../helpers/Emoji'
import request from '../../services/request'
import { ChatsBase } from './Base'
import { logger } from '../../helpers/logger'
import { requireDependency } from '../../helpers/RequireDependency'
import { ILicensee, IContact, IRoom } from '../../../types'
import { IRepository } from '../../repositories/repository'
import { IMessageRepository } from '../../repositories/message'

const createVisitor = async (contact: any, token: any, url: any) => {
  const body = {
    visitor: {
      name: `${contact.name} - ${contact.number} - WhatsApp`,
      email: contact.email ? `${contact.email}` : `${contact.number}${contact.type}`,
      token: `${token}`,
    },
  }

  const response = await request.post(`${url}/api/v1/livechat/visitor`, { body })

  if (response.data.success !== true) {
    logger.error(`Não foi possível criar o visitante na Rocketchat ${JSON.stringify(response.data)}`)
  }

  return response.data.success === true
}

const createRoom = async (contact: any, token: any, url: any, roomRepository: any) => {
  const response = await request.get(`${url}/api/v1/livechat/room?token=${token}`)

  if (response.data.success !== true) {
    logger.error(`Não foi possível criar a sala na Rocketchat ${JSON.stringify(response.data)}`)
    return
  }

  const room = await roomRepository.create({
    roomId: response.data.room._id,
    contact: contact._id,
    token: token,
  })

  return room
}

const transferToDepartament = async (department: any, room: any, url: any) => {
  const body = {
    token: `${room.token}`,
    rid: room.roomId,
    department,
  }

  await request.post(`${url}/api/v1/livechat/room.transfer`, { body })
}

const postMessage = async (contact: any, message: any, room: any, url: any) => {
  const body = {
    token: `${room.token}`,
    rid: room.roomId,
    msg: formatMessage(message, contact),
  }

  return await request.post(`${url}/api/v1/livechat/message`, { body })
}

const formatMessage = (message: any, contact: any) => {
  let text = message.text
  if (message.kind === 'file') {
    text = message.url
  }

  return contact.type === '@c.us' ? text : `*${message.senderName}:*\n${text}`
}

class Rocketchat extends ChatsBase {
  _roomRepository: IRepository<any>

  constructor(
    licensee: ILicensee,
    {
      roomRepository,
      contactRepository,
      messageRepository,
      ...dependencies
    }: {
      roomRepository?: IRepository<any>
      contactRepository?: IRepository<any>
      messageRepository?: IMessageRepository
      [key: string]: unknown
    } = {},
  ) {
    super(licensee, { contactRepository, messageRepository, ...dependencies })
    this._roomRepository = roomRepository!
  }

  get roomRepository() {
    return requireDependency(this._roomRepository, 'roomRepository', this.constructor.name)
  }

  action(responseBody: any) {
    if (responseBody.type === 'LivechatSession') {
      return 'close-chat'
    } else {
      if (
        responseBody &&
        responseBody.messages &&
        responseBody.messages.find((message: any) => message.closingMessage)
      ) {
        return 'close-chat'
      } else {
        return 'send-message-to-messenger'
      }
    }
  }

  async parseMessage(responseBody: any): Promise<any> {
    if (!responseBody._id) {
      this.messageParsed = null
      return []
    }

    const room = await this.roomRepository.findFirst({ roomId: responseBody._id })
    if (!room) {
      this.messageParsed = null
      return
    }

    this.messageParsed = { room }
    this.messageParsed.contact = await this.findContact({ _id: room.contact._id })
    this.messageParsed.action = this.action(responseBody)
    this.messageParsed.messages = []
    for (const message of responseBody.messages) {
      const messageToSend: Record<string, any> = {}

      if (message.attachments) {
        messageToSend.kind = 'file'
        messageToSend.file = {
          text: replace(message.attachments[0].description),
          url: message.fileUpload.publicFilePath,
          fileName: message.attachments[0].title,
        }
      } else {
        messageToSend.kind = 'text'
        messageToSend.text = { body: message.msg }
      }

      this.messageParsed.messages.push(messageToSend)
    }
  }

  async transfer(messageId: any, url: any) {
    const messageToSend = await this.messageRepository.findFirst({ _id: messageId }, ['contact'])
    if (!messageToSend) return
    const messageContact = messageToSend.contact as IContact
    const contact = await this.contactRepository.findFirst({ _id: messageContact._id })
    if (!contact) return

    contact.talkingWithChatBot = false
    await this.contactRepository.save(contact)

    await this.sendMessage(messageId, url)
  }

  async sendMessage(messageId: string, url: string): Promise<void> {
    const messageToSend = await this.messageRepository.findFirst({ _id: messageId }, ['contact'])
    if (!messageToSend) return
    const messageContact = messageToSend.contact as IContact
    const openRoom = await this.roomRepository.findFirst({ contact: messageContact, closed: false })
    let room = openRoom

    if (!room) {
      const token = messageContact._id.toString()
      if ((await createVisitor(messageContact, token, url)) === true) {
        room = await createRoom(messageContact, token, url, this.roomRepository)
        if (!room) {
          return
        }
      } else {
        return
      }
    }

    if (messageToSend.departament && messageToSend.departament !== '') {
      await transferToDepartament(messageToSend.departament, room, url)
    }

    const response = await postMessage(messageContact, messageToSend, room, url)

    if (!messageToSend.room || (messageToSend.room as IRoom)._id !== room._id) messageToSend.room = room

    if (response.data.success === true) {
      messageToSend.sended = true
      await this.messageRepository.save(messageToSend)

      logger.info(`Mensagem ${messageToSend._id} enviada para Rocketchat com sucesso!`)
    } else {
      messageToSend.error = messageToSend.error
        ? `${messageToSend.error} | ${JSON.stringify(response.data)}`
        : JSON.stringify(response.data)
      if (messageToSend.error.includes('room-closed')) {
        room.closed = true
        room.closedAt = new Date()
        await this.roomRepository.save(room)
        messageToSend.room = undefined
      }
      await this.messageRepository.save(messageToSend)

      if (messageToSend.error.includes('room-closed')) {
        await this.sendMessage(messageToSend._id, url)
      } else {
        logger.error(`Mensagem ${messageToSend._id} não enviada para a Rocketchat ${JSON.stringify(response.data)}`)
      }
    }
  }

  async closeChat(messageId: any) {
    const message = await this.messageRepository.findFirst({ _id: messageId }, ['contact', 'licensee', 'room'])
    if (!message) return []
    const licensee = message.licensee as ILicensee
    const messageContact = message.contact as IContact
    const messageRoom = message.room as IRoom

    const contact = await this.contactRepository.findFirst({ _id: messageContact._id })
    if (!contact) return []

    const room = await this.roomRepository.findFirst({ _id: messageRoom._id })
    const messages = []

    room.closed = true
    room.closedAt = new Date()
    await this.roomRepository.save(room)

    if (licensee.messageOnCloseChat) {
      const messagesCloseChat = await this.messageRepository.createInteractiveMessages({
        kind: 'text',
        text: licensee.messageOnCloseChat,
        licensee,
        contact,
        destination: 'to-messenger',
      })

      messages.push(...messagesCloseChat)
    }

    if (licensee.useChatbot) {
      contact.talkingWithChatBot = true
      await this.contactRepository.save(contact)
    }

    return messages
  }
}

export { Rocketchat }
