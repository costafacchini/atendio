import { NormalizePhone } from '../../helpers/NormalizePhone'
import request from '../../services/request'
import { logger } from '../../helpers/logger'
import { isPhoto, isVideo, isMidia, isVoice } from '../../helpers/Files'
import { MessengersBase } from './Base'
import { requireDependency } from '../../helpers/RequireDependency'
import { ILicensee, IContact, ITemplate } from '../../../types'
import { IRepository } from '../../repositories/repository'

// const getWaIdContact = async (number, url, token) => {
//   const headers = {
//     'X-Api-Key': `${token}`,
//     accept: 'application/json',
//     'Content-Type': 'application/json',
//   }

//   const body = {
//     phoneNumber: `+${number}`,
//   }

//   try {
//     const response = await request.post(`${url}contact/contacts`, { headers, body })
//     return {
//       valid: response.status === 200,
//       waId: response.data.id,
//       data: response.data,
//     }
//   } catch (error) {
//     console.error('Erro ao verificar contato YCloud:', error)
//     return {
//       valid: false,
//       waId: null,
//       data: error.response?.data || error.message,
//     }
//   }
// }

const getTemplates = async (url: any, token: any) => {
  const headers = {
    'X-Api-Key': `${token}`,
    accept: 'application/json',
    'Content-Type': 'application/json',
  }

  try {
    const response = await request.get(`${url}/whatsapp/templates?page=1&limit=50&includeTotal=false`, { headers })
    return response.data
  } catch (error) {
    logger.error('YCloud - erro: Erro ao buscar templates', error)
    return { templates: [] }
  }
}

