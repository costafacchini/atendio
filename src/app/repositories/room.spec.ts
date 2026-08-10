import { RoomRepositoryMemory } from '@repositories/room'
import { LicenseeRepositoryMemory } from '@repositories/licensee'
import { ContactRepositoryMemory } from '@repositories/contact'
import { licensee as licenseeFactory } from '@factories/licensee'
import { contact as contactFactory } from '@factories/contact'

describe('room repository memory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('#create', () => {
    it('creates a room with closed=false by default', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()
      const licensee = await licenseeRepository.create(licenseeFactory.build())

      const contactRepository = new ContactRepositoryMemory()
      const contact = await contactRepository.create(contactFactory.build({ licensee: licensee._id }))

      const roomRepository = new RoomRepositoryMemory()
      const room = await roomRepository.create({ contact: contact._id })

      expect(room).toEqual(
        expect.objectContaining({
          contact: contact._id,
          closed: false,
        }),
      )
    })
  })

  describe('#findFirst', () => {
    it('returns one record by filter', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()
      const licensee = await licenseeRepository.create(licenseeFactory.build())

      const contactRepository = new ContactRepositoryMemory()
      const contact = await contactRepository.create(contactFactory.build({ licensee: licensee._id }))
      const anotherContact = await contactRepository.create(contactFactory.build({ licensee: licensee._id }))

      const roomRepository = new RoomRepositoryMemory()
      await roomRepository.create({ roomId: '1234', contact: contact._id })
      await roomRepository.create({ roomId: '1234', contact: anotherContact._id })

      const room = await roomRepository.findFirst({ roomId: '1234', contact: contact._id })

      expect(room).toEqual(
        expect.objectContaining({
          roomId: '1234',
          contact: contact._id,
        }),
      )
    })
  })

  describe('#update', () => {
    it('updates a room', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()
      const licensee = await licenseeRepository.create(licenseeFactory.build())

      const contactRepository = new ContactRepositoryMemory()
      const contact = await contactRepository.create(contactFactory.build({ licensee: licensee._id }))

      const roomRepository = new RoomRepositoryMemory()
      const room = await roomRepository.create({ roomId: '1234', contact: contact._id })

      await roomRepository.update(room._id, { closed: true })

      const roomSaved = await roomRepository.findFirst({ _id: room._id })
      expect(roomSaved.closed).toEqual(true)
    })
  })
})
