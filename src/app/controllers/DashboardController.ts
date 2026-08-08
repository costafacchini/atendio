import { Request, Response } from 'express'
import { IRepository } from '@repositories/repository'
import { IQueryableRepository } from '../queries/QueryBuilder'
import { IUser, ILicensee, IContact, IMessage, IRoom } from '../../types'

const EXCLUDE_SYSTEM_CLOSE = { $nor: [{ kind: 'text', text: 'Chat encerrado pelo agente' }] }

interface RedisClient {
  get(key: string): Promise<string | null>
  setex(key: string, seconds: number, value: string): Promise<unknown>
}

class DashboardController {
  userRepository: IRepository<IUser>
  licenseeRepository: IQueryableRepository<ILicensee>
  contactRepository: IQueryableRepository<IContact>
  messageRepository: IQueryableRepository<IMessage>
  roomRepository: IQueryableRepository<IRoom>
  redisConnection: RedisClient

  constructor({
    userRepository,
    licenseeRepository,
    contactRepository,
    messageRepository,
    roomRepository,
    redisConnection,
  }: {
    userRepository?: IRepository<IUser>
    licenseeRepository?: IQueryableRepository<ILicensee>
    contactRepository?: IQueryableRepository<IContact>
    messageRepository?: IQueryableRepository<IMessage>
    roomRepository?: IQueryableRepository<IRoom>
    redisConnection?: RedisClient
  } = {}) {
    this.userRepository = userRepository!
    this.licenseeRepository = licenseeRepository!
    this.contactRepository = contactRepository!
    this.messageRepository = messageRepository!
    this.roomRepository = roomRepository!
    this.redisConnection = redisConnection!

    this.licensees = this.licensees.bind(this)
    this.messageVolume = this.messageVolume.bind(this)
    this.deliveryRate = this.deliveryRate.bind(this)
    this.queue = this.queue.bind(this)
    this.conversations = this.conversations.bind(this)
    this.contacts = this.contacts.bind(this)
    this.messagesToday = this.messagesToday.bind(this)
    this.messagesPerDay = this.messagesPerDay.bind(this)
    this.openRooms = this.openRooms.bind(this)
    this.closeRoom = this.closeRoom.bind(this)
  }

  async _resolveUser(req: Request) {
    return await this.userRepository.findFirst({ _id: req.userId })
  }

  async _cached(key: string, fn: () => Promise<unknown>) {
    const cached = await this.redisConnection.get(key)
    if (cached) return JSON.parse(cached)
    const data = await fn()
    await this.redisConnection.setex(key, 600, JSON.stringify(data))
    return data
  }

  _parseDateRange(query: Record<string, unknown>) {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
    return {
      startDate: query.startDate ? new Date(query.startDate as string) : startOfDay,
      endDate: query.endDate ? new Date(query.endDate as string) : endOfDay,
    }
  }

