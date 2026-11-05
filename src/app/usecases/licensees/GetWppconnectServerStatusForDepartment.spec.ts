import { GetWppconnectServerStatusForDepartment } from './GetWppconnectServerStatusForDepartment'
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
  const getWppconnectServerStatusForInbox = overrides.getWppconnectServerStatusForInbox ?? { execute: jest.fn() }
  const useCase = new GetWppconnectServerStatusForDepartment({
    licenseeRepository,
    inboxRepository,
    departmentRepository,
    createMessengerPlugin,
    getWppconnectServerStatusForInbox,
  })
  return {
    licenseeRepository,
    inboxRepository,
    departmentRepository,
    createMessengerPlugin,
    getWppconnectServerStatusForInbox,
    useCase,
  }
}

describe('GetWppconnectServerStatusForDepartment', () => {
  it('returns { connected: false } when department is not found', async () => {
    const { useCase } = buildUseCase()

    const result = await useCase.execute('000000000000000000000000')

    expect(result).toEqual({ connected: false })
  })

  it('returns { connected: false } when licensee has no wppconnect-server inbox', async () => {
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
        whatsappDefault: 'wppconnect-server',
        whatsappUrl: 'https://my-wppconnect-server.com',
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

  it('delegates to getWppconnectServerStatusForInbox when department has a linked inbox', async () => {
    const inboxId = 'inbox-id-abc'
    const { departmentRepository, getWppconnectServerStatusForInbox, createMessengerPlugin, useCase } = buildUseCase()
    const department = await departmentRepository.create({ name: 'Suporte', licensee: 'licensee-id-1', inbox: inboxId })
    getWppconnectServerStatusForInbox.execute.mockResolvedValue({ connected: true })

    const result = await useCase.execute(department._id)

    expect(getWppconnectServerStatusForInbox.execute).toHaveBeenCalledWith(inboxId)
    expect(createMessengerPlugin).not.toHaveBeenCalled()
    expect(result).toEqual({ connected: true })
  })
})
