import { ChatRoomsController } from './ChatRoomsController'

function buildResponse() {
  return {
    json: jest.fn(),
    send: jest.fn(),
    status: jest.fn().mockReturnThis(),
  }
}

function buildController(overrides: Record<string, any> = {}) {
  const userRepository = {
    findFirst: jest.fn().mockResolvedValue({ _id: 'agent-1', name: 'Ana' }),
  }
  const roomRepository = {
    findFirst: jest.fn(),
  }
  const ingestChatMessage = {
    execute: jest.fn().mockResolvedValue({}),
  }

  const controller = new ChatRoomsController({
    userRepository: overrides.userRepository ?? userRepository,
    roomRepository: overrides.roomRepository ?? roomRepository,
    ingestChatMessage: overrides.ingestChatMessage ?? ingestChatMessage,
  })

  return { controller, userRepository, roomRepository, ingestChatMessage }
}

describe('ChatRoomsController', () => {
  describe('#replyToRoom', () => {
    it('returns 404 when room is not found', async () => {
      const { controller, roomRepository } = buildController()
      roomRepository.findFirst.mockResolvedValue(null)
      const res = buildResponse()

      await controller.replyToRoom({ params: { roomId: 'room-1' }, body: { text: 'Hi' }, userId: 'agent-1' }, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ message: 'Conversa não encontrada ou encerrada.' })
    })

    it('returns 404 when room is closed', async () => {
      const { controller, roomRepository } = buildController()
      roomRepository.findFirst.mockResolvedValue({
        _id: 'room-1',
        closed: true,
        contact: { _id: 'contact-1', licensee: 'licensee-1' },
      })
      const res = buildResponse()

      await controller.replyToRoom({ params: { roomId: 'room-1' }, body: { text: 'Hi' }, userId: 'agent-1' }, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('calls ingestChatMessage.execute for a valid open room', async () => {
      const { controller, roomRepository, ingestChatMessage } = buildController()
      roomRepository.findFirst.mockResolvedValue({
        _id: 'room-1',
        closed: false,
        contact: { _id: 'contact-1', licensee: 'licensee-1' },
      })
      const res = buildResponse()

      await controller.replyToRoom({ params: { roomId: 'room-1' }, body: { text: 'Hello' }, userId: 'agent-1' }, res)

      expect(ingestChatMessage.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({ roomId: 'room-1', text: 'Hello' }),
          licenseeId: 'licensee-1',
        }),
      )
      expect(res.status).toHaveBeenCalledWith(200)
    })

    // schedule-message plan moved scheduledAt handling to CreateMessage usecase (POST /resources/messages)
    // No scheduled-message stubs needed here.

    // --- local-chat-files plan stubs (task-04) ---
    it.todo('forwards url, fileName, and kind=file to IngestChatMessage when body is a file message (S2)')
    it.todo('defaults kind to text and url/fileName to null when body has only text (no regression)')
  })
})
