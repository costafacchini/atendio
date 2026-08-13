import request from '../../services/request'
import { ChatsBase } from './Base'
import { logger } from '../../helpers/logger'
import path from 'path'

import mime from 'mime-types'
import { requireDependency } from '../../helpers/RequireDependency'
import { ILicensee, IContact, IRoom } from '../../../types'
import { IRepository } from '../../repositories/repository'
import { IMessageRepository } from '../../repositories/message'

const searchContact = async (url: any, headers: any, contact: any, licensee: any, contactRepository: any) => {
  const response = await request.get(`${url}contacts/search?q=+${contact.number}`, { headers })

  if (response.status == 200 && response.data && response.data.payload && response.data.payload.length > 0) {
    const contactInbox = response.data.payload[0].contact_inboxes.find(
      (inbox: any) => inbox.inbox.id == licensee.chatIdentifier,
    )

    if (!contactInbox) {
      await contactRepository.update(contact._id, {
        chatwootId: response.data.payload[0].id,
      })

      return { sourceId: null, id: response.data.payload[0].id }
    }

    await contactRepository.update(contact._id, {
      chatwootId: response.data.payload[0].id,
      chatwootSourceId: contactInbox.source_id,
    })

    return { sourceId: contactInbox.source_id, id: response.data.payload[0].id }
  } else {
    return { sourceId: null, id: null }
  }
}

const createContact = async (url: any, headers: any, contact: any, licensee: any, contactRepository: any) => {
  const body = {
    name: contact.name,
    inbox_id: licensee.chatIdentifier,
    phone_number: `+${contact.number}`,
    email: contact.email,
    custom_attributes: {
      address: contact.address,
      address_number: contact.address_number,
      address_complement: contact.address_complement,
      neighborhood: contact.neighborhood,
      city: contact.city,
      cep: contact.cep,
      uf: contact.uf,
    },
  }

  //  TODO: implementar essa rota para criar o contato na inbox
  // https://chat.zibb.com.br/public/api/v1/inboxes/kawhk9sA6d58ohXRJ3AfPLe8/contacts
  // host + public/api/ + api version + /inboxes/ + inbox id + /contacts
  const response = await request.post(`${url}contacts`, { headers, body })

  if (!(response.status == 200)) {
    await contactRepository.update(contact._id, {
      chatwootId: null,
      chatwootSourceId: null,
    })

    logger.error('Chatwoot - erro: Não foi possível criar o contato na Chatwoot', response.data)
    return
  } else if (response.data?.payload?.contact_inbox) {
    await contactRepository.update(contact._id, {
      chatwootId: response.data.payload.contact.id,
      chatwootSourceId: response.data.payload.contact_inbox.source_id,
    })

    return response.data.payload.contact_inbox.source_id
  } else {
    return null
  }
}

const createConversation = async (url: any, headers: any, contact: any, inboxId: any, roomRepository: any) => {
  const body: Record<string, any> = {
    contact_id: contact.chatwootId,
    status: 'open',
  }

  if (contact.chatwootSourceId) {
    body.source_id = contact.chatwootSourceId
  } else {
    body.inbox_id = inboxId
  }

  const response = await request.post(`${url}conversations`, { headers, body })

  if (response.status !== 200) {
    logger.error('Chatwoot - erro: Não foi possível criar a conversa na Chatwoot', response.data)
    return
  } else {
    const room = await roomRepository.create({
      roomId: response.data.id,
      contact: contact._id,
    })

    return room
  }
}

const formatMessage = (message: any, contact: any) => {
  const text = message.text

  return contact.type === '@c.us' ? text : `*${message.senderName}:*\n${text}`
}

