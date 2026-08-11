import { v4 as uuidv4 } from 'uuid'
import { IRepository, RepositoryMemory, PrismaRepository, comparableValue, sortRecords } from './repository'
import { replace } from '../helpers/Emoji'
import { requireDependency } from '../helpers/RequireDependency'
import { IMessage, MessageKind, MessageDestination } from '../../types'
import { getPrismaClient } from '../../config/postgres'
import { tryGetActiveRepositories } from './activeState'

export interface IMessageRepository extends IRepository<IMessage> {
  createInteractiveMessages(fields: any): Promise<IMessage[]>
}

class MessageRepositoryMemory extends RepositoryMemory<IMessage> {
  triggerRepository: any
  parseTextDependency: any

  constructor({
    items = [],
    triggerRepository,
    parseText: parseTextDependency,
  }: { items?: any[]; triggerRepository?: any; parseText?: any } = {}) {
    super(items)
    this.triggerRepository = triggerRepository
    this.parseTextDependency = parseTextDependency
  }

  async create(fields: Partial<IMessage> = {}): Promise<IMessage> {
    return await super.create({ number: uuidv4(), ...(fields ?? {}) })
  }

  findByRoom(roomId: any, options: { since?: Date } = {}) {
    const messages = this.items.filter((m: any) => {
      const roomMatch = comparableValue(m.room) === comparableValue(roomId)
      if (!roomMatch) return false
      if (options.since && m.createdAt) {
        return new Date(m.createdAt) > options.since
      }
      return true
    })
    return sortRecords(messages, { createdAt: 'asc' })
  }

  async createInteractiveMessages(fields: any) {
    const triggerRepository = requireDependency(this.triggerRepository, 'triggerRepository', 'MessageRepositoryMemory')
    const messages: IMessage[] = []

    const text = replace(fields.text)
    const triggers = await triggerRepository.find({ expression: text, licensee: fields.licensee }, { order: 'asc' })

    if (triggers.length > 0) {
      for (const trigger of triggers) {
        messages.push(
          await this.create({
            ...fields,
            kind: MessageKind.Interactive,
            text,
            trigger: trigger._id,
          }),
        )
      }
    } else {
      messages.push(
        await this.create({
          ...fields,
          kind: MessageKind.Text,
          text,
        }),
      )
    }

    return messages
  }

  async createTextMessageInsteadInteractive(fields: any) {
    let { kind, text, contact } = fields

    if (kind === MessageKind.Interactive) {
      kind = MessageKind.Text
      text = await requireDependency(this.parseTextDependency, 'parseText', 'MessageRepositoryMemory')(text, contact)
    }

    return await this.create({ ...fields, kind, text, contact })
  }

  async createMessageToWarnAboutWindowOfWhatsassHasExpired(contact: any, licensee: any) {
    return await this.create({
      number: uuidv4(),
      kind: MessageKind.Text,
      contact,
      licensee,
      destination: MessageDestination.ToChat,
      text: '🚨 ATENÇÃO\nO período de 24h para manter conversas expirou. Envie um Template para voltar a interagir com esse contato.',
    })
  }

  async createMessageToWarnAboutWindowOfWhatsassIsEnding(contact: any, licensee: any) {
    return await this.create({
      number: uuidv4(),
      kind: MessageKind.Text,
      contact,
      licensee,
      destination: MessageDestination.ToChat,
      text: '🚨 ATENÇÃO\nO período de 24h para manter conversas está quase expirando. Faltam apenas 10 minutos para encerrar.',
    })
  }
}

class PrismaMessageDatabaseRepository extends PrismaRepository<IMessage> {
  delegate() {
    return getPrismaClient().message
  }
  protected fkFields() {
    return ['licensee', 'contact', 'room', 'department', 'inbox', 'trigger']
  }

  // Cart was removed by the remove-pdv plan; strip it from the payload if somehow still present.
  protected toData(fields: any = {}): Record<string, unknown> {
    const result = super.toData(fields)
    delete result.cart
    return result
  }
}

// Factory for backward-compatibility with specs that call new MessageRepositoryDatabase().
// Returns the active shared instance when memory repos are installed, so all
// patched methods (find, findFirst, etc.) are inherited from the shared instance.

const MessageRepositoryDatabase = function (this: any): any {
  const active = tryGetActiveRepositories()
  if (active) return active.messageRepository
  return new MessageRepositoryMemory()
} as unknown as new () => MessageRepositoryMemory
MessageRepositoryDatabase.prototype = MessageRepositoryMemory.prototype

export { MessageRepositoryDatabase, MessageRepositoryMemory, PrismaMessageDatabaseRepository }
