// Integration tests for PrismaDepartmentDatabaseRepository.
// Requires RUN_POSTGRES_TESTS=1 and a reachable DATABASE_URL.
import { PrismaDepartmentDatabaseRepository } from './department'
import { connectPostgres, disconnectPostgres, getPrismaClient } from '../../config/postgres'

const describeIf = process.env['RUN_POSTGRES_TESTS'] === '1' ? describe : describe.skip

describeIf('PrismaDepartmentDatabaseRepository', () => {
  let licenseeId: number

  beforeAll(async () => {
    await connectPostgres()
    const licensee = await getPrismaClient().licensee.create({
      data: { name: 'Test Licensee', apiToken: 'tok-department', licenseKind: 'demo', active: true },
    })
    licenseeId = licensee.id
  })

  afterAll(async () => {
    await getPrismaClient().licensee.deleteMany({ where: { apiToken: 'tok-department' } })
    await disconnectPostgres()
  })

  afterEach(async () => {
    await getPrismaClient().department.deleteMany({ where: { licensee: licenseeId } })
  })

  const repo = new PrismaDepartmentDatabaseRepository()

  const baseFields = {
    name: 'Test Department',
    users: [],
    active: true,
  }

  describe('#create', () => {
    it('persists a department and returns it with an id', async () => {
      const result = await repo.create({ ...baseFields, licensee: licenseeId } as any)
      expect((result as any).id).toBeDefined()
      expect((result as any).name).toEqual('Test Department')
    })

    it('auto-generates departmentToken when not provided', async () => {
      const result = await repo.create({ ...baseFields, licensee: licenseeId } as any)
      expect((result as any).departmentToken).toBeDefined()
      expect(typeof (result as any).departmentToken).toBe('string')
      expect((result as any).departmentToken.length).toBeGreaterThan(0)
    })

    it('preserves a provided departmentToken', async () => {
      const result = await repo.create({
        ...baseFields,
        departmentToken: 'custom-dept-token',
        licensee: licenseeId,
      } as any)
      expect((result as any).departmentToken).toEqual('custom-dept-token')
    })
  })

  describe('#findFirst', () => {
    it('finds a department by name and licensee', async () => {
      await repo.create({ ...baseFields, licensee: licenseeId } as any)
      const found = await repo.findFirst({ name: baseFields.name, licensee: licenseeId })
      expect(found).not.toBeNull()
      expect((found as any).name).toEqual('Test Department')
    })

    it('returns null when not found', async () => {
      const found = await repo.findFirst({ name: 'Nonexistent Department' })
      expect(found).toBeNull()
    })
  })

  describe('#find', () => {
    it('returns all matching departments', async () => {
      await repo.create({ ...baseFields, licensee: licenseeId } as any)
      await repo.create({ ...baseFields, name: 'Second Department', licensee: licenseeId } as any)
      const results = await repo.find({ licensee: licenseeId })
      expect(results.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('#update', () => {
    it('updates a department by id', async () => {
      const created = await repo.create({ ...baseFields, licensee: licenseeId } as any)
      await repo.update((created as any)._id, { name: 'Updated Department' } as any)
      const found = await repo.findFirst({ licensee: licenseeId, active: true })
      expect((found as any).name).toEqual('Updated Department')
    })
  })

  describe('#save', () => {
    it('upserts a department', async () => {
      const created = await repo.create({ ...baseFields, licensee: licenseeId } as any)
      ;(created as any).name = 'Upserted Department'
      await repo.save(created as any)
      const found = await repo.findFirst({ licensee: licenseeId, active: true })
      expect((found as any).name).toEqual('Upserted Department')
    })
  })

  describe('#delete', () => {
    it('removes a department by name and licensee', async () => {
      await repo.create({ ...baseFields, licensee: licenseeId } as any)
      await repo.delete({ name: baseFields.name, licensee: licenseeId })
      const found = await repo.findFirst({ name: baseFields.name, licensee: licenseeId })
      expect(found).toBeNull()
    })
  })
})
