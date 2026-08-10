// Integration tests for PrismaRoomDatabaseRepository.
// Requires RUN_POSTGRES_TESTS=1 and a reachable DATABASE_URL.
import { PrismaRoomDatabaseRepository } from './room'
import { connectPostgres, disconnectPostgres, getPrismaClient } from '../../config/postgres'

const describeIf = process.env['RUN_POSTGRES_TESTS'] === '1' ? describe : describe.skip

describeIf('PrismaRoomDatabaseRepository', () => {
  let licenseeId: number
  let contactId: number

  beforeAll(async () => {
    await connectPostgres()
    const licensee = await getPrismaClient().licensee.create({
      data: { name: 'Test Licensee', apiToken: 'tok-room', licenseKind: 'demo', active: true },
    })
    licenseeId = licensee.id
    const contact = await getPrismaClient().contact.create({
      data: { number: '5511999990099', talkingWithChatBot: false, licensee: licenseeId, active: true, isGroup: false },
    })
    contactId = contact.id
  })

  afterAll(async () => {
    await getPrismaClient().contact.deleteMany({ where: { licensee: licenseeId } })
    await getPrismaClient().licensee.deleteMany({ where: { apiToken: 'tok-room' } })
    await disconnectPostgres()
  })

  afterEach(async () => {
    await getPrismaClient().room.deleteMany({ where: { contact: contactId } })
  })

  const repo = new PrismaRoomDatabaseRepository()

  describe('#create', () => {
    it('persists a room and returns it with an id', async () => {
      const result = await repo.create({ contact: contactId, closed: false } as any)
      expect((result as any).id).toBeDefined()
      expect((result as any).closed).toBe(false)
    })
  })

  describe('#findFirst', () => {
    it('finds a room by contact', async () => {
      await repo.create({ contact: contactId, closed: false } as any)
      const found = await repo.findFirst({ contact: contactId })
      expect(found).not.toBeNull()
      expect((found as any).contact).toEqual(contactId)
    })

    it('returns null when not found', async () => {
      const found = await repo.findFirst({ contact: 999999 })
      expect(found).toBeNull()
    })
  })

  describe('#find', () => {
    it('returns all matching rooms', async () => {
      await repo.create({ contact: contactId, closed: false } as any)
      await repo.create({ contact: contactId, closed: true } as any)
      const results = await repo.find({ contact: contactId })
      expect(results.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('#update', () => {
    it('updates a room by id', async () => {
      const created = await repo.create({ contact: contactId, closed: false } as any)
      await repo.update((created as any)._id, { closed: true } as any)
      const found = await repo.findFirst({ contact: contactId })
      expect((found as any).closed).toBe(true)
    })
  })

  describe('#save', () => {
    it('upserts a room', async () => {
      const created = await repo.create({ contact: contactId, closed: false } as any)
      ;(created as any).closed = true
      await repo.save(created as any)
      const found = await repo.findFirst({ contact: contactId })
      expect((found as any).closed).toBe(true)
    })
  })

  describe('#delete', () => {
    it('removes a room by contact', async () => {
      await repo.create({ contact: contactId, closed: false } as any)
      await repo.delete({ contact: contactId })
      const found = await repo.findFirst({ contact: contactId })
      expect(found).toBeNull()
    })
  })
})
