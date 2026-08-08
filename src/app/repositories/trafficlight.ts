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
