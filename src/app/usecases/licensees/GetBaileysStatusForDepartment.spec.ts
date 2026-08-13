import { GetBaileysStatusForDepartment } from './GetBaileysStatusForDepartment'
import { LicenseeRepositoryMemory } from '@repositories/licensee'
import { InboxRepositoryMemory } from '@repositories/inbox'
import { WhatsappSessionRepositoryMemory } from '@repositories/whatsappsession'
import { DepartmentRepositoryMemory } from '@repositories/department'
import { licenseeComplete as licenseeCompleteFactory } from '@factories/licensee'
import { inbox as inboxFactory } from '@factories/inbox'

function buildUseCase(overrides: Record<string, any> = {}) {
  const licenseeRepository = overrides.licenseeRepository ?? new LicenseeRepositoryMemory()
  const inboxRepository = overrides.inboxRepository ?? new InboxRepositoryMemory()
  const whatsappSessionRepository = overrides.whatsappSessionRepository ?? new WhatsappSessionRepositoryMemory()
  const departmentRepository = overrides.departmentRepository ?? new DepartmentRepositoryMemory()
  const startBaileysSocket = overrides.startBaileysSocket
  const socketManager = overrides.socketManager
  const getBaileysStatusForInbox = overrides.getBaileysStatusForInbox ?? { execute: jest.fn() }
  const useCase = new GetBaileysStatusForDepartment({
    licenseeRepository,
    inboxRepository,
    whatsappSessionRepository,
    departmentRepository,
    startBaileysSocket,
    socketManager,
    getBaileysStatusForInbox,
  })
  return { licenseeRepository, inboxRepository, whatsappSessionRepository, departmentRepository, getBaileysStatusForInbox, useCase }
}

describe('GetBaileysStatusForDepartment', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.ENABLE_BAILEYS_SOCKET
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('returns { connected: false } when department is not found', async () => {
    const { useCase } = buildUseCase()

    const result = await useCase.execute('000000000000000000000000')

    expect(result).toEqual({ connected: false })
  })

  it('returns { connected: false } when licensee has no baileys inbox', async () => {
    const { licenseeRepository, inboxRepository, departmentRepository, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'dialog' }))
    const department = await departmentRepository.create({ name: 'Suporte', licensee: licensee._id })

    const result = await useCase.execute(department._id)

    expect(result).toEqual({ connected: false })
  })

  it('returns { connected: false } when no session exists for the licensee', async () => {
    const { licenseeRepository, inboxRepository, departmentRepository, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'baileys' }))
    const department = await departmentRepository.create({ name: 'Suporte', licensee: licensee._id })

    const result = await useCase.execute(department._id)

    expect(result).toEqual({ connected: false })
  })

  it('returns { connected: false } when department session exists but creds are empty', async () => {
    const { licenseeRepository, inboxRepository, whatsappSessionRepository, departmentRepository, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'baileys' }))
    const department = await departmentRepository.create({ name: 'Suporte', licensee: licensee._id })
    await whatsappSessionRepository.create({ licensee: licensee._id, department: department._id, creds: {}, keys: {} })

    const result = await useCase.execute(department._id)

    expect(result).toEqual({ connected: false })
  })

  it('returns { connected: true } when department session has non-empty creds', async () => {
    const { licenseeRepository, inboxRepository, whatsappSessionRepository, departmentRepository, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'baileys' }))
    const department = await departmentRepository.create({ name: 'Suporte', licensee: licensee._id })
    await whatsappSessionRepository.create({
      licensee: licensee._id,
      department: department._id,
      creds: { registered: true, me: { id: '5511999999999' } },
    })

    const result = await useCase.execute(department._id)

    expect(result).toEqual({ connected: true })
  })

  it('returns { connected: false } when only a general licensee session (no department) exists', async () => {
    const { licenseeRepository, inboxRepository, whatsappSessionRepository, departmentRepository, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'baileys' }))
    const department = await departmentRepository.create({ name: 'Suporte', licensee: licensee._id })
    await whatsappSessionRepository.create({
      licensee: licensee._id,
      creds: { registered: true, me: { id: '5511999999999' } },
    })

    const result = await useCase.execute(department._id)

    expect(result).toEqual({ connected: false })
  })

  it('starts the socket when connected and ENABLE_BAILEYS_SOCKET is true and socket is not yet running', async () => {
    process.env.ENABLE_BAILEYS_SOCKET = 'true'
    const startBaileysSocket = jest.fn().mockResolvedValue(undefined)
    const socketManager = { isConnectedForLicensee: jest.fn().mockReturnValue(false) }
    const { licenseeRepository, inboxRepository, whatsappSessionRepository, departmentRepository, useCase } = buildUseCase({
      startBaileysSocket,
      socketManager,
    })
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'baileys' }))
    const department = await departmentRepository.create({ name: 'Suporte', licensee: licensee._id })
    await whatsappSessionRepository.create({
      licensee: licensee._id,
      department: department._id,
      creds: { registered: true, me: { id: '5511999999999' } },
    })

    await useCase.execute(department._id)

    expect(startBaileysSocket).toHaveBeenCalledWith(licensee, department)
  })

  it('does not start the socket when already connected in socket manager', async () => {
    process.env.ENABLE_BAILEYS_SOCKET = 'true'
    const startBaileysSocket = jest.fn().mockResolvedValue(undefined)
    const socketManager = { isConnectedForLicensee: jest.fn().mockReturnValue(true) }
    const { licenseeRepository, inboxRepository, whatsappSessionRepository, departmentRepository, useCase } = buildUseCase({
      startBaileysSocket,
      socketManager,
    })
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'baileys' }))
    const department = await departmentRepository.create({ name: 'Suporte', licensee: licensee._id })
    await whatsappSessionRepository.create({
      licensee: licensee._id,
      department: department._id,
      creds: { registered: true, me: { id: '5511999999999' } },
    })

    await useCase.execute(department._id)

    expect(startBaileysSocket).not.toHaveBeenCalled()
  })

  it('delegates to getBaileysStatusForInbox when department has a linked inbox', async () => {
    const inboxId = 'inbox-id-abc'
    const { departmentRepository, getBaileysStatusForInbox, useCase } = buildUseCase()
    const department = await departmentRepository.create({ name: 'Suporte', licensee: 'licensee-id-1', inbox: inboxId })
    getBaileysStatusForInbox.execute.mockResolvedValue({ connected: true })

    const result = await useCase.execute(department._id)

    expect(getBaileysStatusForInbox.execute).toHaveBeenCalledWith(inboxId)
    expect(result).toEqual({ connected: true })
  })
})
