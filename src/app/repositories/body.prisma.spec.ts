// Integration tests for PrismaBodyDatabaseRepository.
// Requires RUN_POSTGRES_TESTS=1 and a reachable DATABASE_URL.
import { PrismaBodyDatabaseRepository } from './body'
import { connectPostgres, disconnectPostgres, getPrismaClient } from '../../config/postgres'

const describeIf = process.env['RUN_POSTGRES_TESTS'] === '1' ? describe : describe.skip

describeIf('PrismaBodyDatabaseRepository', () => {
  let licenseeId: number

  beforeAll(async () => {
    await connectPostgres()
    const licensee = await getPrismaClient().licensee.create({
      data: { name: 'Test Licensee', apiToken: 'tok-body', licenseKind: 'demo', active: true },
    })
    licenseeId = licensee.id
  })

  afterAll(async () => {
    await getPrismaClient().licensee.deleteMany({ where: { apiToken: 'tok-body' } })
    await disconnectPostgres()
  })

  afterEach(async () => {
    await getPrismaClient().body.deleteMany({})
  })

  const repo = new PrismaBodyDatabaseRepository()

  const baseFields = {
    content: { text: 'Hello' },
    kind: 'text',
    concluded: false,
  }

  describe('#create', () => {
    it('persists a body and returns it with an id', async () => {
      const result = await repo.create({ ...baseFields, licensee: licenseeId } as any)
      expect((result as any).id).toBeDefined()
      expect((result as any).kind).toEqual('text')
    })
  })

  describe('#findFirst', () => {
    it('finds a body by kind and licensee', async () => {
      await repo.create({ ...baseFields, licensee: licenseeId } as any)
      const found = await repo.findFirst({ kind: baseFields.kind, licensee: licenseeId })
      expect(found).not.toBeNull()
      expect((found as any).kind).toEqual('text')
    })

    it('returns null when not found', async () => {
      const found = await repo.findFirst({ kind: 'nonexistent', licensee: licenseeId })
      expect(found).toBeNull()
    })
  })

  describe('#find', () => {
    it('returns all matching bodies', async () => {
      await repo.create({ ...baseFields, licensee: licenseeId } as any)
      await repo.create({ ...baseFields, kind: 'image', licensee: licenseeId } as any)
      const results = await repo.find({ licensee: licenseeId })
      expect(results.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('#update', () => {
    it('updates a body by id', async () => {
      const created = await repo.create({ ...baseFields, licensee: licenseeId } as any)
      await repo.update((created as any)._id, { concluded: true } as any)
      const found = await repo.findFirst({ kind: baseFields.kind, licensee: licenseeId })
      expect((found as any).concluded).toBe(true)
    })
  })

  describe('#save', () => {
    it('upserts a body', async () => {
      const created = await repo.create({ ...baseFields, licensee: licenseeId } as any)
      ;(created as any).concluded = true
      await repo.save(created as any)
      const found = await repo.findFirst({ kind: baseFields.kind, licensee: licenseeId })
      expect((found as any).concluded).toBe(true)
    })
  })

  describe('#delete', () => {
    it('removes a body by kind and licensee', async () => {
      await repo.create({ ...baseFields, licensee: licenseeId } as any)
      await repo.delete({ kind: baseFields.kind, licensee: licenseeId })
      const found = await repo.findFirst({ kind: baseFields.kind, licensee: licenseeId })
      expect(found).toBeNull()
    })
  })
})