  async licensees(req: Request, res: Response) {
    try {
      const user = await this._resolveUser(req)
      if (!user) return res.status(404).json({ errors: { message: 'User not found' } })
      if (user.role !== 'super') return res.status(403).json({ errors: { message: 'Forbidden' } })

      const cacheKey = 'dashboard:super:licensees'
      const data = await this._cached(cacheKey, async () => {
        const [total, active, demo, free, paid] = await Promise.all([
          this.licenseeRepository.model().where({}).countDocuments(),
          this.licenseeRepository.model().where({ active: true }).countDocuments(),
          this.licenseeRepository.model().where({ licenseKind: 'demo' }).countDocuments(),
          this.licenseeRepository.model().where({ licenseKind: 'free' }).countDocuments(),
          this.licenseeRepository.model().where({ licenseKind: 'paid' }).countDocuments(),
        ])
        return { total, active, by_kind: { demo, free, paid } }
      })

      return res.status(200).json(data)
    } catch (err: any) {
      return res.status(500).json({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async messageVolume(req: Request, res: Response) {
    try {
      const user = await this._resolveUser(req)
      if (!user) return res.status(404).json({ errors: { message: 'User not found' } })
      if (!['super', 'admin'].includes(user.role)) return res.status(403).json({ errors: { message: 'Forbidden' } })

      const { startDate, endDate } = this._parseDateRange(req.query)
      const licensee = req.query.licensee || null
      const cacheKey = `dashboard:super:message-volume:${startDate.toISOString()}:${endDate.toISOString()}:${licensee || 'all'}`
      const msgFilter = licensee ? { licensee: licensee as string } : {}

      const data = await this._cached(cacheKey, async () => {
        const perDayPipeline = [
          { $match: { ...msgFilter, ...EXCLUDE_SYSTEM_CLOSE, createdAt: { $gte: startDate, $lt: endDate } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]
        const perHourPipeline = [
          { $match: { ...msgFilter, ...EXCLUDE_SYSTEM_CLOSE, createdAt: { $gte: startDate, $lt: endDate } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%dT%H', date: '$createdAt' } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]

        const [perDay, perHour, sentCount, failedCount] = await Promise.all([
          this.messageRepository.model().aggregate(perDayPipeline),
          this.messageRepository.model().aggregate(perHourPipeline),
          this.messageRepository
            .model()
            .where({
              ...msgFilter,
              ...EXCLUDE_SYSTEM_CLOSE,
              sended: true,
              createdAt: { $gte: startDate, $lt: endDate },
            })
            .countDocuments(),
          this.messageRepository
            .model()
            .where({
              ...msgFilter,
              ...EXCLUDE_SYSTEM_CLOSE,
              sended: false,
              createdAt: { $gte: startDate, $lt: endDate },
            })
            .countDocuments(),
        ])

        const peakThroughput = perHour.length > 0 ? Math.max(...perHour.map((h: any) => h.count)) : 0
        const hourSpan = (endDate.getTime() - startDate.getTime()) / 3_600_000
        const avgTransferRate = parseFloat(((sentCount + failedCount) / hourSpan).toFixed(2))

        return {
          per_day: perDay,
          per_hour: perHour,
          peak_throughput: peakThroughput,
          avg_transfer_rate: avgTransferRate,
        }
      })

      return res.status(200).json(data)
    } catch (err: any) {
      return res.status(500).json({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async deliveryRate(req: Request, res: Response) {
    try {
      const user = await this._resolveUser(req)
      if (!user) return res.status(404).json({ errors: { message: 'User not found' } })
      if (!['super', 'admin'].includes(user.role)) return res.status(403).json({ errors: { message: 'Forbidden' } })

      const { startDate, endDate } = this._parseDateRange(req.query)
      const licensee = req.query.licensee || null
      const cacheKey = `dashboard:super:delivery-rate:${startDate.toISOString()}:${endDate.toISOString()}:${licensee || 'all'}`
      const msgFilter = licensee ? { licensee: licensee as string } : {}

      const data = await this._cached(cacheKey, async () => {
        const [sentCount, failedCount, failedTotal] = await Promise.all([
          this.messageRepository
            .model()
            .where({
              ...msgFilter,
              ...EXCLUDE_SYSTEM_CLOSE,
              sended: true,
              createdAt: { $gte: startDate, $lt: endDate },
            })
            .countDocuments(),
          this.messageRepository
            .model()
            .where({
              ...msgFilter,
              ...EXCLUDE_SYSTEM_CLOSE,
              sended: false,
              ignored: { $ne: true },
              createdAt: { $gte: startDate, $lt: endDate },
            })
            .countDocuments(),
          this.messageRepository
            .model()
            .where({ ...msgFilter, ...EXCLUDE_SYSTEM_CLOSE, sended: false, ignored: { $ne: true } })
            .countDocuments(),
        ])

        const total = sentCount + failedCount
        const sentPct = total === 0 ? 0 : parseFloat(((sentCount / total) * 100).toFixed(2))
        const failedPct = total === 0 ? 0 : parseFloat(((failedCount / total) * 100).toFixed(2))

        return {
          sent_today: sentCount,
          failed_today: failedCount,
          failed_total: failedTotal,
          sent_pct: sentPct,
          failed_pct: failedPct,
        }
      })

      return res.status(200).json(data)
    } catch (err: any) {
      return res.status(500).json({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async queue(req: Request, res: Response) {
    try {
      const user = await this._resolveUser(req)
      if (!user) return res.status(404).json({ errors: { message: 'User not found' } })
      if (!['super', 'admin'].includes(user.role)) return res.status(403).json({ errors: { message: 'Forbidden' } })

      const { startDate, endDate } = this._parseDateRange(req.query)
      const licensee = req.query.licensee || null
      const cacheKey = `dashboard:super:queue:${startDate.toISOString()}:${endDate.toISOString()}:${licensee || 'all'}`
      const msgFilter = licensee ? { licensee: licensee as string } : {}

      const data = await this._cached(cacheKey, async () => {
        const avgQueuePipeline: any[] = [
          {
            $match: {
              ...msgFilter,
              ...EXCLUDE_SYSTEM_CLOSE,
              sendedAt: { $exists: true },
              createdAt: { $gte: startDate, $lt: endDate },
            },
          },
          { $group: { _id: null, avg: { $avg: { $divide: [{ $subtract: ['$sendedAt', '$createdAt'] }, 1000] } } } },
        ]

        const [pendingMessages, avgResult] = await Promise.all([
          this.messageRepository
            .model()
            .where({ ...msgFilter, ...EXCLUDE_SYSTEM_CLOSE, sended: false, destination: 'to-messenger' })
            .countDocuments(),
          this.messageRepository.model().aggregate(avgQueuePipeline),
        ])

        const avgTimeInQueueSeconds = avgResult.length > 0 ? parseFloat((avgResult[0].avg ?? 0).toFixed(2)) : 0

        return { pending_messages: pendingMessages, avg_time_in_queue_seconds: avgTimeInQueueSeconds }
      })

      return res.status(200).json(data)
    } catch (err: any) {
      return res.status(500).json({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async conversations(req: Request, res: Response) {
    try {
      const user = await this._resolveUser(req)
      if (!user) return res.status(404).json({ errors: { message: 'User not found' } })
      if (!['super', 'admin'].includes(user.role)) return res.status(403).json({ errors: { message: 'Forbidden' } })

      const { startDate, endDate } = this._parseDateRange(req.query)
      const licensee = req.query.licensee || null
      const cacheKey = `dashboard:super:conversations:${startDate.toISOString()}:${endDate.toISOString()}:${licensee || 'all'}`
      const msgFilter = licensee ? { licensee: licensee as string } : {}

      const data = await this._cached(cacheKey, async () => {
        let roomFilter: any = {}
        if (licensee) {
          const contacts = await this.contactRepository.model().find({ licensee }).select('_id')
          const contactIds = contacts.map((c: any) => c._id)
          roomFilter = { contact: { $in: contactIds } }
        }

        const avgMsgPerConvPipeline: any[] = [
          {
            $match: {
              ...msgFilter,
              ...EXCLUDE_SYSTEM_CLOSE,
              room: { $exists: true },
              createdAt: { $gte: startDate, $lt: endDate },
            },
          },
          { $group: { _id: '$room', count: { $sum: 1 } } },
          { $group: { _id: null, avg: { $avg: '$count' } } },
        ]
        const avgDurationPipeline: any[] = [
          { $match: { ...roomFilter, closedAt: { $gte: startDate, $lt: endDate } } },
          { $group: { _id: null, avg: { $avg: { $divide: [{ $subtract: ['$closedAt', '$createdAt'] }, 1000] } } } },
        ]

        const [startedCount, endedCount, avgMsgResult, avgDurationResult] = await Promise.all([
          this.roomRepository
            .model()
            .where({ ...roomFilter, createdAt: { $gte: startDate, $lt: endDate } })
            .countDocuments(),
          this.roomRepository
            .model()
            .where({ ...roomFilter, closedAt: { $gte: startDate, $lt: endDate } })
            .countDocuments(),
          this.messageRepository.model().aggregate(avgMsgPerConvPipeline),
          this.roomRepository.model().aggregate(avgDurationPipeline),
        ])

        const avgMessagesPerConversation =
          avgMsgResult.length > 0 ? parseFloat((avgMsgResult[0].avg ?? 0).toFixed(2)) : 0
        const avgDurationSeconds =
          avgDurationResult.length > 0 ? parseFloat((avgDurationResult[0].avg ?? 0).toFixed(2)) : 0

        return {
          started_today: startedCount,
          ended_today: endedCount,
          avg_messages_per_conversation: avgMessagesPerConversation,
          avg_duration_seconds: avgDurationSeconds,
        }
      })

      return res.status(200).json(data)
    } catch (err: any) {
      return res.status(500).json({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async contacts(req: Request, res: Response) {
    try {
      const user = await this._resolveUser(req)
      if (!user) return res.status(404).json({ errors: { message: 'User not found' } })
      if (user.role === 'super') return res.status(403).json({ errors: { message: 'Forbidden' } })

      const cacheKey = `dashboard:licensee:${user.licensee}:contacts`

      const data = await this._cached(cacheKey, async () => {
        const [total, inChatbot] = await Promise.all([
          this.contactRepository.model().where({ licensee: user.licensee }).countDocuments(),
          this.contactRepository.model().where({ licensee: user.licensee, talkingWithChatBot: true }).countDocuments(),
        ])
        return { total, in_chatbot: inChatbot }
      })

      return res.status(200).json(data)
    } catch (err: any) {
      return res.status(500).json({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async messagesToday(req: Request, res: Response) {
    try {
      const user = await this._resolveUser(req)
      if (!user) return res.status(404).json({ errors: { message: 'User not found' } })
      if (user.role === 'super') return res.status(403).json({ errors: { message: 'Forbidden' } })

      const { startDate, endDate } = this._parseDateRange(req.query)
      const cacheKey = `dashboard:licensee:${user.licensee}:messages-today:${startDate.toISOString()}:${endDate.toISOString()}`

      const data = await this._cached(cacheKey, async () => {
        const [sentCount, failedCount] = await Promise.all([
          this.messageRepository
            .model()
            .where({
              licensee: user.licensee,
              ...EXCLUDE_SYSTEM_CLOSE,
              sended: true,
              createdAt: { $gte: startDate, $lt: endDate },
            })
            .countDocuments(),
          this.messageRepository
            .model()
            .where({
              licensee: user.licensee,
              ...EXCLUDE_SYSTEM_CLOSE,
              sended: false,
              ignored: { $ne: true },
              createdAt: { $gte: startDate, $lt: endDate },
            })
            .countDocuments(),
        ])

        const total = sentCount + failedCount
        const sentPct = total === 0 ? 0 : parseFloat(((sentCount / total) * 100).toFixed(2))
        const failedPct = total === 0 ? 0 : parseFloat(((failedCount / total) * 100).toFixed(2))

        return { sent_today: sentCount, failed_today: failedCount, sent_pct: sentPct, failed_pct: failedPct }
      })

      return res.status(200).json(data)
    } catch (err: any) {
      return res.status(500).json({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async messagesPerDay(req: Request, res: Response) {
    try {
      const user = await this._resolveUser(req)
      if (!user) return res.status(404).json({ errors: { message: 'User not found' } })
      if (user.role === 'super') return res.status(403).json({ errors: { message: 'Forbidden' } })

      const { startDate, endDate } = this._parseDateRange(req.query)
      const cacheKey = `dashboard:licensee:${user.licensee}:messages-per-day:${startDate.toISOString()}:${endDate.toISOString()}`

      const data = await this._cached(cacheKey, async () => {
        const sevenDaysAgo = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
        const perDayPipeline = [
          {
            $match: {
              createdAt: { $gte: sevenDaysAgo, $lt: endDate },
              licensee: user.licensee,
              ...EXCLUDE_SYSTEM_CLOSE,
            },
          },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]

        const perDay = await this.messageRepository.model().aggregate(perDayPipeline)
        return { per_day: perDay }
      })

      return res.status(200).json(data)
    } catch (err: any) {
      return res.status(500).json({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async openRooms(req: Request, res: Response) {
    try {
      const user = await this._resolveUser(req)
      if (!user) return res.status(404).json({ errors: { message: 'User not found' } })
      if (!['super', 'admin'].includes(user.role)) return res.status(403).json({ errors: { message: 'Forbidden' } })

      const licensee = req.query.licensee || null
      const page = Math.max(1, parseInt(req.query.page as string) || 1)
      const limit = 10

      let roomFilter: any = { closed: false }
      if (licensee) {
        const contacts = await this.contactRepository.model().find({ licensee }).select('_id').lean()
        const contactIds = contacts.map((c: any) => c._id)
        roomFilter.contact = { $in: contactIds }
      }

      const roomResults = await this.roomRepository
        .model()
        .find(roomFilter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit + 1)
        .populate('contact', 'name number')
        .lean()

      const hasMore = roomResults.length > limit
      const rooms: any[] = hasMore ? roomResults.slice(0, limit) : roomResults

      const roomIds = rooms.map((r: any) => r._id)
      const lastMessages = await this.messageRepository
        .model()
        .aggregate([
          { $match: { room: { $in: roomIds }, ...EXCLUDE_SYSTEM_CLOSE } },
          { $sort: { createdAt: -1 } },
          { $group: { _id: '$room', text: { $first: '$text' }, createdAt: { $first: '$createdAt' } } },
        ])

      const lastMsgMap: Record<string, any> = {}
      for (const m of lastMessages) lastMsgMap[m._id.toString()] = m

      const roomsWithMessages = rooms
        .map((r: any) => ({ ...r, lastMessage: lastMsgMap[r._id.toString()] || null }))
        .filter((r: any) => r.lastMessage !== null)

      return res.status(200).json({ rooms: roomsWithMessages, hasMore })
    } catch (err: any) {
      return res.status(500).json({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async closeRoom(req: Request, res: Response) {
    try {
      const user = await this._resolveUser(req)
      if (!user) return res.status(404).json({ errors: { message: 'User not found' } })
      if (!['super', 'admin'].includes(user.role)) return res.status(403).json({ errors: { message: 'Forbidden' } })

      const room = await this.roomRepository.model().findById(req.params.roomId as string)
      if (!room) return res.status(404).json({ errors: { message: 'Room not found' } })
      if (room.closed) return res.status(200).json({ message: 'Already closed' })

      room.status = 'closed'
      await room.save()

      return res.status(200).json({ message: 'Room closed' })
    } catch (err: any) {
      return res.status(500).json({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }
}

export { DashboardController }
