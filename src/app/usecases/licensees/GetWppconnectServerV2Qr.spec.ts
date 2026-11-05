import { licenseeComplete as licenseeCompleteFactory } from '@factories/licensee'
import { inbox as inboxFactory } from '@factories/inbox'
import { LicenseeRepositoryMemory } from '@repositories/licensee'
import { InboxRepositoryMemory } from '@repositories/inbox'
import { GetWppconnectServerV2Qr } from './GetWppconnectServerV2Qr'

describe('GetWppconnectServerV2Qr', () => {
  it('returns { qr } when plugin.getQrCode() returns a QR data URL', async () => {
    const licenseeRepository = new LicenseeRepositoryMemory()
    const inboxRepository = new InboxRepositoryMemory()
    const plugin = { getQrCode: jest.fn().mockResolvedValue('data:image/png;base64,abc123') }
    const createMessengerPlugin = jest.fn().mockReturnValue(plugin)
    const useCase = new GetWppconnectServerV2Qr({ licenseeRepository, inboxRepository, createMessengerPlugin })
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
    expect(plugin.getQrCode).toHaveBeenCalledWith('https://my-wppconnect-server-v2.com', 'session-token')
    expect(response).toEqual({ qr: 'data:image/png;base64,abc123' })
  })

  it('returns { connected: true, message: "Já conectado" } when plugin.getQrCode() returns null', async () => {
    const licenseeRepository = new LicenseeRepositoryMemory()
    const inboxRepository = new InboxRepositoryMemory()
    const plugin = { getQrCode: jest.fn().mockResolvedValue(null) }
    const createMessengerPlugin = jest.fn().mockReturnValue(plugin)
    const useCase = new GetWppconnectServerV2Qr({ licenseeRepository, inboxRepository, createMessengerPlugin })
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

    const response = await useCase.execute(licensee._id)

    expect(response).toEqual({ connected: true, message: 'Já conectado' })
  })

  it('returns { message: "Licensee não usa Wppconnect Server v2" } when licensee has no wppconnect-server-v2 inbox', async () => {
    const licenseeRepository = new LicenseeRepositoryMemory()
    const inboxRepository = new InboxRepositoryMemory()
    const createMessengerPlugin = jest.fn()
    const useCase = new GetWppconnectServerV2Qr({ licenseeRepository, inboxRepository, createMessengerPlugin })
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(
      inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'dialog' }),
    )

    const response = await useCase.execute(licensee._id)

    expect(createMessengerPlugin).not.toHaveBeenCalled()
    expect(response).toEqual({ message: 'Licensee não usa Wppconnect Server v2' })
  })

  it('returns { message: "Licensee não usa Wppconnect Server v2" } when licensee is not found', async () => {
    const licenseeRepository = new LicenseeRepositoryMemory()
    const inboxRepository = new InboxRepositoryMemory()
    const createMessengerPlugin = jest.fn()
    const useCase = new GetWppconnectServerV2Qr({ licenseeRepository, inboxRepository, createMessengerPlugin })

    const response = await useCase.execute('000000000000000000000001')

    expect(createMessengerPlugin).not.toHaveBeenCalled()
    expect(response).toEqual({ message: 'Licensee não usa Wppconnect Server v2' })
  })

  it('returns a missing-configuration message when whatsappUrl/whatsappToken are missing', async () => {
    const licenseeRepository = new LicenseeRepositoryMemory()
    const inboxRepository = new InboxRepositoryMemory()
    const createMessengerPlugin = jest.fn()
    const useCase = new GetWppconnectServerV2Qr({ licenseeRepository, inboxRepository, createMessengerPlugin })
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(
      inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'wppconnect-server-v2' }),
    )

    const response = await useCase.execute(licensee._id)

    expect(createMessengerPlugin).not.toHaveBeenCalled()
    expect(response).toEqual({ message: 'Configuração incompleta: whatsappUrl e whatsappToken são obrigatórios' })
  })
})
