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

  async create(fields: Partial<IDepartment> = {}): Promise<IDepartment> {
    const withToken = (fields as any).departmentToken ? fields : { ...fields, departmentToken: uuidv4() }
    return await super.create(withToken)
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
