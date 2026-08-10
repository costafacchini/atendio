// Integration tests for PrismaTriggerDatabaseRepository.
// Requires RUN_POSTGRES_TESTS=1 and a reachable DATABASE_URL.
import { PrismaTriggerDatabaseRepository } from './trigger'
import { connectPostgres, disconnectPostgres, getPrismaClient } from '../../config/postgres'

const describeIf = process.env['RUN_POSTGRES_TESTS'] === '1' ? describe : describe.skip

describeIf('PrismaTriggerDatabaseRepository', () => {
  let licenseeId: number

  beforeAll(async () => {
    await connectPostgres()
    const licensee = await getPrismaClient().licensee.create({
      data: { name: 'Test Licensee', apiToken: 'tok-trigger', licenseKind: 'demo', active: true },
    })
    licenseeId = licensee.id
  })

  afterAll(async () => {
    await getPrismaClient().licensee.deleteMany({ where: { apiToken: 'tok-trigger' } })
    await disconnectPostgres()
  })

  afterEach(async () => {
    await getPrismaClient().trigger.deleteMany({})
  })

  const repo = new PrismaTriggerDatabaseRepository()

  const baseFields = {
    triggerKind: 'text',
    expression: 'hello',
    order: 1,
  }

  describe('#create', () => {
    it('persists a trigger and returns it with an id', async () => {
      const result = await repo.create({ ...baseFields, licensee: licenseeId } as any)
      expect((result as any).id).toBeDefined()
      expect((result as any).expression).toEqual('hello')
    })
  })

  describe('#findFirst', () => {
    it('finds a trigger by expression and licensee', async () => {
      await repo.create({ ...baseFields, licensee: licenseeId } as any)
      const found = await repo.findFirst({ expression: baseFields.expression, licensee: licenseeId })
      expect(found).not.toBeNull()
      expect((found as any).expression).toEqual('hello')
    })

    it('returns null when not found', async () => {
      const found = await repo.findFirst({ expression: 'nonexistent' })
      expect(found).toBeNull()
    })
  })

  describe('#find', () => {
    it('returns all matching triggers', async () => {
      await repo.create({ ...baseFields, licensee: licenseeId } as any)
      await repo.create({ ...baseFields, expression: 'bye', licensee: licenseeId } as any)
      const results = await repo.find({ licensee: licenseeId })
      expect(results.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('#update', () => {
    it('updates a trigger by id', async () => {
      const created = await repo.create({ ...baseFields, licensee: licenseeId } as any)
      await repo.update((created as any)._id, { expression: 'updated' } as any)
      const found = await repo.findFirst({ licensee: licenseeId, triggerKind: 'text' })
      expect((found as any).expression).toEqual('updated')
    })
  })

  describe('#save', () => {
    it('upserts a trigger', async () => {
      const created = await repo.create({ ...baseFields, licensee: licenseeId } as any)
      ;(created as any).expression = 'upserted'
      await repo.save(created as any)
      const found = await repo.findFirst({ licensee: licenseeId, triggerKind: 'text' })
      expect((found as any).expression).toEqual('upserted')
    })
  })

  describe('#delete', () => {
    it('removes a trigger by expression and licensee', async () => {
      await repo.create({ ...baseFields, licensee: licenseeId } as any)
      await repo.delete({ expression: baseFields.expression, licensee: licenseeId })
      const found = await repo.findFirst({ expression: baseFields.expression, licensee: licenseeId })
      expect(found).toBeNull()
    })
  })
})
