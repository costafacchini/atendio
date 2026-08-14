import { Request, Response } from 'express'
import { IRepository } from '@repositories/repository'
import { IUser, IRoom, IContact } from '../../types'

interface IRoomRepository extends IRepository<IRoom> {
  findForLicensee(
    licenseeId: string | number,
    opts?: { departmentIds?: number[]; contactIds?: number[]; page?: number; limit?: number; inboxId?: string },
  ): Promise<any[]>
  findOpenForContact(contactId: string): Promise<IRoom | null>
  findById(id: string | number): Promise<IRoom | null>
  close(id: string | number): Promise<void>
}

interface IMessageRepository {
  lastMessagePerRoom(roomIds: number[]): Promise<{ room: number; text: string | null; createdAt: Date }[]>
  countForRoom(roomId: number): Promise<number>
  findPagedForRoom(roomId: number, page: number, limit: number): Promise<any[]>
}

interface IDepartmentRepository {
  findIds(params: { users?: string | number; licensee?: string | number; active?: boolean }): Promise<number[]>
}

interface IContactRepository extends IRepository<IContact> {
  findIds(params: Record<string, unknown>): Promise<number[]>
  findByIds(ids: (string | number)[]): Promise<IContact[]>
}

class RoomsController {
  userRepository: IRepository<IUser>
  roomRepository: IRoomRepository
  messageRepository: IMessageRepository
  departmentRepository: IDepartmentRepository
  contactRepository: IContactRepository

  constructor({
    userRepository,
    roomRepository,
    messageRepository,
    departmentRepository,
    contactRepository,
  }: {
    userRepository?: IRepository<IUser>
    roomRepository?: IRoomRepository
    messageRepository?: IMessageRepository
    departmentRepository?: IDepartmentRepository
    contactRepository?: IContactRepository
  } = {}) {
    this.userRepository = userRepository!
    this.roomRepository = roomRepository!
    this.messageRepository = messageRepository!
    this.departmentRepository = departmentRepository!
    this.contactRepository = contactRepository!

    this.index = this.index.bind(this)
    this.create = this.create.bind(this)
    this.messages = this.messages.bind(this)
    this.closeRoom = this.closeRoom.bind(this)
  }

  async _resolveUser(req: Request) {
    return await this.userRepository.findFirst({ _id: req.userId }, ['licensee'])
  }

  _resolveLicenseeId(user: IUser) {
    return (user.licensee as any)?._id ?? user.licensee
  }

