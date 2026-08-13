import { licenseeComplete as licenseeCompleteFactory } from '@factories/licensee'
import { inbox as inboxFactory } from '@factories/inbox'
import { contact as contactFactory } from '@factories/contact'
import { LicenseeRepositoryMemory } from '@repositories/licensee'
import { InboxRepositoryMemory } from '@repositories/inbox'
import { ContactRepositoryMemory } from '@repositories/contact'
import { DepartmentRepositoryMemory } from '@repositories/department'
import { SyncBaileysDirectoryForDepartment, NOT_BAILEYS_MESSAGE } from './SyncBaileysDirectoryForDepartment'

const DEFAULT_GROUPS = [
  {
    waId: '1234567890@g.us',
    name: 'Grupo Alpha',
    number: '1234567890',
    type: '@g.us',
  },
  {
    waId: '9876543210@g.us',
    name: 'Grupo Beta',
    number: '9876543210',
    type: '@g.us',
  },
]

function buildUseCase({ groups, syncBaileysDirectoryForInbox }: Record<string, any> = {}) {
  const departmentRepository = new DepartmentRepositoryMemory()
  const licenseeRepository = new LicenseeRepositoryMemory()
  const inboxRepository = new InboxRepositoryMemory()
  const contactRepository = new ContactRepositoryMemory()
  const resolvedGroups = groups !== undefined ? groups : DEFAULT_GROUPS
  const plugin = { fetchGroups: jest.fn().mockResolvedValue({ groups: resolvedGroups }) }
  const createMessengerPlugin = jest.fn().mockReturnValue(plugin)
  const resolvedSyncForInbox = syncBaileysDirectoryForInbox ?? { execute: jest.fn() }
  const useCase = new SyncBaileysDirectoryForDepartment({
    departmentRepository,
    licenseeRepository,
    inboxRepository,
    contactRepository,
    createMessengerPlugin,
    syncBaileysDirectoryForInbox: resolvedSyncForInbox,
  })
  return {
    departmentRepository,
    licenseeRepository,
    inboxRepository,
    contactRepository,
    createMessengerPlugin,
    plugin,
    syncBaileysDirectoryForInbox: resolvedSyncForInbox,
    useCase,
  }
}

