import { IRepository } from '@repositories/repository'
import { ILicensee, IInbox, IDepartment } from '../../../types'

const WHATSAPP_DEFAULT_WPPCONNECT_SERVER = 'wppconnect-server'

interface GetWppconnectServerStatusForDepartmentDeps {
  departmentRepository: IRepository<IDepartment>
  licenseeRepository: IRepository<ILicensee>
  inboxRepository: IRepository<IInbox>
  createMessengerPlugin: (licensee: ILicensee, extras: Record<string, any>) => any
  getWppconnectServerStatusForInbox: { execute(inboxId: string): Promise<{ connected: boolean }> }
}

class GetWppconnectServerStatusForDepartment {
  departmentRepository: IRepository<IDepartment>
  licenseeRepository: IRepository<ILicensee>
  inboxRepository: IRepository<IInbox>
  createMessengerPlugin: GetWppconnectServerStatusForDepartmentDeps['createMessengerPlugin']
  getWppconnectServerStatusForInbox: GetWppconnectServerStatusForDepartmentDeps['getWppconnectServerStatusForInbox']

  constructor({
    departmentRepository,
    licenseeRepository,
    inboxRepository,
    createMessengerPlugin,
    getWppconnectServerStatusForInbox,
  }: GetWppconnectServerStatusForDepartmentDeps) {
    this.departmentRepository = departmentRepository
    this.licenseeRepository = licenseeRepository
    this.inboxRepository = inboxRepository
    this.createMessengerPlugin = createMessengerPlugin
    this.getWppconnectServerStatusForInbox = getWppconnectServerStatusForInbox
  }

  async execute(departmentId: string): Promise<{ connected: boolean }> {
    const department = await this.departmentRepository.findFirst({ _id: departmentId })
    if (!department) {
      return { connected: false }
    }

    if (department.inbox) {
      return this.getWppconnectServerStatusForInbox.execute(department.inbox as string)
    }

    const licensee = await this.licenseeRepository.findFirst({ _id: department.licensee })
    if (!licensee) return { connected: false }

    const inbox = await this.inboxRepository.findFirst({
      licensee: String(department.licensee),
      kind: 'messenger',
      whatsappDefault: WHATSAPP_DEFAULT_WPPCONNECT_SERVER,
    })
    if (!inbox || !inbox.whatsappUrl || !inbox.whatsappToken) return { connected: false }

    const plugin = this.createMessengerPlugin(licensee, { department, inbox })
    const connected = await plugin.getConnectionStatus(inbox.whatsappUrl, inbox.whatsappToken)

    return { connected }
  }
}

export { GetWppconnectServerStatusForDepartment }
