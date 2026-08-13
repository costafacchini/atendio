import { DashboardController } from './DashboardController'

function buildResponse() {
  return {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  }
}

function buildRedis({ cachedValue = null } = {}) {
  return {
    get: jest.fn().mockResolvedValue(cachedValue),
    setex: jest.fn().mockResolvedValue('OK'),
  }
}

function buildController({ user = null, redisConnection = null, overrides = {} as any } = {}) {
  const userRepository = { findFirst: jest.fn().mockResolvedValue(user) }
  const licenseeRepository = { count: jest.fn().mockResolvedValue(0) }
  const contactRepository = {
    count: jest.fn().mockResolvedValue(0),
    findIds: jest.fn().mockResolvedValue([]),
    find: jest.fn().mockResolvedValue([]),
  }
  const messageRepository = {
    countMessages: jest.fn().mockResolvedValue(0),
    groupByDay: jest.fn().mockResolvedValue([]),
    groupByHour: jest.fn().mockResolvedValue([]),
    avgQueueTime: jest.fn().mockResolvedValue(0),
    avgMessagesPerRoom: jest.fn().mockResolvedValue(0),
    lastMessagePerRoom: jest.fn().mockResolvedValue([]),
  }
  const roomRepository = {
    count: jest.fn().mockResolvedValue(0),
    findManyPaged: jest.fn().mockResolvedValue([]),
    avgDuration: jest.fn().mockResolvedValue(0),
    findById: jest.fn().mockResolvedValue(null),
    close: jest.fn().mockResolvedValue(undefined),
  }
  const redis = redisConnection ?? buildRedis()

  const controller = new DashboardController({
    userRepository,
    licenseeRepository,
    contactRepository,
    messageRepository,
    roomRepository,
    redisConnection: redis,
    ...overrides,
  })

  return {
    controller,
    userRepository,
    licenseeRepository,
    contactRepository,
    messageRepository,
    roomRepository,
    redisConnection: redis,
  }
}

const SUPER_USER = { _id: 'user-id', role: 'super' }
const LICENSEE_USER = { _id: 'user-id', role: 'agent', licensee: 'licensee-id' }

