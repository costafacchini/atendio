import { IRepository } from '@repositories/repository'
import { ILicensee, IInbox } from '../../../types'

const WHATSAPP_DEFAULT_WPPCONNECT_SERVER = 'wppconnect-server'

interface GetWppconnectServerQrDeps {
  licenseeRepository: IRepository<ILicensee>
  inboxRepository: IRepository<IInbox>
  createMessengerPlugin: (licensee: ILicensee, extras: Record<string, any>) => any
}

class GetWppconnectServerQr {
  licenseeRepository: IRepository<ILicensee>
  inboxRepository: IRepository<IInbox>
  createMessengerPlugin: GetWppconnectServerQrDeps['createMessengerPlugin']

  constructor({ licenseeRepository, inboxRepository, createMessengerPlugin }: GetWppconnectServerQrDeps) {
    this.licenseeRepository = licenseeRepository
    this.inboxRepository = inboxRepository
    this.createMessengerPlugin = createMessengerPlugin
  }

  async execute(id: string): Promise<{ qr: string } | { message: string } | { connected: boolean; message: string }> {
    const licensee = await this.licenseeRepository.findFirst({ _id: id })
    if (!licensee) return { message: 'Licensee não usa Wppconnect Server' }

    const inbox = await this.inboxRepository.findFirst({
      licensee: id,
      kind: 'messenger',
      whatsappDefault: WHATSAPP_DEFAULT_WPPCONNECT_SERVER,
    })
    if (!inbox) return { message: 'Licensee não usa Wppconnect Server' }

    if (!inbox.whatsappUrl || !inbox.whatsappToken) {
      return { message: 'Configuração incompleta: whatsappUrl e whatsappToken são obrigatórios' }
    }

    const plugin = this.createMessengerPlugin(licensee, { inbox })
    const qr = await plugin.getQrCode(inbox.whatsappUrl, inbox.whatsappToken)

    if (!qr) {
      return { connected: true, message: 'Já conectado' }
    }

    return { qr }
  }
}

export { GetWppconnectServerQr }