class Chatwoot extends ChatsBase {
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
    if (responseBody.event === 'conversation_status_changed' && responseBody.status === 'resolved') {
      return 'close-chat'
    } else {
      return 'send-message-to-messenger'
    }
  }

  async parseMessage(responseBody: any) {
    if (responseBody.event === 'conversation_status_changed' && responseBody.status === 'resolved') {
      if (!responseBody.contact_inbox?.contact_id) {
        this.messageParsed = null
        return
      }

      const contact = await this.findContact({
        licensee: this.licensee._id,
        chatwootId: responseBody.contact_inbox.contact_id,
      })
      if (!contact) {
        this.messageParsed = null
        return
      }

      let room = await this.roomRepository.findFirst({ roomId: responseBody.id })
      if (!room) {
        this.messageParsed = null
        return
      }

      this.messageParsed = { room }
      this.messageParsed.contact = contact
      this.messageParsed.action = this.action(responseBody)
      this.messageParsed.messages = []
      return
    }

    if (
      responseBody.event !== 'message_created' ||
      responseBody.message_type !== 'outgoing' ||
      responseBody.private == true
    ) {
      this.messageParsed = null
      return
    }

    const rawContactId =
      responseBody.conversation?.contact_inbox?.contact_id ??
      (responseBody.conversation?.meta?.sender?.type === 'contact' ? responseBody.conversation.meta.sender.id : null)

    const chatwootContactId = rawContactId != null ? String(rawContactId) : null

    if (!chatwootContactId) {
      this.messageParsed = null
      return
    }

    const contact = await this.findContact({
      licensee: this.licensee._id,
      chatwootId: chatwootContactId,
    })
    if (!contact) {
      this.messageParsed = null
      return
    }

    let room = await this.roomRepository.findFirst({ roomId: String(responseBody.conversation.id) })
    if (!room) {
      await this.roomRepository.create({ roomId: responseBody.conversation.id, contact: contact })
      this.messageParsed = null
      return
    }

    this.messageParsed = { room }
    this.messageParsed.contact = contact
    this.messageParsed.action = this.action(responseBody)

    const messagesToSend: any[] = []

    let senderName = null
    if (this.licensee.useSenderName) {
      senderName = responseBody.conversation.meta?.assignee?.available_name
    }

    if (responseBody.content && responseBody.content_type === 'text') {
      const messageToSend: Record<string, any> = {}
      messageToSend.text = { body: responseBody.content }
      messageToSend.kind = 'text'
      if (senderName) {
        messageToSend.senderName = senderName
      }
      messagesToSend.push(messageToSend)

      this.messageParsed.messages = messagesToSend
      return
    }

    responseBody.conversation.messages?.forEach((message: any) => {
      if (message.content) {
        const messageToSend: Record<string, any> = {}
        messageToSend.text = { body: message.content }
        messageToSend.kind = 'text'
        if (senderName) {
          messageToSend.senderName = senderName
        }
        messagesToSend.push(messageToSend)
      }

      if (message.attachments?.length > 0) {
        message.attachments.forEach((attachment: any) => {
          const messageToSend: Record<string, any> = {}
          messageToSend.kind = 'file'
          messageToSend.file = {
            fileName: attachment.file_type,
            url: attachment.data_url,
          }
          messagesToSend.push(messageToSend)
        })
      }
    })

    this.messageParsed.messages = messagesToSend
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
    const headers = { api_access_token: this.inbox?.chatKey, 'Content-Type': 'application/json' }

    if (!messageContact.chatwootSourceId) {
      const { sourceId, id: chatwootId } = await searchContact(
        url,
        headers,
        messageContact,
        this.licensee,
        this.contactRepository,
      )
      if (!sourceId && !chatwootId) {
        messageContact.chatwootSourceId = await createContact(
          url,
          headers,
          messageContact,
          this.licensee,
          this.contactRepository,
        )
      } else {
        messageContact.chatwootSourceId = sourceId ?? undefined
        messageContact.chatwootId = chatwootId ?? undefined
      }
    }

    if (!messageContact.chatwootSourceId && !messageContact.chatwootId) {
      messageToSend.error = 'Chatwoot - erro: Não foi possível encontrar ou criar o contato na Chatwoot!'
      await this.messageRepository.save(messageToSend)

      return
    }

    const openRoom = await this.roomRepository.findFirst({ contact: messageContact, closed: false })
    let room = openRoom

    if (!room) {
      room = await createConversation(url, headers, messageContact, this.inbox?.chatIdentifier, this.roomRepository)
      if (!room) {
        messageToSend.error =
          'Chatwoot - erro: Não foi possível criar a conversa na Chatwoot! Você vai encontrar mais detalhes nos logs do servidor.'
        await this.messageRepository.save(messageToSend)

        return
      }
    }

    const sent = await this.postMessage(url, headers, messageContact, messageToSend, room)
    if (!sent) {
      const contact = await this.contactRepository.findFirst({ _id: messageContact._id })
      if (!contact) return
      const { sourceId, id: chatwootId } = await searchContact(
        url,
        headers,
        contact,
        this.licensee,
        this.contactRepository,
      )
      if (!sourceId && !chatwootId) {
        contact.chatwootSourceId = await createContact(url, headers, contact, this.licensee, this.contactRepository)
      } else {
        contact.chatwootSourceId = sourceId ?? undefined
        contact.chatwootId = chatwootId ?? undefined
      }

      room = await createConversation(url, headers, contact, this.inbox?.chatIdentifier, this.roomRepository)
      if (!room) {
        messageToSend.error =
          'Chatwoot - erro 2: Não foi possível criar a conversa na Chatwoot! Você vai encontrar mais detalhes nos logs do servidor.'
        await this.messageRepository.save(messageToSend)

        return
      }

      await this.postMessage(url, headers, contact, messageToSend, room)
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
    const messages = []

    const room = await this.roomRepository.findFirst({ roomId: messageRoom.roomId })
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

  async postMessage(url: any, headers: any, contact: any, message: any, room: any) {
    const requestOptions: Record<string, any> = {
      headers: { ...headers },
    }

    if (message.kind === 'text') {
      const body: Record<string, any> = {
        private: message.departament == 'outgoing' ? true : false,
        message_type: message.departament == 'outgoing' ? 'outgoing' : 'incoming',
        content_type: 'text',
        content: formatMessage(message, contact),
      }

      if (message.replyMessageId) {
        const replyMessage = await this.messageRepository.findFirst({ messageWaId: message.replyMessageId })

        if (replyMessage && replyMessage.messageChatId) {
          body.content_attributes = { in_reply_to: replyMessage.messageChatId }
        }
      }

      requestOptions.body = body
    } else if (message.kind === 'file') {
      const fileResponse = await request.download(message.url)

      if (!fileResponse || !fileResponse.data) {
        logger.error('Chatwoot - erro: Erro: fileResponse ou fileResponse.data é null/undefined', fileResponse)
        message.error = 'Chatwoot - erro: Erro ao baixar arquivo: resposta inválida'
        await this.messageRepository.save(message)
        return false
      }

      const fileName = path.basename(message.url.split('?')[0]) || 'file'
      const contentType =
        (fileResponse.headers && fileResponse.headers.get && fileResponse.headers.get('content-type')) ||
        mime.lookup(fileName) ||
        'application/octet-stream'

      const fileBuffer = Buffer.from(fileResponse.data)

      const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substr(2)
      requestOptions.headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`

      let multipartBodyStr = ''

      multipartBodyStr += `--${boundary}\r\n`
      multipartBodyStr += 'Content-Disposition: form-data; name="private"\r\n\r\n'
      if (message.departament == 'outgoing') {
        multipartBodyStr += 'true\r\n'
      } else {
        multipartBodyStr += 'false\r\n'
      }

      multipartBodyStr += `--${boundary}\r\n`
      multipartBodyStr += 'Content-Disposition: form-data; name="message_type"\r\n\r\n'
      if (message.departament == 'outgoing') {
        multipartBodyStr += 'outgoing\r\n'
      } else {
        multipartBodyStr += 'incoming\r\n'
      }

      multipartBodyStr += `--${boundary}\r\n`
      multipartBodyStr += `Content-Disposition: form-data; name="attachments[]"; filename="${fileName}"\r\n`
      multipartBodyStr += `Content-Type: ${contentType}\r\n\r\n`

      if (message.replyMessageId) {
        const replyMessage = await this.messageRepository.findFirst({ messageWaId: message.replyMessageId })

        if (replyMessage && replyMessage.messageChatId) {
          multipartBodyStr += `--${boundary}\r\n`
          multipartBodyStr += 'Content-Disposition: form-data; name="content_attributes"\r\n\r\n'
          multipartBodyStr += `${JSON.stringify({ in_reply_to: replyMessage.messageChatId })}\r\n`
        }
      }

      const headerBuffer = Buffer.from(multipartBodyStr, 'utf8')
      const footerBuffer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')

      requestOptions.body = Buffer.concat([headerBuffer, fileBuffer, footerBuffer])
    } else {
      const body: Record<string, any> = {
        private: false,
        message_type: 'incoming',
        content_type: 'form',
      }

      if (message.replyMessageId) {
        body.content_attributes = { in_reply_to: message.replyMessageId }
      }

      requestOptions.body = body
    }

    const response = await request.post(`${url}conversations/${room.roomId}/messages`, requestOptions)

    if (response.status === 200) {
      message.sended = true
      message.messageChatId = response.data?.id
      const serializedPayload = JSON.stringify(response.data)
      if (serializedPayload.length <= 1_048_576) {
        message.payload = serializedPayload
      }
      await this.messageRepository.save(message)

      logger.info(`Chatwoot: Mensagem ${message._id} enviada para Chatwoot com sucesso!`)
      return true
    } else {
      message.error = `mensagem: ${JSON.stringify(response.data)}`
      await this.messageRepository.save(message)
      if (response.data.error === 'Resource could not be found') {
        const roomSaved = await this.roomRepository.findFirst({ roomId: room.roomId })
        roomSaved.closed = true
        roomSaved.closedAt = new Date()
        await this.roomRepository.save(roomSaved)

        await this.contactRepository.update(contact._id, {
          chatwootSourceId: undefined,
          chatwootId: undefined,
        })

        return false
      }
      logger.error(
        `Chatwoot - erro: Mensagem ${message._id} não enviada para Chatwoot.
           status: ${response.status}`,
      )
      return true
    }
  }
}

export { Chatwoot }
