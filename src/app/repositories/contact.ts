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

  async deactivateGroupsForLicensee(licenseeId: any) {
    return await this.updateMany({ licensee: licenseeId, isGroup: true }, { active: false })
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

  async create(fields: Partial<IContact> = {}): Promise<IContact> {
    const normalized = this.normalizeNumber(fields)
    return await super.create(normalized)
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
