import { IRepository } from '@repositories/repository'
import { ILicensee, IInbox } from '../../../types'

interface GetBaileysQrDeps {
  licenseeRepository: IRepository<ILicensee>
  inboxRepository: IRepository<IInbox>
  createMessengerPlugin: (licensee: ILicensee, extras: Record<string, any>) => any
  startBaileysSocket?: (licensee: ILicensee, inbox: IInbox) => Promise<void>
}

class GetBaileysQr {
  licenseeRepository: IRepository<ILicensee>
  inboxRepository: IRepository<IInbox>
  createMessengerPlugin: GetBaileysQrDeps['createMessengerPlugin']
  startBaileysSocket?: GetBaileysQrDeps['startBaileysSocket']

  constructor({ licenseeRepository, inboxRepository, createMessengerPlugin, startBaileysSocket }: GetBaileysQrDeps) {
    this.licenseeRepository = licenseeRepository
    this.inboxRepository = inboxRepository
    this.createMessengerPlugin = createMessengerPlugin
    this.startBaileysSocket = startBaileysSocket
  }

  async execute(id: string): Promise<{ qr: string } | { message: string }> {
    const licensee = await this.licenseeRepository.findFirst({ _id: id })
    if (!licensee) return { message: 'Licensee não usa Baileys' }

    const inbox = await this.inboxRepository.findFirst({ licensee: id, kind: 'messenger', whatsappDefault: 'baileys' })
    if (!inbox) return { message: 'Licensee não usa Baileys' }

    const plugin = this.createMessengerPlugin(licensee, { inbox })
    const qr = await plugin.getQrCode()

    if (!qr) {
      if (process.env.ENABLE_BAILEYS_SOCKET === 'true') {
        this.startBaileysSocket?.(licensee, inbox).catch(() => {})
      }
      return { message: 'Já conectado' }
    }

    return { qr }
  }
}

export { GetBaileysQr }
