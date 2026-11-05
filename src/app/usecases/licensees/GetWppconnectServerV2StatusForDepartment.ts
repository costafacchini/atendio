import { IRepository } from '@repositories/repository'
import { ILicensee, IInbox, IDepartment } from '../../../types'

const WHATSAPP_DEFAULT_WPPCONNECT_SERVER = 'wppconnect-server-v2'

interface GetWppconnectServerV2StatusForDepartmentDeps {
  departmentRepository: IRepository<IDepartment>
  licenseeRepository: IRepository<ILicensee>
  inboxRepository: IRepository<IInbox>
  createMessengerPlugin: (licensee: ILicensee, extras: Record<string, any>) => any
  getWppconnectServerV2StatusForInbox: { execute(inboxId: string): Promise<{ connected: boolean }> }
}

class GetWppconnectServerV2StatusForDepartment {
  departmentRepository: IRepository<IDepartment>
  licenseeRepository: IRepository<ILicensee>
  inboxRepository: IRepository<IInbox>
  createMessengerPlugin: GetWppconnectServerV2StatusForDepartmentDeps['createMessengerPlugin']
  getWppconnectServerV2StatusForInbox: GetWppconnectServerV2StatusForDepartmentDeps['getWppconnectServerV2StatusForInbox']

  constructor({
    departmentRepository,
    licenseeRepository,
    inboxRepository,
    createMessengerPlugin,
    getWppconnectServerV2StatusForInbox,
  }: GetWppconnectServerV2StatusForDepartmentDeps) {
    this.departmentRepository = departmentRepository
    this.licenseeRepository = licenseeRepository
    this.inboxRepository = inboxRepository
    this.createMessengerPlugin = createMessengerPlugin
    this.getWppconnectServerV2StatusForInbox = getWppconnectServerV2StatusForInbox
  }

  async execute(departmentId: string): Promise<{ connected: boolean }> {
    const department = await this.departmentRepository.findFirst({ _id: departmentId })
    if (!department) {
      return { connected: false }
    }

    if (department.inbox) {
      return this.getWppconnectServerV2StatusForInbox.execute(department.inbox as string)
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

export { GetWppconnectServerV2StatusForDepartment }
