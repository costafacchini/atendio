import { GetWppconnectServerV2StatusForDepartment } from './GetWppconnectServerV2StatusForDepartment'
import { LicenseeRepositoryMemory } from '@repositories/licensee'
import { InboxRepositoryMemory } from '@repositories/inbox'
import { DepartmentRepositoryMemory } from '@repositories/department'
import { licenseeComplete as licenseeCompleteFactory } from '@factories/licensee'
import { inbox as inboxFactory } from '@factories/inbox'

function buildUseCase(overrides: Record<string, any> = {}) {
  const licenseeRepository = overrides.licenseeRepository ?? new LicenseeRepositoryMemory()
  const inboxRepository = overrides.inboxRepository ?? new InboxRepositoryMemory()
  const departmentRepository = overrides.departmentRepository ?? new DepartmentRepositoryMemory()
  const createMessengerPlugin = overrides.createMessengerPlugin ?? jest.fn()
  const getWppconnectServerV2StatusForInbox = overrides.getWppconnectServerV2StatusForInbox ?? { execute: jest.fn() }
  const useCase = new GetWppconnectServerV2StatusForDepartment({
    licenseeRepository,
    inboxRepository,
    departmentRepository,
    createMessengerPlugin,
    getWppconnectServerV2StatusForInbox,
  })
  return {
    licenseeRepository,
    inboxRepository,
    departmentRepository,
    createMessengerPlugin,
    getWppconnectServerV2StatusForInbox,
    useCase,
  }
}

describe('GetWppconnectServerV2StatusForDepartment', () => {
  it('returns { connected: false } when department is not found', async () => {
    const { useCase } = buildUseCase()

    const result = await useCase.execute('000000000000000000000000')

    expect(result).toEqual({ connected: false })
  })

  it('returns { connected: false } when licensee has no wppconnect-server-v2 inbox', async () => {
    const { licenseeRepository, inboxRepository, departmentRepository, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(
      inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'dialog' }),
    )
    const department = await departmentRepository.create({ name: 'Suporte', licensee: licensee._id })

    const result = await useCase.execute(department._id)

    expect(result).toEqual({ connected: false })
  })

  it('returns { connected: true } when plugin.getConnectionStatus() resolves true', async () => {
    const { licenseeRepository, inboxRepository, departmentRepository, createMessengerPlugin, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    const inbox = await inboxRepository.create(
      inboxFactory.build({
        licensee: licensee._id,
        kind: 'messenger',
        whatsappDefault: 'wppconnect-server-v2',
        whatsappUrl: 'https://my-wppconnect-server-v2.com',
        whatsappToken: 'session-token',
      }),
    )
    const department = await departmentRepository.create({ name: 'Suporte', licensee: licensee._id })
    const plugin = { getConnectionStatus: jest.fn().mockResolvedValue(true) }
    createMessengerPlugin.mockReturnValue(plugin)

    const result = await useCase.execute(department._id)

    expect(createMessengerPlugin).toHaveBeenCalledWith(licensee, { department, inbox })
    expect(result).toEqual({ connected: true })
  })

  it('delegates to getWppconnectServerV2StatusForInbox when department has a linked inbox', async () => {
    const inboxId = 'inbox-id-abc'
    const { departmentRepository, getWppconnectServerV2StatusForInbox, createMessengerPlugin, useCase } = buildUseCase()
    const department = await departmentRepository.create({ name: 'Suporte', licensee: 'licensee-id-1', inbox: inboxId })
    getWppconnectServerV2StatusForInbox.execute.mockResolvedValue({ connected: true })

    const result = await useCase.execute(department._id)

    expect(getWppconnectServerV2StatusForInbox.execute).toHaveBeenCalledWith(inboxId)
    expect(createMessengerPlugin).not.toHaveBeenCalled()
    expect(result).toEqual({ connected: true })
  })
})
