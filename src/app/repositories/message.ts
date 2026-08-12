import { v4 as uuidv4 } from 'uuid'
import { Prisma } from '@prisma/client'
import { IRepository, RepositoryMemory, PrismaRepository, comparableValue, sortRecords } from './repository'
import { replace } from '../helpers/Emoji'
import { requireDependency } from '../helpers/RequireDependency'
import { IMessage, MessageKind, MessageDestination } from '../../types'
import { getPrismaClient } from '../../config/postgres'
import { tryGetActiveRepositories } from './activeState'

// Prisma-native where clause excluding system-generated close messages
const EXCLUDE_SYSTEM_CLOSE_WHERE = {
  NOT: { AND: [{ kind: 'text' }, { text: 'Chat encerrado pelo agente' }] },
}

// SQL fragment for $queryRaw queries
const EXCLUDE_SYSTEM_CLOSE_SQL = `NOT (kind = 'text' AND text = 'Chat encerrado pelo agente')`

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

  async countMessages(params: Record<string, unknown> = {}): Promise<number> {
    return await getPrismaClient().message.count({
      where: { ...EXCLUDE_SYSTEM_CLOSE_WHERE, ...(this.toWhere(params) as any) },
    })
  }

  async groupByDay(
    licenseeId: number | null,
    startDate: Date,
    endDate: Date,
  ): Promise<{ _id: string; count: number }[]> {
    const licenseeFilter = licenseeId ? Prisma.sql`AND licensee = ${licenseeId}` : Prisma.sql``

    return await getPrismaClient().$queryRaw<{ _id: string; count: number }[]>`
      SELECT
        TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "_id",
        COUNT(*)::int AS count
      FROM messages
      WHERE ${Prisma.raw(EXCLUDE_SYSTEM_CLOSE_SQL)}
        AND "createdAt" >= ${startDate}
        AND "createdAt" < ${endDate}
        ${licenseeFilter}
      GROUP BY 1
      ORDER BY 1
    `
  }

  async groupByHour(
    licenseeId: number | null,
    startDate: Date,
    endDate: Date,
  ): Promise<{ _id: string; count: number }[]> {
    const licenseeFilter = licenseeId ? Prisma.sql`AND licensee = ${licenseeId}` : Prisma.sql``

    return await getPrismaClient().$queryRaw<{ _id: string; count: number }[]>`
      SELECT
        TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24') AS "_id",
        COUNT(*)::int AS count
      FROM messages
      WHERE ${Prisma.raw(EXCLUDE_SYSTEM_CLOSE_SQL)}
        AND "createdAt" >= ${startDate}
        AND "createdAt" < ${endDate}
        ${licenseeFilter}
      GROUP BY 1
      ORDER BY 1
    `
  }

  async avgQueueTime(licenseeId: number | null, startDate: Date, endDate: Date): Promise<number> {
    const licenseeFilter = licenseeId ? Prisma.sql`AND licensee = ${licenseeId}` : Prisma.sql``

    const rows = await getPrismaClient().$queryRaw<{ avg: number | null }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM ("sendedAt" - "createdAt")))::float AS avg
      FROM messages
      WHERE ${Prisma.raw(EXCLUDE_SYSTEM_CLOSE_SQL)}
        AND "sendedAt" IS NOT NULL
        AND "createdAt" >= ${startDate}
        AND "createdAt" < ${endDate}
        ${licenseeFilter}
    `
    return parseFloat((rows[0]?.avg ?? 0).toFixed(2))
  }

  async avgMessagesPerRoom(licenseeId: number | null, startDate: Date, endDate: Date): Promise<number> {
    const licenseeFilter = licenseeId ? Prisma.sql`AND licensee = ${licenseeId}` : Prisma.sql``

    const rows = await getPrismaClient().$queryRaw<{ avg: number | null }[]>`
      SELECT COALESCE(AVG(cnt)::float, 0) AS avg
      FROM (
        SELECT COUNT(*) AS cnt
        FROM messages
        WHERE room IS NOT NULL
          AND ${Prisma.raw(EXCLUDE_SYSTEM_CLOSE_SQL)}
          AND "createdAt" >= ${startDate}
          AND "createdAt" < ${endDate}
          ${licenseeFilter}
        GROUP BY room
      ) sub
    `
    return parseFloat((rows[0]?.avg ?? 0).toFixed(2))
  }

  async lastMessagePerRoom(roomIds: number[]): Promise<{ room: number; text: string | null; createdAt: Date }[]> {
    if (roomIds.length === 0) return []

    return await getPrismaClient().$queryRaw<{ room: number; text: string | null; createdAt: Date }[]>(
      Prisma.sql`
        SELECT DISTINCT ON (room) room, text, "createdAt"
        FROM messages
        WHERE room = ANY(${roomIds})
          AND ${Prisma.raw(EXCLUDE_SYSTEM_CLOSE_SQL)}
        ORDER BY room, "createdAt" DESC
      `,
    )
  }

  async countForRoom(roomId: number): Promise<number> {
    return await getPrismaClient().message.count({ where: { room: roomId } })
  }

  async findPagedForRoom(roomId: number, page: number, limit: number): Promise<any[]> {
    return await getPrismaClient().message.findMany({
      where: { room: roomId },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit + 1,
    })
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
