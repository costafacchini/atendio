import { RepositoryMemory } from './repository'
import { redisConnection } from '../../config/redis'
import { ITrafficlight } from '../../types'

const KEY_PREFIX = 'trafficlight'

function redisKey(key: string): string {
  return `${KEY_PREFIX}:${key}`
}

class TrafficlightRepositoryMemory extends RepositoryMemory<ITrafficlight> {}

// Stores trafficlight records in Redis with TTL derived from the expiresAt field.
class RedisTrafficlightRepository {
  async findFirst({ key }: { key: string }): Promise<ITrafficlight | null> {
    const raw = await redisConnection.get(redisKey(key))
    if (!raw) return null
    return JSON.parse(raw) as ITrafficlight
  }

  async find({ key }: { key: string }): Promise<ITrafficlight[]> {
    const record = await this.findFirst({ key })
    return record ? [record] : []
  }

  async create(fields: Partial<ITrafficlight>): Promise<ITrafficlight> {
    const { key, token, expiresAt } = fields as ITrafficlight
    const expiresAtDate = new Date(expiresAt)
    const unixSeconds = Math.floor(expiresAtDate.getTime() / 1000)
    const record: ITrafficlight = { _id: key, key, token, expiresAt: expiresAtDate }
    // SET NX — only set if key does not exist (distributed lock semantics)
    const result = await redisConnection.set(redisKey(key), JSON.stringify(record), 'EXAT', unixSeconds, 'NX')
    if (result === null) {
      const err: any = new Error('Lock already held')
      err.code = 11000
      throw err
    }
    return record
  }

  async save(document: ITrafficlight): Promise<ITrafficlight> {
    const expiresAt = new Date(document.expiresAt)
    const unixSeconds = Math.floor(expiresAt.getTime() / 1000)
    await redisConnection.set(redisKey(document.key), JSON.stringify(document), 'EXAT', unixSeconds)
    return document
  }

  async delete({ key }: { key: string }): Promise<{ acknowledged: boolean }> {
    await redisConnection.del(redisKey(key))
    return { acknowledged: true }
  }
}

// Alias for backward-compatibility with specs that import TrafficlightRepositoryDatabase.
const TrafficlightRepositoryDatabase = TrafficlightRepositoryMemory

export { TrafficlightRepositoryDatabase, TrafficlightRepositoryMemory, RedisTrafficlightRepository }
