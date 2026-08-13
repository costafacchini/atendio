import { v4 as uuidv4 } from 'uuid'

const ONBOARD_LICENSEE_FIELDS = ['name', 'email', 'phone', 'document', 'kind', 'useDepartments']

const CHAT_INBOX_FIELDS = ['chatDefault', 'chatUrl', 'chatIdentifier', 'chatKey']
const WHATSAPP_INBOX_FIELDS = ['whatsappDefault', 'whatsappToken', 'whatsappUrl']

function pickFields(fields: Record<string, any> = {}, keys: string[]) {
  return keys.reduce((payload: Record<string, any>, key) => {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      payload[key] = fields[key]
    }
    return payload
  }, {})
}

class OnboardAccount {
  licenseeRepository: any
  userRepository: any
  inboxRepository: any

  constructor({ licenseeRepository, userRepository, inboxRepository }: Record<string, any> = {}) {
    this.licenseeRepository = licenseeRepository
    this.userRepository = userRepository
    this.inboxRepository = inboxRepository
  }

  async execute(fields: Record<string, any> = {}) {
    const licenseePayload = {
      ...pickFields(fields, ONBOARD_LICENSEE_FIELDS),
      name: fields.licenseeName,
      email: fields.licenseeEmail,
      licenseKind: 'demo',
      active: true,
      apiToken: uuidv4(),
    }

    const createdLicensee = await this.licenseeRepository.create(licenseePayload)

    const userPayload = {
      name: fields.userName,
      email: fields.userEmail,
      password: fields.password,
      role: 'admin',
      active: true,
      licensee: createdLicensee._id,
      language: fields.language ?? 'pt',
    }

    let createdUser
    try {
      createdUser = await this.userRepository.create(userPayload)
    } catch (err) {
      await this.licenseeRepository.delete({ _id: createdLicensee._id })
      throw err
    }

    await this.createInboxes(fields, createdLicensee._id)

    return { licensee: createdLicensee, user: createdUser }
  }

  private async createInboxes(fields: Record<string, any>, licenseeId: string) {
    if (!this.inboxRepository) return

    if (fields.chatDefault) {
      await this.inboxRepository.create({
        name: 'Chat',
        kind: 'chat',
        licensee: licenseeId,
        active: true,
        ...pickFields(fields, CHAT_INBOX_FIELDS),
      })
    }

    if (fields.whatsappDefault) {
      await this.inboxRepository.create({
        name: 'WhatsApp',
        kind: 'messenger',
        licensee: licenseeId,
        active: true,
        ...pickFields(fields, WHATSAPP_INBOX_FIELDS),
      })
    }
  }
}

export { OnboardAccount }
