import { RepositoryMemory, PrismaRepository } from './repository'
import { ILicensee } from '../../types'
import { getPrismaClient } from '../../config/postgres'
import { tryGetActiveRepositories } from './activeState'

class LicenseeRepositoryMemory extends RepositoryMemory<ILicensee> {
  async create(fields: Partial<ILicensee> = {}): Promise<ILicensee> {
    return await super.create(this.normalizeLicenseeFields(fields))
  }

  async save(document: any) {
    Object.assign(document, this.normalizeLicenseeFields(document))
    return await super.save(document)
  }

  normalizeLicenseeFields(fields: Record<string, any> = {}) {
    const normalizedFields: Record<string, any> = { ...(fields ?? {}) }
    const stringFields = ['apiToken']

    stringFields.forEach((field) => {
      if (normalizedFields[field] != null) {
        normalizedFields[field] = `${normalizedFields[field]}`
      }
    })

    if (normalizedFields.whatsappDefault === 'utalk') {
      normalizedFields.whatsappUrl = 'https://v1.utalk.chat/send/'
    }

    if (normalizedFields.whatsappDefault === 'dialog') {
      normalizedFields.whatsappUrl = 'https://waba.360dialog.io/'
    }

    if (normalizedFields.whatsappDefault === 'ycloud') {
      normalizedFields.whatsappUrl = 'https://api.ycloud.com/v2/'
    }

    return normalizedFields
  }
}

const WHATSAPP_URLS: Record<string, string> = {
  utalk: 'https://v1.utalk.chat/send/',
  dialog: 'https://waba.360dialog.io/',
  ycloud: 'https://api.ycloud.com/v2/',
}

class PrismaLicenseeDatabaseRepository extends PrismaRepository<ILicensee> {
  delegate() {
    return getPrismaClient().licensee
  }

  async create(fields: Partial<ILicensee> = {}): Promise<ILicensee> {
    return await super.create(this.applyWhatsappUrl(fields))
  }

  async save(document: ILicensee): Promise<ILicensee> {
    return await super.save(this.applyWhatsappUrl(document) as ILicensee)
  }

  private applyWhatsappUrl<F extends Partial<ILicensee>>(fields: F): F {
    const whatsappDefault = (fields as any).whatsappDefault as string | undefined
    if (whatsappDefault && WHATSAPP_URLS[whatsappDefault]) {
      return { ...fields, whatsappUrl: WHATSAPP_URLS[whatsappDefault] }
    }
    return fields
  }
}

// Factory for backward-compatibility with specs that call new LicenseeRepositoryDatabase().
// Returns the active shared instance when memory repos are installed.

function LicenseeRepositoryDatabase(this: any): any {
  const active = tryGetActiveRepositories()
  if (active) return active.licenseeRepository
  return new LicenseeRepositoryMemory()
}
LicenseeRepositoryDatabase.prototype = LicenseeRepositoryMemory.prototype

export { LicenseeRepositoryDatabase, LicenseeRepositoryMemory, PrismaLicenseeDatabaseRepository }