describe('SyncBaileysDirectoryForDepartment', () => {
  it('returns message when department is not found', async () => {
    const { useCase, createMessengerPlugin } = buildUseCase()

    const result = await useCase.execute('000000000000000000000000')

    expect(createMessengerPlugin).not.toHaveBeenCalled()
    expect(result).toEqual({ message: 'Departamento não encontrado' })
  })

  it('returns NOT_BAILEYS_MESSAGE when licensee has no baileys inbox', async () => {
    const { departmentRepository, licenseeRepository, inboxRepository, useCase, createMessengerPlugin } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'dialog' }))
    const department = await departmentRepository.create({ name: 'Suporte', licensee: licensee._id })

    const result = await useCase.execute(department._id)

    expect(createMessengerPlugin).not.toHaveBeenCalled()
    expect(result).toEqual({ message: NOT_BAILEYS_MESSAGE })
  })

  it('returns NOT_BAILEYS_MESSAGE when licensee is not found', async () => {
    const { departmentRepository, useCase, createMessengerPlugin } = buildUseCase()
    const department = await departmentRepository.create({ name: 'Suporte', licensee: '000000000000000000000001' })

    const result = await useCase.execute(department._id)

    expect(createMessengerPlugin).not.toHaveBeenCalled()
    expect(result).toEqual({ message: NOT_BAILEYS_MESSAGE })
  })

  it('imports new groups as contacts with isGroup: true', async () => {
    const { departmentRepository, licenseeRepository, inboxRepository, contactRepository, useCase, plugin } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'baileys' }))
    const department = await departmentRepository.create({ name: 'Suporte', licensee: licensee._id })

    const result = await useCase.execute(department._id)

    expect(plugin.fetchGroups).toHaveBeenCalled()
    expect(result).toEqual({ importedContacts: 0, updatedContacts: 0, importedGroups: 2, updatedGroups: 0, skipped: 0 })

    const contacts = await contactRepository.find({ licensee: licensee._id })
    expect(contacts.length).toBe(2)
    expect(contacts[0].isGroup).toBe(true)
    expect(contacts[1].isGroup).toBe(true)
  })

  it('updates existing contacts matched by waId', async () => {
    const { departmentRepository, licenseeRepository, inboxRepository, contactRepository, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'baileys' }))
    const department = await departmentRepository.create({ name: 'Suporte', licensee: licensee._id })
    await contactRepository.create(
      contactFactory.build({
        number: '1234567890',
        type: '@g.us',
        waId: '1234567890@g.us',
        name: 'Old Name',
        licensee: licensee._id,
        talkingWithChatBot: false,
      }),
    )

    const result = await useCase.execute(department._id)

    expect(result).toEqual({ importedContacts: 0, updatedContacts: 0, importedGroups: 1, updatedGroups: 1, skipped: 0 })

    const contacts = await contactRepository.find({ licensee: licensee._id })
    expect(contacts.length).toBe(2)
    const updated = contacts.find((c) => c.waId === '1234567890@g.us')
    expect(updated.name).toBe('Grupo Alpha')
    expect(updated.isGroup).toBe(true)
  })

  it('updates existing contacts matched by number+type when waId does not match any existing', async () => {
    const { departmentRepository, licenseeRepository, inboxRepository, contactRepository, useCase } = buildUseCase({
      groups: [{ waId: '1234567890@g.us', name: 'Grupo Alpha', number: '1234567890', type: '@g.us' }],
    })
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'baileys' }))
    const department = await departmentRepository.create({ name: 'Suporte', licensee: licensee._id })
    await contactRepository.create(
      contactFactory.build({
        number: '1234567890',
        type: '@g.us',
        waId: undefined,
        name: 'Old Name Without WaId',
        licensee: licensee._id,
        talkingWithChatBot: false,
      }),
    )

    const result = await useCase.execute(department._id)

    expect(result).toEqual({ importedContacts: 0, updatedContacts: 0, importedGroups: 0, updatedGroups: 1, skipped: 0 })

    const contacts = await contactRepository.find({ licensee: licensee._id })
    expect(contacts.length).toBe(1)
    expect(contacts[0].name).toBe('Grupo Alpha')
    expect(contacts[0].isGroup).toBe(true)
  })

  it('passes licensee, department, and inbox to createMessengerPlugin', async () => {
    const { departmentRepository, licenseeRepository, inboxRepository, createMessengerPlugin, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    const inbox = await inboxRepository.create(inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'baileys' }))
    const department = await departmentRepository.create({ name: 'Suporte', licensee: licensee._id })

    await useCase.execute(department._id)

    expect(createMessengerPlugin).toHaveBeenCalledWith(licensee, { department, inbox })
  })

  it('deactivates existing groups for the licensee before syncing', async () => {
    const { departmentRepository, licenseeRepository, inboxRepository, contactRepository, useCase } = buildUseCase({ groups: [] })
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'baileys' }))
    const department = await departmentRepository.create({ name: 'Suporte', licensee: licensee._id })
    const group = await contactRepository.create(
      contactFactory.build({
        number: '1234567890',
        type: '@g.us',
        waId: '1234567890@g.us',
        isGroup: true,
        active: true,
        licensee: licensee._id,
        talkingWithChatBot: false,
      }),
    )

    await useCase.execute(department._id)

    const contacts = await contactRepository.find({ licensee: licensee._id })
    const deactivated = contacts.find((c) => String(c._id) === String(group._id))
    expect(deactivated.active).toBe(false)
  })

  it('reactivates an inactive group that matches during sync', async () => {
    const { departmentRepository, licenseeRepository, inboxRepository, contactRepository, useCase } = buildUseCase({
      groups: [{ waId: '1234567890@g.us', name: 'Grupo Alpha', number: '1234567890', type: '@g.us' }],
    })
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'baileys' }))
    const department = await departmentRepository.create({ name: 'Suporte', licensee: licensee._id })
    await contactRepository.create(
      contactFactory.build({
        number: '1234567890',
        type: '@g.us',
        waId: '1234567890@g.us',
        isGroup: true,
        active: false,
        licensee: licensee._id,
        talkingWithChatBot: false,
      }),
    )

    const result = await useCase.execute(department._id)

    expect(result).toEqual({ importedContacts: 0, updatedContacts: 0, importedGroups: 0, updatedGroups: 1, skipped: 0 })

    const contacts = await contactRepository.find({ licensee: licensee._id })
    expect(contacts.length).toBe(1)
    expect(contacts[0].active).toBe(true)
    expect(contacts[0].isGroup).toBe(true)
  })

  it('returns zero counts when groups list is empty', async () => {
    const { departmentRepository, licenseeRepository, inboxRepository, useCase } = buildUseCase({ groups: [] })
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'baileys' }))
    const department = await departmentRepository.create({ name: 'Suporte', licensee: licensee._id })

    const result = await useCase.execute(department._id)

    expect(result).toEqual({ importedContacts: 0, updatedContacts: 0, importedGroups: 0, updatedGroups: 0, skipped: 0 })
  })

  it('delegates to syncBaileysDirectoryForInbox when department has a linked inbox', async () => {
    const inboxId = 'inbox-id-abc'
    const syncBaileysDirectoryForInbox = {
      execute: jest.fn().mockResolvedValue({ importedGroups: 3, updatedGroups: 0 }),
    }
    const { departmentRepository, createMessengerPlugin, useCase } = buildUseCase({ syncBaileysDirectoryForInbox })
    const department = await departmentRepository.create({ name: 'Suporte', licensee: 'licensee-id-1', inbox: inboxId })

    const result = await useCase.execute(department._id)

    expect(syncBaileysDirectoryForInbox.execute).toHaveBeenCalledWith(inboxId)
    expect(createMessengerPlugin).not.toHaveBeenCalled()
    expect(result).toEqual({ importedGroups: 3, updatedGroups: 0 })
  })
})
