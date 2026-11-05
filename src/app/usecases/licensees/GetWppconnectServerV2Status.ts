import { IRepository } from '@repositories/repository'
import { ILicensee, IInbox } from '../../../types'

const WHATSAPP_DEFAULT_WPPCONNECT_SERVER = 'wppconnect-server-v2'

interface GetWppconnectServerV2StatusDeps {
  licenseeRepository: IRepository<ILicensee>
  inboxRepository: IRepository<IInbox>
  createMessengerPlugin: (licensee: ILicensee, extras: Record<string, any>) => any
}

class GetWppconnectServerV2Status {
  licenseeRepository: IRepository<ILicensee>
  inboxRepository: IRepository<IInbox>
  createMessengerPlugin: GetWppconnectServerV2StatusDeps['createMessengerPlugin']

  constructor({ licenseeRepository, inboxRepository, createMessengerPlugin }: GetWppconnectServerV2StatusDeps) {
    this.licenseeRepository = licenseeRepository
    this.inboxRepository = inboxRepository
    this.createMessengerPlugin = createMessengerPlugin
  }

  async execute(id: string): Promise<{ connected: boolean }> {
    const licensee = await this.licenseeRepository.findFirst({ _id: id })
    if (!licensee) return { connected: false }

    const inbox = await this.inboxRepository.findFirst({
      licensee: id,
      kind: 'messenger',
      whatsappDefault: WHATSAPP_DEFAULT_WPPCONNECT_SERVER,
    })
    if (!inbox || !inbox.whatsappUrl || !inbox.whatsappToken) return { connected: false }

    const plugin = this.createMessengerPlugin(licensee, { inbox })
    const connected = await plugin.getConnectionStatus(inbox.whatsappUrl, inbox.whatsappToken)

    return { connected }
  }
}

export { GetWppconnectServerV2Status }
