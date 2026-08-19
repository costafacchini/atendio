import { MessagesController } from './MessagesController'

function buildResponse() {
  return {
    json: jest.fn(),
    send: jest.fn(),
    status: jest.fn().mockReturnThis(),
  }
}

function buildController({ user = null, message = null } = {}) {
  const messagesQueryInstance = {
    page: jest.fn(),
    limit: jest.fn(),
    filterByCreatedAt: jest.fn(),
    filterByLicensee: jest.fn(),
    filterByContact: jest.fn(),
    filterByKind: jest.fn(),
    filterByDestination: jest.fn(),
    filterBySended: jest.fn(),
    all: jest.fn(),
  }
  const createMessagesQuery = jest.fn().mockReturnValue(messagesQueryInstance)

  const userRepository = {
    findFirst: jest.fn().mockResolvedValue(user),
  }
  const messageRepository = {
    findFirst: jest.fn().mockResolvedValue(message),
    save: jest.fn().mockResolvedValue(undefined),
  }
  const queueServer = {
    addJob: jest.fn().mockResolvedValue(undefined),
  }

  const controller = new MessagesController({ createMessagesQuery, userRepository, messageRepository, queueServer })

  return { controller, createMessagesQuery, messagesQueryInstance, userRepository, messageRepository, queueServer }
}

describe('MessagesController delegation', () => {
  it('delegates index to messagesQuery and returns status 200', async () => {
    const { controller, messagesQueryInstance } = buildController()
    const messages = [{ _id: 'msg-id', text: 'Message 1' }]
    messagesQueryInstance.all.mockResolvedValue(messages)

    const req = { query: { page: '1', limit: '10', destination: 'to-chat', kind: 'text', sended: 'true' } }
    const res = buildResponse()

    await controller.index(req, res)

    expect(messagesQueryInstance.page).toHaveBeenCalledWith(1)
    expect(messagesQueryInstance.limit).toHaveBeenCalledWith(10)
    expect(messagesQueryInstance.filterByDestination).toHaveBeenCalledWith('to-chat')
    expect(messagesQueryInstance.filterByKind).toHaveBeenCalledWith('text')
    expect(messagesQueryInstance.filterBySended).toHaveBeenCalledWith(true)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith(messages)
  })

  it('filters by date range when startDate and endDate are provided', async () => {
    const { controller, messagesQueryInstance } = buildController()
    messagesQueryInstance.all.mockResolvedValue([])

    const startDate = '2021-07-01T00:00:00.000Z'
    const endDate = '2021-07-05T00:00:00.000Z'
    const req = { query: { page: '1', limit: '10', startDate, endDate } }
    const res = buildResponse()

    await controller.index(req, res)

    expect(messagesQueryInstance.filterByCreatedAt).toHaveBeenCalledWith(new Date(startDate), new Date(endDate))
  })

  it('filters by licensee and contact when provided', async () => {
    const { controller, messagesQueryInstance } = buildController()
    messagesQueryInstance.all.mockResolvedValue([])

    const req = { query: { page: '1', limit: '10', licensee: 'licensee-id', contact: 'contact-id' } }
    const res = buildResponse()

    await controller.index(req, res)

    expect(messagesQueryInstance.filterByLicensee).toHaveBeenCalledWith('licensee-id')
    expect(messagesQueryInstance.filterByContact).toHaveBeenCalledWith('contact-id')
  })
})

describe('MessagesController resend', () => {
  const LICENSEE_ID = 'licensee-id'
  const OTHER_LICENSEE_ID = 'other-licensee-id'

  function buildMessage(licenseeId = LICENSEE_ID, { sended = false } = {}) {
    return {
      _id: 'msg-id',
      licensee: { toString: () => licenseeId },
      sended,
      error: 'some error',
      sendedAt: new Date(),
    }
  }

  it('resets message fields, enqueues, and returns 200 for super user', async () => {
    const superUser = { _id: 'user-id', role: 'super' }
    const message = buildMessage()
    const { controller, messageRepository, queueServer } = buildController({ user: superUser, message })
    const req = { userId: 'user-id', params: { id: 'msg-id' } }
    const res = buildResponse()

    await controller.resend(req, res)

    expect(message.sended).toBe(false)
    expect(message.error).toBeNull()
    expect(message.sendedAt).toBeNull()
    expect(messageRepository.save).toHaveBeenCalledWith(message)
    expect(queueServer.addJob).toHaveBeenCalledWith('send-message-to-messenger', { messageId: message._id })
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('resets message and returns 200 for licensee user owning the message', async () => {
    const licenseeUser = { _id: 'user-id', role: 'agent', licensee: { toString: () => LICENSEE_ID } }
    const message = buildMessage(LICENSEE_ID)
    const { controller, queueServer } = buildController({ user: licenseeUser, message })
    const req = { userId: 'user-id', params: { id: 'msg-id' } }
    const res = buildResponse()

    await controller.resend(req, res)

    expect(queueServer.addJob).toHaveBeenCalledWith('send-message-to-messenger', { messageId: message._id })
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('returns 403 when licensee user attempts cross-licensee resend', async () => {
    const licenseeUser = { _id: 'user-id', role: 'agent', licensee: { toString: () => OTHER_LICENSEE_ID } }
    const message = buildMessage(LICENSEE_ID)
    const { controller, queueServer } = buildController({ user: licenseeUser, message })
    const req = { userId: 'user-id', params: { id: 'msg-id' } }
    const res = buildResponse()

    await controller.resend(req, res)

    expect(queueServer.addJob).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('returns 422 when message is already sended', async () => {
    const superUser = { _id: 'user-id', role: 'super' }
    const message = buildMessage(LICENSEE_ID, { sended: true })
    const { controller, queueServer } = buildController({ user: superUser, message })
    const req = { userId: 'user-id', params: { id: 'msg-id' } }
    const res = buildResponse()

    await controller.resend(req, res)

    expect(queueServer.addJob).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(422)
    expect(res.json).toHaveBeenCalledWith({ errors: { message: 'Message already sended' } })
  })

  it('returns 404 when message not found', async () => {
    const superUser = { _id: 'user-id', role: 'super' }
    const { controller, queueServer } = buildController({ user: superUser, message: null })
    const req = { userId: 'user-id', params: { id: 'nonexistent-id' } }
    const res = buildResponse()

    await controller.resend(req, res)

    expect(queueServer.addJob).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(404)
  })
})
