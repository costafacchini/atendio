import { NormalizePhone } from '../../helpers/NormalizePhone'
import request from '../../services/request'
import { logger } from '../../helpers/logger'
import { isPhoto, isVideo, isMidia, isVoice } from '../../helpers/Files'
import { MessengersBase } from './Base'
import { requireDependency } from '../../helpers/RequireDependency'
import { ILicensee, IContact, ITemplate } from '../../../types'
import { IRepository } from '../../repositories/repository'

const getTemplates = async (url: any, token: any) => {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  try {
    const response = await request.get(`${url}/templates?limit=20&page=1`, { headers })
    return response.data.templates
  } catch (error) {
    logger.error('Pabbly - erro: Erro ao buscar templates Pabbly', error)
    return []
  }
}

const parseTemplates = (pabblyTemplates: any, licenseeId: any) => {
  const templates: any[] = []

  for (const template of pabblyTemplates || []) {
    const templateValues: Record<string, any> = {
      name: template.name,
      // namespace: template.namespace,
      licensee: licenseeId,
      language: template.language,
      active: template.status.toUpperCase() === 'APPROVED',
      category: template.category,
      officialTemplateId: template.waTemplateId,
      wabaId: template.waTemplateId,
      headerParams: [],
      bodyParams: [],
      footerParams: [],
    }

    if (template.components) {
      template.components.forEach((component: any) => {
        const type = component.type.toLowerCase()

        if (component.format) {
          templateValues[`${type}Params`].push({ format: component.format })
        } else if (component.text) {
          const regex = /\{\{([0-9]*)\}\}/g
          const matches = component.text.match(regex)
          if (matches) {
            matches.forEach((match: any) => {
              const number = match.replace(/\D/g, '')
              templateValues[`${type}Params`].push({ number, format: 'text' })
            })
          }
        }
      })
    }

    templates.push(templateValues)
  }

  return templates
}

const parseComponents = (template: any, parameters: any) => {
  const components: any[] = []
  let paramCounter = 1

  if (template.headerParams.length > 0) {
    const header: any[] = []
    template.headerParams.forEach((param: any, index: any) => {
      header.push(parseComponentParam(param, parameters[index + paramCounter]))
    })
    components.push({
      type: 'header',
      parameters: header,
    })
    paramCounter += template.headerParams.length
  }

  if (template.bodyParams.length > 0) {
    const body: any[] = []
    template.bodyParams.forEach((param: any, index: any) => {
      body.push(parseComponentParam(param, parameters[index + paramCounter]))
    })
    components.push({
      type: 'body',
      parameters: body,
    })
    paramCounter += template.bodyParams.length
  }

  if (template.footerParams.length > 0) {
    const footer: any[] = []
    template.footerParams.forEach((param: any, index: any) => {
      footer.push(parseComponentParam(param, parameters[index + paramCounter]))
    })
    components.push({
      type: 'footer',
      parameters: footer,
    })
  }

  return components
}

const parseComponentParam = (param: any, value: any) => {
  if (param.format?.toUpperCase() === 'IMAGE') {
    return {
      type: 'image',
      image: {
        link: value.replace('{{', '').replace('}}', ''),
      },
    }
  }
  if (param.format?.toUpperCase() === 'TEXT' || param.format === 'text') {
    return {
      type: 'text',
      text: value.replace('{{', '').replace('}}', ''),
    }
  }
  return {
    type: 'text',
    text: value.replace('{{', '').replace('}}', ''),
  }
}

class Pabbly extends MessengersBase {
  _templateRepository: IRepository<ITemplate>
  _parseText: (text: string, contact: IContact) => string

  constructor(
    licensee: ILicensee,
    {
      templateRepository,
      messageRepository,
      parseText,
      ...dependencies
    }: {
      templateRepository?: IRepository<ITemplate>
      messageRepository?: IRepository<any>
      parseText?: (text: string, contact: IContact) => string
      [key: string]: unknown
    } = {},
  ) {
    super(licensee, { messageRepository, ...dependencies })
    this._templateRepository = templateRepository!
    this._parseText = parseText!
  }

  get templateRepository() {
    return requireDependency(this._templateRepository, 'templateRepository', this.constructor.name)
  }

  get parseText() {
    return requireDependency(this._parseText, 'parseText', this.constructor.name)
  }