const parseTemplates = (ycloudTemplates: any, licenseeId: any) => {
  const templates: any[] = []

  for (const template of ycloudTemplates.items || []) {
    const templateValues: Record<string, any> = {
      name: template.name,
      // namespace: template.namespace,
      licensee: licenseeId,
      language: template.language,
      active: template.status.toUpperCase() === 'APPROVED',
      category: template.category,
      officialTemplateId: template.officialTemplateId,
      wabaId: template.wabaId,
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

class YCloud extends MessengersBase {
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
    if (
      !responseBody.whatsappInboundMessage &&
      !(responseBody.whatsappMessage && responseBody.type === 'whatsapp.smb.message.echoes')
    ) {
      this.messageData = null
      return
    }

    const message = responseBody.whatsappInboundMessage || responseBody.whatsappMessage

    if (
      message.type === 'sticker' ||
      message.type === 'ephemeral' ||
      message.type === 'reaction' ||
      message.type === 'contacts' ||
      message.type === 'unsupported' ||
      message.type === 'system' ||
      message.type === 'interactive'
    ) {
      this.messageData = null
      return
    }

    this.messageData = {
      kind: message.type,
      waId: message.id,
    }

    switch (message.type) {
      case 'text':
        this.messageData.text = { body: message.text?.body || '' }
        break

      case 'button':
        this.messageData.kind = 'text'
        this.messageData.text = { body: message.button?.text || '' }
        break

      case 'image':
        this.messageData.kind = 'file'
        this.messageData.file = {
          id: message.image?.id,
          url: message.image?.link,
          fileName: message.image?.sha256,
          caption: message.image?.caption,
          fileBase64: null,
        }
        break

      case 'video':
        this.messageData.kind = 'file'
        this.messageData.file = {
          id: message.video?.id,
          url: message.video?.link,
          fileName: message.video?.sha256,
          caption: message.video?.caption,
          fileBase64: null,
        }
        break

      case 'voice':
        this.messageData.kind = 'file'
        this.messageData.file = {
          id: message.voice?.id,
          url: message.voice?.link,
          fileName: message.voice?.sha256,
          caption: message.voice?.caption,
          fileBase64: null,
        }
        break

      case 'audio':
        this.messageData.kind = 'file'
        this.messageData.file = {
          id: message.audio?.id,
          url: message.audio?.link,
          fileName: message.audio?.sha256,
          caption: message.audio?.caption,
          fileBase64: null,
        }
        break

      case 'document':
        this.messageData.kind = 'file'
        this.messageData.file = {
          id: message.document?.id,
          url: message.document?.link,
          fileName: message.document?.filename,
          caption: message.document?.caption,
          fileBase64: null,
        }
        break

      case 'location':
        this.messageData.kind = 'location'
        this.messageData.latitude = message.location?.latitude
        this.messageData.longitude = message.location?.longitude
        this.messageData.name = message.location?.name
        this.messageData.address = message.location?.address
        break

      default:
        this.messageData = null
    }
  }

  parseContactData(responseBody: any) {
    if (
      !responseBody.whatsappInboundMessage &&
      !(responseBody.whatsappMessage && responseBody.type === 'whatsapp.smb.message.echoes')
    ) {
      this.contactData = null
      return
    }

    let chatId
    let contact
    if (responseBody.type === 'whatsapp.smb.message.echoes') {
      chatId = responseBody.whatsappMessage.to
      this.messageData = { departament: 'outgoing' }
    } else {
      chatId = responseBody.whatsappInboundMessage.from
      contact = responseBody.whatsappInboundMessage.customerProfile
    }
    const normalizePhone = new NormalizePhone(chatId)

    this.contactData = {
      number: normalizePhone.number,
      type: normalizePhone.type,
      name: contact?.name || '',
      wa_start_chat: new Date(),
    }
  }

  contactWithDifferentData(contact: any) {
    return (
      (this.contactData.name && this.contactData.name !== contact.name) ||
      (this.contactData.waId && this.contactData.waId !== contact.waId)
    )
  }

  shouldUpdateWaStartChat(contact: any) {
    return !contact.wa_start_chat
  }

  async sendMessage(messageId: string, url: string, token: string): Promise<void> {
    const messageToSend = await this.messageRepository.findFirst({ _id: messageId }, ['contact'])
    if (!messageToSend) return
    const messageContact = messageToSend.contact as IContact

    const headers = {
      'X-Api-Key': `${token}`,
      accept: 'application/json',
      'Content-Type': 'application/json',
    }

    const messageBody: Record<string, any> = {
      from: `+${this.licensee.phone}`,
      to: `+${messageContact.number}`,
      type: 'individual',
    }

    switch (messageToSend.kind) {
      case 'text':
        messageBody.type = 'text'
        messageBody.text = {
          body: messageToSend.senderName ? `*${messageToSend.senderName}:*\n${messageToSend.text}` : messageToSend.text,
        }
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
      case 'file':
        if (this.licensee.useFileIDYcloud === true) {
          const uploadedFile = await this.uploadFileToYCloud(messageToSend.url, url, token)

          if (uploadedFile) {
            if (isPhoto(messageToSend.url!)) {
              messageBody.type = 'image'
              messageBody.image = {
                id: uploadedFile.id,
              }
            } else if (isVideo(messageToSend.url!)) {
              messageBody.type = 'video'
              messageBody.video = {
                id: uploadedFile.id,
              }
            } else if (isMidia(messageToSend.url!) || isVoice(messageToSend.url!)) {
              messageBody.type = 'audio'
              messageBody.audio = {
                id: uploadedFile.id,
              }
            } else {
              messageBody.type = 'document'
              messageBody.document = {
                id: uploadedFile.id,
              }
            }
          } else {
            if (isPhoto(messageToSend.url!)) {
              messageBody.type = 'image'
              messageBody.image = {
                link: messageToSend.url,
              }
            } else if (isVideo(messageToSend.url!)) {
              messageBody.type = 'video'
              messageBody.video = {
                link: messageToSend.url,
              }
            } else if (isMidia(messageToSend.url!) || isVoice(messageToSend.url!)) {
              messageBody.type = 'audio'
              messageBody.audio = {
                link: messageToSend.url,
              }
            } else {
              messageBody.type = 'document'
              messageBody.document = {
                link: messageToSend.url,
                filename: messageToSend.fileName,
              }
            }
          }
        } else {
          if (isPhoto(messageToSend.url!)) {
            messageBody.type = 'image'
            messageBody.image = {
              link: messageToSend.url,
            }
          } else if (isVideo(messageToSend.url!)) {
            messageBody.type = 'video'
            messageBody.video = {
              link: messageToSend.url,
            }
          } else if (isMidia(messageToSend.url!) || isVoice(messageToSend.url!)) {
            messageBody.type = 'audio'
            messageBody.audio = {
              link: messageToSend.url,
            }
          } else {
            messageBody.type = 'document'
            messageBody.document = {
              link: messageToSend.url,
              filename: messageToSend.fileName,
            }
          }
        }
        break

      case 'location':
        messageBody.type = 'location'
        messageBody.location = {
          longitude: messageToSend.longitude,
          latitude: messageToSend.latitude,
        }
        break

      default:
        messageBody.type = 'text'
        messageBody.text = {
          body: messageToSend.senderName
            ? `${messageToSend.senderName}: ${messageToSend.text}`
            : messageToSend.text || 'YCloud: Mensagem não suportada',
        }
    }

    try {
      const messageResponse = await request.post(`${url}/whatsapp/messages/sendDirectly`, {
        headers,
        body: messageBody,
      })

      if (messageResponse.status === 200 || messageResponse.status === 201) {
        messageToSend.messageWaId = messageResponse.data?.id
        messageToSend.sended = true
        await this.messageRepository.save(messageToSend)
        logger.info(
          `YCloud: Mensagem ${messageId} enviada para YCloud com sucesso! ${JSON.stringify(messageResponse.data)}`,
        )
      } else {
        messageToSend.error = JSON.stringify(messageResponse.data)
        await this.messageRepository.save(messageToSend)
        logger.error(
          `YCloud - erro: Mensagem ${messageId} não enviada para YCloud. ${JSON.stringify(messageResponse.data)}`,
        )
      }
    } catch (error: any) {
      messageToSend.error = JSON.stringify(error.response?.data || error.message)
      await this.messageRepository.save(messageToSend)
      logger.error(`YCloud - erro: Erro ao enviar mensagem ${messageId} para YCloud`, error)
    }
  }

  async uploadFileToYCloud(fileUrl: any, url: any, token: any) {
    const fileResponse = await request.get(fileUrl, { responseType: 'arraybuffer' })
    const fileData = fileResponse.data
    const fileName = fileUrl.split('/').pop()

    const formData = new FormData()
    formData.append('file', new Blob([fileData]), fileName)

    const headers = {
      accept: 'application/json',
      'X-Api-Key': `${token}`,
    }

    try {
      const phoneNumber = encodeURIComponent(`+${this.licensee.phone}`)
      const response = await request.post(`${url}/whatsapp/media/${phoneNumber}/upload`, { headers, body: formData })
      if (response.status === 200 || response.status === 201) {
        return response.data
      } else {
        logger.error(`YCloud - erro: Falha ao enviar arquivo para YCloud. ${JSON.stringify(response.data)}`)
        return null
      }
    } catch (error) {
      logger.error('YCloud - erro: Erro ao enviar arquivo para YCloud', error)
      return null
    }
  }

  async setWebhook(url: any, token: any) {
    const headers = {
      'X-Api-Key': `${token}`,
      accept: 'application/json',
      'Content-Type': 'application/json',
    }

    const body = {
      url: `${this.licensee.urlWhatsappWebhook}`,
      events: ['whatsapp.inbound_message.received'],
    }

    try {
      const response = await request.post(`${url}/webhookEndpoints`, { headers, body })
      return response.status === 200 || response.status === 201
    } catch (error) {
      logger.error('YCloud - erro: Erro ao configurar webhook', error)
      return false
    }
  }

  async searchTemplates(url: any, token: any) {
    try {
      const ycloudTemplates = await getTemplates(url, token)
      const templates = parseTemplates(ycloudTemplates, this.licensee._id)
      return templates
    } catch (error) {
      logger.error('YCloud - erro: Erro ao buscar templates', error)
      return []
    }
  }
}

export { YCloud }
