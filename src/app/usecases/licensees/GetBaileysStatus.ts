import { IRepository } from '@repositories/repository'
import { ILicensee, IInbox, IWhatsappSession } from '../../../types'

interface GetBaileysStatusDeps {
  licenseeRepository: IRepository<ILicensee>
  inboxRepository: IRepository<IInbox>
  whatsappSessionRepository: IRepository<IWhatsappSession>
  startBaileysSocket?: (licensee: ILicensee, inbox: IInbox) => Promise<void>
  socketManager?: { isConnected(id: string): boolean }
}

class GetBaileysStatus {
  licenseeRepository: IRepository<ILicensee>
  inboxRepository: IRepository<IInbox>
  whatsappSessionRepository: IRepository<IWhatsappSession>
  startBaileysSocket?: GetBaileysStatusDeps['startBaileysSocket']
  socketManager?: GetBaileysStatusDeps['socketManager']

  constructor({
    licenseeRepository,
    inboxRepository,
    whatsappSessionRepository,
    startBaileysSocket,
    socketManager,
  }: GetBaileysStatusDeps) {
    this.licenseeRepository = licenseeRepository
    this.inboxRepository = inboxRepository
    this.whatsappSessionRepository = whatsappSessionRepository
    this.startBaileysSocket = startBaileysSocket
    this.socketManager = socketManager
  }

  async execute(id: string): Promise<{ connected: boolean }> {
    const licensee = await this.licenseeRepository.findFirst({ _id: id })
    if (!licensee) return { connected: false }

    const inbox = await this.inboxRepository.findFirst({ licensee: id, kind: 'messenger', whatsappDefault: 'baileys' })
    if (!inbox) return { connected: false }

    const session = await this.whatsappSessionRepository.findFirst({ licensee: id })
    const connected = !!(session?.creds && Object.keys(session.creds).length > 0)

    if (connected && process.env.ENABLE_BAILEYS_SOCKET === 'true' && this.startBaileysSocket) {
      if (!this.socketManager?.isConnected(id)) {
        this.startBaileysSocket(licensee, inbox).catch(() => {})
      }
    }

    return { connected }
  }
}

export { GetBaileysStatus }
