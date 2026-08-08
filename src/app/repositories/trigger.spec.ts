import { TriggerRepositoryMemory, createTrigger, getAllTriggerBy } from '@repositories/trigger'
import { LicenseeRepositoryMemory } from '@repositories/licensee'
import { licensee as licenseeFactory } from '@factories/licensee'
import { triggerMultiProduct as triggerFactory } from '@factories/trigger'

describe('trigger repository memory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('#createTrigger', () => {
    it('creates a trigger', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()
      const licensee = await licenseeRepository.create(licenseeFactory.build())
      const triggerRepository = new TriggerRepositoryMemory()

      const trigger = await createTrigger(
        {
          licensee: licensee._id,
          name: 'Send multi products',
          expression: 'send_multi_product',
          triggerKind: 'multi_product',
          catalogMulti: 'catalog',
          catalogId: 'id',
          order: 1,
        },
        { triggerRepository },
      )

      expect(trigger).toEqual(
        expect.objectContaining({
          name: 'Send multi products',
          expression: 'send_multi_product',
          triggerKind: 'multi_product',
          catalogMulti: 'catalog',
          catalogId: 'id',
          order: 1,
          licensee: licensee._id,
        }),
      )
    })
  })

  describe('#getAllTriggerBy', () => {
    it('returns all records by filter', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()
      const licensee = await licenseeRepository.create(licenseeFactory.build())
      const triggerRepository = new TriggerRepositoryMemory()

      const trigger1 = await createTrigger(triggerFactory.build({ licensee: licensee._id }), { triggerRepository })
      const trigger2 = await createTrigger(triggerFactory.build({ licensee: licensee._id }), { triggerRepository })

      const anotherLicensee = await licenseeRepository.create(licenseeFactory.build())
      const trigger3 = await createTrigger(triggerFactory.build({ licensee: anotherLicensee._id }), {
        triggerRepository,
      })

      const triggers = await getAllTriggerBy({ licensee: licensee._id }, {}, { triggerRepository })
      expect(triggers.length).toEqual(2)
      expect(triggers).toEqual(expect.arrayContaining([expect.objectContaining({ _id: trigger1._id })]))
      expect(triggers).toEqual(expect.arrayContaining([expect.objectContaining({ _id: trigger2._id })]))
      expect(triggers).not.toEqual(expect.arrayContaining([expect.objectContaining({ _id: trigger3._id })]))
    })

    it('returns all records ordered', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()
      const licensee = await licenseeRepository.create(licenseeFactory.build())
      const triggerRepository = new TriggerRepositoryMemory()

      const trigger1 = await createTrigger(triggerFactory.build({ licensee: licensee._id, order: 2 }), {
        triggerRepository,
      })
      const trigger2 = await createTrigger(triggerFactory.build({ licensee: licensee._id, order: 1 }), {
        triggerRepository,
      })

      const triggers = await getAllTriggerBy({ licensee: licensee._id }, { order: 'asc' }, { triggerRepository })
      expect(triggers.length).toEqual(2)
      expect(triggers[0]).toEqual(expect.objectContaining({ _id: trigger2._id }))
      expect(triggers[1]).toEqual(expect.objectContaining({ _id: trigger1._id }))
    })
  })
})
