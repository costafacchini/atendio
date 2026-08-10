// Integration tests for PrismaUserDatabaseRepository.
// Requires RUN_POSTGRES_TESTS=1 and a reachable DATABASE_URL.
import bcrypt from 'bcrypt'
import { PrismaUserDatabaseRepository } from './user'
import { connectPostgres, disconnectPostgres, getPrismaClient } from '../../config/postgres'

const describeIf = process.env['RUN_POSTGRES_TESTS'] === '1' ? describe : describe.skip

describeIf('PrismaUserDatabaseRepository', () => {
  let licenseeId: number

  beforeAll(async () => {
    await connectPostgres()
    const licensee = await getPrismaClient().licensee.create({
      data: { name: 'Test Licensee', apiToken: 'tok-user', licenseKind: 'demo', active: true },
    })
    licenseeId = licensee.id
  })

  afterAll(async () => {
    await getPrismaClient().licensee.deleteMany({ where: { apiToken: 'tok-user' } })
    await disconnectPostgres()
  })

  afterEach(async () => {
    await getPrismaClient().user.deleteMany({})
  })

  const repo = new PrismaUserDatabaseRepository()

  const baseFields = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'plainpassword',
    active: true,
  }

  describe('#create', () => {
    it('persists a user and returns it with an id', async () => {
      const result = await repo.create({ ...baseFields, licensee: licenseeId } as any)
      expect((result as any).id).toBeDefined()
      expect((result as any).name).toEqual('Test User')
    })

    it('hashes the password on create', async () => {
      const result = await repo.create({ ...baseFields, licensee: licenseeId } as any)
      expect((result as any).password).not.toEqual('plainpassword')
      const matches = await bcrypt.compare('plainpassword', (result as any).password)
      expect(matches).toBe(true)
    })
  })

  describe('#findFirst', () => {
    it('finds a user by email', async () => {
      await repo.create({ ...baseFields, licensee: licenseeId } as any)
      const found = await repo.findFirst({ email: baseFields.email })
      expect(found).not.toBeNull()
      expect((found as any).name).toEqual('Test User')
    })

    it('returns null when not found', async () => {
      const found = await repo.findFirst({ email: 'nonexistent@example.com' })
      expect(found).toBeNull()
    })
  })

  describe('#find', () => {
    it('returns all matching users', async () => {
      await repo.create({ ...baseFields, licensee: licenseeId } as any)
      await repo.create({ ...baseFields, email: 'test2@example.com', licensee: licenseeId } as any)
      const results = await repo.find({ active: true })
      expect(results.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('#update', () => {
    it('updates a user by id', async () => {
      const created = await repo.create({ ...baseFields, licensee: licenseeId } as any)
      await repo.update((created as any)._id, { name: 'Updated User' } as any)
      const found = await repo.findFirst({ email: baseFields.email })
      expect((found as any).name).toEqual('Updated User')
    })
  })

  describe('#save', () => {
    it('upserts a user', async () => {
      const created = await repo.create({ ...baseFields, licensee: licenseeId } as any)
      ;(created as any).name = 'Upserted User'
      await repo.save(created as any)
      const found = await repo.findFirst({ email: baseFields.email })
      expect((found as any).name).toEqual('Upserted User')
    })
  })

  describe('#delete', () => {
    it('removes a user by email', async () => {
      await repo.create({ ...baseFields, licensee: licenseeId } as any)
      await repo.delete({ email: baseFields.email })
      const found = await repo.findFirst({ email: baseFields.email })
      expect(found).toBeNull()
    })
  })
})
