import Repository, { IRepository } from '../../repositories/repository'
import { logger } from '../../helpers/logger'
import { v4 as uuidv4 } from 'uuid'
import { S3 } from '../storage/S3'
import { LocalStorage } from '../storage/Local'
import { requireDependency } from '../../helpers/RequireDependency'
import { ILicensee, IContact, IMessage, ITrigger, MessageKind, MessageDestination } from '../../../types'

interface ITriggerRepository {
  findFirst(params?: Record<string, unknown>): Promise<ITrigger | null>
  find(params?: Record<string, unknown>, order?: Record<string, unknown>): Promise<ITrigger[]>
}

interface IMessengerPlugin {
  sendMessage(messageId: string, url?: string, token?: string): Promise<void>
  responseToMessages(
    responseBody: Record<string, unknown>,
    opts?: { departmentId?: string | null },
  ): Promise<IMessage[]>
}

const createStorageProvider = (licensee: any, contact: any, fileName: any, fileBase64: any) => {
  if (process.env.STORAGE_PROVIDER === 'local') {
    return new LocalStorage(licensee, contact, fileName, fileBase64)
  }
  return new S3(licensee, contact, fileName, fileBase64)
}

const uploadFile = (licensee: any, contact: any, fileName: any, fileBase64: any) => {
  const storage = createStorageProvider(licensee, contact, fileName, fileBase64)
  storage.uploadFile()
  return storage.presignedUrl()
}

class MessengersBase implements IMessengerPlugin {
  licensee: ILicensee
  _contactRepository: IRepository<IContact>
  _messageRepository: IRepository<IMessage>
  _triggerRepository: ITriggerRepository
  _productRepository: any
  messageParsed: any
  messageStatus: any
  messageData: any
  contactData: any

  constructor(
    licensee: ILicensee,
    {
      contactRepository,
      messageRepository,
      triggerRepository,
      productRepository,
    }: {
      contactRepository?: IRepository<IContact>
      messageRepository?: IRepository<IMessage>
      triggerRepository?: ITriggerRepository
      productRepository?: any
    } = {},
  ) {
    this.licensee = licensee
    this._contactRepository = contactRepository!
    this._messageRepository = messageRepository!
    this._triggerRepository = triggerRepository!
    this._productRepository = productRepository
  }

  // Implemented by subclasses
  sendMessage(_messageId: string, _url?: string, _token?: string): Promise<void> {
    return Promise.resolve()
  }

  get contactRepository() {
    const repository = requireDependency(this._contactRepository, 'contactRepository', this.constructor.name)
    if (typeof repository.save !== 'function') {
      repository.save = Repository.prototype.save.bind(repository)
    }
    return repository
  }

  get messageRepository() {
    const repository = requireDependency(this._messageRepository, 'messageRepository', this.constructor.name)
    if (typeof repository.save !== 'function') {
      repository.save = Repository.prototype.save.bind(repository)
    }
    return repository
  }

  get triggerRepository() {
    return requireDependency(this._triggerRepository, 'triggerRepository', this.constructor.name)
  }

  get productRepository() {
    return requireDependency(this._productRepository, 'productRepository', this.constructor.name)
  }

  // These methods are implemented by subclasses
  parseMessageStatus(_responseBody: any): void {
    return
  }
  parseMessage(_responseBody: any): void {
    return
  }
  parseContactData(_responseBody: any): void {
    return
  }
  contactWithDifferentData(_contact: any): boolean {
    return false
  }
  shouldUpdateWaStartChat(_contact: any): boolean {
    return false
  }

  // eslint-disable-next-line require-await
  async getMediaUrl(_mediaId: any, _url: any, _token: any, _contact: any): Promise<any> {
    // Método padrão que pode ser sobrescrito pelas classes filhas
    // Retorna null se não for implementado
    return null
  }

  async findContact(number: any, type: any) {
    return await this.contactRepository.findFirst({
      number: number,
      type: type,
      licensee: this.licensee._id,
    })
  }

