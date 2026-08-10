import bcrypt from 'bcrypt'
import { RepositoryMemory, PrismaRepository } from './repository'
import { IUser } from '../../types'
import { getPrismaClient } from '../../config/postgres'
import { tryGetActiveRepositories } from './activeState'

const saltRounds = 14

class UserRepositoryMemory extends RepositoryMemory<IUser> {
  async create(fields: Record<string, any> = {}) {
    await this.validateUserFields(fields)

    const record = await super.create({
      ...(fields ?? {}),
      password: await bcrypt.hash(fields?.password ?? '', saltRounds),
    })

    return this.attachValidPassword(record)
  }

  async findFirst(params: any = {}, relations: any[] = []) {
    // Call RepositoryMemory.prototype.find directly to avoid the projection
    // collision in UserRepositoryMemory.find whose second param is `projection`, not `relations`.
    const records = await RepositoryMemory.prototype.find.call(this, params, relations)
    const record = (records[0] as any) ?? null
    return record ? this.attachValidPassword(record) : null
  }

  async find(params = {}, projection = {}) {
    const records = (await super.find(params)).map((record) => this.attachValidPassword(record))

    if (!projection || Object.keys(projection).length === 0) {
      return records
    }

    const excludedFields = Object.entries(projection)
      .filter(([, value]) => value === 0)
      .map(([field]) => field)

    if (excludedFields.length > 0) {
      return records.map((record) => {
        const projectedRecord = { ...record }
        excludedFields.forEach((field) => delete projectedRecord[field])
        return projectedRecord
      })
    }

    const includedFields = Object.entries(projection)
      .filter(([, value]) => value === 1)
      .map(([field]) => field)

    return records.map((record: any) => {
      const projectedRecord: Record<string, any> = { _id: record._id }
      includedFields.forEach((field: any) => {
        projectedRecord[field] = record[field]
      })
      return projectedRecord
    })
  }

  async save(document: any) {
    const payload = document?.toObject ? document.toObject() : { ...(document ?? {}) }

    if (payload.password && !payload.password.startsWith('$2')) {
      await this.validateUserFields(payload)
      payload.password = await bcrypt.hash(payload.password, saltRounds)
    }

    const saved = await super.save(payload)
    return this.attachValidPassword(saved)
  }

  attachValidPassword(record: any) {
    if (record.validPassword) {
      return record
    }

    record.validPassword = async function (password: any) {
      return await bcrypt.compare(password, this.password)
    }

    return record
  }

  // Validation was previously delegated to the Mongoose User model.
  // The Prisma repo enforces constraints at the DB level; memory repo skips schema validation.
  async validateUserFields(_fields = {}) {
    // no-op: schema validation is handled by Prisma in production
  }
}

class PrismaUserDatabaseRepository extends PrismaRepository<IUser> {
  delegate() {
    return getPrismaClient().user
  }
  protected fkFields() {
    return ['licensee']
  }

  async create(fields: Partial<IUser> = {}): Promise<IUser> {
    const prepared = await this.hashPasswordIfPresent(fields)
    return await super.create(prepared)
  }

  async update(id: string, fields: Partial<IUser> = {}): Promise<{ acknowledged: boolean }> {
    const prepared = await this.hashPasswordIfPresent(fields)
    return await super.update(id, prepared)
  }

  private async hashPasswordIfPresent<F extends Partial<IUser>>(fields: F): Promise<F> {
    if (!fields.password) return fields
    return { ...fields, password: await bcrypt.hash(fields.password, saltRounds) }
  }
}

// Factory for backward-compatibility with specs that call new UserRepositoryDatabase().
// Returns the active shared instance when memory repos are installed.

function UserRepositoryDatabase(this: any): any {
  const active = tryGetActiveRepositories()
  if (active) return active.userRepository
  return new UserRepositoryMemory()
}
UserRepositoryDatabase.prototype = UserRepositoryMemory.prototype

export { UserRepositoryDatabase, UserRepositoryMemory, PrismaUserDatabaseRepository }
