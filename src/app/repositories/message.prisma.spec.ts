// Integration tests for PrismaMessageDatabaseRepository.
// Requires RUN_POSTGRES_TESTS=1 and a reachable DATABASE_URL.
import { PrismaMessageDatabaseRepository } from './message'
import { connectPostgres, disconnectPostgres, getPrismaClient } from '../../config/postgres'

const describeIf = process.env['RUN_POSTGRES_TESTS'] === '1' ? describe : describe.skip

describeIf('PrismaMessageDatabaseRepository', () => {
  let licenseeId: number
  let contactId: number

  beforeAll(async () => {
    await connectPostgres()
    const licensee = await getPrismaClient().licensee.create({
      data: { name: 'Test Licensee', apiToken: 'tok-message', licenseKind: 'demo', active: true },
    })
    licenseeId = licensee.id
    const contact = await getPrismaClient().contact.create({
      data: { number: '5511999990088', talkingWithChatBot: false, licensee: licenseeId, active: true, isGroup: false },
    })
    contactId = contact.id
  })

  afterAll(async () => {
    await getPrismaClient().contact.deleteMany({ where: { licensee: licenseeId } })
    await getPrismaClient().licensee.deleteMany({ where: { apiToken: 'tok-message' } })
    await disconnectPostgres()
  })

  afterEach(async () => {
    await getPrismaClient().message.deleteMany({ where: { contact: contactId } })
  })

  const repo = new PrismaMessageDatabaseRepository()

  const baseFields = {
    number: 'msg-001',
    destination: 'to-chat',
    fromMe: false,
    kind: 'text',
    sended: false,
  }

  describe('#create', () => {
    it('persists a message and returns it with an id', async () => {
      const result = await repo.create({ ...baseFields, licensee: licenseeId, contact: contactId } as any)
      expect((result as any).id).toBeDefined()
      expect((result as any).number).toEqual('msg-001')
    })

    it('strips cart field from the created record', async () => {
      const result = await repo.create({
        ...baseFields,
        cart: 'some-cart-data',
        licensee: licenseeId,
        contact: contactId,
      } as any)
      expect((result as any).cart).toBeUndefined()
    })
  })

  describe('#findFirst', () => {
    it('finds a message by number', async () => {
      await repo.create({ ...baseFields, licensee: licenseeId, contact: contactId } as any)
      const found = await repo.findFirst({ number: baseFields.number })
      expect(found).not.toBeNull()
      expect((found as any).number).toEqual('msg-001')
    })

    it('returns null when not found', async () => {
      const found = await repo.findFirst({ number: 'nonexistent-msg' })
      expect(found).toBeNull()
    })
  })

  describe('#find', () => {
    it('returns all matching messages', async () => {
      await repo.create({ ...baseFields, licensee: licenseeId, contact: contactId } as any)
      await repo.create({ ...baseFields, number: 'msg-002', licensee: licenseeId, contact: contactId } as any)
      const results = await repo.find({ licensee: licenseeId })
      expect(results.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('#update', () => {
    it('updates a message by id', async () => {
      const created = await repo.create({ ...baseFields, licensee: licenseeId, contact: contactId } as any)
      await repo.update((created as any)._id, { sended: true } as any)
      const found = await repo.findFirst({ number: baseFields.number })
      expect((found as any).sended).toBe(true)
    })
  })

  describe('#save', () => {
    it('upserts a message', async () => {
      const created = await repo.create({ ...baseFields, licensee: licenseeId, contact: contactId } as any)
      ;(created as any).sended = true
      await repo.save(created as any)
      const found = await repo.findFirst({ number: baseFields.number })
      expect((found as any).sended).toBe(true)
    })
  })

  describe('#delete', () => {
    it('removes a message by number', async () => {
      await repo.create({ ...baseFields, licensee: licenseeId, contact: contactId } as any)
      await repo.delete({ number: baseFields.number })
      const found = await repo.findFirst({ number: baseFields.number })
      expect(found).toBeNull()
    })
  })
})
