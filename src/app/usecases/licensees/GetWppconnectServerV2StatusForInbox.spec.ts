import { GetWppconnectServerV2StatusForInbox } from './GetWppconnectServerV2StatusForInbox'
import { LicenseeRepositoryMemory } from '@repositories/licensee'
import { InboxRepositoryMemory } from '@repositories/inbox'
import { licenseeComplete as licenseeCompleteFactory } from '@factories/licensee'

function buildUseCase(overrides: Record<string, any> = {}) {
  const licenseeRepository = overrides.licenseeRepository ?? new LicenseeRepositoryMemory()
  const inboxRepository = overrides.inboxRepository ?? new InboxRepositoryMemory()
  const createMessengerPlugin = overrides.createMessengerPlugin ?? jest.fn()
  const useCase = new GetWppconnectServerV2StatusForInbox({
    licenseeRepository,
    inboxRepository,
    createMessengerPlugin,
  })
  return { licenseeRepository, inboxRepository, createMessengerPlugin, useCase }
}

describe('GetWppconnectServerV2StatusForInbox', () => {
  it('returns { connected: false } when inbox is not found', async () => {
    const { useCase } = buildUseCase()

    const result = await useCase.execute('000000000000000000000000')

    expect(result).toEqual({ connected: false })
  })

  it('returns { connected: false } when inbox does not use wppconnect-server-v2', async () => {
    const { licenseeRepository, inboxRepository, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    const inbox = await inboxRepository.create({
      name: 'Suporte',
      licensee: licensee._id,
      kind: 'messenger',
      whatsappDefault: 'dialog',
    })

    const result = await useCase.execute(inbox._id)

    expect(result).toEqual({ connected: false })
  })

  it('returns { connected: false } when licensee is not found', async () => {
    const { inboxRepository, useCase } = buildUseCase()
    const inbox = await inboxRepository.create({
      name: 'Suporte',
      licensee: '000000000000000000000001',
      kind: 'messenger',
      whatsappDefault: 'wppconnect-server-v2',
    })

    const result = await useCase.execute(inbox._id)

    expect(result).toEqual({ connected: false })
  })

  it('returns { connected: false } when whatsappUrl or whatsappToken is missing', async () => {
    const { licenseeRepository, inboxRepository, createMessengerPlugin, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    const inbox = await inboxRepository.create({
      name: 'Suporte',
      licensee: licensee._id,
      kind: 'messenger',
      whatsappDefault: 'wppconnect-server-v2',
    })

    const result = await useCase.execute(inbox._id)

    expect(createMessengerPlugin).not.toHaveBeenCalled()
    expect(result).toEqual({ connected: false })
  })

  it('returns { connected: true } when plugin.getConnectionStatus() resolves true', async () => {
    const { licenseeRepository, inboxRepository, createMessengerPlugin, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    const inbox = await inboxRepository.create({
      name: 'Suporte',
      licensee: licensee._id,
      kind: 'messenger',
      whatsappDefault: 'wppconnect-server-v2',
      whatsappUrl: 'https://my-wppconnect-server-v2.com',
      whatsappToken: 'session-token',
    })
    const plugin = { getConnectionStatus: jest.fn().mockResolvedValue(true) }
    createMessengerPlugin.mockReturnValue(plugin)

    const result = await useCase.execute(inbox._id)

    expect(plugin.getConnectionStatus).toHaveBeenCalledWith('https://my-wppconnect-server-v2.com', 'session-token')
    expect(result).toEqual({ connected: true })
  })

  it('returns { connected: false } when plugin.getConnectionStatus() resolves false', async () => {
    const { licenseeRepository, inboxRepository, createMessengerPlugin, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    const inbox = await inboxRepository.create({
      name: 'Suporte',
      licensee: licensee._id,
      kind: 'messenger',
      whatsappDefault: 'wppconnect-server-v2',
      whatsappUrl: 'https://my-wppconnect-server-v2.com',
      whatsappToken: 'session-token',
    })
    const plugin = { getConnectionStatus: jest.fn().mockResolvedValue(false) }
    createMessengerPlugin.mockReturnValue(plugin)

    const result = await useCase.execute(inbox._id)

    expect(result).toEqual({ connected: false })
  })
})