  async responseToMessages(
    responseBody: Record<string, unknown>,
    { departmentId = null }: { departmentId?: string | null } = {},
  ): Promise<IMessage[]> {
    this.parseMessageStatus(responseBody)
    if (this.messageStatus) {
      const message = await this.messageRepository.findFirst({
        licensee: this.licensee._id,
        messageWaId: this.messageStatus.id,
      })

      if (message) {
        if (this.messageStatus.status === 'sent') message.sendedAt = new Date()
        if (this.messageStatus.status === 'delivered') message.deliveredAt = new Date()
        if (this.messageStatus.status === 'read') message.readAt = new Date()

        await this.messageRepository.save(message)
      }

      return []
    }

    this.parseContactData(responseBody)
    this.parseMessage(responseBody)

    if (!this.contactData) return []

    let contact = await this.findContact(this.contactData.number, this.contactData.type)
    if (!contact) {
      contact = await this.contactRepository.create({
        name: this.contactData.name,
        number: this.contactData.number,
        type: this.contactData.type,
        talkingWithChatBot: this.licensee.useChatbot,
        waId: this.contactData.waId,
        licensee: this.licensee._id,
        wa_start_chat: this.contactData.wa_start_chat,
      })
    } else {
      if (this.contactWithDifferentData(contact)) {
        contact.name = this.contactData.name
        contact.waId = this.contactData.waId
        contact.talkingWithChatBot = this.licensee.useChatbot

        await this.contactRepository.save(contact)
      }
      if (this.shouldUpdateWaStartChat(contact)) {
        contact.wa_start_chat = this.contactData.wa_start_chat

        await this.contactRepository.save(contact)
      }
    }

    if (!this.messageData) return []

    const processedMessages = []

    if (this.messageData.kind === 'interactive') {
      const triggers = await this.triggerRepository.find(
        { expression: this.messageData.interactive.expression, licensee: this.licensee._id },
        { order: 'asc' },
      )
      if (triggers.length > 0) {
        for (const trigger of triggers) {
          processedMessages.push(
            await this.messageRepository.create({
              number: uuidv4(),
              messageWaId: this.messageData.waId,
              licensee: this.licensee._id,
              contact: contact._id,
              destination: MessageDestination.ToMessenger,
              kind: MessageKind.Interactive,
              trigger: trigger._id,
              ...(departmentId && { department: departmentId }),
            }),
          )
        }
      } else {
        processedMessages.push(
          await this.messageRepository.create({
            number: uuidv4(),
            messageWaId: this.messageData.waId,
            licensee: this.licensee._id,
            contact: contact._id,
            destination: contact.talkingWithChatBot ? MessageDestination.ToChatbot : MessageDestination.ToChat,
            text: this.messageData.interactive.expression,
            ...(departmentId && { department: departmentId }),
          }),
        )
      }
    } else {
      const messageToSend: Record<string, any> = {
        number: uuidv4(),
        messageWaId: this.messageData.waId,
        licensee: this.licensee._id,
        contact: contact._id,
        destination: contact.talkingWithChatBot ? MessageDestination.ToChatbot : MessageDestination.ToChat,
        kind: this.messageData.kind,
        departament: this.messageData.departament,
        ...(departmentId && { department: departmentId }),
      }

      if (messageToSend.kind === 'text') {
        messageToSend.text = this.messageData.text.body
      } else if (messageToSend.kind === 'location') {
        messageToSend.latitude = this.messageData.latitude
        messageToSend.longitude = this.messageData.longitude
      } else {
        messageToSend.attachmentWaId = this.messageData.file.id
        messageToSend.fileName = this.messageData.file.fileName

        if (this.messageData.file.url) {
          messageToSend.url = this.messageData.file.url
        } else if (this.messageData.file.fileBase64) {
          messageToSend.url = await uploadFile(
            this.licensee,
            contact,
            this.messageData.file.fileName,
            this.messageData.file.fileBase64,
          )
        } else {
          messageToSend.url = await this.getMediaUrl(
            messageToSend.attachmentWaId,
            this.licensee.whatsappUrl,
            this.licensee.whatsappToken,
            contact,
          )
        }
      }

      if (this.messageData.sender) messageToSend.senderName = this.messageData.sender
      if (this.messageData.replyMessageId) messageToSend.replyMessageId = this.messageData.replyMessageId

      try {
        processedMessages.push(await this.messageRepository.create(messageToSend))
      } catch (error) {
        logger.error('Não consegui criar a mensagem, verifique os erros', error)
      }
    }

    return processedMessages
  }
}

export { MessengersBase, IMessengerPlugin }
