// Integration tests for PrismaLicenseeDatabaseRepository.
// Requires RUN_POSTGRES_TESTS=1 and a reachable DATABASE_URL.
import { PrismaLicenseeDatabaseRepository } from './licensee'
import { connectPostgres, disconnectPostgres, getPrismaClient } from '../../config/postgres'

const describeIf = process.env['RUN_POSTGRES_TESTS'] === '1' ? describe : describe.skip

describeIf('PrismaLicenseeDatabaseRepository', () => {
  beforeAll(async () => {
    await connectPostgres()
  })

  afterAll(async () => {
    await disconnectPostgres()
  })

  afterEach(async () => {
    await getPrismaClient().licensee.deleteMany({
      where: { apiToken: { in: ['test-token-prisma', 'test-token-prisma-2', 'test-token-prisma-3', 'tok2'] } },
    })
  })

  const repo = new PrismaLicenseeDatabaseRepository()

  const baseFields = {
    name: 'Alcateia Ltds',
    licenseKind: 'demo',
    apiToken: 'test-token-prisma',
    active: true,
  }

  describe('#create', () => {
    it('persists a licensee and returns it with an id', async () => {
      const result = await repo.create(baseFields as any)
      expect((result as any).id).toBeDefined()
      expect((result as any).name).toEqual('Alcateia Ltds')
    })

    it('sets whatsappUrl from whatsappDefault=utalk', async () => {
      const result = await repo.create({
        ...baseFields,
        apiToken: 'test-token-prisma-2',
        whatsappDefault: 'utalk',
        whatsappToken: 'tok',
      } as any)
      expect((result as any).whatsappUrl).toEqual('https://v1.utalk.chat/send/')
    })

    it('sets whatsappUrl from whatsappDefault=dialog', async () => {
      const result = await repo.create({
        ...baseFields,
        apiToken: 'test-token-prisma-3',
        whatsappDefault: 'dialog',
        whatsappToken: 'tok',
      } as any)
      expect((result as any).whatsappUrl).toEqual('https://waba.360dialog.io/')
    })
  })

  describe('#findFirst', () => {
    it('finds a licensee by apiToken', async () => {
      await repo.create(baseFields as any)
      const found = await repo.findFirst({ apiToken: baseFields.apiToken })
      expect(found).not.toBeNull()
      expect((found as any).name).toEqual('Alcateia Ltds')
    })

    it('returns null when not found', async () => {
      const found = await repo.findFirst({ apiToken: 'nonexistent-token' })
      expect(found).toBeNull()
    })
  })

  describe('#find', () => {
    it('returns all matching licensees', async () => {
      await repo.create(baseFields as any)
      await repo.create({ ...baseFields, apiToken: 'tok2' } as any)
      const results = await repo.find({ active: true })
      expect(results.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('#update', () => {
    it('updates a licensee by id', async () => {
      const created = await repo.create(baseFields as any)
      await repo.update((created as any)._id, { name: 'Updated Name' } as any)
      const found = await repo.findFirst({ apiToken: baseFields.apiToken })
      expect((found as any).name).toEqual('Updated Name')
    })
  })

  describe('#save', () => {
    it('upserts a licensee', async () => {
      const created = await repo.create(baseFields as any)
      ;(created as any).name = 'Upserted Name'
      await repo.save(created as any)
      const found = await repo.findFirst({ apiToken: baseFields.apiToken })
      expect((found as any).name).toEqual('Upserted Name')
    })
  })

  describe('#delete', () => {
    it('removes a licensee by apiToken', async () => {
      await repo.create(baseFields as any)
      await repo.delete({ apiToken: baseFields.apiToken })
      const found = await repo.findFirst({ apiToken: baseFields.apiToken })
      expect(found).toBeNull()
    })
  })

  describe('#count', () => {
    it('returns total count with no filter', async () => {
      const n = await repo.count()
      expect(typeof n).toBe('number')
      expect(n).toBeGreaterThanOrEqual(1)
    })

    it('counts by licenseKind', async () => {
      const demo = await repo.count({ licenseKind: 'demo' })
      const paid = await repo.count({ licenseKind: 'paid' })
      expect(demo).toBeGreaterThanOrEqual(1)
      expect(paid).toBe(0)
    })
  })
})
