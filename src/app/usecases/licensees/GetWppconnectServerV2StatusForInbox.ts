import { IRepository } from '@repositories/repository'
import { ILicensee, IInbox } from '../../../types'

const WHATSAPP_DEFAULT_WPPCONNECT_SERVER = 'wppconnect-server-v2'

interface GetWppconnectServerV2StatusForInboxDeps {
  inboxRepository: IRepository<IInbox>
  licenseeRepository: IRepository<ILicensee>
  createMessengerPlugin: (licensee: ILicensee, extras: Record<string, any>) => any
}

class GetWppconnectServerV2StatusForInbox {
  inboxRepository: IRepository<IInbox>
  licenseeRepository: IRepository<ILicensee>
  createMessengerPlugin: GetWppconnectServerV2StatusForInboxDeps['createMessengerPlugin']

  constructor({ inboxRepository, licenseeRepository, createMessengerPlugin }: GetWppconnectServerV2StatusForInboxDeps) {
    this.inboxRepository = inboxRepository
    this.licenseeRepository = licenseeRepository
    this.createMessengerPlugin = createMessengerPlugin
  }

  async execute(inboxId: string): Promise<{ connected: boolean }> {
    const inbox = await this.inboxRepository.findFirst({ _id: inboxId })
    if (!inbox) {
      return { connected: false }
    }

    const licensee = await this.licenseeRepository.findFirst({ _id: inbox.licensee })
    if (!licensee || inbox.whatsappDefault !== WHATSAPP_DEFAULT_WPPCONNECT_SERVER) {
      return { connected: false }
    }

    if (!inbox.whatsappUrl || !inbox.whatsappToken) {
      return { connected: false }
    }

    const plugin = this.createMessengerPlugin(licensee, { inbox })
    const connected = await plugin.getConnectionStatus(inbox.whatsappUrl, inbox.whatsappToken)

    return { connected }
  }
}

export { GetWppconnectServerV2StatusForInbox }
