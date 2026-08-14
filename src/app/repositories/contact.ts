import { RepositoryMemory, PrismaRepository, comparableValue, sortRecords } from './repository'
import moment from 'moment-timezone'
import { NormalizePhone } from '../helpers/NormalizePhone'
import { requireDependency } from '../helpers/RequireDependency'
import { IContact } from '../../types'
import { getPrismaClient } from '../../config/postgres'
import { tryGetActiveRepositories } from './activeState'

class ContactRepositoryMemory extends RepositoryMemory<IContact> {
  messageRepository: any

  constructor({ items = [], messageRepository }: { items?: any[]; messageRepository?: any } = {}) {
    super(items)
    this.messageRepository = messageRepository
  }

  async create(fields: Partial<IContact> = {}): Promise<IContact> {
    return await super.create(this.normalizeContactFields(fields))
  }

  async contactWithWhatsappWindowClosed(contactId: any) {
    const messageRepository = requireDependency(this.messageRepository, 'messageRepository', 'ContactRepositoryMemory')
    const messages = sortRecords(await messageRepository.find({ destination: 'to-chat' }), {
      createdAt: 'desc',
    }).filter((message: any) => comparableValue(message.contact) === comparableValue(contactId))

    if (messages.length === 0) {
      return true
    }

    const now = moment.tz(new Date(), 'America/Sao_Paulo')
    const diff = now.diff(moment.tz(messages[0].createdAt, 'America/Sao_Paulo'), 'minutes')
    const twentyFourhoursInMinutes = 24 * 60

    return diff >= twentyFourhoursInMinutes
  }

  async getContactByNumber(number: any, licenseeId: any) {
    const normalizedPhone = new NormalizePhone(number)
    return await this.findFirst({
      number: normalizedPhone.number,
      licensee: licenseeId,
      type: normalizedPhone.type,
    })
  }

  async findByIds(ids: (string | number)[]): Promise<IContact[]> {
    const all = (await this.find()) as IContact[]
    const strIds = new Set(ids.map(String))
    return all.filter((c: any) => strIds.has(String(c._id)) || strIds.has(String(c.id)))
  }

  async deactivateGroupsForLicensee(licenseeId: any) {
    return await this.updateMany({ licensee: licenseeId, isGroup: true }, { active: false })
  }

  async findManyContacts({
    type,
    talkingWithChatBot,
    licensee,
    expression,
    startDate,
    endDate,
    isGroup,
    updatedAtStart,
    updatedAtEnd,
    page,
    limit,
  }: {
    type?: string
    talkingWithChatBot?: boolean
    licensee?: string
    expression?: string
    startDate?: Date | string
    endDate?: Date | string
    isGroup?: boolean
    updatedAtStart?: Date | string
    updatedAtEnd?: Date | string
    page?: number
    limit?: number
  }): Promise<IContact[]> {
    const params: any = { active: { $ne: false } }
    if (type) params.type = type
    if (talkingWithChatBot !== undefined) params.talkingWithChatBot = talkingWithChatBot
    if (licensee) params.licensee = licensee
    if (isGroup !== undefined) params.isGroup = isGroup

    if (startDate && endDate) params.wa_start_chat = { $gt: startDate, $lt: endDate }
    else if (endDate) params.wa_start_chat = { $lt: endDate }

    if (updatedAtStart && updatedAtEnd) params.updatedAt = { $gt: updatedAtStart, $lt: updatedAtEnd }
    else if (updatedAtStart) params.updatedAt = { $gt: updatedAtStart }
    else if (updatedAtEnd) params.updatedAt = { $lt: updatedAtEnd }

    if (expression) {
      const words = expression.split(' ').filter(Boolean)
      const fields = ['name', 'email', 'number', 'waId', 'landbotId']
      params.$or = words.flatMap((word) => fields.map((field) => ({ [field]: new RegExp(word, 'i') })))
    }

    const records = (await this.find(params)) as any[]
    const sorted = sortRecords(records, { createdAt: 'asc' })
    if (page == null || limit == null) return sorted
    return sorted.slice((page - 1) * limit, page * limit)
  }

  async save(document: any) {
    Object.assign(document, this.normalizeContactFields(document))
    return await super.save(document)
  }