describe('DashboardController', () => {
  describe('licensees', () => {
    it('returns 403 when user is not super', async () => {
      const { controller } = buildController({ user: LICENSEE_USER })
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.licensees(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('returns 404 when user not found', async () => {
      const { controller } = buildController({ user: null })
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.licensees(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('serves from cache on cache hit', async () => {
      const cached = { total: 5, active: 3, by_kind: { demo: 1, free: 2, paid: 2 } }
      const redis = buildRedis({ cachedValue: JSON.stringify(cached) })
      const { controller, licenseeRepository } = buildController({ user: SUPER_USER, redisConnection: redis })
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.licensees(req, res)

      expect(redis.get).toHaveBeenCalledWith('dashboard:super:licensees')
      expect(licenseeRepository.count).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(cached)
    })

    it('queries DB on cache miss and stores result in redis', async () => {
      const redis = buildRedis({ cachedValue: null })
      const { controller, licenseeRepository } = buildController({ user: SUPER_USER, redisConnection: redis })
      licenseeRepository.count.mockResolvedValue(10)
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.licensees(req, res)

      expect(redis.setex).toHaveBeenCalledWith('dashboard:super:licensees', 600, expect.any(String))
      expect(res.status).toHaveBeenCalledWith(200)
      const result = res.json.mock.calls[0][0]
      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('by_kind')
    })

    it('returns 500 on repository error', async () => {
      const redis = buildRedis({ cachedValue: null })
      const { controller, licenseeRepository } = buildController({ user: SUPER_USER, redisConnection: redis })
      licenseeRepository.count.mockRejectedValue(new Error('DB error'))
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.licensees(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('messageVolume', () => {
    it('returns 403 when user is not super', async () => {
      const { controller } = buildController({ user: LICENSEE_USER })
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.messageVolume(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('serves from cache on cache hit', async () => {
      const cached = { per_day: [], per_hour: [], peak_throughput: 0, avg_transfer_rate: 0 }
      const startDate = new Date('2026-05-07T00:00:00.000Z')
      const endDate = new Date('2026-05-07T01:00:00.000Z')
      const redis = buildRedis({ cachedValue: JSON.stringify(cached) })
      const { controller, messageRepository } = buildController({ user: SUPER_USER, redisConnection: redis })
      const req = { userId: 'user-id', query: { startDate: startDate.toISOString(), endDate: endDate.toISOString() } }
      const res = buildResponse()

      await controller.messageVolume(req, res)

      expect(messageRepository.groupByDay).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(cached)
    })

    it('queries DB and returns volume data on cache miss', async () => {
      const redis = buildRedis({ cachedValue: null })
      const { controller, messageRepository } = buildController({ user: SUPER_USER, redisConnection: redis })
      messageRepository.groupByDay.mockResolvedValue([{ _id: '2026-05-07', count: 5 }])
      messageRepository.groupByHour.mockResolvedValue([{ _id: '2026-05-07T10', count: 5 }])
      messageRepository.countMessages.mockResolvedValue(5)
      const req = {
        userId: 'user-id',
        query: { startDate: '2026-05-07T00:00:00.000Z', endDate: '2026-05-07T24:00:00.000Z' },
      }
      const res = buildResponse()

      await controller.messageVolume(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      const result = res.json.mock.calls[0][0]
      expect(result).toHaveProperty('per_day')
      expect(result).toHaveProperty('per_hour')
      expect(result).toHaveProperty('peak_throughput')
      expect(result).toHaveProperty('avg_transfer_rate')
    })
  })

  describe('deliveryRate', () => {
    it('returns 403 when user is not super', async () => {
      const { controller } = buildController({ user: LICENSEE_USER })
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.deliveryRate(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('returns correct percentages on cache miss', async () => {
      const redis = buildRedis({ cachedValue: null })
      const { controller, messageRepository } = buildController({ user: SUPER_USER, redisConnection: redis })
      messageRepository.countMessages.mockResolvedValueOnce(80).mockResolvedValueOnce(20).mockResolvedValueOnce(35)
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.deliveryRate(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      const result = res.json.mock.calls[0][0]
      expect(result.sent_today).toBe(80)
      expect(result.failed_today).toBe(20)
      expect(result.failed_total).toBe(35)
      expect(result.sent_pct).toBe(80)
      expect(result.failed_pct).toBe(20)
    })

    it('returns zero percentages when no messages', async () => {
      const redis = buildRedis({ cachedValue: null })
      const { controller } = buildController({ user: SUPER_USER, redisConnection: redis })
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.deliveryRate(req, res)

      const result = res.json.mock.calls[0][0]
      expect(result.sent_pct).toBe(0)
      expect(result.failed_pct).toBe(0)
    })
  })

  describe('queue', () => {
    it('returns 403 when user is not super', async () => {
      const { controller } = buildController({ user: LICENSEE_USER })
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.queue(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('returns queue stats on cache miss', async () => {
      const redis = buildRedis({ cachedValue: null })
      const { controller, messageRepository } = buildController({ user: SUPER_USER, redisConnection: redis })
      messageRepository.countMessages.mockResolvedValue(5)
      messageRepository.avgQueueTime.mockResolvedValue(30)
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.queue(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      const result = res.json.mock.calls[0][0]
      expect(result).toHaveProperty('pending_messages')
      expect(result).toHaveProperty('avg_time_in_queue_seconds')
    })

    it('returns 0 avg when avgQueueTime returns 0', async () => {
      const redis = buildRedis({ cachedValue: null })
      const { controller, messageRepository } = buildController({ user: SUPER_USER, redisConnection: redis })
      messageRepository.countMessages.mockResolvedValue(3)
      messageRepository.avgQueueTime.mockResolvedValue(0)
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.queue(req, res)

      const result = res.json.mock.calls[0][0]
      expect(result.avg_time_in_queue_seconds).toBe(0)
    })
  })

  describe('conversations', () => {
    it('returns 403 when user is not super', async () => {
      const { controller } = buildController({ user: LICENSEE_USER })
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.conversations(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('returns conversation stats on cache miss', async () => {
      const redis = buildRedis({ cachedValue: null })
      const { controller, roomRepository, messageRepository } = buildController({
        user: SUPER_USER,
        redisConnection: redis,
      })
      roomRepository.count.mockResolvedValue(5)
      roomRepository.avgDuration.mockResolvedValue(120)
      messageRepository.avgMessagesPerRoom.mockResolvedValue(4.5)
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.conversations(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      const result = res.json.mock.calls[0][0]
      expect(result).toHaveProperty('started_today')
      expect(result).toHaveProperty('ended_today')
      expect(result).toHaveProperty('avg_messages_per_conversation')
      expect(result).toHaveProperty('avg_duration_seconds')
    })

    it('returns 0 averages when repositories return 0', async () => {
      const redis = buildRedis({ cachedValue: null })
      const { controller } = buildController({ user: SUPER_USER, redisConnection: redis })
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.conversations(req, res)

      const result = res.json.mock.calls[0][0]
      expect(result.avg_messages_per_conversation).toBe(0)
      expect(result.avg_duration_seconds).toBe(0)
    })
  })

  describe('contacts', () => {
    it('returns 403 when user is super', async () => {
      const { controller } = buildController({ user: SUPER_USER })
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.contacts(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('returns 404 when user not found', async () => {
      const { controller } = buildController({ user: null })
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.contacts(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('serves from cache on cache hit', async () => {
      const cached = { total: 10, in_chatbot: 3 }
      const redis = buildRedis({ cachedValue: JSON.stringify(cached) })
      const { controller, contactRepository } = buildController({ user: LICENSEE_USER, redisConnection: redis })
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.contacts(req, res)

      expect(redis.get).toHaveBeenCalledWith(`dashboard:licensee:${LICENSEE_USER.licensee}:contacts`)
      expect(contactRepository.count).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(cached)
    })

    it('queries DB on cache miss', async () => {
      const redis = buildRedis({ cachedValue: null })
      const { controller, contactRepository } = buildController({ user: LICENSEE_USER, redisConnection: redis })
      contactRepository.count.mockResolvedValueOnce(15).mockResolvedValueOnce(4)
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.contacts(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      const result = res.json.mock.calls[0][0]
      expect(result.total).toBe(15)
      expect(result.in_chatbot).toBe(4)
    })
  })

  describe('messagesToday', () => {
    it('returns 403 when user is super', async () => {
      const { controller } = buildController({ user: SUPER_USER })
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.messagesToday(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('returns licensee message counts on cache miss', async () => {
      const redis = buildRedis({ cachedValue: null })
      const { controller, messageRepository } = buildController({ user: LICENSEE_USER, redisConnection: redis })
      messageRepository.countMessages.mockResolvedValueOnce(50).mockResolvedValueOnce(5)
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.messagesToday(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      const result = res.json.mock.calls[0][0]
      expect(result.sent_today).toBe(50)
      expect(result.failed_today).toBe(5)
    })
  })

  describe('messagesPerDay', () => {
    it('returns 403 when user is super', async () => {
      const { controller } = buildController({ user: SUPER_USER })
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.messagesPerDay(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('returns per_day data on cache miss', async () => {
      const redis = buildRedis({ cachedValue: null })
      const { controller, messageRepository } = buildController({ user: LICENSEE_USER, redisConnection: redis })
      messageRepository.groupByDay.mockResolvedValue([{ _id: '2026-05-07', count: 10 }])
      const req = { userId: 'user-id', query: {} }
      const res = buildResponse()

      await controller.messagesPerDay(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      const result = res.json.mock.calls[0][0]
      expect(result).toHaveProperty('per_day')
      expect(result.per_day).toHaveLength(1)
      expect(result.per_day[0]).toEqual({ _id: '2026-05-07', count: 10 })
    })
  })

  describe('_parseDateRange', () => {
    it('defaults to today when no query params', () => {
      const { controller } = buildController()
      const now = new Date()
      const { startDate, endDate } = controller._parseDateRange({})

      expect(startDate.getDate()).toBe(now.getDate())
      expect(endDate.getTime() - startDate.getTime()).toBe(24 * 60 * 60 * 1000)
    })

    it('parses ISO date strings from query', () => {
      const { controller } = buildController()
      const start = '2026-01-01T00:00:00.000Z'
      const end = '2026-01-02T00:00:00.000Z'
      const { startDate, endDate } = controller._parseDateRange({ startDate: start, endDate: end })

      expect(startDate).toEqual(new Date(start))
      expect(endDate).toEqual(new Date(end))
    })
  })

  describe('openRooms', () => {
    const room1 = { id: 1, _id: '1', contact: 101, createdAt: new Date() }
    const room2 = { id: 2, _id: '2', contact: 102, createdAt: new Date() }
    const lastMsg1 = { room: 1, text: 'Hello', createdAt: new Date() }

    it('returns 403 when user is not super or admin', async () => {
      const { controller } = buildController({ user: LICENSEE_USER })
      const req = { userId: 'user-id', query: {}, params: {} }
      const res = buildResponse()

      await controller.openRooms(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('returns 404 when user not found', async () => {
      const { controller } = buildController({ user: null })
      const req = { userId: 'user-id', query: {}, params: {} }
      const res = buildResponse()

      await controller.openRooms(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns rooms that have a last message', async () => {
      const { controller, roomRepository, messageRepository } = buildController({ user: SUPER_USER })
      roomRepository.findManyPaged.mockResolvedValue([room1, room2])
      messageRepository.lastMessagePerRoom.mockResolvedValue([lastMsg1])
      const req = { userId: 'user-id', query: { page: '1' }, params: {} }
      const res = buildResponse()

      await controller.openRooms(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      const result = res.json.mock.calls[0][0]
      expect(result.rooms).toHaveLength(1)
      expect(result.rooms[0].id).toBe(1)
      expect(result.rooms[0].lastMessage).toEqual(lastMsg1)
      expect(result.hasMore).toBe(false)
    })

    it('filters out rooms without a last message', async () => {
      const { controller, roomRepository, messageRepository } = buildController({ user: SUPER_USER })
      roomRepository.findManyPaged.mockResolvedValue([room1, room2])
      messageRepository.lastMessagePerRoom.mockResolvedValue([])
      const req = { userId: 'user-id', query: {}, params: {} }
      const res = buildResponse()

      await controller.openRooms(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      const result = res.json.mock.calls[0][0]
      expect(result.rooms).toHaveLength(0)
    })

    it('sets hasMore true when DB returns more rooms than the limit', async () => {
      // findManyPaged fetches limit+1 (11); if it gets 11 back, hasMore=true
      const manyRooms = Array.from({ length: 11 }, (_, i) => ({
        id: i + 1,
        _id: String(i + 1),
        contact: i + 100,
        createdAt: new Date(),
      }))
      const lastMsgs = manyRooms.slice(0, 10).map((r) => ({ room: r.id, text: 'msg', createdAt: new Date() }))
      const { controller, roomRepository, messageRepository } = buildController({ user: SUPER_USER })
      roomRepository.findManyPaged.mockResolvedValue(manyRooms)
      messageRepository.lastMessagePerRoom.mockResolvedValue(lastMsgs)
      const req = { userId: 'user-id', query: { page: '1' }, params: {} }
      const res = buildResponse()

      await controller.openRooms(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      const result = res.json.mock.calls[0][0]
      expect(result.rooms).toHaveLength(10)
      expect(result.hasMore).toBe(true)
    })

    it('filters rooms by licensee via contact lookup', async () => {
      const { controller, roomRepository, contactRepository, messageRepository } = buildController({ user: SUPER_USER })
      contactRepository.findIds.mockResolvedValue([101])
      roomRepository.findManyPaged.mockResolvedValue([room1])
      messageRepository.lastMessagePerRoom.mockResolvedValue([lastMsg1])
      const req = { userId: 'user-id', query: { licensee: 'licensee-id' }, params: {} }
      const res = buildResponse()

      await controller.openRooms(req, res)

      expect(contactRepository.findIds).toHaveBeenCalledWith({ licensee: expect.any(Number) })
      expect(roomRepository.findManyPaged).toHaveBeenCalledWith(
        expect.objectContaining({ contact: { in: [101] } }),
        1,
        10,
      )
      expect(res.status).toHaveBeenCalledWith(200)
    })
  })

  describe('closeRoom', () => {
    it('returns 403 when user is not super or admin', async () => {
      const { controller } = buildController({ user: LICENSEE_USER })
      const req = { userId: 'user-id', query: {}, params: { roomId: 'room-id' } }
      const res = buildResponse()

      await controller.closeRoom(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('returns 404 when user not found', async () => {
      const { controller } = buildController({ user: null })
      const req = { userId: 'user-id', query: {}, params: { roomId: 'room-id' } }
      const res = buildResponse()

      await controller.closeRoom(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 404 when room not found', async () => {
      const { controller, roomRepository } = buildController({ user: SUPER_USER })
      roomRepository.findById.mockResolvedValue(null)
      const req = { userId: 'user-id', query: {}, params: { roomId: 'nonexistent-room' } }
      const res = buildResponse()

      await controller.closeRoom(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 200 with already-closed message without calling close when room is already closed', async () => {
      const { controller, roomRepository } = buildController({ user: SUPER_USER })
      roomRepository.findById.mockResolvedValue({ id: 1, closed: true })
      const req = { userId: 'user-id', query: {}, params: { roomId: 'room-id' } }
      const res = buildResponse()

      await controller.closeRoom(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ message: 'Already closed' })
      expect(roomRepository.close).not.toHaveBeenCalled()
    })

    it('calls close and returns 200 for an open room', async () => {
      const { controller, roomRepository } = buildController({ user: SUPER_USER })
      roomRepository.findById.mockResolvedValue({ id: 1, closed: false })
      const req = { userId: 'user-id', query: {}, params: { roomId: 'room-id' } }
      const res = buildResponse()

      await controller.closeRoom(req, res)

      expect(roomRepository.close).toHaveBeenCalledWith('room-id')
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ message: 'Room closed' })
    })
  })
})
