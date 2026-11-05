import { licenseeComplete as licenseeCompleteFactory } from '@factories/licensee'
import { inbox as inboxFactory } from '@factories/inbox'
import { LicenseeRepositoryMemory } from '@repositories/licensee'
import { InboxRepositoryMemory } from '@repositories/inbox'
import { GetWppconnectServerV2Status } from './GetWppconnectServerV2Status'

describe('GetWppconnectServerV2Status', () => {
  it('returns { connected: true } when plugin.getConnectionStatus() resolves true', async () => {
    const licenseeRepository = new LicenseeRepositoryMemory()
    const inboxRepository = new InboxRepositoryMemory()
    const plugin = { getConnectionStatus: jest.fn().mockResolvedValue(true) }
    const createMessengerPlugin = jest.fn().mockReturnValue(plugin)
    const useCase = new GetWppconnectServerV2Status({ licenseeRepository, inboxRepository, createMessengerPlugin })
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

    const response = await useCase.execute(licensee._id)

    expect(createMessengerPlugin).toHaveBeenCalledWith(licensee, { inbox })
    expect(plugin.getConnectionStatus).toHaveBeenCalledWith('https://my-wppconnect-server-v2.com', 'session-token')
    expect(response).toEqual({ connected: true })
  })

  it('returns { connected: false } when licensee has no wppconnect-server-v2 inbox', async () => {
    const licenseeRepository = new LicenseeRepositoryMemory()
    const inboxRepository = new InboxRepositoryMemory()
    const createMessengerPlugin = jest.fn()
    const useCase = new GetWppconnectServerV2Status({ licenseeRepository, inboxRepository, createMessengerPlugin })
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(
      inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'dialog' }),
    )

    const response = await useCase.execute(licensee._id)

    expect(createMessengerPlugin).not.toHaveBeenCalled()
    expect(response).toEqual({ connected: false })
  })

  it('returns { connected: false } when licensee is not found', async () => {
    const licenseeRepository = new LicenseeRepositoryMemory()
    const inboxRepository = new InboxRepositoryMemory()
    const createMessengerPlugin = jest.fn()
    const useCase = new GetWppconnectServerV2Status({ licenseeRepository, inboxRepository, createMessengerPlugin })

    const response = await useCase.execute('000000000000000000000001')

    expect(response).toEqual({ connected: false })
  })

  it('returns { connected: false } when whatsappUrl/whatsappToken are missing', async () => {
    const licenseeRepository = new LicenseeRepositoryMemory()
    const inboxRepository = new InboxRepositoryMemory()
    const createMessengerPlugin = jest.fn()
    const useCase = new GetWppconnectServerV2Status({ licenseeRepository, inboxRepository, createMessengerPlugin })
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(
      inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'wppconnect-server-v2' }),
    )

    const response = await useCase.execute(licensee._id)

    expect(createMessengerPlugin).not.toHaveBeenCalled()
    expect(response).toEqual({ connected: false })
  })
})
