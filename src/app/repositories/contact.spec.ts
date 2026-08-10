import { LicenseeRepositoryMemory } from '@repositories/licensee'
import { ContactRepositoryMemory } from '@repositories/contact'
import { MessageRepositoryMemory } from '@repositories/message'
import { licensee as licenseeFactory } from '@factories/licensee'
import { contact as contactFactory } from '@factories/contact'
import { message as messageFactory } from '@factories/message'
import moment from 'moment-timezone'

describe('contact repository memory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('#create', () => {
    it('creates a new contact', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()
      const licensee = await licenseeRepository.create(licenseeFactory.build())

      const contactRepository = new ContactRepositoryMemory()
      const contactSaved = await contactRepository.create({
        licensee: licensee._id,
        number: '5511990283745',
        talkingWithChatBot: false,
      })

      expect(contactSaved._id).toBeDefined()
      expect(contactSaved.number).toEqual('5511990283745')
      expect(contactSaved.talkingWithChatBot).toEqual(false)
      expect(contactSaved.licensee).toEqual(licensee._id)
    })

    it('normalizes phone number when it includes @', async () => {
      const contactRepository = new ContactRepositoryMemory()
      const contact = await contactRepository.create({
        number: '5511990283745@s.whatsapp.net',
        talkingWithChatBot: false,
        licensee: 'aabbccddeeff001122334455',
      })

      expect(contact.number).toEqual('5511990283745')
      expect(contact.type).toBeDefined()
    })
  })

  describe('#findFirst', () => {
    it('finds a contact', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()
      const licensee = await licenseeRepository.create(licenseeFactory.build())

      const contactRepository = new ContactRepositoryMemory()
      await contactRepository.create(
        contactFactory.build({ number: '5511990283745', talkingWithChatBot: true, licensee: licensee._id }),
      )
      await contactRepository.create(
        contactFactory.build({ number: '5511990283745', talkingWithChatBot: false, licensee: licensee._id }),
      )

      let result = await contactRepository.findFirst()
      expect(result).toEqual(expect.objectContaining({ number: '5511990283745' }))

      result = await contactRepository.findFirst({ talkingWithChatBot: false })
      expect(result).toEqual(expect.objectContaining({ number: '5511990283745', talkingWithChatBot: false }))
    })
  })

  describe('#getContactByNumber', () => {
    it('returns one record matching normalized phone and licensee', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()
      const licensee = await licenseeRepository.create(licenseeFactory.build())

      const contactRepository = new ContactRepositoryMemory()
      await contactRepository.create({ number: '5511990283745', talkingWithChatBot: false, licensee: licensee._id })

      const anotherLicensee = await licenseeRepository.create(licenseeFactory.build())
      await contactRepository.create({
        number: '5511990283745',
        talkingWithChatBot: false,
        licensee: anotherLicensee._id,
      })

      const contact = await contactRepository.getContactByNumber('11990283745', licensee._id)

      expect(contact).toEqual(expect.objectContaining({ number: '5511990283745', licensee: licensee._id }))
      expect(contact).not.toEqual(expect.objectContaining({ licensee: anotherLicensee._id }))
    })
  })

  describe('#find', () => {
    it('finds contacts by filter', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()
      const licensee = await licenseeRepository.create(licenseeFactory.build())

      const contactRepository = new ContactRepositoryMemory()
      await contactRepository.create(
        contactFactory.build({ number: '5511990283745', talkingWithChatBot: true, licensee: licensee._id }),
      )
      await contactRepository.create(
        contactFactory.build({ number: '5511990283745', talkingWithChatBot: false, licensee: licensee._id }),
      )

      const allResult = await contactRepository.find({ number: '5511990283745' })
      expect(allResult.length).toEqual(2)

      const filtered = await contactRepository.find({ talkingWithChatBot: false })
      expect(filtered.length).toEqual(1)
    })
  })

  describe('#contactWithWhatsappWindowClosed', () => {
    it('returns true if the last message was sent more than 24 hours ago', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()
      const licensee = await licenseeRepository.create(licenseeFactory.build())

      const messageRepository = new MessageRepositoryMemory()
      const contactRepository = new ContactRepositoryMemory({ messageRepository })
      const contact = await contactRepository.create({
        licensee: licensee._id,
        number: '5511990283745',
        talkingWithChatBot: false,
      })

      const now = moment.tz(new Date(), 'UTC')

      await messageRepository.create(
        messageFactory.build({
          licensee: licensee._id,
          contact: contact._id,
          destination: 'to-chat',
          createdAt: now.clone().subtract(24, 'hours').subtract(1, 'minutes').toDate(),
        }),
      )

      expect(await contactRepository.contactWithWhatsappWindowClosed(contact._id)).toEqual(true)
    })

    it('returns true if the contact has no messages sent to chat', async () => {
      const messageRepository = new MessageRepositoryMemory()
      const contactRepository = new ContactRepositoryMemory({ messageRepository })
      const contact = await contactRepository.create({
        number: '5511990283745',
        talkingWithChatBot: false,
        licensee: 'aabbccddeeff001122334455',
      })

      expect(await contactRepository.contactWithWhatsappWindowClosed(contact._id)).toEqual(true)
    })

    it('returns false if the last message was sent less than 24 hours ago', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()
      const licensee = await licenseeRepository.create(licenseeFactory.build())

      const messageRepository = new MessageRepositoryMemory()
      const contactRepository = new ContactRepositoryMemory({ messageRepository })
      const contact = await contactRepository.create({
        licensee: licensee._id,
        number: '5511990283745',
        talkingWithChatBot: false,
      })

      const now = moment.tz(new Date(), 'UTC')

      await messageRepository.create(
        messageFactory.build({
          licensee: licensee._id,
          contact: contact._id,
          destination: 'to-chat',
          createdAt: now.clone().subtract(23, 'hours').subtract(59, 'minutes').toDate(),
        }),
      )

      expect(await contactRepository.contactWithWhatsappWindowClosed(contact._id)).toEqual(false)
    })
  })
})
