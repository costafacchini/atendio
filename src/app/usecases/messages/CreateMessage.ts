import { IRepository } from '@repositories/repository'
import { IMessage, IContact } from '../../../types'
import { IQueueServer, JobOptions } from '@config/queue'

const CREATE_MESSAGE_FIELDS = [
  'licensee',
  'contact',
  'phone',
  'kind',
  'destination',
  'text',
  'url',
  'fileName',
  'latitude',
  'longitude',
  'fromMe',
  'senderName',
  'departament',
  'scheduledAt',
]

const SEND_MESSAGE_TO_MESSENGER_JOB = 'send-message-to-messenger'

interface ContactRepository extends IRepository<IContact> {
  getContactByNumber(phone: string, licenseeId: string): Promise<IContact | null>
}

interface RoomRepository {
  findOpenForContact(contactId: any): Promise<{ _id: any } | null>
  create(fields: Record<string, any>): Promise<{ _id: any }>
}

interface CreateMessageDeps {
  messageRepository: IRepository<IMessage>
  contactRepository: ContactRepository
  jobQueue: IQueueServer
  roomRepository?: RoomRepository
}

function pickFields(fields: Record<string, any> = {}, keys: string[] = []) {
  return keys.reduce((payload: Record<string, any>, key: string) => {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      payload[key] = fields[key]
    }
    return payload
  }, {})
}

class CreateMessage {
  messageRepository: IRepository<IMessage>
  contactRepository: ContactRepository
  jobQueue: IQueueServer
  roomRepository?: RoomRepository

  constructor({ messageRepository, contactRepository, jobQueue, roomRepository }: CreateMessageDeps) {
    this.messageRepository = messageRepository
    this.contactRepository = contactRepository
    this.jobQueue = jobQueue
    this.roomRepository = roomRepository
  }

  async execute(fields: Record<string, any> = {}): Promise<IMessage> {
    const payload = pickFields(fields, CREATE_MESSAGE_FIELDS)

    if (!payload.licensee) {
      throw new Error('licensee is required')
    }

    if (payload.phone && !payload.contact) {
      const contact = await this.contactRepository.getContactByNumber(payload.phone, payload.licensee)
      if (!contact) {
        throw new Error(`Contact not found for phone ${payload.phone}`)
      }
      payload.contact = contact._id
    }

    delete payload.phone

    if (payload.destination === 'to-messenger' && payload.contact && this.roomRepository) {
      let room = await this.roomRepository.findOpenForContact(payload.contact)
      if (!room) {
        room = await this.roomRepository.create({ contact: payload.contact, status: 'pending' })
      }
      payload.room = room._id
    }

    const message = await this.messageRepository.create(payload)

    let delay: number | undefined
    if (message.scheduledAt) {
      const ms = new Date(message.scheduledAt).getTime() - Date.now()
      if (ms <= 0) {
        throw Object.assign(new Error('Validation failed'), {
          errors: { scheduledAt: { message: 'must be a future datetime' } },
        })
      }
      delay = ms
    }

    const messengerOptions: JobOptions = {}
    if (message.kind === 'file') {
      messengerOptions.attempts = 3
      messengerOptions.backoff = { type: 'exponential', delay: 3000 }
    }
    if (delay) messengerOptions.delay = delay

    if (message.destination === 'to-messenger') {
      await this.jobQueue.addJob(SEND_MESSAGE_TO_MESSENGER_JOB, { messageId: message._id }, messengerOptions)
    } else if (message.destination === 'to-chat') {
      const chatOptions: JobOptions = delay ? { delay } : {}
      await this.jobQueue.addJob('send-message-to-chat', { messageId: message._id }, chatOptions)
    }

    return message
  }
}

export { CreateMessage, CREATE_MESSAGE_FIELDS }
