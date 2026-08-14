import { IRepository } from '@repositories/repository'
import { ILicensee, IInbox, IDepartment } from '../../../types'

interface GetBaileysQrForDepartmentDeps {
  departmentRepository: IRepository<IDepartment>
  licenseeRepository: IRepository<ILicensee>
  inboxRepository: IRepository<IInbox>
  createMessengerPlugin: (licensee: ILicensee, extras: Record<string, any>) => any
  startBaileysSocket?: (licensee: ILicensee, department: IDepartment) => Promise<void>
  getBaileysQrForInbox: { execute(inboxId: string): Promise<Record<string, any>> }
}

class GetBaileysQrForDepartment {
  departmentRepository: IRepository<IDepartment>
  licenseeRepository: IRepository<ILicensee>
  inboxRepository: IRepository<IInbox>
  createMessengerPlugin: GetBaileysQrForDepartmentDeps['createMessengerPlugin']
  startBaileysSocket?: GetBaileysQrForDepartmentDeps['startBaileysSocket']
  getBaileysQrForInbox: GetBaileysQrForDepartmentDeps['getBaileysQrForInbox']

  constructor({
    departmentRepository,
    licenseeRepository,
    inboxRepository,
    createMessengerPlugin,
    startBaileysSocket,
    getBaileysQrForInbox,
  }: GetBaileysQrForDepartmentDeps) {
    this.departmentRepository = departmentRepository
    this.licenseeRepository = licenseeRepository
    this.inboxRepository = inboxRepository
    this.createMessengerPlugin = createMessengerPlugin
    this.startBaileysSocket = startBaileysSocket
    this.getBaileysQrForInbox = getBaileysQrForInbox
  }

  async execute(departmentId: string) {
    const department = await this.departmentRepository.findFirst({ _id: departmentId })
    if (!department) {
      return { message: 'Departamento não encontrado' }
    }

    if (department.inbox) {
      return this.getBaileysQrForInbox.execute(department.inbox as string)
    }

    const licensee = await this.licenseeRepository.findFirst({ _id: department.licensee })
    if (!licensee) return { message: 'Licensee não usa Baileys' }

    const inbox = await this.inboxRepository.findFirst({
      licensee: String(department.licensee),
      kind: 'messenger',
      whatsappDefault: 'baileys',
    })
    if (!inbox) return { message: 'Licensee não usa Baileys' }

    const plugin = this.createMessengerPlugin(licensee, { department, inbox })
    const qr = await plugin.getQrCode()

    if (!qr) {
      if (process.env.ENABLE_BAILEYS_SOCKET === 'true') {
        this.startBaileysSocket?.(licensee, department).catch(() => {})
      }
      return { connected: true, message: 'Já conectado' }
    }

    return { qr }
  }
}

export { GetBaileysQrForDepartment }
