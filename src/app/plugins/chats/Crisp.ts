import { isMidia } from '../../helpers/Files'
import { logger } from '../../helpers/logger'
import request from '../../services/request'

import mime from 'mime-types'
import { ChatsBase } from './Base'
import { requireDependency } from '../../helpers/RequireDependency'
import { ILicensee, IContact } from '../../../types'
import { IRepository } from '../../repositories/repository'
import { IMessageRepository } from '../../repositories/message'

const createSession = async (url: any, headers: any, contact: any, segments: any, roomRepository: any) => {
  const response = await request.post(`https://api.crisp.chat/v1/website/${url}/conversation`, { headers })

  if (response.status !== 201) {
    logger.error(`Não foi possível criar a sessão na Crisp ${JSON.stringify(response.data)}`)
    return
  } else {
    const room = await roomRepository.create({
      roomId: response.data.data.session_id,
      contact: contact._id,
    })

    await updateContact(url, headers, contact, response.data.data.session_id, segments)

    return room
  }
}

const updateContact = async (url: any, headers: any, contact: any, room: any, segments: any) => {
  const body: Record<string, any> = {
    nickname: `${contact.name} - ${contact.number} - WhatsApp`,
    email: contact.email ? `${contact.email}` : `${contact.number}${contact.type}`,
    phone: contact.number,
  }

  if (segments) {
    body.segments = segments.split(',')
  }

  await request.patch(`https://api.crisp.chat/v1/website/${url}/conversation/${room}/meta`, {
    headers,
    body,
  })
}

const updateSegments = async (url: any, headers: any, segments: any, room: any) => {
  const body = {
    segments: segments.split(','),
  }

  await request.patch(`https://api.crisp.chat/v1/website/${url}/conversation/${room.roomId}/meta`, {
    headers,
    body,
  })
}

const postMessage = async (url: any, headers: any, contact: any, message: any, room: any) => {
  const body: Record<string, any> = {
    from: 'user',
    origin: 'chat',
  }

  if (message.kind === 'text') {
    body.type = 'text'
    body.content = formatMessage(message, contact)
  }

  if (message.kind === 'file') {
    body.type = Crisp.messageType(message.url)

    const content: Record<string, any> = {
      name: message.fileName,
      url: message.url,
      type: mime.lookup(message.url),
    }

    if (body.type === 'audio') {
      content.duration = 60
    }

    body.content = content
  }

  const response = await request.post(`https://api.crisp.chat/v1/website/${url}/conversation/${room.roomId}/message`, {
    headers,
    body,
  })

  return response
}

const persistPostedMessage = async (messageRepository: any, message: any, response: any) => {
  if (response.data.error === false) {
    message.sended = true
    await messageRepository.save(message)

    logger.info(`Mensagem ${message._id} enviada para Crisp com sucesso!`)
  } else {
    message.error = `mensagem: ${JSON.stringify(response.data)}`
    await messageRepository.save(message)
    logger.error(
      `Mensagem ${message._id} não enviada para Crisp.
           status: ${response.status}
           mensagem: ${JSON.stringify(response.data)}`,
    )
  }

  return response.data.success === true
}

const formatMessage = (message: any, contact: any) => {
  const text = message.text

  return contact.type === '@c.us' ? text : `*${message.senderName}:*\n${text}`
}

class Crisp extends ChatsBase {
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
    if (
      responseBody.event === 'session:removed' ||
      (responseBody.event === 'message:received' && responseBody.data.content.namespace === 'state:resolved')
    ) {
      return 'close-chat'
    } else {
      return 'send-message-to-messenger'
    }
  }

  async parseMessage(responseBody: any) {
    if (responseBody.event !== 'session:removed' && responseBody.event !== 'message:received') {
      this.messageParsed = null
      return
    }

    const room = await this.roomRepository.findFirst({ roomId: responseBody.data.session_id })
    if (!room) {
      // room = await this.roomRepository.create({ roomId: responseBody.data.session_id, contact })
      this.messageParsed = null
      return
    }

    this.messageParsed = { room }
    this.messageParsed.contact = await this.findContact({ _id: room.contact._id })
    this.messageParsed.action = this.action(responseBody)

    const messageToSend: Record<string, any> = {}
    messageToSend.kind = responseBody.data.type
    if (responseBody.data.type === 'text') {
      messageToSend.text = { body: responseBody.data.content }
    } else if (responseBody.data.type === 'file') {
      messageToSend.kind = 'file'
      messageToSend.file = {
        fileName: responseBody.data.content.name,
        url: responseBody.data.content.url,
      }
    } else if (responseBody.data.type === 'audio') {
      messageToSend.kind = 'file'
      messageToSend.file = {
        fileName: responseBody.data.content.name || responseBody.data.content.url,
        url: responseBody.data.content.url,
      }
    }

    this.messageParsed.messages = [messageToSend]
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
    const basicToken = Buffer.from(`${this.inbox?.chatIdentifier}:${this.inbox?.chatKey}`).toString('base64')
    const headers = { Authorization: `Basic ${basicToken}`, 'X-Crisp-Tier': 'plugin' }
    const openRoom = await this.roomRepository.findFirst({ contact: messageContact, closed: false })
    let room = openRoom

    if (!room) {
      room = await createSession(url, headers, messageContact, messageToSend.departament, this.roomRepository)
      if (!room) {
        return
      }
    } else {
      if (messageToSend.departament) {
        await updateSegments(url, headers, messageToSend.departament, room)
      }
    }

    const response = await postMessage(url, headers, messageContact, messageToSend, room)
    await persistPostedMessage(this.messageRepository, messageToSend, response)
  }

  static messageType(fileUrl: any) {
    let type = 'file'
    if (isMidia(fileUrl)) {
      type = 'audio'
    }

    return type
  }

  async closeChat(messageId: any) {
    const message = await this.messageRepository.findFirst({ _id: messageId }, ['contact', 'licensee', 'room'])
    if (!message) return []
    const licensee = message.licensee as ILicensee
    const messageContact = message.contact as IContact

    const contact = await this.contactRepository.findFirst({ _id: messageContact._id })
    if (!contact) return []
    const messages = []

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

export { Crisp }
