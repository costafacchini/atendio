import { BodyRepositoryMemory } from '@repositories/body'
import { LicenseeRepositoryMemory } from '@repositories/licensee'
import { body as bodyFactory } from '@factories/body'
import { licensee as licenseeFactory } from '@factories/licensee'

describe('body repository memory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('#create', () => {
    it('creates a body', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()
      const licensee = await licenseeRepository.create(licenseeFactory.build())

      const bodyRepository = new BodyRepositoryMemory()
      const body = await bodyRepository.create(bodyFactory.build({ licensee: licensee._id }))

      expect(body).toEqual(
        expect.objectContaining({
          kind: 'normal',
          licensee: licensee._id,
          content: expect.objectContaining({ message: 'text' }),
        }),
      )
    })
  })

  describe('#update', () => {
    it('updates a body', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()
      const licensee = await licenseeRepository.create(licenseeFactory.build())

      const bodyRepository = new BodyRepositoryMemory()
      const body = await bodyRepository.create(bodyFactory.build({ licensee: licensee._id }))

      await bodyRepository.update(body._id, { concluded: true })

      const bodySaved = await bodyRepository.findFirst({ _id: body._id })
      expect(bodySaved.concluded).toEqual(true)
    })
  })
})