  async index(req: Request, res: Response) {
    try {
      const user = await this._resolveUser(req)
      if (!user) return res.status(404).json({ errors: { message: 'User not found' } })

      let licenseeId: any
      if (user.role === 'super') {
        if (!req.query.licensee) {
          return res.status(400).json({ errors: { message: 'licensee query param required for super users' } })
        }
        licenseeId = req.query.licensee
      } else {
        licenseeId = this._resolveLicenseeId(user)
      }

      // Step 1: get contact IDs for this licensee (scope rooms to licensee via contacts)
      const contactIds = await this.contactRepository.findIds({ licensee: licenseeId })

      // Step 2: get agent's department IDs
      const agentDepts = await this.departmentRepository.findIds({
        users: req.userId,
        licensee: licenseeId,
        active: true,
      })

      const page = Math.max(1, parseInt(req.query.page as string) || 1)
      const limit = 20
      const inboxId = req.query.inbox as string | undefined

      // Step 3: get rooms
      const results = await this.roomRepository.findForLicensee(licenseeId, {
        departmentIds: agentDepts,
        contactIds,
        page,
        limit,
        inboxId,
      })

      const hasMore = results.length > limit
      const rooms: any[] = hasMore ? results.slice(0, limit) : results

      // Step 4: populate contacts
      const roomContactIds = [...new Set(rooms.map((r: any) => r.contact).filter(Boolean))]
      const contacts = await this.contactRepository.findByIds(roomContactIds)
      const contactMap: Record<string, any> = {}
      for (const c of contacts) contactMap[String((c as any).id ?? (c as any)._id)] = c

      // Step 5: last message per room
      const roomIds = rooms.map((r: any) => r.id as number)
      const lastMessages = await this.messageRepository.lastMessagePerRoom(roomIds)
      const lastMsgMap: Record<number, any> = {}
      for (const m of lastMessages) lastMsgMap[m.room] = m

      const roomsWithLast = rooms.map((r: any) => ({
        ...r,
        _id: String(r.id),
        contact: contactMap[String(r.contact)] ?? r.contact,
        lastMessage: lastMsgMap[r.id] ?? null,
      }))

      return res.status(200).json({ rooms: roomsWithLast, hasMore })
    } catch (err: any) {
      return res.status(500).json({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async create(req: Request, res: Response) {
    try {
      const user = await this._resolveUser(req)
      if (!user) return res.status(404).json({ errors: { message: 'User not found' } })

      const licenseeId = user.role === 'super' ? req.body.licenseeId : this._resolveLicenseeId(user)

      const contact = await this.contactRepository.findFirst({ _id: req.body.contactId })
      if (!contact) return res.status(404).json({ errors: { message: 'Contact not found' } })

      const contactLicenseeId = (contact.licensee as any)?._id?.toString() ?? contact.licensee?.toString()
      const resolvedLicenseeId = licenseeId?.toString()

      if (user.role !== 'super' && contactLicenseeId !== resolvedLicenseeId) {
        return res.status(403).json({ errors: { message: 'Forbidden' } })
      }

      const existingRoom = await this.roomRepository.findOpenForContact(contact._id as string)
      if (existingRoom) {
        return res.status(200).json({ room: { ...(existingRoom as any), contact } })
      }

      const inboxId = req.body.inboxId
      await this.roomRepository.create({
        contact: contact._id as string,
        status: 'pending',
        ...(inboxId ? { inbox: inboxId } : {}),
      })
      const room = await this.roomRepository.findOpenForContact(contact._id as string)
      return res.status(201).json({ room: { ...(room as any), contact } })
    } catch (err: any) {
      return res.status(500).json({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async messages(req: Request, res: Response) {
    try {
      const user = await this._resolveUser(req)
      if (!user) return res.status(404).json({ errors: { message: 'User not found' } })

      const room = await this.roomRepository.findFirst({ _id: req.params.roomId as string })
      if (!room) return res.status(404).json({ errors: { message: 'Room not found' } })

      if (user.role !== 'super') {
        const userLicenseeId = this._resolveLicenseeId(user)?.toString()
        const contactRaw = (room as any).contact
        let roomLicenseeId: string | null
        if (contactRaw && typeof contactRaw === 'object') {
          roomLicenseeId = (contactRaw.licensee as any)?._id?.toString() ?? contactRaw.licensee?.toString() ?? null
        } else {
          const contact = await this.contactRepository.findFirst({ _id: String(contactRaw) })
          roomLicenseeId = (contact?.licensee as any)?._id?.toString() ?? contact?.licensee?.toString() ?? null
        }

        if (userLicenseeId !== roomLicenseeId) {
          return res.status(403).json({ errors: { message: 'Forbidden' } })
        }
      }

      const page = Math.max(1, parseInt(req.query.page as string) || 1)
      const limit = 30
      const roomId = (room as any).id as number

      const total = await this.messageRepository.countForRoom(roomId)
      const messages = await this.messageRepository.findPagedForRoom(roomId, page, limit)
      const hasMore = messages.length > limit
      const pageMessages = hasMore ? messages.slice(0, limit) : messages

      return res.status(200).json({ messages: pageMessages, total, page, hasMore })
    } catch (err: any) {
      return res.status(500).json({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async closeRoom(req: Request, res: Response) {
    try {
      const user = await this._resolveUser(req)
      if (!user) return res.status(404).json({ errors: { message: 'User not found' } })

      const room = await this.roomRepository.findById(req.params.roomId as string)
      if (!room) return res.status(404).json({ errors: { message: 'Room not found' } })

      if (user.role !== 'super') {
        const userLicenseeId = this._resolveLicenseeId(user)?.toString()
        const contactRaw = (room as any).contact
        let roomLicenseeId: string | null
        if (contactRaw && typeof contactRaw === 'object') {
          roomLicenseeId = (contactRaw.licensee as any)?._id?.toString() ?? contactRaw.licensee?.toString() ?? null
        } else {
          const contact = await this.contactRepository.findFirst({ _id: String(contactRaw) })
          roomLicenseeId = (contact?.licensee as any)?._id?.toString() ?? contact?.licensee?.toString() ?? null
        }
        if (userLicenseeId !== roomLicenseeId) {
          return res.status(403).json({ errors: { message: 'Forbidden' } })
        }
      }

      if ((room as any).closed) return res.status(200).json({ message: 'Already closed' })

      await this.roomRepository.close(String(req.params.roomId))
      return res.status(200).json({ message: 'Room closed' })
    } catch (err: any) {
      return res.status(500).json({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }
}

export { RoomsController }
