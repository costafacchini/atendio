import { renderHook } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useChatSocket } from './useChatSocket'

const mockDisconnect = vi.fn()
const mockEmit = vi.fn()
const mockOn = vi.fn()
const mockSocket = { disconnect: mockDisconnect, emit: mockEmit, on: mockOn }

vi.mock('socket.io-client', () => ({ io: vi.fn(() => mockSocket) }))
vi.mock('../services/auth', () => ({ getToken: vi.fn(() => 'test-token') }))

describe('useChatSocket', () => {
  let mockIo: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    const socketIoClient = await import('socket.io-client')
    mockIo = socketIoClient.io as unknown as ReturnType<typeof vi.fn>
  })

  it('does not connect when licenseeId is undefined', () => {
    const onNewRoomMessage = vi.fn()
    renderHook(() => useChatSocket(undefined, onNewRoomMessage))
    expect(mockIo).not.toHaveBeenCalled()
  })

  it('connects and emits join-licensee when licenseeId is provided', () => {
    const licenseeId = '507f1f77bcf86cd799439011'
    const onNewRoomMessage = vi.fn()
    renderHook(() => useChatSocket(licenseeId, onNewRoomMessage))
    expect(mockIo).toHaveBeenCalledWith({ auth: { token: 'test-token' } })
    expect(mockEmit).toHaveBeenCalledWith('join-licensee', licenseeId)
  })

  it('calls onNewRoomMessage when new-room-message is received', () => {
    const licenseeId = '507f1f77bcf86cd799439011'
    const onNewRoomMessage = vi.fn()
    renderHook(() => useChatSocket(licenseeId, onNewRoomMessage))

    const onCall = mockOn.mock.calls.find(([event]) => event === 'new-room-message')
    expect(onCall).toBeDefined()
    const handler = onCall![1]

    const payload = { roomId: 'room-1', messageId: 'msg-1', licenseeId }
    handler(payload)
    expect(onNewRoomMessage).toHaveBeenCalledWith(payload)
  })

  it('passes url and fileName through for file messages (S4)', () => {
    const licenseeId = '507f1f77bcf86cd799439011'
    const onNewRoomMessage = vi.fn()
    renderHook(() => useChatSocket(licenseeId, onNewRoomMessage))

    const onCall = mockOn.mock.calls.find(([event]) => event === 'new-room-message')
    const handler = onCall![1]

    const payload = {
      roomId: 'room-1',
      messageId: 'msg-1',
      licenseeId,
      kind: 'file',
      url: 'http://localhost:5001/uploads/photo.jpg',
      fileName: 'photo.jpg',
    }
    handler(payload)

    expect(onNewRoomMessage).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'http://localhost:5001/uploads/photo.jpg', fileName: 'photo.jpg' }),
    )
  })

  it('disconnects on cleanup', () => {
    const licenseeId = '507f1f77bcf86cd799439011'
    const onNewRoomMessage = vi.fn()
    const { unmount } = renderHook(() => useChatSocket(licenseeId, onNewRoomMessage))
    unmount()
    expect(mockDisconnect).toHaveBeenCalled()
  })
})
