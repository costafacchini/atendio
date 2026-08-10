import { LicenseeRepositoryMemory } from '@repositories/licensee'
import { ContactRepositoryMemory } from '@repositories/contact'
import { MessageRepositoryMemory } from '@repositories/message'
import { RoomRepositoryMemory } from '@repositories/room'
import { TriggerRepositoryMemory } from '@repositories/trigger'
import { licensee as licenseeFactory } from '@factories/licensee'
import { contact as contactFactory } from '@factories/contact'
import { message as messageFactory } from '@factories/message'
import { triggerText } from '@factories/trigger'
import { room as roomFactory } from '@factories/room'
import { parseText as parseTextHelper } from '../helpers/ParseTriggerText'

jest.mock('uuid', () => ({ v4: () => '150bdb15-4c55-42ac-bc6c-970d620fdb6d' }))

function buildRepositories() {
  const licenseeRepository = new LicenseeRepositoryMemory()
  const triggerRepository = new TriggerRepositoryMemory()
  const parseText = (text: any, contact: any) => parseTextHelper(text, contact, {})
  const messageRepository = new MessageRepositoryMemory({ triggerRepository, parseText })
  const contactRepository = new ContactRepositoryMemory()
  const roomRepository = new RoomRepositoryMemory()
  return { licenseeRepository, contactRepository, messageRepository, roomRepository, triggerRepository, parseText }
}

