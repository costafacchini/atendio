import { v4 as uuidv4 } from 'uuid'

const ONBOARD_LICENSEE_FIELDS = [
  'name',
  'email',
  'phone',
  'document',
  'kind',
  'chatDefault',
  'chatUrl',
  'chatIdentifier',
  'chatKey',
  'whatsappDefault',
  'whatsappToken',
  'whatsappUrl',
  'useDepartments',
]

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

  constructor({ licenseeRepository, userRepository }: Record<string, any> = {}) {
    this.licenseeRepository = licenseeRepository
    this.userRepository = userRepository
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

    try {
      const createdUser = await this.userRepository.create(userPayload)
      return { licensee: createdLicensee, user: createdUser }
    } catch (err) {
      await this.licenseeRepository.delete({ _id: createdLicensee._id })
      throw err
    }
  }
}

export { OnboardAccount }
