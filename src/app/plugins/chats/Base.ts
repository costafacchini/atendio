import Repository, { IRepository } from '../../repositories/repository'
import { IMessageRepository } from '../../repositories/message'
import { replace } from '../../helpers/Emoji'
import { v4 as uuidv4 } from 'uuid'
import { requireDependency } from '../../helpers/RequireDependency'
import { ILicensee, IInbox, IContact, IMessage, ITrigger, MessageKind, MessageDestination } from '../../../types'

interface ITriggerRepository {
  findFirst(params?: Record<string, unknown>): Promise<ITrigger | null>
  find(params?: Record<string, unknown>, order?: Record<string, unknown>): Promise<ITrigger[]>
}

interface IChatPlugin {
  sendMessage(messageId: string, url?: string): Promise<void>
  responseToMessages(responseBody: Record<string, unknown>): Promise<IMessage[]>
}

class ChatsBase implements IChatPlugin {
  licensee: ILicensee
  inbox: IInbox | null
  _contactRepository: IRepository<IContact>
  _messageRepository: IMessageRepository
  _triggerRepository: ITriggerRepository
  messageParsed: any

  // Implemented by subclasses
  parseMessage(_responseBody: any): Promise<any> | any {
    return
  }

  // Implemented by subclasses
  sendMessage(_messageId: string, _url?: string): Promise<void> {
    return Promise.resolve()
  }

  constructor(
    licensee: ILicensee,
    {
      inbox,
      contactRepository,
      messageRepository,
      triggerRepository,
    }: {
      inbox?: IInbox | null
      contactRepository?: IRepository<IContact>
      messageRepository?: IMessageRepository
      triggerRepository?: ITriggerRepository
    } = {},
  ) {
    this.licensee = licensee
    this.inbox = inbox ?? null
    this._contactRepository = contactRepository!
    this._messageRepository = messageRepository!
    this._triggerRepository = triggerRepository!
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

  async findContact(filters: any) {
    return await this.contactRepository.findFirst(filters)
  }

  async responseToMessages(responseBody: Record<string, unknown>): Promise<IMessage[]> {
    await this.parseMessage(responseBody)
    if (!this.messageParsed) return []

    const processedMessages = []

    if (this.messageParsed.action === 'close-chat') {
      processedMessages.push(
        await this.messageRepository.create({
          number: uuidv4(),
          text: 'Chat encerrado pelo agente',
          kind: MessageKind.Text,
          licensee: this.licensee._id,
          contact: this.messageParsed.contact._id,
          room: this.messageParsed.room?._id || this.messageParsed.room,
          department: this.messageParsed.room?.department,
          destination: MessageDestination.ToMessenger,
        }),
      )
    } else {
      for (const message of this.messageParsed.messages) {
        if (message.kind === 'text') {
          const text = message.text.body ? replace(message.text.body) : ''

          const triggers = await this.triggerRepository.find(
            { expression: text, licensee: this.licensee._id },
            { order: 'asc' },
          )
          if (triggers.length > 0) {
            for (const trigger of triggers) {
              processedMessages.push(
                await this.messageRepository.create({
                  number: uuidv4(),
                  kind: MessageKind.Interactive,
                  text,
                  licensee: this.licensee._id,
                  contact: this.messageParsed.contact._id,
                  room: this.messageParsed.room?._id || this.messageParsed.room,
                  department: this.messageParsed.room?.department,
                  destination: MessageDestination.ToMessenger,
                  trigger: trigger._id,
                }),
              )
            }
          } else {
            const messageToSend: Record<string, any> = {
              number: uuidv4(),
              kind: MessageKind.Text,
              text,
              licensee: this.licensee._id,
              contact: this.messageParsed.contact._id,
              room: this.messageParsed.room?._id || this.messageParsed.room,
              department: this.messageParsed.room?.department,
              destination: 'to-messenger',
              senderName: message.senderName,
            }

            if (messageToSend.text.includes('{{') && messageToSend.text.includes('}}')) {
              messageToSend.kind = 'template'
            }

            processedMessages.push(await this.messageRepository.create(messageToSend))
          }
        } else if (message.kind === 'file') {
          const messageToSend: Record<string, any> = {
            number: uuidv4(),
            kind: 'file',
            licensee: this.licensee._id,
            contact: this.messageParsed.contact._id,
            room: this.messageParsed.room?._id || this.messageParsed.room,
            department: this.messageParsed.room?.department,
            destination: 'to-messenger',
            senderName: message.senderName,
          }

          messageToSend.text = message.file.text
          messageToSend.fileName = message.file.fileName
          messageToSend.url = message.file.url

          processedMessages.push(await this.messageRepository.create(messageToSend))
        } else if (message.kind === 'location') {
          const messageToSend: Record<string, any> = {
            number: uuidv4(),
            kind: 'location',
            licensee: this.licensee._id,
            contact: this.messageParsed.contact._id,
            room: this.messageParsed.room?._id || this.messageParsed.room,
            department: this.messageParsed.room?.department,
            destination: 'to-messenger',
            senderName: message.senderName,
          }

          messageToSend.latitude = message.location.latitude
          messageToSend.longitude = message.location.longitude

          processedMessages.push(await this.messageRepository.create(messageToSend))
        }
      }
    }

    return processedMessages
  }
}

export { ChatsBase, IChatPlugin }
