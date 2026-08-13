import { IRepository } from '@repositories/repository'
import { ILicensee, IInbox, IDepartment, IWhatsappSession } from '../../../types'

interface GetBaileysStatusForDepartmentDeps {
  departmentRepository: IRepository<IDepartment>
  licenseeRepository: IRepository<ILicensee>
  inboxRepository: IRepository<IInbox>
  whatsappSessionRepository: IRepository<IWhatsappSession>
  startBaileysSocket?: (licensee: ILicensee, department: IDepartment) => Promise<void>
  socketManager?: { isConnectedForLicensee(licenseeId: string, entityId: string): boolean }
  getBaileysStatusForInbox: { execute(inboxId: string): Promise<{ connected: boolean }> }
}

class GetBaileysStatusForDepartment {
  departmentRepository: IRepository<IDepartment>
  licenseeRepository: IRepository<ILicensee>
  inboxRepository: IRepository<IInbox>
  whatsappSessionRepository: IRepository<IWhatsappSession>
  startBaileysSocket?: GetBaileysStatusForDepartmentDeps['startBaileysSocket']
  socketManager?: GetBaileysStatusForDepartmentDeps['socketManager']
  getBaileysStatusForInbox: GetBaileysStatusForDepartmentDeps['getBaileysStatusForInbox']

  constructor({
    departmentRepository,
    licenseeRepository,
    inboxRepository,
    whatsappSessionRepository,
    startBaileysSocket,
    socketManager,
    getBaileysStatusForInbox,
  }: GetBaileysStatusForDepartmentDeps) {
    this.departmentRepository = departmentRepository
    this.licenseeRepository = licenseeRepository
    this.inboxRepository = inboxRepository
    this.whatsappSessionRepository = whatsappSessionRepository
    this.startBaileysSocket = startBaileysSocket
    this.socketManager = socketManager
    this.getBaileysStatusForInbox = getBaileysStatusForInbox
  }

  async execute(departmentId: string) {
    const department = await this.departmentRepository.findFirst({ _id: departmentId })
    if (!department) {
      return { connected: false }
    }

    if (department.inbox) {
      return this.getBaileysStatusForInbox.execute(department.inbox as string)
    }

    const licensee = await this.licenseeRepository.findFirst({ _id: department.licensee })
    if (!licensee) return { connected: false }

    const inbox = await this.inboxRepository.findFirst({ licensee: String(department.licensee), kind: 'messenger', whatsappDefault: 'baileys' })
    if (!inbox) return { connected: false }

    const session = await this.whatsappSessionRepository.findFirst({
      licensee: licensee._id,
      department: department._id,
    })
    const connected = !!(session?.creds && Object.keys(session.creds).length > 0)

    if (connected && process.env.ENABLE_BAILEYS_SOCKET === 'true' && this.startBaileysSocket) {
      if (!this.socketManager?.isConnectedForLicensee(licensee._id, department._id)) {
        this.startBaileysSocket(licensee, department).catch(() => {})
      }
    }

    return { connected }
  }
}

export { GetBaileysStatusForDepartment }
