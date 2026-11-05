import { IRepository } from '@repositories/repository'
import { ILicensee, IInbox } from '../../../types'

const WHATSAPP_DEFAULT_WPPCONNECT_SERVER = 'wppconnect-server'

interface GetWppconnectServerQrForInboxDeps {
  inboxRepository: IRepository<IInbox>
  licenseeRepository: IRepository<ILicensee>
  createMessengerPlugin: (licensee: ILicensee, extras: Record<string, any>) => any
}

class GetWppconnectServerQrForInbox {
  inboxRepository: IRepository<IInbox>
  licenseeRepository: IRepository<ILicensee>
  createMessengerPlugin: GetWppconnectServerQrForInboxDeps['createMessengerPlugin']

  constructor({ inboxRepository, licenseeRepository, createMessengerPlugin }: GetWppconnectServerQrForInboxDeps) {
    this.inboxRepository = inboxRepository
    this.licenseeRepository = licenseeRepository
    this.createMessengerPlugin = createMessengerPlugin
  }

  async execute(inboxId: string) {
    const inbox = await this.inboxRepository.findFirst({ _id: inboxId })
    if (!inbox) {
      return { message: 'Inbox não encontrado' }
    }

    const licensee = await this.licenseeRepository.findFirst({ _id: inbox.licensee })
    if (!licensee || inbox.whatsappDefault !== WHATSAPP_DEFAULT_WPPCONNECT_SERVER) {
      return { message: 'Inbox não usa Wppconnect Server' }
    }

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

export { GetWppconnectServerQrForInbox }
