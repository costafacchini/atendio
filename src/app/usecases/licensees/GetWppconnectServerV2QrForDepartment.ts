import { IRepository } from '@repositories/repository'
import { ILicensee, IInbox, IDepartment } from '../../../types'

const WHATSAPP_DEFAULT_WPPCONNECT_SERVER = 'wppconnect-server-v2'

interface GetWppconnectServerV2QrForDepartmentDeps {
  departmentRepository: IRepository<IDepartment>
  licenseeRepository: IRepository<ILicensee>
  inboxRepository: IRepository<IInbox>
  createMessengerPlugin: (licensee: ILicensee, extras: Record<string, any>) => any
  getWppconnectServerV2QrForInbox: { execute(inboxId: string): Promise<Record<string, any>> }
}

class GetWppconnectServerV2QrForDepartment {
  departmentRepository: IRepository<IDepartment>
  licenseeRepository: IRepository<ILicensee>
  inboxRepository: IRepository<IInbox>
  createMessengerPlugin: GetWppconnectServerV2QrForDepartmentDeps['createMessengerPlugin']
  getWppconnectServerV2QrForInbox: GetWppconnectServerV2QrForDepartmentDeps['getWppconnectServerV2QrForInbox']

  constructor({
    departmentRepository,
    licenseeRepository,
    inboxRepository,
    createMessengerPlugin,
    getWppconnectServerV2QrForInbox,
  }: GetWppconnectServerV2QrForDepartmentDeps) {
    this.departmentRepository = departmentRepository
    this.licenseeRepository = licenseeRepository
    this.inboxRepository = inboxRepository
    this.createMessengerPlugin = createMessengerPlugin
    this.getWppconnectServerV2QrForInbox = getWppconnectServerV2QrForInbox
  }

  async execute(departmentId: string) {
    const department = await this.departmentRepository.findFirst({ _id: departmentId })
    if (!department) {
      return { message: 'Departamento não encontrado' }
    }

    if (department.inbox) {
      return this.getWppconnectServerV2QrForInbox.execute(department.inbox as string)
    }

    const licensee = await this.licenseeRepository.findFirst({ _id: department.licensee })
    if (!licensee) return { message: 'Licensee não usa Wppconnect Server v2' }

    const inbox = await this.inboxRepository.findFirst({
      licensee: String(department.licensee),
      kind: 'messenger',
      whatsappDefault: WHATSAPP_DEFAULT_WPPCONNECT_SERVER,
    })
    if (!inbox) return { message: 'Licensee não usa Wppconnect Server v2' }

    if (!inbox.whatsappUrl || !inbox.whatsappToken) {
      return { message: 'Configuração incompleta: whatsappUrl e whatsappToken são obrigatórios' }
    }

    const plugin = this.createMessengerPlugin(licensee, { department, inbox })
    const qr = await plugin.getQrCode(inbox.whatsappUrl, inbox.whatsappToken)

    if (!qr) {
      return { connected: true, message: 'Já conectado' }
    }

    return { qr }
  }
}

export { GetWppconnectServerV2QrForDepartment }
