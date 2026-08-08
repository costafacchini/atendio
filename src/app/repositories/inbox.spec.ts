import { LicenseeRepositoryMemory } from '@repositories/licensee'
import { InboxRepositoryMemory } from '@repositories/inbox'
import { licensee as licenseeFactory } from '@factories/licensee'

describe('inbox repository memory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('#create', () => {
    it('creates an inbox', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()
      const licensee = await licenseeRepository.create(licenseeFactory.build())

      const inboxRepository = new InboxRepositoryMemory()
      const inbox = await inboxRepository.create({
        name: 'Suporte',
        licensee: licensee._id,
        kind: 'messenger',
        active: true,
        inboxToken: 'token-xyz',
      })

      expect(inbox).toEqual(
        expect.objectContaining({
          name: 'Suporte',
          active: true,
        }),
      )
    })
  })

  describe('#find', () => {
    it('filters by licensee', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()
      const licensee = await licenseeRepository.create(licenseeFactory.build())
      const otherLicensee = await licenseeRepository.create(licenseeFactory.build())

      const inboxRepository = new InboxRepositoryMemory()
      await inboxRepository.create({ name: 'Suporte', licensee: licensee._id, kind: 'messenger', inboxToken: 't1' })
      await inboxRepository.create({
        name: 'Vendas',
        licensee: otherLicensee._id,
        kind: 'messenger',
        inboxToken: 't2',
      })

      const inboxes = await inboxRepository.find({ licensee: licensee._id })

      expect(inboxes).toHaveLength(1)
      expect(inboxes[0].name).toEqual('Suporte')
    })
  })
})
