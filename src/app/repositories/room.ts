import { RepositoryMemory, PrismaRepository } from './repository'
import { IRoom } from '../../types'
import { getPrismaClient } from '../../config/postgres'
import { tryGetActiveRepositories } from './activeState'

class RoomRepositoryMemory extends RepositoryMemory<IRoom> {
  async create(fields: any = {}) {
    const normalized = fields?.roomId != null ? { ...fields, roomId: String(fields.roomId) } : fields
    return await super.create({
      closed: false,
      ...(normalized ?? {}),
    })
  }

  async findOpenForContact(contactId: any): Promise<IRoom | null> {
    const records = await this.find({ contact: contactId, closed: false })
    return records[0] ?? null
  }
}

class PrismaRoomDatabaseRepository extends PrismaRepository<IRoom> {
  delegate() {
    return getPrismaClient().room
  }
  protected fkFields() {
    return ['contact', 'agent', 'department', 'inbox']
  }
}

// Factory for backward-compatibility with specs that call new RoomRepositoryDatabase().
// Returns the active shared instance when memory repos are installed.

function RoomRepositoryDatabase(this: any): any {
  const active = tryGetActiveRepositories()
  if (active) return active.roomRepository
  return new RoomRepositoryMemory()
}
RoomRepositoryDatabase.prototype = RoomRepositoryMemory.prototype

export { RoomRepositoryDatabase, RoomRepositoryMemory, PrismaRoomDatabaseRepository }
