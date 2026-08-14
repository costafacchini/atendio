import { licenseeComplete as licenseeCompleteFactory } from '@factories/licensee'
import { inbox as inboxFactory } from '@factories/inbox'
import { LicenseeRepositoryMemory } from '@repositories/licensee'
import { InboxRepositoryMemory } from '@repositories/inbox'
import { GetBaileysQr } from './GetBaileysQr'

describe('GetBaileysQr', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.ENABLE_BAILEYS_SOCKET
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('returns { qr } when plugin.getQrCode() returns a QR string', async () => {
    const licenseeRepository = new LicenseeRepositoryMemory()
    const inboxRepository = new InboxRepositoryMemory()
    const plugin = { getQrCode: jest.fn().mockResolvedValue('qr-string-data') }
    const createMessengerPlugin = jest.fn().mockReturnValue(plugin)
    const useCase = new GetBaileysQr({ licenseeRepository, inboxRepository, createMessengerPlugin })
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    const inbox = await inboxRepository.create(
      inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'baileys' }),
    )

    const response = await useCase.execute(licensee._id)

    expect(createMessengerPlugin).toHaveBeenCalledWith(licensee, { inbox })
    expect(plugin.getQrCode).toHaveBeenCalled()
    expect(response).toEqual({ qr: 'qr-string-data' })
  })

  it('returns { message: "Já conectado" } when plugin.getQrCode() returns null', async () => {
    const licenseeRepository = new LicenseeRepositoryMemory()
    const inboxRepository = new InboxRepositoryMemory()
    const plugin = { getQrCode: jest.fn().mockResolvedValue(null) }
    const createMessengerPlugin = jest.fn().mockReturnValue(plugin)
    const useCase = new GetBaileysQr({ licenseeRepository, inboxRepository, createMessengerPlugin })
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(
      inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'baileys' }),
    )

    const response = await useCase.execute(licensee._id)

    expect(response).toEqual({ message: 'Já conectado' })
  })

  it('returns { message: "Licensee não usa Baileys" } when licensee has no baileys inbox', async () => {
    const licenseeRepository = new LicenseeRepositoryMemory()
    const inboxRepository = new InboxRepositoryMemory()
    const plugin = { getQrCode: jest.fn() }
    const createMessengerPlugin = jest.fn().mockReturnValue(plugin)
    const useCase = new GetBaileysQr({ licenseeRepository, inboxRepository, createMessengerPlugin })
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(
      inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'dialog' }),
    )

    const response = await useCase.execute(licensee._id)

    expect(createMessengerPlugin).not.toHaveBeenCalled()
    expect(plugin.getQrCode).not.toHaveBeenCalled()
    expect(response).toEqual({ message: 'Licensee não usa Baileys' })
  })

  it('does not call startBaileysSocket when QR is returned (avoid conflicting sockets during pairing)', async () => {
    process.env.ENABLE_BAILEYS_SOCKET = 'true'
    const licenseeRepository = new LicenseeRepositoryMemory()
    const inboxRepository = new InboxRepositoryMemory()
    const plugin = { getQrCode: jest.fn().mockResolvedValue('qr-string-data') }
    const createMessengerPlugin = jest.fn().mockReturnValue(plugin)
    const startBaileysSocket = jest.fn().mockResolvedValue(undefined)
    const useCase = new GetBaileysQr({ licenseeRepository, inboxRepository, createMessengerPlugin, startBaileysSocket })
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(
      inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'baileys' }),
    )

    const response = await useCase.execute(licensee._id)

    expect(response).toEqual({ qr: 'qr-string-data' })
    expect(startBaileysSocket).not.toHaveBeenCalled()
  })

  it('calls startBaileysSocket when ENABLE_BAILEYS_SOCKET is true and already connected (qr is null)', async () => {
    process.env.ENABLE_BAILEYS_SOCKET = 'true'
    const licenseeRepository = new LicenseeRepositoryMemory()
    const inboxRepository = new InboxRepositoryMemory()
    const plugin = { getQrCode: jest.fn().mockResolvedValue(null) }
    const createMessengerPlugin = jest.fn().mockReturnValue(plugin)
    const startBaileysSocket = jest.fn().mockResolvedValue(undefined)
    const useCase = new GetBaileysQr({ licenseeRepository, inboxRepository, createMessengerPlugin, startBaileysSocket })
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    const inbox = await inboxRepository.create(
      inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'baileys' }),
    )

    const response = await useCase.execute(licensee._id)

    expect(response).toEqual({ message: 'Já conectado' })
    expect(startBaileysSocket).toHaveBeenCalledWith(licensee, inbox)
  })

  it('does not call startBaileysSocket when ENABLE_BAILEYS_SOCKET is not set', async () => {
    const licenseeRepository = new LicenseeRepositoryMemory()
    const inboxRepository = new InboxRepositoryMemory()
    const plugin = { getQrCode: jest.fn().mockResolvedValue('qr-string-data') }
    const createMessengerPlugin = jest.fn().mockReturnValue(plugin)
    const startBaileysSocket = jest.fn()
    const useCase = new GetBaileysQr({ licenseeRepository, inboxRepository, createMessengerPlugin, startBaileysSocket })
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(
      inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'baileys' }),
    )

    await useCase.execute(licensee._id)

    expect(startBaileysSocket).not.toHaveBeenCalled()
  })
})
