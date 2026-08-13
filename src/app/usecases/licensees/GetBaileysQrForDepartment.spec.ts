import { GetBaileysQrForDepartment } from './GetBaileysQrForDepartment'
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
  const startBaileysSocket = overrides.startBaileysSocket
  const getBaileysQrForInbox = overrides.getBaileysQrForInbox ?? { execute: jest.fn() }
  const useCase = new GetBaileysQrForDepartment({
    licenseeRepository,
    inboxRepository,
    departmentRepository,
    createMessengerPlugin,
    startBaileysSocket,
    getBaileysQrForInbox,
  })
  return { licenseeRepository, inboxRepository, departmentRepository, createMessengerPlugin, getBaileysQrForInbox, useCase }
}

describe('GetBaileysQrForDepartment', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.ENABLE_BAILEYS_SOCKET
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('returns { message: "Departamento não encontrado" } when department is not found', async () => {
    const { useCase } = buildUseCase()

    const result = await useCase.execute('000000000000000000000000')

    expect(result).toEqual({ message: 'Departamento não encontrado' })
  })

  it('returns { message: "Licensee não usa Baileys" } when licensee has no baileys inbox', async () => {
    const { licenseeRepository, inboxRepository, departmentRepository, createMessengerPlugin, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'dialog' }))
    const department = await departmentRepository.create({ name: 'Suporte', licensee: licensee._id })

    const result = await useCase.execute(department._id)

    expect(createMessengerPlugin).not.toHaveBeenCalled()
    expect(result).toEqual({ message: 'Licensee não usa Baileys' })
  })

  it('returns { qr } when plugin.getQrCode() returns a QR string', async () => {
    const { licenseeRepository, inboxRepository, departmentRepository, createMessengerPlugin, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    const inbox = await inboxRepository.create(inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'baileys' }))
    const department = await departmentRepository.create({ name: 'Suporte', licensee: licensee._id })
    const plugin = { getQrCode: jest.fn().mockResolvedValue('qr-string-data') }
    createMessengerPlugin.mockReturnValue(plugin)

    const result = await useCase.execute(department._id)

    expect(createMessengerPlugin).toHaveBeenCalledWith(licensee, { department, inbox })
    expect(result).toEqual({ qr: 'qr-string-data' })
  })

  it('returns { connected: true, message: "Já conectado" } when plugin.getQrCode() returns null', async () => {
    const { licenseeRepository, inboxRepository, departmentRepository, createMessengerPlugin, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'baileys' }))
    const department = await departmentRepository.create({ name: 'Suporte', licensee: licensee._id })
    const plugin = { getQrCode: jest.fn().mockResolvedValue(null) }
    createMessengerPlugin.mockReturnValue(plugin)

    const result = await useCase.execute(department._id)

    expect(result).toEqual({ connected: true, message: 'Já conectado' })
  })

  it('calls startBaileysSocket with licensee and department when ENABLE_BAILEYS_SOCKET is true and already connected', async () => {
    process.env.ENABLE_BAILEYS_SOCKET = 'true'
    const startBaileysSocket = jest.fn().mockResolvedValue(undefined)
    const { licenseeRepository, inboxRepository, departmentRepository, createMessengerPlugin, useCase } = buildUseCase({
      startBaileysSocket,
    })
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'baileys' }))
    const department = await departmentRepository.create({ name: 'Suporte', licensee: licensee._id })
    const plugin = { getQrCode: jest.fn().mockResolvedValue(null) }
    createMessengerPlugin.mockReturnValue(plugin)

    await useCase.execute(department._id)

    expect(startBaileysSocket).toHaveBeenCalledWith(licensee, department)
  })

  it('does not call startBaileysSocket when ENABLE_BAILEYS_SOCKET is not set', async () => {
    const startBaileysSocket = jest.fn()
    const { licenseeRepository, inboxRepository, departmentRepository, createMessengerPlugin, useCase } = buildUseCase({
      startBaileysSocket,
    })
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'baileys' }))
    const department = await departmentRepository.create({ name: 'Suporte', licensee: licensee._id })
    const plugin = { getQrCode: jest.fn().mockResolvedValue(null) }
    createMessengerPlugin.mockReturnValue(plugin)

    await useCase.execute(department._id)

    expect(startBaileysSocket).not.toHaveBeenCalled()
  })

  it('delegates to getBaileysQrForInbox when department has a linked inbox', async () => {
    const inboxId = 'inbox-id-abc'
    const { departmentRepository, getBaileysQrForInbox, createMessengerPlugin, useCase } = buildUseCase()
    const department = await departmentRepository.create({ name: 'Suporte', licensee: 'licensee-id-1', inbox: inboxId })
    getBaileysQrForInbox.execute.mockResolvedValue({ qr: 'inbox-qr-data' })

    const result = await useCase.execute(department._id)

    expect(getBaileysQrForInbox.execute).toHaveBeenCalledWith(inboxId)
    expect(createMessengerPlugin).not.toHaveBeenCalled()
    expect(result).toEqual({ qr: 'inbox-qr-data' })
  })
})
