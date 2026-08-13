import { RepositoryMemory, PrismaRepository, sortRecords } from './repository'
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

  async findManyLicensees({
    chatbotDefault,
    active,
    expression,
    excludedIds,
    page,
    limit,
  }: {
    chatbotDefault?: string
    active?: boolean
    expression?: string
    excludedIds?: string[]
    page?: number
    limit?: number
  }): Promise<ILicensee[]> {
    const params: any = {}
    if (chatbotDefault) params.chatbotDefault = chatbotDefault
    if (active !== undefined) params.active = active
    if (excludedIds && excludedIds.length > 0) params._id = { $nin: excludedIds }
    if (expression) {
      const words = expression.split(' ').filter(Boolean)
      const fields = ['name', 'email', 'phone']
      params.$or = words.flatMap((word) => fields.map((field) => ({ [field]: new RegExp(word, 'i') })))
    }
    const records = (await this.find(params)) as any[]
    const sorted = sortRecords(records, { createdAt: 'asc' })
    if (page == null || limit == null) return sorted
    return sorted.slice((page - 1) * limit, page * limit)
  }

  normalizeLicenseeFields(fields: Record<string, any> = {}) {
    const normalizedFields: Record<string, any> = { ...(fields ?? {}) }
    const stringFields = ['apiToken']

    stringFields.forEach((field) => {
      if (normalizedFields[field] != null) {
        normalizedFields[field] = `${normalizedFields[field]}`
      }
    })

    return normalizedFields
  }
}

class PrismaLicenseeDatabaseRepository extends PrismaRepository<ILicensee> {
  delegate() {
    return getPrismaClient().licensee
  }

  async findManyLicensees({
    chatbotDefault,
    active,
    expression,
    excludedIds,
    page,
    limit,
  }: {
    chatbotDefault?: string
    active?: boolean
    expression?: string
    excludedIds?: string[]
    page?: number
    limit?: number
  }): Promise<ILicensee[]> {
    const where: any = {}
    if (chatbotDefault) where.chatbotDefault = chatbotDefault
    if (active !== undefined) where.active = active
    if (excludedIds && excludedIds.length > 0) where.id = { notIn: excludedIds.map((id) => parseInt(id, 10)) }
    if (expression) {
      const words = expression.split(' ').filter(Boolean)
      const fields = ['name', 'email', 'phone']
      where.OR = words.flatMap((word) => fields.map((field) => ({ [field]: { contains: word, mode: 'insensitive' } })))
    }
    const query: any = { where, orderBy: { createdAt: 'asc' } }
    if (page != null && limit != null) {
      query.skip = (page - 1) * limit
      query.take = limit
    }
    const records = await getPrismaClient().licensee.findMany(query)
    return this.fromDBMany(records) as unknown as ILicensee[]
  }
}

// Factory for backward-compatibility with specs that call new LicenseeRepositoryDatabase().
// Returns the active shared instance when memory repos are installed.

const LicenseeRepositoryDatabase = function (this: any): any {
  const active = tryGetActiveRepositories()
  if (active) return active.licenseeRepository
  return new LicenseeRepositoryMemory()
} as unknown as new () => LicenseeRepositoryMemory
LicenseeRepositoryDatabase.prototype = LicenseeRepositoryMemory.prototype

export { LicenseeRepositoryDatabase, LicenseeRepositoryMemory, PrismaLicenseeDatabaseRepository }
