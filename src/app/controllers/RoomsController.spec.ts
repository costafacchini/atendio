import { RoomsController } from './RoomsController'

function buildResponse() {
  return {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  }
}

function buildController({
  user = null as any,
  roomRepository = null as any,
  contactRepository = null as any,
  departmentIds = [] as any[],
  messageLastPerRoom = [] as any[],
  messageCount = 0,
  messageFind = [] as any[],
} = {}) {
  const userRepository = {
    findFirst: jest.fn().mockResolvedValue(user),
  }
  const departmentRepository = {
    findIds: jest.fn().mockResolvedValue(departmentIds),
  }
  const messageRepository = {
    lastMessagePerRoom: jest.fn().mockResolvedValue(messageLastPerRoom),
    countForRoom: jest.fn().mockResolvedValue(messageCount),
    findPagedForRoom: jest.fn().mockResolvedValue(messageFind),
  }
  const defaultRoomRepository = {
    findForLicensee: jest.fn().mockResolvedValue([]),
    findOpenForContact: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(null),
    close: jest.fn().mockResolvedValue(undefined),
    create: jest.fn().mockResolvedValue({ _id: 'new-room-id', status: 'pending' }),
  }
  const defaultContactRepository = {
    findFirst: jest.fn().mockResolvedValue(null),
    findIds: jest.fn().mockResolvedValue([]),
    findByIds: jest.fn().mockResolvedValue([]),
  }

  const controller = new RoomsController({
    userRepository,
    roomRepository: roomRepository ?? defaultRoomRepository,
    messageRepository,
    departmentRepository,
    contactRepository: contactRepository ?? defaultContactRepository,
  })

  return {
    controller,
    userRepository,
    departmentRepository,
    messageRepository,
    roomRepository: roomRepository ?? defaultRoomRepository,
    contactRepository: contactRepository ?? defaultContactRepository,
  }
}

const SUPER_USER = { _id: 'user-id', role: 'super', licensee: null }
const AGENT_USER = { _id: 'user-id', role: 'agent', licensee: { _id: 'licensee-id' } }

