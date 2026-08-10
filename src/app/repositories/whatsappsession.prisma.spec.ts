// Integration tests for PrismaWhatsappSessionDatabaseRepository.
// Requires RUN_POSTGRES_TESTS=1 and a reachable DATABASE_URL.
import { PrismaWhatsappSessionDatabaseRepository } from './whatsappsession'
import { connectPostgres, disconnectPostgres, getPrismaClient } from '../../config/postgres'

const describeIf = process.env['RUN_POSTGRES_TESTS'] === '1' ? describe : describe.skip

describeIf('PrismaWhatsappSessionDatabaseRepository', () => {
  let licenseeId: number

  beforeAll(async () => {
    await connectPostgres()
    const licensee = await getPrismaClient().licensee.create({
      data: { name: 'Test Licensee', apiToken: 'tok-whatsappsession', licenseKind: 'demo', active: true },
    })
    licenseeId = licensee.id
  })

  afterAll(async () => {
    await getPrismaClient().licensee.deleteMany({ where: { apiToken: 'tok-whatsappsession' } })
    await disconnectPostgres()
  })

  afterEach(async () => {
    await getPrismaClient().whatsappSession.deleteMany({})
  })

  const repo = new PrismaWhatsappSessionDatabaseRepository()

  describe('#create', () => {
    it('persists a whatsapp session and returns it with an id', async () => {
      const result = await repo.create({ licensee: licenseeId } as any)
      expect((result as any).id).toBeDefined()
      expect((result as any).licensee).toEqual(licenseeId)
    })
  })

  describe('#findFirst', () => {
    it('finds a session by licensee', async () => {
      await repo.create({ licensee: licenseeId } as any)
      const found = await repo.findFirst({ licensee: licenseeId })
      expect(found).not.toBeNull()
      expect((found as any).licensee).toEqual(licenseeId)
    })

    it('returns null when not found', async () => {
      const found = await repo.findFirst({ licensee: 999999 })
      expect(found).toBeNull()
    })
  })

  describe('#find', () => {
    it('returns all matching sessions', async () => {
      await repo.create({ licensee: licenseeId } as any)
      await repo.create({ licensee: licenseeId } as any)
      const results = await repo.find({ licensee: licenseeId })
      expect(results.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('#update', () => {
    it('updates a session by id', async () => {
      const created = await repo.create({ licensee: licenseeId } as any)
      const result = await repo.update((created as any)._id, {} as any)
      expect(result.acknowledged).toBe(true)
    })
  })

  describe('#save', () => {
    it('upserts a session', async () => {
      const created = await repo.create({ licensee: licenseeId } as any)
      const saved = await repo.save(created as any)
      expect((saved as any).id).toEqual((created as any).id)
    })
  })

  describe('#delete', () => {
    it('removes a session by licensee', async () => {
      await repo.create({ licensee: licenseeId } as any)
      await repo.delete({ licensee: licenseeId })
      const found = await repo.findFirst({ licensee: licenseeId })
      expect(found).toBeNull()
    })
  })
})
