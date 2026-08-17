import { Queue } from 'bullmq'
import { redisConnection } from './redis'

import jobs from '../app/jobs/index'

export interface JobOptions {
  attempts?: number
  backoff?: { type: string; delay: number }
}

export interface IQueueServer {
  addJob(name: string, data: Record<string, unknown>, options?: JobOptions): Promise<unknown>
}

const queueOptions = {
  defaultJobOptions: {
    backoff: {
      type: 'exponential',
      delay: 100,
    },
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: 10000,
  },
  connection: redisConnection,
}

function createQueue(name: any) {
  return new Queue(name, queueOptions)
}

class QueueServer implements IQueueServer {
  queues: { bull: Queue; name: string; workerEnabled: boolean; handle: (...args: any[]) => any }[]

  constructor() {
    this.queues = jobs.map((job: any) => ({
      bull: createQueue(job.key),
      name: job.key,
      workerEnabled: job.workerEnabled,
      handle: job.handle,
    }))
  }

  async addJob(name: string, body: Record<string, unknown>, options: JobOptions = {}) {
    const queue = this.queues.find((queue) => queue.name === name)

    if (!queue) return null

    return await queue.bull.add(name, { body }, { attempts: 1, ...options })
  }
}

export const queueServer = new QueueServer()
