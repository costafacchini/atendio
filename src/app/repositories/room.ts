import { Prisma } from '@prisma/client'
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

  async findById(id: string | number): Promise<IRoom | null> {
    const record = await getPrismaClient().room.findUnique({
      where: { id: typeof id === 'string' ? parseInt(id, 10) : id },
    })
    return this.fromDB(record)
  }

  async close(id: string | number): Promise<void> {
    await getPrismaClient().room.update({
      where: { id: typeof id === 'string' ? parseInt(id, 10) : id },
      data: { status: 'closed', closed: true, closedAt: new Date() },
    })
  }

  async findOpenForContact(contactId: string | number): Promise<IRoom | null> {
    const record = await getPrismaClient().room.findFirst({
      where: {
        contact: typeof contactId === 'string' ? parseInt(contactId, 10) : contactId,
        closed: false,
      },
    })
    return this.fromDB(record)
  }

  async findManyPaged(params: Record<string, unknown>, page: number, limit: number): Promise<IRoom[]> {
    const records = await getPrismaClient().room.findMany({
      where: this.toWhere(params) as any,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit + 1,
    })
    return this.fromDBMany(records) as IRoom[]
  }

  async avgDuration(contactIds: number[] | null, startDate: Date, endDate: Date): Promise<number> {
    const contactFilter =
      contactIds && contactIds.length > 0 ? Prisma.sql`AND contact = ANY(${contactIds})` : Prisma.sql``

    const rows = await getPrismaClient().$queryRaw<{ avg: number | null }[]>`
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM ("closedAt" - "createdAt")))::float, 0) AS avg
      FROM rooms
      WHERE "closedAt" >= ${startDate}
        AND "closedAt" < ${endDate}
        ${contactFilter}
    `
    return parseFloat((rows[0]?.avg ?? 0).toFixed(2))
  }

  async findForLicensee(
    _licenseeId: string | number,
    opts: { departmentIds?: number[]; page?: number; limit?: number; contactIds?: number[] } = {},
  ): Promise<any[]> {
    const { departmentIds = [], page = 1, limit = 20, contactIds = [] } = opts

    const contactFilter = contactIds.length > 0 ? { contact: { in: contactIds } } : undefined

    const deptFilter =
      departmentIds.length > 0 ? { OR: [{ department: null }, { department: { in: departmentIds } }] } : undefined

    const where: Record<string, any> = { closed: false }
    if (contactFilter) Object.assign(where, contactFilter)
    if (deptFilter) Object.assign(where, deptFilter)

    return await getPrismaClient().room.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit + 1,
    })
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
