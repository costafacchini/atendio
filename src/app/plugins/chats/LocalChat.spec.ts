import { generateObjectId } from '@repositories/repository'
import { LocalChat } from './LocalChat'
import { installMemoryRepositories, resetMemoryRepositories } from '@repositories/testing'
import { licensee as licenseeFactory } from '@factories/licensee'
import { contact as contactFactory } from '@factories/contact'
import { message as messageFactory } from '@factories/message'
import { LicenseeRepositoryDatabase } from '@repositories/licensee'
import { ContactRepositoryDatabase } from '@repositories/contact'
import { MessageRepositoryDatabase } from '@repositories/message'
import { RoomRepositoryDatabase } from '@repositories/room'
import { createRuntimeDependencies } from '../../runtime/dependencies'
import * as socketEmitter from '../../services/socketEmitter'

jest.mock('../../services/socketEmitter', () => ({
  emitToLicensee: jest.fn(),
}))

let dependencies: any

describe('LocalChat plugin', () => {
  let licensee: any
  let contact: any
  let messageRepository: any
  let roomRepository: any
  let plugin: any

  beforeEach(async () => {
    installMemoryRepositories()
    dependencies = createRuntimeDependencies()
    jest.clearAllMocks()

    const licenseeRepository = new LicenseeRepositoryDatabase()
    licensee = await licenseeRepository.create(licenseeFactory.build({ chatDefault: 'local' }))

    const contactRepository = new ContactRepositoryDatabase()
    contact = await contactRepository.create(contactFactory.build({ licensee }))

    messageRepository = new MessageRepositoryDatabase()
    roomRepository = new RoomRepositoryDatabase()

    plugin = new LocalChat(licensee, {
      messageRepository,
      roomRepository,
    })
  })

  afterEach(() => {
    resetMemoryRepositories()
  })

  describe('#sendMessage', () => {
    it('creates a new room when no open room exists for the contact', async () => {
      const message = await messageRepository.create(messageFactory.build({ contact, licensee, sended: false }))

      await plugin.sendMessage(message._id)

      const room = await roomRepository.findFirst({ contact: contact._id, closed: false })
      expect(room).not.toBeNull()
      expect(room.status).toEqual('pending')
    })

    it('reuses the existing open room', async () => {
      const existingRoom = await roomRepository.create({ contact: contact._id, status: 'pending' })
      const message = await messageRepository.create(messageFactory.build({ contact, licensee, sended: false }))

      await plugin.sendMessage(message._id)

      const rooms = await roomRepository.find({ contact: contact._id })
      expect(rooms).toHaveLength(1)
      expect(rooms[0]._id.toString()).toEqual(existingRoom._id.toString())
    })

    it('marks the message as sended', async () => {
      const message = await messageRepository.create(messageFactory.build({ contact, licensee, sended: false }))

      await plugin.sendMessage(message._id)

      const updated = await messageRepository.findFirst({ _id: message._id })
      expect(updated.sended).toEqual(true)
    })

    it('assigns room to message before saving', async () => {
      const message = await messageRepository.create(messageFactory.build({ contact, licensee, sended: false }))

      await plugin.sendMessage(message._id)

      const updated = await messageRepository.findFirst({ _id: message._id })
      const room = await roomRepository.findFirst({ contact: contact._id })
      expect(updated.room?.toString()).toEqual(room._id.toString())
    })

    it('emits new-room-message via socketEmitter', async () => {
      const message = await messageRepository.create(messageFactory.build({ contact, licensee, sended: false }))

      await plugin.sendMessage(message._id)

      expect(socketEmitter.emitToLicensee).toHaveBeenCalledWith(
        licensee._id,
        'new-room-message',
        expect.objectContaining({
          messageId: message._id.toString(),
          licenseeId: licensee._id.toString(),
          contact: { id: contact._id.toString(), name: contact.name },
        }),
      )
    })

    it("creates a room with the message's department when no open room exists", async () => {
      const departmentId = generateObjectId()
      const message = await messageRepository.create(
        messageFactory.build({ contact, licensee, sended: false, department: departmentId }),
      )

      await plugin.sendMessage(message._id)

      const room = await roomRepository.findFirst({ contact: contact._id, closed: false })
      expect(room).not.toBeNull()
      expect(room.department).toEqual(departmentId.toString())
    })

    it('creates a room with department null when message has no department', async () => {
      const message = await messageRepository.create(
        messageFactory.build({ contact, licensee, sended: false, department: undefined }),
      )

      await plugin.sendMessage(message._id)

      const room = await roomRepository.findFirst({ contact: contact._id, closed: false })
      expect(room).not.toBeNull()
      expect(room.department).toBeUndefined()
    })
  })

  describe('#parseMessage', () => {
    it('sets messageParsed with correct shape for valid body', async () => {
      const room = await roomRepository.create({ contact: contact._id, status: 'open' })

      await plugin.parseMessage({ roomId: room._id, text: 'Hello agent', agentName: 'Ana' })

      expect(plugin.messageParsed).toMatchObject({
        action: 'send-message-to-messenger',
        messages: [{ kind: 'text', text: { body: 'Hello agent' }, senderName: 'Ana' }],
      })
    })

    it('sets messageParsed null when text is missing', async () => {
      const room = await roomRepository.create({ contact: contact._id, status: 'open' })

      await plugin.parseMessage({ roomId: room._id })

      expect(plugin.messageParsed).toBeNull()
    })

    it('sets messageParsed null when room is closed', async () => {
      const room = await roomRepository.create({ contact: contact._id, status: 'closed', closed: true })

      await plugin.parseMessage({ roomId: room._id, text: 'Hi' })

      expect(plugin.messageParsed).toBeNull()
    })

    it('sets messageParsed null when roomId is missing', async () => {
      await plugin.parseMessage({ text: 'Hi' })

      expect(plugin.messageParsed).toBeNull()
    })
  })

  describe('#responseToMessages', () => {
    it('sets department on message when room has a department', async () => {
      const departmentId = generateObjectId()
      const room = await roomRepository.create({ contact: contact._id, status: 'open', department: departmentId })
      const fullPlugin = new LocalChat(licensee, {
        messageRepository,
        roomRepository,
        triggerRepository: dependencies.triggerRepository,
      })

      await fullPlugin.responseToMessages({ roomId: room._id, text: 'Hello' })

      const saved = await messageRepository.findFirst({ contact: contact._id })
      expect(saved).not.toBeNull()
      expect(saved.department).toEqual(departmentId.toString())
    })

    it('sets department null on message when room has no department', async () => {
      const room = await roomRepository.create({ contact: contact._id, status: 'open' })
      const fullPlugin = new LocalChat(licensee, {
        messageRepository,
        roomRepository,
        triggerRepository: dependencies.triggerRepository,
      })

      await fullPlugin.responseToMessages({ roomId: room._id, text: 'Hello' })

      const saved = await messageRepository.findFirst({ contact: contact._id })
      expect(saved).not.toBeNull()
      expect(saved.department).toBeUndefined()
    })
  })

  describe('#closeChat', () => {
    it('sets room status to closed', async () => {
      const room = await roomRepository.create({ contact: contact._id, status: 'open' })
      const message = await messageRepository.create(messageFactory.build({ contact, licensee, room }))

      await plugin.closeChat(message._id)

      const updated = await roomRepository.findFirst({ _id: room._id })
      expect(updated.status).toEqual('closed')
    })
  })
})