  action(messageDestination: any) {
    if (messageDestination === 'to-chat') {
      return 'send-message-to-chat'
    } else if (messageDestination === 'to-messenger') {
      return 'send-message-to-messenger'
    } else {
      return 'send-message-to-chatbot'
    }
  }

  parseMessageStatus(_: any) {
    this.messageStatus = null
  }

  parseMessage(responseBody: any) {
    if (!responseBody.data || !['smb_message_echoes', 'message_received'].includes(responseBody.data.name)) {
      this.messageData = null
      return
    }

    const message = responseBody.data.event_data

    if (
      message.type === 'sticker' ||
      message.type === 'ephemeral' ||
      message.type === 'reaction' ||
      message.type === 'contacts' ||
      message.type === 'unsupported' ||
      message.type === 'system' ||
      message.type === 'button' ||
      message.type === 'interactive'
    ) {
      this.messageData = null
      return
    }

    if (this.messageData) {
      this.messageData.kind = message.type
      this.messageData.waId = message.id
    } else {
      this.messageData = {
        kind: message.type,
        waId: message.id,
      }
    }

    if (message.context && message.context.id) {
      this.messageData.replyMessageId = message.context.id
    }

    switch (message.type) {
      case 'text':
        this.messageData.text = { body: message.text?.body || '' }
        break

      case 'image':
        this.messageData.kind = 'file'
        this.messageData.file = {
          id: message.image?.id,
          fileName: message.image?.sha256,
          caption: message.image?.caption,
          fileBase64: null,
        }
        break

      case 'video':
        this.messageData.kind = 'file'
        this.messageData.file = {
          id: message.video?.id,
          fileName: message.video?.sha256,
          caption: message.video?.caption,
          fileBase64: null,
        }
        break

      case 'voice':
        this.messageData.kind = 'file'
        this.messageData.file = {
          id: message.voice?.id,
          fileName: message.voice?.sha256,
          caption: message.voice?.caption,
          fileBase64: null,
        }
        break

      case 'audio':
        this.messageData.kind = 'file'
        this.messageData.file = {
          id: message.audio?.id,
          fileName: message.audio?.sha256,
          caption: message.audio?.caption,
          fileBase64: null,
        }
        break

      case 'document':
        this.messageData.kind = 'file'
        this.messageData.file = {
          id: message.document?.id,
          fileName: message.document?.filename,
          caption: message.document?.caption,
          fileBase64: null,
        }
        break

      case 'location':
        this.messageData.kind = 'location'
        this.messageData.latitude = message.location?.latitude
        this.messageData.longitude = message.location?.longitude
        break

      default:
        this.messageData = null
    }
  }

  parseContactData(responseBody: any) {
    if (
      !responseBody.data ||
      !['message_received', 'contact_created', 'smb_message_echoes'].includes(responseBody.data.name)
    ) {
      this.contactData = null
      return
    }

    let chatId
    if (['message_received', 'contact_created'].includes(responseBody.data.name)) {
      chatId = responseBody.data.event_data.from || responseBody.data.event_data.mobile
    } else {
      chatId = responseBody.data.event_data.to || responseBody.data.event_data.mobile
      this.messageData = { departament: 'outgoing' }
    }
    // const contact = responseBody.whatsappInboundMessage.customerProfile
    const normalizePhone = new NormalizePhone(chatId)

    this.contactData = {
      number: normalizePhone.number,
      type: normalizePhone.type,
      name: responseBody.data.event_data.name || normalizePhone.number,
      wa_start_chat: new Date(),
    }
  }

  contactWithDifferentData(_: any) {
    return false
  }

  shouldUpdateWaStartChat(contact: any) {
    return !contact.wa_start_chat
  }

  async sendMessage(messageId: string, url: string, token: string): Promise<void> {
    const messageToSend = await this.messageRepository.findFirst({ _id: messageId }, ['contact'])
    if (!messageToSend) return
    const messageContact = messageToSend.contact as IContact

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }

    const messageBody: Record<string, any> = {
      to: `+${messageContact.number}`,
      type: 'individual',
    }

