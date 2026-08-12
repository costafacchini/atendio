import { v4 as uuidv4 } from 'uuid'
import { RepositoryMemory, PrismaRepository } from './repository'
import { IDepartment } from '../../types'
import { getPrismaClient } from '../../config/postgres'
import { tryGetActiveRepositories } from './activeState'

class DepartmentRepositoryMemory extends RepositoryMemory<IDepartment> {}

class PrismaDepartmentDatabaseRepository extends PrismaRepository<IDepartment> {
  delegate() {
    return getPrismaClient().department
  }
  protected fkFields() {
    return ['licensee', 'inbox']
  }

  async create(fields: Partial<IDepartment> = {}): Promise<IDepartment> {
    const withToken = (fields as any).departmentToken ? fields : { ...fields, departmentToken: uuidv4() }
    return await super.create(withToken)
  }

  /**
   * Returns IDs of departments whose `users` JSON array contains the given userId.
   * Replaces the Mongoose: departmentRepository.model().find({ users, licensee, active }).select('_id').lean()
   * `users` is a JSONB column storing string user IDs, e.g. ["abc123", "def456"].
   */
  async findIds(
    params: {
      users?: string | number
      licensee?: string | number
      active?: boolean
    } = {},
  ): Promise<number[]> {
    const { users: userId, licensee: licenseeId, active } = params
    const licenseeInt = licenseeId != null ? parseInt(String(licenseeId), 10) : undefined

    const records = await getPrismaClient().department.findMany({
      where: {
        ...(licenseeInt != null ? { licensee: licenseeInt } : {}),
        ...(active != null ? { active } : {}),
        ...(userId != null ? { users: { array_contains: userId } } : {}),
      },
      select: { id: true },
    })
    return records.map((r) => r.id)
  }
}

// Factory for backward-compatibility with specs that call new DepartmentRepositoryDatabase().
// Returns the active shared instance when memory repos are installed.

function DepartmentRepositoryDatabase(this: any): any {
  const active = tryGetActiveRepositories()
  if (active) return active.departmentRepository
  return new DepartmentRepositoryMemory()
}
DepartmentRepositoryDatabase.prototype = DepartmentRepositoryMemory.prototype

export { DepartmentRepositoryDatabase, DepartmentRepositoryMemory, PrismaDepartmentDatabaseRepository }
