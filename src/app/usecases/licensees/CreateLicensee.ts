const CREATE_LICENSEE_FIELDS = [
  'name',
  'email',
  'phone',
  'licenseKind',
  'useChatbot',
  'chatbotDefault',
  'chatbotUrl',
  'chatbotAuthorizationToken',
  'messageOnResetChatbot',
  'chatbotApiToken',
  'unidadeId',
  'statusId',
  'messageOnCloseChat',
  'document',
  'kind',
  'financial_player_fee',
  'holder_name',
  'bank',
  'branch_number',
  'branch_check_digit',
  'account_number',
  'account_check_digit',
  'holder_kind',
  'holder_document',
  'account_type',
  'useSenderName',
  'useFileIDYcloud',
]

import { IRepository } from '@repositories/repository'
import { ILicensee } from '../../../types'

interface CreateLicenseeDeps {
  licenseeRepository: IRepository<ILicensee>
}

function pickFields(fields: Record<string, any> = {}, keys: string[] = []) {
  return keys.reduce((payload: Record<string, any>, key: string) => {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      payload[key] = fields[key]
    }

    return payload
  }, {})
}

class CreateLicensee {
  licenseeRepository: IRepository<ILicensee>

  constructor({ licenseeRepository }: CreateLicenseeDeps) {
    this.licenseeRepository = licenseeRepository
  }

  async execute(fields: Record<string, any> = {}): Promise<ILicensee> {
    const payload = { ...pickFields(fields, CREATE_LICENSEE_FIELDS), active: true }

    return await this.licenseeRepository.create(payload)
  }
}

export { CreateLicensee, CREATE_LICENSEE_FIELDS }
