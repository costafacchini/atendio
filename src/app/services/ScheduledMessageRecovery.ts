import { queueServer as defaultQueueServer } from '../../config/queue'
import type { IQueueServer } from '../../config/queue'

const DESTINATION_TO_QUEUE: Record<string, string> = {
  'to-messenger': 'send-message-to-messenger',
  'to-chat': 'send-message-to-chat',
}

async function getAlreadyQueuedIds(qs = defaultQueueServer): Promise<Set<string>> {
  const ids = new Set<string>()
  for (const queueName of Object.values(DESTINATION_TO_QUEUE)) {
    const entry = qs.queues.find((q: any) => q.name === queueName)
    if (!entry) continue
    const delayed = await entry.bull.getDelayed()
    for (const job of delayed) {
      if (job.data?.body?.messageId) ids.add(String(job.data.body.messageId))
    }
  }
  return ids
}

async function recoverScheduledMessages(
  messageRepository: { findScheduledPending(now: Date): Promise<any[]> },
  jobQueue: IQueueServer,
  qs = defaultQueueServer,
): Promise<void> {
  const now = new Date()
  const pending = await messageRepository.findScheduledPending(now)
  const alreadyQueued = await getAlreadyQueuedIds(qs)

  let enqueued = 0
  for (const message of pending) {
    const queue = DESTINATION_TO_QUEUE[message.destination as string]
    if (!queue) {
      console.warn(`[recovery] Skipping message ${message._id}: no queue for destination "${message.destination}"`)
      continue
    }
    if (alreadyQueued.has(String(message._id))) continue
    const delay = new Date(message.scheduledAt!).getTime() - Date.now()
    if (delay <= 0) continue
    await jobQueue.addJob(queue, { messageId: message._id }, { delay })
    enqueued++
  }

  console.log(`[recovery] Re-enqueued ${enqueued} scheduled message(s) (${pending.length} checked)`)
}

export { recoverScheduledMessages, getAlreadyQueuedIds }
