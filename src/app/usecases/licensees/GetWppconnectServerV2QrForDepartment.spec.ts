import { GetWppconnectServerV2QrForDepartment } from './GetWppconnectServerV2QrForDepartment'
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
  const getWppconnectServerV2QrForInbox = overrides.getWppconnectServerV2QrForInbox ?? { execute: jest.fn() }
  const useCase = new GetWppconnectServerV2QrForDepartment({
    licenseeRepository,
    inboxRepository,
    departmentRepository,
    createMessengerPlugin,
    getWppconnectServerV2QrForInbox,
  })
  return {
    licenseeRepository,
    inboxRepository,
    departmentRepository,
    createMessengerPlugin,
    getWppconnectServerV2QrForInbox,
    useCase,
  }
}

describe('GetWppconnectServerV2QrForDepartment', () => {
  it('returns { message: "Departamento não encontrado" } when department is not found', async () => {
    const { useCase } = buildUseCase()

    const result = await useCase.execute('000000000000000000000000')

    expect(result).toEqual({ message: 'Departamento não encontrado' })
  })

  it('returns { message: "Licensee não usa Wppconnect Server v2" } when licensee has no wppconnect-server-v2 inbox', async () => {
    const { licenseeRepository, inboxRepository, departmentRepository, createMessengerPlugin, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(
      inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'dialog' }),
    )
    const department = await departmentRepository.create({ name: 'Suporte', licensee: licensee._id })

    const result = await useCase.execute(department._id)

    expect(createMessengerPlugin).not.toHaveBeenCalled()
    expect(result).toEqual({ message: 'Licensee não usa Wppconnect Server v2' })
  })

  it('returns a missing-configuration message when the resolved inbox has no whatsappUrl/whatsappToken', async () => {
    const { licenseeRepository, inboxRepository, departmentRepository, createMessengerPlugin, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(
      inboxFactory.build({
        licensee: licensee._id,
        kind: 'messenger',
        whatsappDefault: 'wppconnect-server-v2',
        whatsappUrl: '',
        whatsappToken: '',
      }),
    )
    const department = await departmentRepository.create({ name: 'Suporte', licensee: licensee._id })

    const result = await useCase.execute(department._id)

    expect(createMessengerPlugin).not.toHaveBeenCalled()
    expect(result).toEqual({ message: 'Configuração incompleta: whatsappUrl e whatsappToken são obrigatórios' })
  })

  it('returns { qr } when plugin.getQrCode() returns a QR data URL', async () => {
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
    const plugin = { getQrCode: jest.fn().mockResolvedValue('data:image/png;base64,abc123') }
    createMessengerPlugin.mockReturnValue(plugin)

    const result = await useCase.execute(department._id)

    expect(createMessengerPlugin).toHaveBeenCalledWith(licensee, { department, inbox })
    expect(plugin.getQrCode).toHaveBeenCalledWith('https://my-wppconnect-server-v2.com', 'session-token')
    expect(result).toEqual({ qr: 'data:image/png;base64,abc123' })
  })

  it('returns { connected: true, message: "Já conectado" } when plugin.getQrCode() returns null', async () => {
    const { licenseeRepository, inboxRepository, departmentRepository, createMessengerPlugin, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(
      inboxFactory.build({
        licensee: licensee._id,
        kind: 'messenger',
        whatsappDefault: 'wppconnect-server-v2',
        whatsappUrl: 'https://my-wppconnect-server-v2.com',
        whatsappToken: 'session-token',
      }),
    )
    const department = await departmentRepository.create({ name: 'Suporte', licensee: licensee._id })
    const plugin = { getQrCode: jest.fn().mockResolvedValue(null) }
    createMessengerPlugin.mockReturnValue(plugin)

    const result = await useCase.execute(department._id)

    expect(result).toEqual({ connected: true, message: 'Já conectado' })
  })

  it('delegates to getWppconnectServerV2QrForInbox when department has a linked inbox', async () => {
    const inboxId = 'inbox-id-abc'
    const { departmentRepository, getWppconnectServerV2QrForInbox, createMessengerPlugin, useCase } = buildUseCase()
    const department = await departmentRepository.create({ name: 'Suporte', licensee: 'licensee-id-1', inbox: inboxId })
    getWppconnectServerV2QrForInbox.execute.mockResolvedValue({ qr: 'inbox-qr-data' })

    const result = await useCase.execute(department._id)

    expect(getWppconnectServerV2QrForInbox.execute).toHaveBeenCalledWith(inboxId)
    expect(createMessengerPlugin).not.toHaveBeenCalled()
    expect(result).toEqual({ qr: 'inbox-qr-data' })
  })
})