describe('message repository memory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('#create', () => {
    it('creates a new message with auto-generated number', async () => {
      const { licenseeRepository, contactRepository, messageRepository } = buildRepositories()
      const licensee = await licenseeRepository.create(licenseeFactory.build())
      const contact = await contactRepository.create(contactFactory.build({ licensee: licensee._id }))

      const message = await messageRepository.create({
        destination: 'to-chatbot',
        kind: 'text',
        text: 'Hello World',
        contact: contact._id,
        licensee: licensee._id,
      })

      expect(message).toEqual(
        expect.objectContaining({
          number: '150bdb15-4c55-42ac-bc6c-970d620fdb6d',
          kind: 'text',
          text: 'Hello World',
          destination: 'to-chatbot',
          licensee: licensee._id,
          contact: contact._id,
        }),
      )
    })
  })

  describe('#findFirst', () => {
    it('finds a message by filter', async () => {
      const { licenseeRepository, contactRepository, messageRepository } = buildRepositories()
      const licensee = await licenseeRepository.create(licenseeFactory.build())
      const contact = await contactRepository.create(contactFactory.build({ licensee: licensee._id }))

      await messageRepository.create(
        messageFactory.build({ licensee: licensee._id, contact: contact._id, text: 'Hello world' }),
      )
      await messageRepository.create(
        messageFactory.build({ licensee: licensee._id, contact: contact._id, text: 'Hello world again' }),
      )

      const result = await messageRepository.findFirst({ text: 'Hello world again' })
      expect(result).toEqual(expect.objectContaining({ text: 'Hello world again' }))
    })
  })

  describe('#find', () => {
    it('finds messages by filter', async () => {
      const { licenseeRepository, contactRepository, messageRepository } = buildRepositories()
      const licensee = await licenseeRepository.create(licenseeFactory.build())
      const contact = await contactRepository.create(contactFactory.build({ licensee: licensee._id }))

      await messageRepository.create(
        messageFactory.build({ licensee: licensee._id, contact: contact._id, text: 'Hello world' }),
      )
      await messageRepository.create(
        messageFactory.build({ licensee: licensee._id, contact: contact._id, text: 'Hello world' }),
      )
      await messageRepository.create(
        messageFactory.build({ licensee: licensee._id, contact: contact._id, text: 'Hello world again' }),
      )

      const result = await messageRepository.find({ text: 'Hello world' })
      expect(result.length).toEqual(2)
    })
  })

  describe('#findByRoom', () => {
    it('returns messages for the room in ascending createdAt order', async () => {
      const { licenseeRepository, contactRepository, messageRepository, roomRepository } = buildRepositories()
      const licensee = await licenseeRepository.create(licenseeFactory.build())
      const contact = await contactRepository.create(contactFactory.build({ licensee: licensee._id }))
      const room = await roomRepository.create(roomFactory.build({ contact: contact._id }))

      const msg1Id = '100000000000000000000001'
      const msg2Id = '100000000000000000000002'

      const messageRepository2 = new MessageRepositoryMemory({
        items: [
          { _id: msg2Id, room: room._id, text: 'second', createdAt: new Date('2024-01-01T11:00:00Z') },
          { _id: msg1Id, room: room._id, text: 'first', createdAt: new Date('2024-01-01T10:00:00Z') },
        ],
      })

      const result = await messageRepository2.findByRoom(room._id)

      expect(result.length).toEqual(2)
      expect(result[0]._id).toEqual(msg1Id)
      expect(result[1]._id).toEqual(msg2Id)
    })

    it('returns empty array when no messages exist for the room', async () => {
      const messageRepository = new MessageRepositoryMemory({ items: [] })
      const result = await messageRepository.findByRoom('nonexistent-room')
      expect(result).toEqual([])
    })

    it('filters messages by since option', async () => {
      const rid = 'aabbccddeeff001122334455'
      const oldMsg = {
        _id: 'msg-old-0000000000000001',
        room: rid,
        text: 'old',
        createdAt: new Date('2024-01-01T09:00:00Z'),
      }
      const recentMsg = {
        _id: 'msg-recent-000000000001',
        room: rid,
        text: 'recent',
        createdAt: new Date('2024-01-01T11:00:00Z'),
      }
      const messageRepository = new MessageRepositoryMemory({ items: [oldMsg, recentMsg] })

      const result = await messageRepository.findByRoom(rid, { since: new Date('2024-01-01T10:00:00Z') })

      expect(result.length).toEqual(1)
      expect(result[0]._id).toEqual(recentMsg._id)
    })
  })

  describe('#createInteractiveMessages', () => {
    it('creates interactive messages when triggers match the expression', async () => {
      const { licenseeRepository, contactRepository, messageRepository, triggerRepository } = buildRepositories()
      const licensee = await licenseeRepository.create(licenseeFactory.build())
      const contact = await contactRepository.create(contactFactory.build({ licensee: licensee._id }))

      const trigger1 = await triggerRepository.create(
        triggerText.build({ licensee: licensee._id, expression: 'hello_world', text: 'Hello world 1' }),
      )
      const trigger2 = await triggerRepository.create(
        triggerText.build({ licensee: licensee._id, expression: 'hello_world', text: 'Hello world 2' }),
      )

      const messages = await messageRepository.createInteractiveMessages({
        destination: 'to-chatbot',
        kind: 'text',
        text: 'hello_world',
        contact: contact._id,
        licensee: licensee._id,
      })

      expect(messages.length).toEqual(2)
      expect(messages[0]).toEqual(expect.objectContaining({ kind: 'interactive', trigger: trigger1._id }))
      expect(messages[1]).toEqual(expect.objectContaining({ kind: 'interactive', trigger: trigger2._id }))
    })

    it('creates a text message when no trigger matches', async () => {
      const { licenseeRepository, contactRepository, messageRepository } = buildRepositories()
      const licensee = await licenseeRepository.create(licenseeFactory.build())
      const contact = await contactRepository.create(contactFactory.build({ licensee: licensee._id }))

      const messages = await messageRepository.createInteractiveMessages({
        destination: 'to-chatbot',
        kind: 'text',
        text: 'hello_world',
        contact: contact._id,
        licensee: licensee._id,
      })

      expect(messages.length).toEqual(1)
      expect(messages[0]).toEqual(expect.objectContaining({ kind: 'text', text: 'hello_world' }))
    })
  })

  describe('#createTextMessageInsteadInteractive', () => {
    it('creates a text message unchanged when kind is text', async () => {
      const { licenseeRepository, contactRepository, messageRepository } = buildRepositories()
      const licensee = await licenseeRepository.create(licenseeFactory.build())
      const contact = await contactRepository.create(contactFactory.build({ licensee: licensee._id }))

      const message = await messageRepository.createTextMessageInsteadInteractive({
        destination: 'to-chatbot',
        kind: 'text',
        text: 'Hello World',
        contact: contact._id,
        licensee: licensee._id,
      })

      expect(message).toEqual(expect.objectContaining({ kind: 'text', text: 'Hello World' }))
    })

    it('replaces $contact_name with the contact name when kind is interactive', async () => {
      const { licenseeRepository, contactRepository, messageRepository } = buildRepositories()
      const licensee = await licenseeRepository.create(licenseeFactory.build())
      const contact = await contactRepository.create(contactFactory.build({ licensee: licensee._id, name: 'John Doe' }))

      const message = await messageRepository.createTextMessageInsteadInteractive({
        destination: 'to-chatbot',
        kind: 'interactive',
        text: '$contact_name',
        contact,
        licensee: licensee._id,
      })

      expect(message).toEqual(expect.objectContaining({ kind: 'text', text: 'John Doe' }))
    })
  })

  describe('#createMessageToWarnAboutWindowOfWhatsassHasExpired', () => {
    it('creates a warn message for the chat', async () => {
      const { licenseeRepository, contactRepository, messageRepository } = buildRepositories()
      const licensee = await licenseeRepository.create(licenseeFactory.build())
      const contact = await contactRepository.create(contactFactory.build({ licensee: licensee._id }))

      const message = await messageRepository.createMessageToWarnAboutWindowOfWhatsassHasExpired(contact, licensee._id)

      expect(message).toEqual(
        expect.objectContaining({
          kind: 'text',
          text: '🚨 ATENÇÃO\nO período de 24h para manter conversas expirou. Envie um Template para voltar a interagir com esse contato.',
          destination: 'to-chat',
        }),
      )
    })
  })

  describe('#createMessageToWarnAboutWindowOfWhatsassIsEnding', () => {
    it('creates a warn message for the chat', async () => {
      const { licenseeRepository, contactRepository, messageRepository } = buildRepositories()
      const licensee = await licenseeRepository.create(licenseeFactory.build())
      const contact = await contactRepository.create(contactFactory.build({ licensee: licensee._id }))

      const message = await messageRepository.createMessageToWarnAboutWindowOfWhatsassIsEnding(contact, licensee._id)

      expect(message).toEqual(
        expect.objectContaining({
          kind: 'text',
          text: '🚨 ATENÇÃO\nO período de 24h para manter conversas está quase expirando. Faltam apenas 10 minutos para encerrar.',
          destination: 'to-chat',
        }),
      )
    })
  })
})
