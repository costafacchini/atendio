import { BodyRepositoryMemory } from '@repositories/body'
import { CHAT_MESSAGE_KIND, CHAT_MESSAGE_JOB, IngestChatMessage } from './IngestChatMessage'

describe('IngestChatMessage', () => {
  it('saves the body and enqueues the chat-message job', async () => {
    const chatRepository = new BodyRepositoryMemory()
    const jobQueue = {
      addJob: jest.fn().mockResolvedValue(undefined),
    }
    const ingestChatMessage = new IngestChatMessage({ chatRepository, jobQueue })

    const bodySaved = await ingestChatMessage.execute({
      body: { message: 'hello', from: 'user-1' },
      licenseeId: 'licensee-id',
    })

    expect(bodySaved).toEqual(
      expect.objectContaining({
        content: { message: 'hello', from: 'user-1' },
        licensee: 'licensee-id',
        kind: CHAT_MESSAGE_KIND,
      }),
    )

    expect(jobQueue.addJob).toHaveBeenCalledWith(CHAT_MESSAGE_JOB, {
      bodyId: bodySaved._id,
      licenseeId: 'licensee-id',
    })
  })

  it('removes crmData from the body before saving', async () => {
    const chatRepository = new BodyRepositoryMemory()
    const jobQueue = {
      addJob: jest.fn().mockResolvedValue(undefined),
    }
    const ingestChatMessage = new IngestChatMessage({ chatRepository, jobQueue })

    const bodySaved = await ingestChatMessage.execute({
      body: { message: 'hello', crmData: { history: [] } },
      licenseeId: 'licensee-id',
    })

    expect(bodySaved.content).not.toHaveProperty('crmData')
    expect(bodySaved.content).toEqual({ message: 'hello' })
  })

  it('saves inboxId on the Body record when inboxId is provided', async () => {
    const chatRepository = new BodyRepositoryMemory()
    const jobQueue = {
      addJob: jest.fn().mockResolvedValue(undefined),
    }
    const ingestChatMessage = new IngestChatMessage({ chatRepository, jobQueue })

    const bodySaved = await ingestChatMessage.execute({
      body: { message: 'hello' },
      licenseeId: 'licensee-id',
      inboxId: 'inbox-456',
    })

    expect(bodySaved).toEqual(
      expect.objectContaining({
        inbox: 'inbox-456',
      }),
    )
  })

  // --- schedule-message plan: Scenario 6 ---
  it.todo('forwards delay to addJob when delay is provided')

  // --- schedule-message plan: additional ---
  it.todo('calls addJob without delay option when delay is not provided')

  it('saves null inbox on Body record when inboxId is not provided', async () => {
    const chatRepository = new BodyRepositoryMemory()
    const jobQueue = {
      addJob: jest.fn().mockResolvedValue(undefined),
    }
    const ingestChatMessage = new IngestChatMessage({ chatRepository, jobQueue })

    const bodySaved = await ingestChatMessage.execute({
      body: { message: 'hello' },
      licenseeId: 'licensee-id',
    })

    expect(bodySaved).toEqual(
      expect.objectContaining({
        inbox: null,
      }),
    )
  })
})
