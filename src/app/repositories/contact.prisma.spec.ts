// Integration tests for PrismaContactDatabaseRepository.
// Requires RUN_POSTGRES_TESTS=1 and a reachable DATABASE_URL.
import { PrismaContactDatabaseRepository } from './contact'
import { connectPostgres, disconnectPostgres, getPrismaClient } from '../../config/postgres'

const describeIf = process.env['RUN_POSTGRES_TESTS'] === '1' ? describe : describe.skip

describeIf('PrismaContactDatabaseRepository', () => {
  let licenseeId: number

  beforeAll(async () => {
    await connectPostgres()
    const licensee = await getPrismaClient().licensee.create({
      data: { name: 'Test Licensee', apiToken: 'tok-contact', licenseKind: 'demo', active: true },
    })
    licenseeId = licensee.id
  })

  afterAll(async () => {
    await getPrismaClient().licensee.deleteMany({ where: { apiToken: 'tok-contact' } })
    await disconnectPostgres()
  })

  afterEach(async () => {
    await getPrismaClient().contact.deleteMany({ where: { licensee: licenseeId } })
  })

  const repo = new PrismaContactDatabaseRepository()

  const baseFields = {
    number: '5511999990001',
    type: 'whatsapp',
    talkingWithChatBot: false,
    active: true,
    isGroup: false,
  }

  describe('#create', () => {
    it('persists a contact and returns it with an id', async () => {
      const result = await repo.create({ ...baseFields, licensee: licenseeId } as any)
      expect((result as any).id).toBeDefined()
      expect((result as any).number).toEqual('5511999990001')
    })
  })

  describe('#findFirst', () => {
    it('finds a contact by number and licensee', async () => {
      await repo.create({ ...baseFields, licensee: licenseeId } as any)
      const found = await repo.findFirst({ number: baseFields.number, licensee: licenseeId })
      expect(found).not.toBeNull()
      expect((found as any).number).toEqual('5511999990001')
    })

    it('returns null when not found', async () => {
      const found = await repo.findFirst({ number: '0000000000', licensee: licenseeId })
      expect(found).toBeNull()
    })
  })

  describe('#find', () => {
    it('returns all matching contacts', async () => {
      await repo.create({ ...baseFields, licensee: licenseeId } as any)
      await repo.create({ ...baseFields, number: '5511999990002', licensee: licenseeId } as any)
      const results = await repo.find({ licensee: licenseeId })
      expect(results.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('#update', () => {
    it('updates a contact by id', async () => {
      const created = await repo.create({ ...baseFields, licensee: licenseeId } as any)
      await repo.update((created as any)._id, { talkingWithChatBot: true } as any)
      const found = await repo.findFirst({ number: baseFields.number, licensee: licenseeId })
      expect((found as any).talkingWithChatBot).toBe(true)
    })
  })

  describe('#save', () => {
    it('upserts a contact', async () => {
      const created = await repo.create({ ...baseFields, licensee: licenseeId } as any)
      ;(created as any).talkingWithChatBot = true
      await repo.save(created as any)
      const found = await repo.findFirst({ number: baseFields.number, licensee: licenseeId })
      expect((found as any).talkingWithChatBot).toBe(true)
    })
  })

  describe('#delete', () => {
    it('removes a contact by number and licensee', async () => {
      await repo.create({ ...baseFields, licensee: licenseeId } as any)
      await repo.delete({ number: baseFields.number, licensee: licenseeId })
      const found = await repo.findFirst({ number: baseFields.number, licensee: licenseeId })
      expect(found).toBeNull()
    })
  })
})
