import { GetWppconnectServerQrForInbox } from './GetWppconnectServerQrForInbox'
import { LicenseeRepositoryMemory } from '@repositories/licensee'
import { InboxRepositoryMemory } from '@repositories/inbox'
import { licenseeComplete as licenseeCompleteFactory } from '@factories/licensee'

function buildUseCase(overrides: Record<string, any> = {}) {
  const licenseeRepository = overrides.licenseeRepository ?? new LicenseeRepositoryMemory()
  const inboxRepository = overrides.inboxRepository ?? new InboxRepositoryMemory()
  const createMessengerPlugin = overrides.createMessengerPlugin ?? jest.fn()
  const useCase = new GetWppconnectServerQrForInbox({ licenseeRepository, inboxRepository, createMessengerPlugin })
  return { licenseeRepository, inboxRepository, createMessengerPlugin, useCase }
}

describe('GetWppconnectServerQrForInbox', () => {
  it('returns { message: "Inbox não encontrado" } when inbox is not found', async () => {
    const { useCase } = buildUseCase()

    const result = await useCase.execute('000000000000000000000000')

    expect(result).toEqual({ message: 'Inbox não encontrado' })
  })

  it('returns { message: "Inbox não usa Wppconnect Server" } when inbox does not use wppconnect-server', async () => {
    const { licenseeRepository, inboxRepository, createMessengerPlugin, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    const inbox = await inboxRepository.create({
      name: 'Suporte',
      licensee: licensee._id,
      kind: 'messenger',
      whatsappDefault: 'dialog',
      whatsappUrl: 'https://my-wppconnect-server.com',
      whatsappToken: 'session-token',
    })

    const result = await useCase.execute(inbox._id)

    expect(createMessengerPlugin).not.toHaveBeenCalled()
    expect(result).toEqual({ message: 'Inbox não usa Wppconnect Server' })
  })

  it('returns { message: "Inbox não usa Wppconnect Server" } when licensee is not found', async () => {
    const { inboxRepository, createMessengerPlugin, useCase } = buildUseCase()
    const inbox = await inboxRepository.create({
      name: 'Suporte',
      licensee: '000000000000000000000001',
      kind: 'messenger',
      whatsappDefault: 'wppconnect-server',
      whatsappUrl: 'https://my-wppconnect-server.com',
      whatsappToken: 'session-token',
    })

    const result = await useCase.execute(inbox._id)

    expect(createMessengerPlugin).not.toHaveBeenCalled()
    expect(result).toEqual({ message: 'Inbox não usa Wppconnect Server' })
  })

  it('returns a missing-configuration message when whatsappUrl is not set', async () => {
    const { licenseeRepository, inboxRepository, createMessengerPlugin, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    const inbox = await inboxRepository.create({
      name: 'Suporte',
      licensee: licensee._id,
      kind: 'messenger',
      whatsappDefault: 'wppconnect-server',
      whatsappToken: 'session-token',
    })

    const result = await useCase.execute(inbox._id)

    expect(createMessengerPlugin).not.toHaveBeenCalled()
    expect(result).toEqual({ message: 'Configuração incompleta: whatsappUrl e whatsappToken são obrigatórios' })
  })

  it('returns a missing-configuration message when whatsappToken is not set', async () => {
    const { licenseeRepository, inboxRepository, createMessengerPlugin, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    const inbox = await inboxRepository.create({
      name: 'Suporte',
      licensee: licensee._id,
      kind: 'messenger',
      whatsappDefault: 'wppconnect-server',
      whatsappUrl: 'https://my-wppconnect-server.com',
    })

    const result = await useCase.execute(inbox._id)

    expect(createMessengerPlugin).not.toHaveBeenCalled()
    expect(result).toEqual({ message: 'Configuração incompleta: whatsappUrl e whatsappToken são obrigatórios' })
  })

  it('returns { qr } when plugin.getQrCode() returns a QR data URL', async () => {
    const { licenseeRepository, inboxRepository, createMessengerPlugin, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    const inbox = await inboxRepository.create({
      name: 'Suporte',
      licensee: licensee._id,
      kind: 'messenger',
      whatsappDefault: 'wppconnect-server',
      whatsappUrl: 'https://my-wppconnect-server.com',
      whatsappToken: 'session-token',
    })
    const plugin = { getQrCode: jest.fn().mockResolvedValue('data:image/png;base64,abc123') }
    createMessengerPlugin.mockReturnValue(plugin)

    const result = await useCase.execute(inbox._id)

    expect(createMessengerPlugin).toHaveBeenCalledWith(licensee, { inbox })
    expect(plugin.getQrCode).toHaveBeenCalledWith('https://my-wppconnect-server.com', 'session-token')
    expect(result).toEqual({ qr: 'data:image/png;base64,abc123' })
  })

  it('returns { connected: true, message: "Já conectado" } when plugin.getQrCode() returns null', async () => {
    const { licenseeRepository, inboxRepository, createMessengerPlugin, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    const inbox = await inboxRepository.create({
      name: 'Suporte',
      licensee: licensee._id,
      kind: 'messenger',
      whatsappDefault: 'wppconnect-server',
      whatsappUrl: 'https://my-wppconnect-server.com',
      whatsappToken: 'session-token',
    })
    const plugin = { getQrCode: jest.fn().mockResolvedValue(null) }
    createMessengerPlugin.mockReturnValue(plugin)

    const result = await useCase.execute(inbox._id)

    expect(result).toEqual({ connected: true, message: 'Já conectado' })
  })
})
