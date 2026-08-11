import { NormalizePhone } from '../../helpers/NormalizePhone'
import request from '../../services/request'
import { MessengersBase } from './Base'
import { logger } from '../../helpers/logger'
import { ILicensee, IContact } from '../../../types'
import { IRepository } from '../../repositories/repository'

class Utalk extends MessengersBase {
  constructor(
    licensee: ILicensee,
    { messageRepository, ...dependencies }: { messageRepository?: IRepository<any>; [key: string]: unknown } = {},
  ) {
    super(licensee, { messageRepository, ...dependencies })
  }

  action(messageDestination: any) {
    if (messageDestination === 'to-chat') {
      return 'send-message-to-chat'
    } else {
      return 'send-message-to-chatbot'
    }
  }

  parseMessageStatus() {
    this.messageStatus = null
  }

  parseMessage(responseBody: any) {
    if (!responseBody.event) {
      this.messageData = null
      return
    }

    if (responseBody.event === 'ack' || responseBody.event === 'login') {
      this.messageData = null
      return
    }

    if (responseBody.event === 'chat' && responseBody['chat[type]'] !== 'chat' && !responseBody['caption']) {
      this.messageData = null
      return
    }

    if (responseBody.event === 'chat') {
      if (responseBody['chat[dir]'] === 'o') {
        this.messageData = null
        return
      }

      const chatNumber =
        responseBody['contact[server]'] === 'g.us'
          ? responseBody['contact[groupNumber]']
          : responseBody['contact[number]']
      const chatName =
        responseBody['contact[server]'] === 'g.us' ? responseBody['contact[groupName]'] : responseBody['contact[name]']

      this.messageData = {
        waId: null,
        sender: responseBody['contact[server]'] === 'g.us' ? responseBody['contact[name]'] : '',
        contact: {
          name: chatName,
          server: responseBody['contact[server]'],
          number: chatNumber,
          chatId: chatNumber + '@' + responseBody['contact[server]'],
        },
        kind: 'text',
        text: { body: responseBody['chat[type]'] === 'chat' ? responseBody['chat[body]'] : responseBody['caption'] },
      }
    }

    if (responseBody.event === 'file') {
      if (responseBody['dir'] === 'o') {
        this.messageData = null
        return
      }

      this.messageData = {
        waId: null,
        sender: responseBody['contact[server]'] === 'g.us' ? responseBody['contact[name]'] : '',
        contact: {
          name: responseBody['number'],
          server: '',
          number: responseBody['number'],
          chatId: responseBody['number'],
        },
        kind: 'file',
        file: {
          id: null,
          fileName: responseBody['fn'],
          fileBase64: responseBody['blob'],
        },
      }
    }
  }

  parseContactData(responseBody: any) {
    if (!responseBody.event || !['chat', 'file'].includes(responseBody.event)) {
      this.contactData = null
      return
    }

    if (responseBody.event === 'chat') {
      if (responseBody['chat[dir]'] === 'o' || !responseBody['contact[server]']) {
        this.contactData = null
        return
      }

      const chatNumber =
        responseBody['contact[server]'] === 'g.us'
          ? responseBody['contact[groupNumber]']
          : responseBody['contact[number]']
      const chatName =
        responseBody['contact[server]'] === 'g.us' ? responseBody['contact[groupName]'] : responseBody['contact[name]']

      const chatId = chatNumber + '@' + responseBody['contact[server]']
      const normalizePhone = new NormalizePhone(chatId)
      this.contactData = {
        name: chatName,
        server: responseBody['contact[server]'],
        number: normalizePhone.number,
        type: normalizePhone.type,
        waId: null,
      }
    }

    if (responseBody.event === 'file') {
      if (responseBody['dir'] === 'o' || !responseBody['number']) {
        this.contactData = null
        return
      }

      const normalizePhone = new NormalizePhone(responseBody['number'])
      this.contactData = {
        name: normalizePhone.number,
        server: '',
        number: normalizePhone.number,
        type: normalizePhone.type,
        waId: null,
      }
    }
  }

  contactWithDifferentData(contact: any) {
    return (
      this.contactData &&
      this.contactData.name &&
      contact.name !== this.contactData.name &&
      this.messageData &&
      this.messageData.kind !== 'file'
    )
  }

  shouldUpdateWaStartChat(_: any) {
    return false
  }

  async sendMessage(messageId: string, url: string, token: string): Promise<void> {
    const messageToSend = await this.messageRepository.findFirst({ _id: messageId }, ['contact'])
    if (!messageToSend) return
    const messageContact = messageToSend.contact as IContact

    const body: Record<string, any> = {
      cmd: 'chat',
      id: messageId,
      to: messageContact.number + messageContact.type,
      msg: messageToSend.text,
    }

    if (messageToSend.kind === 'file') {
      body.cmd = 'media'
      body.link = messageToSend.url
    }

    const response = await request.post(`${url}${token}/`, { body })

    if (!response.data.status) {
      messageToSend.sended = true
      await this.messageRepository.save(messageToSend)
      logger.info(`Mensagem ${messageId} enviada para Utalk com sucesso! ${JSON.stringify(response.data)}`)
    } else {
      messageToSend.error = JSON.stringify(response.data)
      await this.messageRepository.save(messageToSend)
      logger.error(`Mensagem ${messageId} não enviada para Utalk. ${JSON.stringify(response.data)}`)
    }
  }
}

export { Utalk }