    switch (messageToSend.kind) {
      case 'text':
        messageBody.type = 'text'
        messageBody.message = messageToSend.senderName
          ? `*${messageToSend.senderName}:*\n${messageToSend.text}`
          : messageToSend.text
        break

      case 'template': {
        const parameters = messageToSend.text!.match(/\{\{[^}]+\}\}/g) || []
        const templateName = parameters[0]?.replace('{{', '').replace('}}', '') || ''

        const template = await this.templateRepository.findFirst({ name: templateName })
        if (template) {
          messageBody.type = 'template'
          messageBody.template = {
            namespace: template.namespace,
            name: template.name,
            language: {
              code: template.language,
              policy: 'deterministic',
            },
            components: [],
          }

          messageBody.template.components = parseComponents(template, parameters)
        }

        break
      }
      case 'interactive': {
        const trigger = await this.triggerRepository.findFirst({ _id: messageToSend.trigger })
        if (trigger) {
          messageBody.type = 'interactive'

          switch (trigger.triggerKind) {
            case 'multi_product':
              messageBody.interactive = JSON.parse(trigger.catalogMulti!)
              break
            case 'single_product':
              messageBody.interactive = JSON.parse(trigger.catalogSingle!)
              break
            case 'reply_button':
              messageBody.interactive = JSON.parse(trigger.textReplyButton!)
              break
            case 'list_message':
              messageBody.interactive = JSON.parse(trigger.messagesList!)
              break
            case 'text':
              messageBody.type = 'text'
              messageBody.text = {
                body: await this.parseText(trigger.text!, messageContact),
              }
              break
            default:
              messageBody.type = 'text'
              messageBody.text = {
                body: messageToSend.senderName
                  ? `${messageToSend.senderName}: ${messageToSend.text}`
                  : messageToSend.text,
              }
          }
        } else {
          messageBody.type = 'text'
          messageBody.text = {
            body: messageToSend.senderName ? `${messageToSend.senderName}: ${messageToSend.text}` : messageToSend.text,
          }
        }
        break
      }
      case 'file': {
        messageBody.link = messageToSend.url

        if (isPhoto(messageToSend.url!)) {
          messageBody.type = 'image'
        } else if (isVideo(messageToSend.url!)) {
          messageBody.type = 'video'
        } else if (isMidia(messageToSend.url!) || isVoice(messageToSend.url!)) {
          messageBody.type = 'audio'
        } else {
          messageBody.type = 'document'
          messageBody.filename = messageToSend.fileName
        }
        break
      }
      case 'location':
        messageBody.type = 'text'
        messageBody.message = `longitude: ${messageToSend.longitude}, latitude: ${messageToSend.latitude}`
        break

      default:
        messageBody.type = 'text'
        messageBody.message = messageToSend.senderName
          ? `${messageToSend.senderName}: ${messageToSend.text}`
          : messageToSend.text || 'Mensagem não suportada pela Pabbly'
    }

    try {
      const messageResponse = await request.post(`${url}/messages`, {
        headers,
        body: messageBody,
      })

      if (messageResponse.status === 200 || messageResponse.status === 201) {
        messageToSend.messageWaId = messageResponse.data?.data?.metaResponse?.messages[0]?.id
        messageToSend.sended = true
        const serializedPayload = JSON.stringify(messageResponse.data)
        if (serializedPayload.length <= 1_048_576) {
          messageToSend.payload = serializedPayload
        }
        await this.messageRepository.save(messageToSend)
      } else {
        messageToSend.error = JSON.stringify(messageResponse.data)
        await this.messageRepository.save(messageToSend)
        logger.error(`Pabbly - erro: Mensagem ${messageId} não enviada para Pabbly.`)
      }
    } catch (error: any) {
      messageToSend.error = JSON.stringify(error.response?.data || error.message)
      await this.messageRepository.save(messageToSend)
      logger.error(`Pabbly - erro: Erro ao enviar mensagem ${messageId} para Pabbly`, error)
    }
  }

  async searchTemplates(url: any, token: any) {
    try {
      const pabblyTemplates = await getTemplates(url, token)
      const templates = parseTemplates(pabblyTemplates, this.licensee._id)
      return templates
    } catch (error) {
      logger.error('Pabbly - erro: Erro ao buscar templates Pabbly', error)
      return []
    }
  }

  async getMediaUrl(mediaId: any, url: any, token: any, _contact: any) {
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }

    try {
      const response = await request.get(`${url}/media?id=${mediaId}`, { headers })
      if (response.status === 200 && response.data.status === 'success') return response.data.data.mediaUrl
    } catch (error) {
      logger.error('Pabbly - erro: Erro ao buscar midia na Pabbly', error)
    }
  }
}

export { Pabbly }
