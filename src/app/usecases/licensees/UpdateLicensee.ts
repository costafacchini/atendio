const UPDATE_LICENSEE_FIELDS = [
  'name',
  'email',
  'phone',
  'active',
  'licenseKind',
  'useChatbot',
  'chatbotDefault',
  'chatbotUrl',
  'chatbotAuthorizationToken',
  'chatbotApiToken',
  'messageOnResetChatbot',
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

interface UpdateLicenseeDeps {
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

class UpdateLicensee {
  licenseeRepository: IRepository<ILicensee>

  constructor({ licenseeRepository }: UpdateLicenseeDeps) {
    this.licenseeRepository = licenseeRepository
  }

  async execute(id: string, fields: Record<string, any> = {}): Promise<ILicensee | null> {
    const payload = pickFields(fields, UPDATE_LICENSEE_FIELDS)

    await this.licenseeRepository.update(id, payload)

    return await this.licenseeRepository.findFirst({ _id: id })
  }
}

export { UpdateLicensee, UPDATE_LICENSEE_FIELDS }