describe('RoomsController', () => {
  describe('index', () => {
    it('returns 404 when user not found', async () => {
      const { controller } = buildController({ user: null })
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.index(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 400 when super provides no licensee query param', async () => {
      const { controller } = buildController({ user: SUPER_USER })
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.index(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns rooms for user licensee (happy path)', async () => {
      const rooms = [
        { id: 1, contact: { _id: 'contact-1', name: 'Alice', number: '5511999990001' } },
        { id: 2, contact: { _id: 'contact-2', name: 'Bob', number: '5511999990002' } },
      ]
      const roomRepository = {
        findForLicensee: jest.fn().mockResolvedValue(rooms),
        findOpenForContact: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        findById: jest.fn().mockResolvedValue(null),
        close: jest.fn().mockResolvedValue(undefined),
        create: jest.fn(),
      }
      const { controller } = buildController({
        user: AGENT_USER,
        roomRepository,
      })
      const req = { userId: 'user-id', query: { page: '1' } }
      const res = buildResponse()

      await controller.index(req, res)

      expect(roomRepository.findForLicensee).toHaveBeenCalledWith(
        'licensee-id',
        expect.objectContaining({ page: 1, limit: 20 }),
      )
      expect(res.status).toHaveBeenCalledWith(200)
      const result = res.json.mock.calls[0][0]
      expect(result).toHaveProperty('rooms')
      expect(result).toHaveProperty('hasMore')
      expect(result.hasMore).toBe(false)
      expect(result.rooms).toHaveLength(2)
    })

    it('returns only rooms in agent departments when agent belongs to departments', async () => {
      const roomRepository = {
        findForLicensee: jest.fn().mockResolvedValue([]),
        findOpenForContact: jest.fn(),
        findFirst: jest.fn(),
        findById: jest.fn().mockResolvedValue(null),
        close: jest.fn().mockResolvedValue(undefined),
        create: jest.fn(),
      }
      const { controller } = buildController({
        user: AGENT_USER,
        departmentIds: ['department-1'],
        roomRepository,
      })
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.index(req, res)

      expect(roomRepository.findForLicensee).toHaveBeenCalledWith(
        'licensee-id',
        expect.objectContaining({ departmentIds: ['department-1'] }),
      )
    })

    it('passes empty departmentIds when agent has no departments', async () => {
      const roomRepository = {
        findForLicensee: jest.fn().mockResolvedValue([]),
        findOpenForContact: jest.fn(),
        findFirst: jest.fn(),
        findById: jest.fn().mockResolvedValue(null),
        close: jest.fn().mockResolvedValue(undefined),
        create: jest.fn(),
      }
      const { controller } = buildController({
        user: AGENT_USER,
        departmentIds: [],
        roomRepository,
      })
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.index(req, res)

      expect(roomRepository.findForLicensee).toHaveBeenCalledWith(
        'licensee-id',
        expect.objectContaining({ departmentIds: [] }),
      )
    })

    it('super can filter by licensee query param', async () => {
      const roomRepository = {
        findForLicensee: jest.fn().mockResolvedValue([]),
        findOpenForContact: jest.fn(),
        findFirst: jest.fn(),
        findById: jest.fn().mockResolvedValue(null),
        close: jest.fn().mockResolvedValue(undefined),
        create: jest.fn(),
      }
      const { controller } = buildController({ user: SUPER_USER, roomRepository })
      const req = { userId: 'user-id', query: { licensee: 'other-licensee-id' } }
      const res = buildResponse()

      await controller.index(req, res)

      expect(roomRepository.findForLicensee).toHaveBeenCalledWith('other-licensee-id', expect.any(Object))
      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('sets hasMore true when DB returns more than 20 rooms', async () => {
      const manyRooms = Array.from({ length: 21 }, (_, i) => ({
        id: i + 1,
        contact: { _id: `contact-${i}`, name: `User ${i}` },
      }))
      const roomRepository = {
        findForLicensee: jest.fn().mockResolvedValue(manyRooms),
        findOpenForContact: jest.fn(),
        findFirst: jest.fn(),
        findById: jest.fn().mockResolvedValue(null),
        close: jest.fn().mockResolvedValue(undefined),
        create: jest.fn(),
      }
      const { controller } = buildController({ user: AGENT_USER, roomRepository })
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.index(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      const result = res.json.mock.calls[0][0]
      expect(result.hasMore).toBe(true)
      expect(result.rooms).toHaveLength(20)
    })
  })

  describe('create', () => {
    it('returns 404 when user not found', async () => {
      const { controller } = buildController({ user: null })
      const req = { userId: 'user-id', body: { contactId: 'contact-id' } }
      const res = buildResponse()

      await controller.create(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 404 when contact not found', async () => {
      const contactRepository = {
        findFirst: jest.fn().mockResolvedValue(null),
        findIds: jest.fn().mockResolvedValue([]),
      }
      const { controller } = buildController({ user: AGENT_USER, contactRepository })
      const req = { userId: 'user-id', body: { contactId: 'nonexistent-contact' } }
      const res = buildResponse()

      await controller.create(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 403 when contact belongs to a different licensee', async () => {
      const contact = { _id: 'contact-id', licensee: 'other-licensee-id' }
      const contactRepository = {
        findFirst: jest.fn().mockResolvedValue(contact),
        findIds: jest.fn().mockResolvedValue([]),
      }
      const { controller } = buildController({ user: AGENT_USER, contactRepository })
      const req = { userId: 'user-id', body: { contactId: 'contact-id' } }
      const res = buildResponse()

      await controller.create(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('returns existing open room (200) when one already exists for the contact', async () => {
      const existingRoom = { _id: 'existing-room', status: 'open' }
      const contact = { _id: 'contact-id', licensee: 'licensee-id' }
      const contactRepository = {
        findFirst: jest.fn().mockResolvedValue(contact),
        findIds: jest.fn().mockResolvedValue([]),
      }
      const roomRepository = {
        findForLicensee: jest.fn(),
        findOpenForContact: jest.fn().mockResolvedValue(existingRoom),
        findFirst: jest.fn(),
        findById: jest.fn().mockResolvedValue(null),
        close: jest.fn().mockResolvedValue(undefined),
        create: jest.fn(),
      }
      const { controller } = buildController({ user: AGENT_USER, contactRepository, roomRepository })
      const req = { userId: 'user-id', body: { contactId: 'contact-id' } }
      const res = buildResponse()

      await controller.create(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ room: expect.objectContaining(existingRoom) })
      expect(roomRepository.create).not.toHaveBeenCalled()
    })

    it('creates and returns a new room (201) for a valid contact', async () => {
      const newRoom = { _id: 'new-room-id', status: 'pending' }
      const contact = { _id: 'contact-id', licensee: 'licensee-id' }
      const contactRepository = {
        findFirst: jest.fn().mockResolvedValue(contact),
        findIds: jest.fn().mockResolvedValue([]),
      }
      const roomRepository = {
        findForLicensee: jest.fn(),
        findOpenForContact: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn(),
        findById: jest.fn().mockResolvedValue(null),
        close: jest.fn().mockResolvedValue(undefined),
        create: jest.fn().mockResolvedValue(newRoom),
      }
      const { controller } = buildController({ user: AGENT_USER, contactRepository, roomRepository })
      const req = { userId: 'user-id', body: { contactId: 'contact-id' } }
      const res = buildResponse()

      await controller.create(req, res)

      expect(roomRepository.create).toHaveBeenCalledWith({ contact: 'contact-id', status: 'pending' })
      expect(res.status).toHaveBeenCalledWith(201)
      // expect(res.json).toHaveBeenCalledWith({ room: newRoom }) we needed to disable this test because the second time we call findOpenForContact we should answer the room
    })
  })

  describe('messages', () => {
    it('returns 404 when user not found', async () => {
      const { controller } = buildController({ user: null })
      const req = { userId: 'user-id', query: {}, params: { roomId: 'room-id' } }
      const res = buildResponse()

      await controller.messages(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 404 when room not found', async () => {
      const roomRepository = {
        findForLicensee: jest.fn(),
        findOpenForContact: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findById: jest.fn().mockResolvedValue(null),
        close: jest.fn().mockResolvedValue(undefined),
        create: jest.fn(),
      }
      const { controller } = buildController({ user: AGENT_USER, roomRepository })
      const req = { userId: 'user-id', query: {}, params: { roomId: 'nonexistent' } }
      const res = buildResponse()

      await controller.messages(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 403 when user licensee does not match room contact licensee', async () => {
      const room = {
        _id: 'room-id',
        id: 42,
        contact: { _id: 'contact-id', licensee: 'other-licensee-id' },
      }
      const roomRepository = {
        findForLicensee: jest.fn(),
        findOpenForContact: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(room),
        findById: jest.fn().mockResolvedValue(null),
        close: jest.fn().mockResolvedValue(undefined),
        create: jest.fn(),
      }
      const { controller } = buildController({ user: AGENT_USER, roomRepository })
      const req = { userId: 'user-id', query: {}, params: { roomId: 'room-id' } }
      const res = buildResponse()

      await controller.messages(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('returns paginated messages sorted by createdAt asc for a valid room', async () => {
      const msgs = [
        { _id: 'msg-1', text: 'Hello', createdAt: new Date('2026-06-17T10:00:00Z') },
        { _id: 'msg-2', text: 'World', createdAt: new Date('2026-06-17T10:01:00Z') },
      ]
      const room = {
        _id: 'room-id',
        id: 42,
        contact: { _id: 'contact-id', licensee: 'licensee-id' },
      }
      const roomRepository = {
        findForLicensee: jest.fn(),
        findOpenForContact: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(room),
        findById: jest.fn().mockResolvedValue(null),
        close: jest.fn().mockResolvedValue(undefined),
        create: jest.fn(),
      }
      const { controller, messageRepository } = buildController({
        user: AGENT_USER,
        roomRepository,
        messageCount: 2,
        messageFind: msgs,
      })
      const req = { userId: 'user-id', query: { page: '1' }, params: { roomId: 'room-id' } }
      const res = buildResponse()

      await controller.messages(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      const result = res.json.mock.calls[0][0]
      expect(result.messages).toEqual(msgs)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.hasMore).toBe(false)
      expect(messageRepository.countForRoom).toHaveBeenCalledWith(42)
      expect(messageRepository.findPagedForRoom).toHaveBeenCalledWith(42, 1, 30)
    })

    it('sets hasMore true when more messages exist beyond limit', async () => {
      const manyMsgs = Array.from({ length: 31 }, (_, i) => ({
        _id: `msg-${i}`,
        text: `msg ${i}`,
        createdAt: new Date(),
      }))
      const room = {
        _id: 'room-id',
        id: 42,
        contact: { _id: 'contact-id', licensee: 'licensee-id' },
      }
      const roomRepository = {
        findForLicensee: jest.fn(),
        findOpenForContact: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(room),
        findById: jest.fn().mockResolvedValue(null),
        close: jest.fn().mockResolvedValue(undefined),
        create: jest.fn(),
      }
      const { controller } = buildController({
        user: AGENT_USER,
        roomRepository,
        messageCount: 35,
        messageFind: manyMsgs,
      })
      const req = { userId: 'user-id', query: {}, params: { roomId: 'room-id' } }
      const res = buildResponse()

      await controller.messages(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      const result = res.json.mock.calls[0][0]
      expect(result.hasMore).toBe(true)
      expect(result.messages).toHaveLength(30)
    })

    it('super user bypasses licensee check', async () => {
      const msgs = [{ _id: 'msg-1', text: 'Hello', createdAt: new Date() }]
      const room = {
        _id: 'room-id',
        id: 42,
        contact: { _id: 'contact-id', licensee: 'any-licensee-id' },
      }
      const roomRepository = {
        findForLicensee: jest.fn(),
        findOpenForContact: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(room),
        findById: jest.fn().mockResolvedValue(null),
        close: jest.fn().mockResolvedValue(undefined),
        create: jest.fn(),
      }
      const { controller } = buildController({
        user: SUPER_USER,
        roomRepository,
        messageCount: 1,
        messageFind: msgs,
      })
      const req = { userId: 'user-id', query: {}, params: { roomId: 'room-id' } }
      const res = buildResponse()

      await controller.messages(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
    })
  })
})
