// Integration tests for PrismaInboxDatabaseRepository.
// Requires RUN_POSTGRES_TESTS=1 and a reachable DATABASE_URL.
import { PrismaInboxDatabaseRepository } from './inbox'
import { connectPostgres, disconnectPostgres, getPrismaClient } from '../../config/postgres'

const describeIf = process.env['RUN_POSTGRES_TESTS'] === '1' ? describe : describe.skip

describeIf('PrismaInboxDatabaseRepository', () => {
  let licenseeId: number

  beforeAll(async () => {
    await connectPostgres()
    const licensee = await getPrismaClient().licensee.create({
      data: { name: 'Test Licensee', apiToken: 'tok-inbox', licenseKind: 'demo', active: true },
    })
    licenseeId = licensee.id
  })

  afterAll(async () => {
    await getPrismaClient().licensee.deleteMany({ where: { apiToken: 'tok-inbox' } })
    await disconnectPostgres()
  })

  afterEach(async () => {
    await getPrismaClient().inbox.deleteMany({})
  })

  const repo = new PrismaInboxDatabaseRepository()

  const baseFields = {
    name: 'Test Inbox',
    kind: 'whatsapp',
    active: true,
  }

  describe('#create', () => {
    it('persists an inbox and returns it with an id', async () => {
      const result = await repo.create({ ...baseFields, licensee: licenseeId } as any)
      expect((result as any).id).toBeDefined()
      expect((result as any).name).toEqual('Test Inbox')
    })

    it('auto-generates inboxToken when not provided', async () => {
      const result = await repo.create({ ...baseFields, licensee: licenseeId } as any)
      expect((result as any).inboxToken).toBeDefined()
      expect(typeof (result as any).inboxToken).toBe('string')
      expect((result as any).inboxToken.length).toBeGreaterThan(0)
    })

    it('preserves a provided inboxToken', async () => {
      const result = await repo.create({
        ...baseFields,
        inboxToken: 'custom-token-abc',
        licensee: licenseeId,
      } as any)
      expect((result as any).inboxToken).toEqual('custom-token-abc')
    })
  })

  describe('#findFirst', () => {
    it('finds an inbox by name and licensee', async () => {
      await repo.create({ ...baseFields, licensee: licenseeId } as any)
      const found = await repo.findFirst({ name: baseFields.name, licensee: licenseeId })
      expect(found).not.toBeNull()
      expect((found as any).name).toEqual('Test Inbox')
    })

    it('returns null when not found', async () => {
      const found = await repo.findFirst({ name: 'Nonexistent Inbox' })
      expect(found).toBeNull()
    })
  })

  describe('#find', () => {
    it('returns all matching inboxes', async () => {
      await repo.create({ ...baseFields, licensee: licenseeId } as any)
      await repo.create({ ...baseFields, name: 'Second Inbox', licensee: licenseeId } as any)
      const results = await repo.find({ licensee: licenseeId })
      expect(results.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('#update', () => {
    it('updates an inbox by id', async () => {
      const created = await repo.create({ ...baseFields, licensee: licenseeId } as any)
      await repo.update((created as any)._id, { name: 'Updated Inbox' } as any)
      const found = await repo.findFirst({ licensee: licenseeId, active: true })
      expect((found as any).name).toEqual('Updated Inbox')
    })
  })

  describe('#save', () => {
    it('upserts an inbox', async () => {
      const created = await repo.create({ ...baseFields, licensee: licenseeId } as any)
      ;(created as any).name = 'Upserted Inbox'
      await repo.save(created as any)
      const found = await repo.findFirst({ licensee: licenseeId, active: true })
      expect((found as any).name).toEqual('Upserted Inbox')
    })
  })

  describe('#delete', () => {
    it('removes an inbox by licensee and name', async () => {
      await repo.create({ ...baseFields, licensee: licenseeId } as any)
      await repo.delete({ name: baseFields.name, licensee: licenseeId })
      const found = await repo.findFirst({ name: baseFields.name, licensee: licenseeId })
      expect(found).toBeNull()
    })
  })
})
