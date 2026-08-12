import { Request, Response } from 'express'
import { IRepository } from '@repositories/repository'
import { IUser } from '../../types'

interface RedisClient {
  get(key: string): Promise<string | null>
  setex(key: string, seconds: number, value: string): Promise<unknown>
}

class DashboardController {
  userRepository: IRepository<IUser>
  licenseeRepository: any
  contactRepository: any
  messageRepository: any
  roomRepository: any
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
    licenseeRepository?: any
    contactRepository?: any
    messageRepository?: any
    roomRepository?: any
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
          this.licenseeRepository.count({}),
          this.licenseeRepository.count({ active: true }),
          this.licenseeRepository.count({ licenseKind: 'demo' }),
          this.licenseeRepository.count({ licenseKind: 'free' }),
          this.licenseeRepository.count({ licenseKind: 'paid' }),
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
      const licenseeIdInt = licensee ? parseInt(licensee as string, 10) : null

      const data = await this._cached(cacheKey, async () => {
        const licenseeFilter = licenseeIdInt ? { licensee: licenseeIdInt } : {}

        const [perDay, perHour, sentCount, failedCount] = await Promise.all([
          this.messageRepository.groupByDay(licenseeIdInt, startDate, endDate),
          this.messageRepository.groupByHour(licenseeIdInt, startDate, endDate),
          this.messageRepository.countMessages({
            sended: true,
            ...licenseeFilter,
            createdAt: { gte: startDate, lt: endDate },
          }),
          this.messageRepository.countMessages({
            sended: false,
            ...licenseeFilter,
            createdAt: { gte: startDate, lt: endDate },
          }),
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
      const licenseeIdInt = licensee ? parseInt(licensee as string, 10) : null
      const licenseeFilter = licenseeIdInt ? { licensee: licenseeIdInt } : {}

      const data = await this._cached(cacheKey, async () => {
        const [sentCount, failedCount, failedTotal] = await Promise.all([
          this.messageRepository.countMessages({
            sended: true,
            ...licenseeFilter,
            createdAt: { gte: startDate, lt: endDate },
          }),
          this.messageRepository.countMessages({
            sended: false,
            NOT: { ignored: true },
            ...licenseeFilter,
            createdAt: { gte: startDate, lt: endDate },
          }),
          this.messageRepository.countMessages({
            sended: false,
            NOT: { ignored: true },
            ...licenseeFilter,
          }),
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
      const licenseeIdInt = licensee ? parseInt(licensee as string, 10) : null
      const licenseeFilter = licenseeIdInt ? { licensee: licenseeIdInt } : {}

      const data = await this._cached(cacheKey, async () => {
        const [pendingMessages, avgTimeInQueueSeconds] = await Promise.all([
          this.messageRepository.countMessages({
            sended: false,
            destination: 'to-messenger',
            ...licenseeFilter,
          }),
          this.messageRepository.avgQueueTime(licenseeIdInt, startDate, endDate),
        ])

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
      const licenseeIdInt = licensee ? parseInt(licensee as string, 10) : null

      const data = await this._cached(cacheKey, async () => {
        let contactIds: number[] = []
        if (licensee) {
          contactIds = await this.contactRepository.findIds({ licensee: parseInt(licensee as string, 10) })
        }
        const roomWhere = contactIds.length > 0 ? { contact: { in: contactIds } } : {}

        const [startedCount, endedCount, avgMessages, avgDuration] = await Promise.all([
          this.roomRepository.count({ ...roomWhere, createdAt: { gte: startDate, lt: endDate } }),
          this.roomRepository.count({ ...roomWhere, closedAt: { gte: startDate, lt: endDate } }),
          this.messageRepository.avgMessagesPerRoom(licenseeIdInt, startDate, endDate),
          this.roomRepository.avgDuration(contactIds.length > 0 ? contactIds : null, startDate, endDate),
        ])

        return {
          started_today: startedCount,
          ended_today: endedCount,
          avg_messages_per_conversation: avgMessages,
          avg_duration_seconds: avgDuration,
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
        const licenseeId = user.licensee as any
        const [total, inChatbot] = await Promise.all([
          this.contactRepository.count({ licensee: licenseeId }),
          this.contactRepository.count({ licensee: licenseeId, talkingWithChatBot: true }),
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
      const licenseeId = user.licensee as any

      const data = await this._cached(cacheKey, async () => {
        const [sentCount, failedCount] = await Promise.all([
          this.messageRepository.countMessages({
            licensee: licenseeId,
            sended: true,
            createdAt: { gte: startDate, lt: endDate },
          }),
          this.messageRepository.countMessages({
            licensee: licenseeId,
            sended: false,
            NOT: { ignored: true },
            createdAt: { gte: startDate, lt: endDate },
          }),
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

      const { endDate } = this._parseDateRange(req.query)
      const cacheKey = `dashboard:licensee:${user.licensee}:messages-per-day`

      const data = await this._cached(cacheKey, async () => {
        const sevenDaysAgo = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
        const licenseeInt = parseInt(String(user.licensee), 10)
        const perDay = await this.messageRepository.groupByDay(licenseeInt, sevenDaysAgo, endDate)
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

      let contactIds: number[] = []
      if (licensee) {
        contactIds = await this.contactRepository.findIds({ licensee: parseInt(licensee as string, 10) })
      }

      const roomParams: Record<string, any> = { closed: false }
      if (contactIds.length > 0) roomParams.contact = { in: contactIds }

      const roomResults = await this.roomRepository.findManyPaged(roomParams, page, limit)
      const hasMore = roomResults.length > limit
      const rooms: any[] = hasMore ? roomResults.slice(0, limit) : roomResults

      // Enrich rooms with contact name/number via separate lookup (no Prisma relation on rooms.contact)
      const contactIdList = [...new Set(rooms.map((r: any) => r.contact as number))]
      const contacts =
        contactIdList.length > 0 ? await this.contactRepository.find({ id: { in: contactIdList } } as any) : []
      const contactMap = new Map((contacts as any[]).map((c: any) => [c.id, c]))

      const roomIds = rooms.map((r: any) => r.id as number)
      const lastMessages = await this.messageRepository.lastMessagePerRoom(roomIds)
      const lastMsgMap: Record<number, any> = {}
      for (const m of lastMessages) lastMsgMap[m.room] = m

      const roomsWithMessages = rooms
        .map((r: any) => ({
          ...r,
          contact: contactMap.get(r.contact) ?? { id: r.contact },
          lastMessage: lastMsgMap[r.id] ?? null,
        }))
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

      const room = await this.roomRepository.findById(req.params.roomId)
      if (!room) return res.status(404).json({ errors: { message: 'Room not found' } })
      if ((room as any).closed) return res.status(200).json({ message: 'Already closed' })

      await this.roomRepository.close(req.params.roomId)
      return res.status(200).json({ message: 'Room closed' })
    } catch (err: any) {
      return res.status(500).json({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }
}

export { DashboardController }