  normalizeContactFields(fields: Record<string, any> = {}) {
    const normalizedFields: Record<string, any> = { ...(fields ?? {}) }
    const stringFields = ['landbotId', 'chatwootId', 'chatwootSourceId', 'customer_id', 'credit_card_id']

    if (!Array.isArray(normalizedFields.credit_cards)) {
      normalizedFields.credit_cards = []
    }

    stringFields.forEach((field) => {
      if (normalizedFields[field] != null) {
        normalizedFields[field] = `${normalizedFields[field]}`
      }
    })

    if (normalizedFields.number?.includes('@') || !normalizedFields.type) {
      const normalizedPhone = new NormalizePhone(normalizedFields.number)
      normalizedFields.number = normalizedPhone.number
      normalizedFields.type = normalizedPhone.type
    }

    return normalizedFields
  }
}

class PrismaContactDatabaseRepository extends PrismaRepository<IContact> {
  delegate() {
    return getPrismaClient().contact
  }
  protected fkFields() {
    return ['licensee']
  }

  async create(fields: Partial<IContact> = {}): Promise<IContact> {
    const normalized = this.normalizeNumber(fields)
    return await super.create(normalized)
  }

  async findIds(params: Record<string, unknown> = {}): Promise<number[]> {
    const records = await getPrismaClient().contact.findMany({
      where: this.toWhere(params) as any,
      select: { id: true },
    })
    return records.map((r) => r.id)
  }

  async findManyContacts({
    type,
    talkingWithChatBot,
    licensee,
    expression,
    startDate,
    endDate,
    isGroup,
    updatedAtStart,
    updatedAtEnd,
    page,
    limit,
  }: {
    type?: string
    talkingWithChatBot?: boolean
    licensee?: string
    expression?: string
    startDate?: Date | string
    endDate?: Date | string
    isGroup?: boolean
    updatedAtStart?: Date | string
    updatedAtEnd?: Date | string
    page?: number
    limit?: number
  }): Promise<IContact[]> {
    const where: any = { active: { not: false } }
    if (type) where.type = type
    if (talkingWithChatBot !== undefined) where.talkingWithChatBot = talkingWithChatBot
    if (licensee) where.licensee = parseInt(String(licensee), 10)
    if (isGroup !== undefined) where.isGroup = isGroup

    if (startDate && endDate) where.wa_start_chat = { gt: new Date(startDate), lt: new Date(endDate) }
    else if (endDate) where.wa_start_chat = { lt: new Date(endDate) }

    if (updatedAtStart && updatedAtEnd) where.updatedAt = { gt: new Date(updatedAtStart), lt: new Date(updatedAtEnd) }
    else if (updatedAtStart) where.updatedAt = { gt: new Date(updatedAtStart) }
    else if (updatedAtEnd) where.updatedAt = { lt: new Date(updatedAtEnd) }

    if (expression) {
      const words = expression.split(' ').filter(Boolean)
      const fields = ['name', 'email', 'number', 'waId', 'landbotId']
      where.OR = words.flatMap((word) => fields.map((field) => ({ [field]: { contains: word, mode: 'insensitive' } })))
    }

    const query: any = { where, orderBy: { createdAt: 'asc' } }
    if (page != null && limit != null) {
      query.skip = (page - 1) * limit
      query.take = limit
    }
    const records = await getPrismaClient().contact.findMany(query)
    return this.fromDBMany(records) as unknown as IContact[]
  }

  async findByIds(ids: (string | number)[]): Promise<IContact[]> {
    const intIds = ids.map((id) => parseInt(String(id), 10)).filter((id) => !isNaN(id))
    if (intIds.length === 0) return []
    const records = await getPrismaClient().contact.findMany({ where: { id: { in: intIds } } })
    return this.fromDBMany(records) as unknown as IContact[]
  }

  async deactivateGroupsForLicensee(licenseeId: string) {
    await getPrismaClient().contact.updateMany({
      where: { licensee: parseInt(String(licenseeId), 10), isGroup: true },
      data: { active: false },
    })
  }

  private normalizeNumber<F extends Partial<IContact>>(fields: F): F {
    const number = fields.number as string | undefined
    if (!number) return fields
    if (!number.includes('@') && (fields as any).type) return fields
    const normalizedPhone = new NormalizePhone(number)
    return { ...fields, number: normalizedPhone.number, type: normalizedPhone.type }
  }
}

// Factory for backward-compatibility with specs that call new ContactRepositoryDatabase().
// Returns the active shared instance when memory repos are installed.

function ContactRepositoryDatabase(this: any): any {
  const active = tryGetActiveRepositories()
  if (active) return active.contactRepository
  return new ContactRepositoryMemory()
}
ContactRepositoryDatabase.prototype = ContactRepositoryMemory.prototype

export { ContactRepositoryDatabase, ContactRepositoryMemory, PrismaContactDatabaseRepository }
