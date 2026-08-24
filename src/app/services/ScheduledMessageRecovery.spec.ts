import { recoverScheduledMessages } from './ScheduledMessageRecovery'

function buildQueueServer(delayedByQueue: Record<string, string[]> = {}) {
  return {
    queues: [
      {
        name: 'send-message-to-messenger',
        bull: {
          getDelayed: jest.fn().mockResolvedValue(
            (delayedByQueue['send-message-to-messenger'] ?? []).map((id) => ({
              data: { body: { messageId: id } },
            })),
          ),
        },
      },
      {
        name: 'send-message-to-chat',
        bull: {
          getDelayed: jest.fn().mockResolvedValue(
            (delayedByQueue['send-message-to-chat'] ?? []).map((id) => ({
              data: { body: { messageId: id } },
            })),
          ),
        },
      },
    ],
    addJob: jest.fn().mockResolvedValue({}),
  }
}

function futureIso(offsetMs = 60_000) {
  return new Date(Date.now() + offsetMs)
}

function buildMessage(overrides: Record<string, any> = {}) {
  return {
    _id: 'msg-1',
    destination: 'to-messenger',
    scheduledAt: futureIso(),
    sended: false,
    ignored: false,
    ...overrides,
  }
}

describe('recoverScheduledMessages', () => {
  it('re-enqueues pending to-messenger message with correct delay', async () => {
    const qs = buildQueueServer()
    const msg = buildMessage({ _id: 'msg-1', destination: 'to-messenger' })
    const repo = { findScheduledPending: jest.fn().mockResolvedValue([msg]) }

    await recoverScheduledMessages(repo, qs as any, qs as any)

    expect(qs.addJob).toHaveBeenCalledWith(
      'send-message-to-messenger',
      { messageId: 'msg-1' },
      expect.objectContaining({ delay: expect.any(Number) }),
    )
    const [, , opts] = (qs.addJob as jest.Mock).mock.calls[0]
    expect(opts.delay).toBeGreaterThan(0)
  })

  it('re-enqueues pending to-chat message', async () => {
    const qs = buildQueueServer()
    const msg = buildMessage({ _id: 'msg-2', destination: 'to-chat' })
    const repo = { findScheduledPending: jest.fn().mockResolvedValue([msg]) }

    await recoverScheduledMessages(repo, qs as any, qs as any)

    expect(qs.addJob).toHaveBeenCalledWith('send-message-to-chat', { messageId: 'msg-2' }, expect.any(Object))
  })

  it('skips messages already present in BullMQ delayed queue (approach A)', async () => {
    const qs = buildQueueServer({ 'send-message-to-messenger': ['msg-1'] })
    const msg = buildMessage({ _id: 'msg-1', destination: 'to-messenger' })
    const repo = { findScheduledPending: jest.fn().mockResolvedValue([msg]) }

    await recoverScheduledMessages(repo, qs as any, qs as any)

    expect(qs.addJob).not.toHaveBeenCalled()
  })

  it('partially re-enqueues when only some messages are in Redis', async () => {
    const qs = buildQueueServer({ 'send-message-to-messenger': ['msg-1'] })
    const msg1 = buildMessage({ _id: 'msg-1', destination: 'to-messenger' })
    const msg2 = buildMessage({ _id: 'msg-2', destination: 'to-messenger' })
    const repo = { findScheduledPending: jest.fn().mockResolvedValue([msg1, msg2]) }

    await recoverScheduledMessages(repo, qs as any, qs as any)

    expect(qs.addJob).toHaveBeenCalledTimes(1)
    expect(qs.addJob).toHaveBeenCalledWith('send-message-to-messenger', { messageId: 'msg-2' }, expect.any(Object))
  })

  it('skips messages with unknown destination and logs a warning', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const qs = buildQueueServer()
    const msg = buildMessage({ _id: 'msg-1', destination: 'to-chatbot' })
    const repo = { findScheduledPending: jest.fn().mockResolvedValue([msg]) }

    await recoverScheduledMessages(repo, qs as any, qs as any)

    expect(qs.addJob).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('to-chatbot'))
    consoleSpy.mockRestore()
  })

  it('skips messages whose scheduledAt is now past due (delay <= 0)', async () => {
    const qs = buildQueueServer()
    const past = new Date(Date.now() - 1000)
    const msg = buildMessage({ _id: 'msg-1', destination: 'to-messenger', scheduledAt: past })
    const repo = { findScheduledPending: jest.fn().mockResolvedValue([msg]) }

    await recoverScheduledMessages(repo, qs as any, qs as any)

    expect(qs.addJob).not.toHaveBeenCalled()
  })

  it('does nothing when no pending messages exist', async () => {
    const qs = buildQueueServer()
    const repo = { findScheduledPending: jest.fn().mockResolvedValue([]) }

    await recoverScheduledMessages(repo, qs as any, qs as any)

    expect(qs.addJob).not.toHaveBeenCalled()
  })
})
