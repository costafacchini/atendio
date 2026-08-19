import { Request, Response } from 'express'
import { sanitizeModelErrors } from '../helpers/SanitizeErrors'
import { IRepository } from '@repositories/repository'
import { IUser, IMessage } from '../../types'
import { CreateMessage } from '../usecases/messages/CreateMessage'
import { MessagesQuery } from '../queries/MessagesQuery'
import { IQueueServer } from '@config/queue'

class MessagesController {
  createMessagesQuery: () => MessagesQuery
  userRepository: IRepository<IUser>
  messageRepository: IRepository<IMessage>
  queueServer: IQueueServer
  createMessage: CreateMessage

  constructor({
    createMessagesQuery,
    userRepository,
    messageRepository,
    queueServer,
    createMessage,
  }: {
    createMessagesQuery?: () => MessagesQuery
    userRepository?: IRepository<IUser>
    messageRepository?: IRepository<IMessage>
    queueServer?: IQueueServer
    createMessage?: CreateMessage
  } = {}) {
    this.createMessagesQuery = createMessagesQuery!
    this.userRepository = userRepository!
    this.messageRepository = messageRepository!
    this.queueServer = queueServer!
    this.createMessage = createMessage!

    this.index = this.index.bind(this)
    this.create = this.create.bind(this)
    this.resend = this.resend.bind(this)
    this.ignore = this.ignore.bind(this)
  }

  async index(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string, 10) || 1
      const limit = parseInt(req.query.limit as string, 10) || 30

      const user = await this.userRepository.findFirst({ _id: req.userId })

      if (user && user.role !== 'super') {
        req.query.licensee = user.licensee?.toString()
      }

      const messagesQuery = this.createMessagesQuery()

      messagesQuery.page(page)
      messagesQuery.limit(limit)

      if (req.query.startDate && req.query.endDate) {
        messagesQuery.filterByCreatedAt(new Date(req.query.startDate as string), new Date(req.query.endDate as string))
      }

      if (req.query.licensee) {
        messagesQuery.filterByLicensee(req.query.licensee as string)
      }

      if (req.query.contact) {
        messagesQuery.filterByContact(req.query.contact as string)
      }

      if (req.query.kind) {
        messagesQuery.filterByKind(req.query.kind as string)
      }

      if (req.query.destination) {
        messagesQuery.filterByDestination(req.query.destination as string)
      }

      if (req.query.sended) {
        messagesQuery.filterBySended(req.query.sended === 'true')
      }

      const messages = await messagesQuery.all()

      res.status(200).send(messages)
    } catch (err: any) {
      return res.status(500).send({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async create(req: Request, res: Response) {
    try {
      const message = await this.createMessage.execute(req.body)
      return res.status(201).send(message)
    } catch (err: any) {
      if (err?.errors) {
        return res.status(422).send({ errors: sanitizeModelErrors(err.errors) })
      }
      return res.status(500).send({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async resend(req: Request, res: Response) {
    try {
      const [user, message] = await Promise.all([
        this.userRepository.findFirst({ _id: req.userId }),
        this.messageRepository.findFirst({ _id: req.params.id as string }),
      ])

      if (!message) return res.status(404).json({ errors: { message: 'Message not found' } })

      if (!user) return res.status(404).json({ errors: { message: 'User not found' } })

      if (user.role !== 'super') {
        if (message.licensee.toString() !== user.licensee!.toString()) {
          return res.status(403).json({ errors: { message: 'Forbidden' } })
        }
      }

      if (message.sended) {
        return res.status(422).json({ errors: { message: 'Message already sended' } })
      }

      message.sended = false
      message.error = null
      message.sendedAt = null

      await this.messageRepository.save(message)

      await this.queueServer.addJob('send-message-to-messenger', { messageId: message._id })

      return res.status(200).json(message)
    } catch (err: any) {
      return res.status(500).json({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async ignore(req: Request, res: Response) {
    try {
      const [user, message] = await Promise.all([
        this.userRepository.findFirst({ _id: req.userId }),
        this.messageRepository.findFirst({ _id: req.params.id as string }),
      ])

      if (!message) return res.status(404).json({ errors: { message: 'Message not found' } })
      if (!user) return res.status(404).json({ errors: { message: 'User not found' } })

      if (user.role !== 'super') {
        if (message.licensee.toString() !== user.licensee!.toString()) {
          return res.status(403).json({ errors: { message: 'Forbidden' } })
        }
      }

      message.ignored = true
      await this.messageRepository.save(message)

      return res.status(200).json(message)
    } catch (err: any) {
      return res.status(500).json({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }
}

export { MessagesController }
