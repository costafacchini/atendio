import { scheduleSendMessageToMessenger } from '@repositories/messenger'
import { queueServer } from '@config/queue'

const runRedisTests = process.env.RUN_REDIS_TESTS === 'true'
const describeIfRedis = runRedisTests ? describe : describe.skip

describeIfRedis('#scheduleSendMessageToMessenger', () => {
  const queueSendMessageToMessenger = queueServer.queues.find((queue) => queue.name === 'send-message-to-messenger')

  beforeEach(async () => {
    await queueSendMessageToMessenger.bull.obliterate({ force: true })
  })

  afterEach(async () => {
    await queueSendMessageToMessenger.bull.obliterate({ force: true })
  })

  it('schedules a job to send message to messenger', async () => {
    await scheduleSendMessageToMessenger({
      messageId: 'messageId',
      url: 'url',
      token: 'token',
      contactId: 'contactId',
      licenseeId: 'licenseeId',
    })

    const counts = await queueSendMessageToMessenger.bull.getJobCounts('wait')

    expect(counts.wait).toEqual(1)
  })
})
