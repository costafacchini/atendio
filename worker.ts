import 'dotenv/config'
import('./src/app/models/index')

import { appsignal } from './appsignal.cjs'

import { queueServer } from './src/config/queue'
import { Worker } from 'bullmq'
import { connect } from './src/config/database'
import { withTrafficlight, resolveTrafficlightKey } from './src/app/services/Trafficlight'
import { jobDependencies } from './src/app/jobs/dependencies'
import { recoverScheduledMessages } from './src/app/services/ScheduledMessageRecovery'

connect()
recoverScheduledMessages(jobDependencies.messageRepository as any, queueServer).catch((err) =>
  console.error('[recovery] Failed:', err),
)

const queuesWithWorkerEnabled = queueServer.queues.filter((queue) => queue.workerEnabled == true)

queuesWithWorkerEnabled.forEach((queue) => {
  const worker = new Worker(
    queue.name,
    async (job) => {
      const lockKey = resolveTrafficlightKey(job?.data)
      const handleResult = await withTrafficlight(
        lockKey,
        async () => {
          return await queue.handle(job.data)
        },
        { trafficlightRepository: jobDependencies.trafficlightRepository },
      )
      if (handleResult) {
        for (const actionJob of handleResult) {
          const { action, body } = actionJob
          const options =
            action === 'send-message-to-messenger' && body.kind === 'file'
              ? { attempts: 3, backoff: { type: 'exponential', delay: 3000 } }
              : {}

          await queueServer.addJob(action, body, options)
        }
      }
    },
    {
      connection: {
        url: process.env.REDIS_URL,
      },
    },
  )

  worker.on('failed', (job, failedReason) => {
    console.error(`Fail process job ${JSON.stringify(job)} `, failedReason)
    appsignal.tracer().sendError(failedReason, (span: any) => {
      span.setName(`job/${queue.name}`)
    })
  })
})
