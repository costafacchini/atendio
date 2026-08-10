// Integration tests for PrismaTemplateDatabaseRepository.
// Requires RUN_POSTGRES_TESTS=1 and a reachable DATABASE_URL.
import { PrismaTemplateDatabaseRepository } from './template'
import { connectPostgres, disconnectPostgres, getPrismaClient } from '../../config/postgres'

const describeIf = process.env['RUN_POSTGRES_TESTS'] === '1' ? describe : describe.skip

describeIf('PrismaTemplateDatabaseRepository', () => {
  let licenseeId: number

  beforeAll(async () => {
    await connectPostgres()
    const licensee = await getPrismaClient().licensee.create({
      data: { name: 'Test Licensee', apiToken: 'tok-template', licenseKind: 'demo', active: true },
    })
    licenseeId = licensee.id
  })

  afterAll(async () => {
    await getPrismaClient().licensee.deleteMany({ where: { apiToken: 'tok-template' } })
    await disconnectPostgres()
  })

  afterEach(async () => {
    await getPrismaClient().template.deleteMany({ where: { licensee: licenseeId } })
  })

  const repo = new PrismaTemplateDatabaseRepository()

  const baseFields = {
    name: 'Test Template',
    active: false,
  }

  describe('#create', () => {
    it('persists a template and returns it with an id', async () => {
      const result = await repo.create({ ...baseFields, licensee: licenseeId } as any)
      expect((result as any).id).toBeDefined()
      expect((result as any).name).toEqual('Test Template')
    })
  })

  describe('#findFirst', () => {
    it('finds a template by name and licensee', async () => {
      await repo.create({ ...baseFields, licensee: licenseeId } as any)
      const found = await repo.findFirst({ name: baseFields.name, licensee: licenseeId })
      expect(found).not.toBeNull()
      expect((found as any).name).toEqual('Test Template')
    })

    it('returns null when not found', async () => {
      const found = await repo.findFirst({ name: 'Nonexistent Template' })
      expect(found).toBeNull()
    })
  })

  describe('#find', () => {
    it('returns all matching templates', async () => {
      await repo.create({ ...baseFields, licensee: licenseeId } as any)
      await repo.create({ ...baseFields, name: 'Second Template', licensee: licenseeId } as any)
      const results = await repo.find({ licensee: licenseeId })
      expect(results.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('#update', () => {
    it('updates a template by id', async () => {
      const created = await repo.create({ ...baseFields, licensee: licenseeId } as any)
      await repo.update((created as any)._id, { active: true } as any)
      const found = await repo.findFirst({ name: baseFields.name, licensee: licenseeId })
      expect((found as any).active).toBe(true)
    })
  })

  describe('#save', () => {
    it('upserts a template', async () => {
      const created = await repo.create({ ...baseFields, licensee: licenseeId } as any)
      ;(created as any).name = 'Upserted Template'
      await repo.save(created as any)
      const found = await repo.findFirst({ licensee: licenseeId })
      expect((found as any).name).toEqual('Upserted Template')
    })
  })

  describe('#delete', () => {
    it('removes a template by name and licensee', async () => {
      await repo.create({ ...baseFields, licensee: licenseeId } as any)
      await repo.delete({ name: baseFields.name, licensee: licenseeId })
      const found = await repo.findFirst({ name: baseFields.name, licensee: licenseeId })
      expect(found).toBeNull()
    })
  })
})
