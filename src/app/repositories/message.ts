import { v4 as uuidv4 } from 'uuid'
import { Prisma } from '../../../generated/prisma/client'
import { IRepository, RepositoryMemory, PrismaRepository, comparableValue, sortRecords } from './repository'
import { replace } from '../helpers/Emoji'
import { requireDependency } from '../helpers/RequireDependency'
import { IMessage, MessageKind, MessageDestination } from '../../types'
import { getPrismaClient } from '../../config/postgres'
import { tryGetActiveRepositories } from './activeState'

// Prisma `where` clause that excludes the system "chat closed" message used by the agent UI.
// Mirrors the Mongoose `{ $nor: [{ kind: 'text', text: 'Chat encerrado pelo agente' }] }` filter.
const EXCLUDE_SYSTEM_CLOSE_WHERE = {
  NOT: { AND: [{ kind: 'text' }, { text: 'Chat encerrado pelo agente' }] },
}

// Raw SQL fragment for the same filter, used inside $queryRaw templates.
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

  async findFailed(startDate: Date | string, endDate: Date | string, licenseeId: string): Promise<IMessage[]> {
    const params: any = {
      sended: false,
      createdAt: { $gte: new Date(startDate), $lt: new Date(endDate) },
      licensee: licenseeId,
      text: { $ne: 'Chat encerrado pelo agente' },
    }
    return (await this.find(params)) as IMessage[]
  }

  async findSended(startDate: Date | string, endDate: Date | string, licenseeId: string): Promise<IMessage[]> {
    const params: any = {
      sended: true,
      createdAt: { $gte: new Date(startDate), $lt: new Date(endDate) },
      licensee: licenseeId,
    }
    return (await this.find(params)) as IMessage[]
  }

  async findManyMessages({
    createdAtStart,
    createdAtEnd,
    licensee,
    contact,
    kind,
    destination,
    sended,
    sortField = 'createdAt',
    sortOrder = -1,
    page,
    limit,
  }: {
    createdAtStart?: Date | string
    createdAtEnd?: Date | string
    licensee?: string
    contact?: string
    kind?: string
    destination?: string
    sended?: boolean
    sortField?: string
    sortOrder?: number | string
    page?: number
    limit?: number
  }): Promise<IMessage[]> {
    const params: any = {}
    if (createdAtStart && createdAtEnd)
      params.createdAt = { $gt: new Date(createdAtStart), $lt: new Date(createdAtEnd) }
    if (licensee) params.licensee = licensee
    if (contact) params.contact = contact
    if (kind) params.kind = kind
    if (destination) params.destination = destination
    if (sended !== undefined) {
      params.sended = sended
      if (sended) {
        params.text = { $ne: 'Chat encerrado pelo agente' }
        params.ignored = { $ne: true }
      }
    }
    const records = (await this.find(params)) as any[]
    const sorted = sortRecords(records, { [sortField]: sortOrder === 'asc' || sortOrder === 1 ? 'asc' : 'desc' })
    if (page == null || limit == null) return sorted
    return sorted.slice((page - 1) * limit, page * limit)
  }

  async countManyMessages({
    createdAtStart,
    createdAtEnd,
    licensee,
    contact,
    kind,
    destination,
    sended,
  }: {
    createdAtStart?: Date | string
    createdAtEnd?: Date | string
    licensee?: string
    contact?: string
    kind?: string
    destination?: string
    sended?: boolean
  }): Promise<number> {
    const params: any = {}
    if (createdAtStart && createdAtEnd)
      params.createdAt = { $gt: new Date(createdAtStart), $lt: new Date(createdAtEnd) }
    if (licensee) params.licensee = licensee
    if (contact) params.contact = contact
    if (kind) params.kind = kind
    if (destination) params.destination = destination
    if (sended !== undefined) {
      params.sended = sended
      if (sended) {
        params.text = { $ne: 'Chat encerrado pelo agente' }
        params.ignored = { $ne: true }
      }
    }
    const records = await this.find(params)
    return records.length
  }

  async groupByLicenseeAndDay(
    startDate: Date | string,
    endDate: Date | string,
    licenseeId?: string,
  ): Promise<{ _id: string; days: { date: string; count: number }[] }[]> {
    const params: any = { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } }
    if (licenseeId) params.licensee = licenseeId
    const records = (await this.find(params)) as any[]

    const grouped = new Map<string, Map<string, number>>()
    for (const record of records) {
      const licKey = String((record.licensee as any)?._id ?? record.licensee)
      const day = new Date(record.createdAt).toISOString().slice(0, 10)
      if (!grouped.has(licKey)) grouped.set(licKey, new Map())
      const dayMap = grouped.get(licKey)!
      dayMap.set(day, (dayMap.get(day) ?? 0) + 1)
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([id, dayMap]) => ({
        _id: id,
        days: Array.from(dayMap.entries())
          .sort(([a], [b]) => (a > b ? 1 : -1))
          .map(([date, count]) => ({ date, count })),
      }))
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

  // params are Prisma-native where clauses, e.g. { sended: true, createdAt: { gte: d1, lt: d2 } }.
  // The EXCLUDE_SYSTEM_CLOSE_WHERE filter is always applied.
  async countMessages(params: Record<string, unknown> = {}): Promise<number> {
    return await getPrismaClient().message.count({
      where: { ...EXCLUDE_SYSTEM_CLOSE_WHERE, ...(params as any) },
    })
  }

  // Returns message counts grouped by calendar day (UTC) within [startDate, endDate).
  async groupByDay(
    licenseeId: number | null,
    startDate: Date,
    endDate: Date,
  ): Promise<{ _id: string; count: number }[]> {
    const licenseeFilter = licenseeId != null ? Prisma.sql`AND licensee = ${licenseeId}` : Prisma.sql``
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

  // Returns message counts grouped by hour (UTC) within [startDate, endDate).
  async groupByHour(
    licenseeId: number | null,
    startDate: Date,
    endDate: Date,
  ): Promise<{ _id: string; count: number }[]> {
    const licenseeFilter = licenseeId != null ? Prisma.sql`AND licensee = ${licenseeId}` : Prisma.sql``
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

  // Returns the average seconds between createdAt and sendedAt for messages sent within the window.
  async avgQueueTime(licenseeId: number | null, startDate: Date, endDate: Date): Promise<number> {
    const licenseeFilter = licenseeId != null ? Prisma.sql`AND licensee = ${licenseeId}` : Prisma.sql``
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

  // Returns the average number of messages per room for messages created within the window.
  async avgMessagesPerRoom(licenseeId: number | null, startDate: Date, endDate: Date): Promise<number> {
    const licenseeFilter = licenseeId != null ? Prisma.sql`AND licensee = ${licenseeId}` : Prisma.sql``
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

  // Returns the most-recent non-system message for each room in roomIds.
  // Uses DISTINCT ON for a single efficient pass — Postgres-specific.
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

  // Returns a page of messages for a room, ordered oldest-first.
  // Fetches limit + 1 so the caller can detect whether a next page exists.
  async findPagedForRoom(roomId: number, page: number, limit: number): Promise<any[]> {
    return await getPrismaClient().message.findMany({
      where: { room: roomId },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit + 1,
    })
  }

  async findFailed(startDate: Date | string, endDate: Date | string, licenseeId: string): Promise<IMessage[]> {
    const licId = parseInt(String(licenseeId), 10)
    const records = await getPrismaClient().message.findMany({
      where: {
        sended: false,
        createdAt: { gte: new Date(startDate), lt: new Date(endDate) },
        licensee: licId,
        NOT: { text: 'Chat encerrado pelo agente' },
      },
    })
    return this.fromDBMany(records) as IMessage[]
  }

  async findSended(startDate: Date | string, endDate: Date | string, licenseeId: string): Promise<IMessage[]> {
    const licId = parseInt(String(licenseeId), 10)
    const records = await getPrismaClient().message.findMany({
      where: {
        sended: true,
        createdAt: { gte: new Date(startDate), lt: new Date(endDate) },
        licensee: licId,
      },
    })
    return this.fromDBMany(records) as IMessage[]
  }

  async findManyMessages({
    createdAtStart,
    createdAtEnd,
    licensee,
    contact,
    kind,
    destination,
    sended,
    sortField = 'createdAt',
    sortOrder = -1,
    page,
    limit,
  }: {
    createdAtStart?: Date | string
    createdAtEnd?: Date | string
    licensee?: string
    contact?: string
    kind?: string
    destination?: string
    sended?: boolean
    sortField?: string
    sortOrder?: number | string
    page?: number
    limit?: number
  }): Promise<IMessage[]> {
    const where: any = {}
    if (createdAtStart && createdAtEnd) where.createdAt = { gt: new Date(createdAtStart), lt: new Date(createdAtEnd) }
    if (licensee) where.licensee = parseInt(String(licensee), 10)
    if (contact) where.contact = parseInt(String(contact), 10)
    if (kind) where.kind = kind
    if (destination) where.destination = destination
    if (sended !== undefined) {
      where.sended = sended
      if (sended) {
        where.NOT = { AND: [{ text: 'Chat encerrado pelo agente' }] }
        where.ignored = { not: true }
      }
    }
    const orderDir = sortOrder === 'asc' || sortOrder === 1 ? 'asc' : 'desc'
    const query: any = { where, orderBy: { [sortField]: orderDir } }
    if (page != null && limit != null) {
      query.skip = (page - 1) * limit
      query.take = limit
    }
    const records = await getPrismaClient().message.findMany(query)
    return this.fromDBMany(records) as IMessage[]
  }

  async countManyMessages({
    createdAtStart,
    createdAtEnd,
    licensee,
    contact,
    kind,
    destination,
    sended,
  }: {
    createdAtStart?: Date | string
    createdAtEnd?: Date | string
    licensee?: string
    contact?: string
    kind?: string
    destination?: string
    sended?: boolean
  }): Promise<number> {
    const where: any = {}
    if (createdAtStart && createdAtEnd) where.createdAt = { gt: new Date(createdAtStart), lt: new Date(createdAtEnd) }
    if (licensee) where.licensee = parseInt(String(licensee), 10)
    if (contact) where.contact = parseInt(String(contact), 10)
    if (kind) where.kind = kind
    if (destination) where.destination = destination
    if (sended !== undefined) {
      where.sended = sended
      if (sended) {
        where.NOT = { AND: [{ text: 'Chat encerrado pelo agente' }] }
        where.ignored = { not: true }
      }
    }
    return await getPrismaClient().message.count({ where })
  }

  async groupByLicenseeAndDay(
    startDate: Date | string,
    endDate: Date | string,
    licenseeId?: string,
  ): Promise<{ _id: string; days: { date: string; count: number }[] }[]> {
    const licenseeFilter =
      licenseeId != null ? Prisma.sql`AND licensee = ${parseInt(String(licenseeId), 10)}` : Prisma.sql``
    const rows = await getPrismaClient().$queryRaw<{ licensee_id: bigint; day: string; count: bigint }[]>`
      SELECT
        licensee AS licensee_id,
        TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
        COUNT(*) AS count
      FROM messages
      WHERE "createdAt" >= ${new Date(startDate)}
        AND "createdAt" <= ${new Date(endDate)}
        ${licenseeFilter}
      GROUP BY licensee, day
      ORDER BY licensee, day
    `
    const grouped = new Map<string, { date: string; count: number }[]>()
    for (const row of rows) {
      const key = String(row.licensee_id)
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push({ date: row.day, count: Number(row.count) })
    }
    return Array.from(grouped.entries()).map(([id, days]) => ({ _id: id, days }))
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
