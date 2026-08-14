import { IRepository } from '@repositories/repository'
import { ILicensee, IInbox, IContact } from '../../../types'

const WHATSAPP_DEFAULT_BAILEYS = 'baileys'
const NOT_BAILEYS_MESSAGE = 'Licensee não usa Baileys'

interface ContactRepositoryWithGroups extends IRepository<IContact> {
  deactivateGroupsForLicensee(licenseeId: string): Promise<void>
}

interface SyncBaileysDirectoryDeps {
  licenseeRepository: IRepository<ILicensee>
  inboxRepository: IRepository<IInbox>
  contactRepository: ContactRepositoryWithGroups
  createMessengerPlugin: (licensee: ILicensee, extras: Record<string, any>) => any
}

class SyncBaileysDirectory {
  licenseeRepository: IRepository<ILicensee>
  inboxRepository: IRepository<IInbox>
  contactRepository: ContactRepositoryWithGroups
  createMessengerPlugin: SyncBaileysDirectoryDeps['createMessengerPlugin']

  constructor({
    licenseeRepository,
    inboxRepository,
    contactRepository,
    createMessengerPlugin,
  }: SyncBaileysDirectoryDeps) {
    this.licenseeRepository = licenseeRepository
    this.inboxRepository = inboxRepository
    this.contactRepository = contactRepository
    this.createMessengerPlugin = createMessengerPlugin
  }

  async execute(id: string) {
    const licensee = await this.licenseeRepository.findFirst({ _id: id })
    if (!licensee) return { message: NOT_BAILEYS_MESSAGE }

    const inbox = await this.inboxRepository.findFirst({
      licensee: id,
      kind: 'messenger',
      whatsappDefault: WHATSAPP_DEFAULT_BAILEYS,
    })
    if (!inbox) return { message: NOT_BAILEYS_MESSAGE }

    const plugin = this.createMessengerPlugin(licensee, { inbox })

    await this.contactRepository.deactivateGroupsForLicensee(licensee._id)

    const { groups } = await plugin.fetchGroups()

    let importedGroups = 0
    let updatedGroups = 0
    const importedContacts = 0
    const updatedContacts = 0
    const skipped = 0

    for (const group of groups) {
      const { waId, name, number, type } = group

      let existing = null

      if (waId) {
        existing = await this.contactRepository.findFirst({ licensee: licensee._id, waId })
      }

      if (!existing) {
        existing = await this.contactRepository.findFirst({ licensee: licensee._id, number, type })
      }

      const payload = {
        name,
        number,
        type,
        waId,
        talkingWithChatBot: false,
        licensee: licensee._id,
        isGroup: true,
        active: true,
      }

      if (existing) {
        await this.contactRepository.update(existing._id, payload)
        updatedGroups += 1
      } else {
        await this.contactRepository.create(payload)
        importedGroups += 1
      }
    }

    return { importedContacts, updatedContacts, importedGroups, updatedGroups, skipped }
  }
}

export { SyncBaileysDirectory, NOT_BAILEYS_MESSAGE }
