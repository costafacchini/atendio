import { Dialog } from './Dialog'
import Trigger from '@models/Trigger'
import Template from '@models/Template'
import { installMemoryRepositories, resetMemoryRepositories } from '@repositories/testing'
import { S3 } from '../storage/S3'
import { licensee as licenseeFactory } from '@factories/licensee'
import { contact as contactFactory } from '@factories/contact'
import { message as messageFactory } from '@factories/message'
import {
  triggerReplyButton as triggerReplyButtonFactory,
  triggerMultiProduct as triggerMultiProductFactory,
  triggerListMessage as triggerListMessageFactory,
  triggerSingleProduct as triggerSingleProductFactory,
  triggerText as triggerTextFactory,
} from '@factories/trigger'
import { template as templateFactory } from '@factories/template'
import { LicenseeRepositoryDatabase } from '@repositories/licensee'
import request from '../../services/request'

jest.mock('uuid', () => ({ v4: () => '150bdb15-4c55-42ac-bc6c-970d620fdb6d' }))
jest.mock('../../services/request')
jest.mock('../../helpers/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() },
}))
import { createRuntimeDependencies } from '../../runtime/dependencies'
import { logger } from '../../helpers/logger'

let dependencies

describe('Dialog plugin', () => {
  let licensee
  const uploadFileS3Spy = jest.spyOn(S3.prototype, 'uploadFile').mockImplementation()
  const presignedUrlS3Spy = jest.spyOn(S3.prototype, 'presignedUrl').mockImplementation(() => {
    return 'https://s3.url.com/1c18498a-f953-41c2-9c56-8a22b89510d3.jpeg'
  })

  beforeEach(async () => {
    installMemoryRepositories()
    dependencies = createRuntimeDependencies()
    jest.clearAllMocks()
    const licenseeRepository = new LicenseeRepositoryDatabase()
    licensee = await licenseeRepository.create(licenseeFactory.build({ whatsappToken: 'whats-token' }))
  })

  afterEach(() => {
    resetMemoryRepositories()
  })

  describe('#responseToMessages', () => {
    describe('text', () => {
      it('returns the response body transformed in messages', async () => {
        const contactRepository = dependencies.contactRepository
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            talkingWithChatBot: false,
            licensee,
          }),
        )

        const responseBody = {
          contacts: [
            {
              profile: {
                name: 'John Doe',
              },
              wa_id: '5511990283745',
            },
          ],
          messages: [
            {
              from: '5511990283745',
              id: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC',
              text: {
                body: 'Message',
              },
              timestamp: '1632784639',
              type: 'text',
            },
          ],
        }

        const dialog = new Dialog(licensee, dependencies)
        const messages = await dialog.responseToMessages(responseBody)

        expect(messages[0].licensee).toEqual(licensee._id)
        expect(messages[0].contact).toEqual(contact._id)
        expect(messages[0].kind).toEqual('text')
        expect(messages[0].messageWaId).toEqual('ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC')
        expect(messages[0].number).toEqual('150bdb15-4c55-42ac-bc6c-970d620fdb6d')
        expect(messages[0].destination).toEqual('to-chat')
        expect(messages[0].text).toEqual('Message')
        expect(messages[0].url).toEqual(undefined)
        expect(messages[0].fileName).toEqual(undefined)
        expect(messages[0].latitude).toEqual(undefined)
        expect(messages[0].longitude).toEqual(undefined)
        expect(messages[0].departament).toEqual(undefined)

        expect(messages.length).toEqual(1)
      })
    })

    describe('button', () => {
      it('returns the response body transformed in messages', async () => {
        const contactRepository = dependencies.contactRepository
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            talkingWithChatBot: false,
            licensee,
          }),
        )

        const responseBody = {
          contacts: [
            {
              profile: {
                name: 'John Doe',
              },
              wa_id: '5511990283745',
            },
          ],
          messages: [
            {
              button: {
                text: 'Message',
              },
              context: {
                from: '5511989187726',
                id: 'ABGHVRGYkYdybwIQ0bTVCg1c-CuSSZXzTHxosg',
              },
              from: '5511990283745',
              id: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC',
              timestamp: '1632784639',
              type: 'button',
            },
          ],
        }

        const dialog = new Dialog(licensee, dependencies)
        const messages = await dialog.responseToMessages(responseBody)

        expect(messages[0].licensee).toEqual(licensee._id)
        expect(messages[0].contact).toEqual(contact._id)
        expect(messages[0].kind).toEqual('text')
        expect(messages[0].messageWaId).toEqual('ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC')
        expect(messages[0].number).toEqual('150bdb15-4c55-42ac-bc6c-970d620fdb6d')
        expect(messages[0].destination).toEqual('to-chat')
        expect(messages[0].text).toEqual('Message')
        expect(messages[0].url).toEqual(undefined)
        expect(messages[0].fileName).toEqual(undefined)
        expect(messages[0].latitude).toEqual(undefined)
        expect(messages[0].longitude).toEqual(undefined)
        expect(messages[0].departament).toEqual(undefined)

        expect(messages.length).toEqual(1)
      })
    })

    describe('image', () => {
      it('returns the response body transformed in messages', async () => {
        const contactRepository = dependencies.contactRepository
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            talkingWithChatBot: false,
            licensee,
          }),
        )

        const responseBody = {
          contacts: [
            {
              profile: {
                name: 'John Doe',
              },
              wa_id: '5511990283745',
            },
          ],
          messages: [
            {
              from: '5511990283745',
              id: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC',
              image: {
                id: 'image-media-id',
                sha256: 'sha256',
              },
              timestamp: '1632784639',
              type: 'image',
            },
          ],
        }

        request.download.mockResolvedValueOnce({
          status: 200,
          headers: {
            get: (name) => (name === 'content-type' ? 'image/jpeg' : null),
          },
          data: Buffer.from('test'),
        })

        const dialog = new Dialog(licensee, dependencies)
        const messages = await dialog.responseToMessages(responseBody)

        expect(messages[0].licensee).toEqual(licensee._id)
        expect(messages[0].contact).toEqual(contact._id)
        expect(messages[0].kind).toEqual('file')
        expect(messages[0].messageWaId).toEqual('ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC')
        expect(messages[0].attachmentWaId).toEqual('image-media-id')
        expect(messages[0].number).toEqual('150bdb15-4c55-42ac-bc6c-970d620fdb6d')
        expect(messages[0].destination).toEqual('to-chat')
        expect(messages[0].text).toEqual(undefined)
        expect(messages[0].senderName).toEqual(undefined)
        expect(messages[0].url).toEqual('https://s3.url.com/1c18498a-f953-41c2-9c56-8a22b89510d3.jpeg')
        expect(messages[0].fileName).toEqual('sha256')
        expect(messages[0].latitude).toEqual(undefined)
        expect(messages[0].longitude).toEqual(undefined)
        expect(messages[0].departament).toEqual(undefined)
        expect(uploadFileS3Spy).toHaveBeenCalledTimes(1)
        expect(presignedUrlS3Spy).toHaveBeenCalledTimes(1)

        expect(messages.length).toEqual(1)
      })
    })

    describe('video', () => {
      it('returns the response body transformed in messages', async () => {
        const contactRepository = dependencies.contactRepository
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            talkingWithChatBot: false,
            licensee,
          }),
        )

        const responseBody = {
          contacts: [
            {
              profile: {
                name: 'John Doe',
              },
              wa_id: '5511990283745',
            },
          ],
          messages: [
            {
              from: '5511990283745',
              id: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC',
              video: {
                id: 'image-media-id',
                sha256: 'sha256',
              },
              timestamp: '1632784639',
              type: 'video',
            },
          ],
        }

        request.download.mockResolvedValueOnce({
          status: 200,
          headers: {
            get: (name) => (name === 'content-type' ? 'video/mov' : null),
          },
          data: Buffer.from('test'),
        })

        const dialog = new Dialog(licensee, dependencies)
        const messages = await dialog.responseToMessages(responseBody)

        expect(messages[0].licensee).toEqual(licensee._id)
        expect(messages[0].contact).toEqual(contact._id)
        expect(messages[0].kind).toEqual('file')
        expect(messages[0].messageWaId).toEqual('ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC')
        expect(messages[0].attachmentWaId).toEqual('image-media-id')
        expect(messages[0].number).toEqual('150bdb15-4c55-42ac-bc6c-970d620fdb6d')
        expect(messages[0].destination).toEqual('to-chat')
        expect(messages[0].text).toEqual(undefined)
        expect(messages[0].senderName).toEqual(undefined)
        expect(messages[0].url).toEqual('https://s3.url.com/1c18498a-f953-41c2-9c56-8a22b89510d3.jpeg')
        expect(messages[0].fileName).toEqual('sha256')
        expect(messages[0].latitude).toEqual(undefined)
        expect(messages[0].longitude).toEqual(undefined)
        expect(messages[0].departament).toEqual(undefined)
        expect(uploadFileS3Spy).toHaveBeenCalledTimes(1)
        expect(presignedUrlS3Spy).toHaveBeenCalledTimes(1)

        expect(messages.length).toEqual(1)
      })
    })

    describe('voice', () => {
      it('returns the response body transformed in messages', async () => {
        const contactRepository = dependencies.contactRepository
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            talkingWithChatBot: false,
            licensee,
          }),
        )

        const responseBody = {
          contacts: [
            {
              profile: {
                name: 'John Doe',
              },
              wa_id: '5511990283745',
            },
          ],
          messages: [
            {
              from: '5511990283745',
              id: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC',
              voice: {
                id: 'image-media-id',
                sha256: 'sha256',
              },
              timestamp: '1632784639',
              type: 'voice',
            },
          ],
        }

        request.download.mockResolvedValueOnce({
          status: 200,
          headers: {
            get: (name) => (name === 'content-type' ? 'voice/ogg' : null),
          },
          data: Buffer.from('test'),
        })

        const dialog = new Dialog(licensee, dependencies)
        const messages = await dialog.responseToMessages(responseBody)

        expect(messages[0].licensee).toEqual(licensee._id)
        expect(messages[0].contact).toEqual(contact._id)
        expect(messages[0].kind).toEqual('file')
        expect(messages[0].messageWaId).toEqual('ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC')
        expect(messages[0].attachmentWaId).toEqual('image-media-id')
        expect(messages[0].number).toEqual('150bdb15-4c55-42ac-bc6c-970d620fdb6d')
        expect(messages[0].destination).toEqual('to-chat')
        expect(messages[0].text).toEqual(undefined)
        expect(messages[0].senderName).toEqual(undefined)
        expect(messages[0].url).toEqual('https://s3.url.com/1c18498a-f953-41c2-9c56-8a22b89510d3.jpeg')
        expect(messages[0].fileName).toEqual('sha256')
        expect(messages[0].latitude).toEqual(undefined)
        expect(messages[0].longitude).toEqual(undefined)
        expect(messages[0].departament).toEqual(undefined)
        expect(uploadFileS3Spy).toHaveBeenCalledTimes(1)
        expect(presignedUrlS3Spy).toHaveBeenCalledTimes(1)

        expect(messages.length).toEqual(1)
      })
    })

    describe('audio', () => {
      it('returns the response body transformed in messages', async () => {
        const contactRepository = dependencies.contactRepository
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            talkingWithChatBot: false,
            licensee,
          }),
        )

        const responseBody = {
          contacts: [
            {
              profile: {
                name: 'John Doe',
              },
              wa_id: '5511990283745',
            },
          ],
          messages: [
            {
              from: '5511990283745',
              id: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC',
              audio: {
                id: 'image-media-id',
                sha256: 'sha256',
              },
              timestamp: '1632784639',
              type: 'audio',
            },
          ],
        }

        request.download.mockResolvedValueOnce({
          status: 200,
          headers: {
            get: (name) => (name === 'content-type' ? 'audio/mp3' : null),
          },
          data: Buffer.from('test'),
        })

        const dialog = new Dialog(licensee, dependencies)
        const messages = await dialog.responseToMessages(responseBody)

        expect(messages[0].licensee).toEqual(licensee._id)
        expect(messages[0].contact).toEqual(contact._id)
        expect(messages[0].kind).toEqual('file')
        expect(messages[0].messageWaId).toEqual('ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC')
        expect(messages[0].attachmentWaId).toEqual('image-media-id')
        expect(messages[0].number).toEqual('150bdb15-4c55-42ac-bc6c-970d620fdb6d')
        expect(messages[0].destination).toEqual('to-chat')
        expect(messages[0].text).toEqual(undefined)
        expect(messages[0].senderName).toEqual(undefined)
        expect(messages[0].url).toEqual('https://s3.url.com/1c18498a-f953-41c2-9c56-8a22b89510d3.jpeg')
        expect(messages[0].fileName).toEqual('sha256')
        expect(messages[0].latitude).toEqual(undefined)
        expect(messages[0].longitude).toEqual(undefined)
        expect(messages[0].departament).toEqual(undefined)
        expect(uploadFileS3Spy).toHaveBeenCalledTimes(1)
        expect(presignedUrlS3Spy).toHaveBeenCalledTimes(1)

        expect(messages.length).toEqual(1)
      })
    })

    describe('document', () => {
      it('returns the response body transformed in messages', async () => {
        const contactRepository = dependencies.contactRepository
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            talkingWithChatBot: false,
            licensee,
          }),
        )

        const responseBody = {
          contacts: [
            {
              profile: {
                name: 'John Doe',
              },
              wa_id: '5511990283745',
            },
          ],
          messages: [
            {
              from: '5511990283745',
              id: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC',
              document: {
                id: 'image-media-id',
                filename: 'documento.pdf',
              },
              timestamp: '1632784639',
              type: 'document',
            },
          ],
        }

        request.download.mockResolvedValueOnce({
          status: 200,
          headers: {
            get: (name) => (name === 'content-type' ? 'application/pdf' : null),
          },
          data: Buffer.from('test'),
        })

        const dialog = new Dialog(licensee, dependencies)
        const messages = await dialog.responseToMessages(responseBody)

        expect(messages[0].licensee).toEqual(licensee._id)
        expect(messages[0].contact).toEqual(contact._id)
        expect(messages[0].kind).toEqual('file')
        expect(messages[0].messageWaId).toEqual('ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC')
        expect(messages[0].attachmentWaId).toEqual('image-media-id')
        expect(messages[0].number).toEqual('150bdb15-4c55-42ac-bc6c-970d620fdb6d')
        expect(messages[0].destination).toEqual('to-chat')
        expect(messages[0].text).toEqual(undefined)
        expect(messages[0].senderName).toEqual(undefined)
        expect(messages[0].url).toEqual('https://s3.url.com/1c18498a-f953-41c2-9c56-8a22b89510d3.jpeg')
        expect(messages[0].fileName).toEqual('documento.pdf')
        expect(messages[0].latitude).toEqual(undefined)
        expect(messages[0].longitude).toEqual(undefined)
        expect(messages[0].departament).toEqual(undefined)
        expect(uploadFileS3Spy).toHaveBeenCalledTimes(1)
        expect(presignedUrlS3Spy).toHaveBeenCalledTimes(1)

        expect(messages.length).toEqual(1)
      })
    })

    describe('interactive list_reply', () => {
      it('returns the response body transformed in messages', async () => {
        const contactRepository = dependencies.contactRepository
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            talkingWithChatBot: false,
            licensee,
          }),
        )

        const triggerOrder2 = await Trigger.create(triggerReplyButtonFactory.build({ licensee, order: 2 }))
        const trigger = await Trigger.create(triggerReplyButtonFactory.build({ licensee }))

        const responseBody = {
          contacts: [
            {
              profile: {
                name: 'John Doe',
              },
              wa_id: '5511990283745',
            },
          ],
          messages: [
            {
              from: '5511990283745',
              id: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC',
              timestamp: '1632784639',
              type: 'interactive',
              interactive: {
                list_reply: {
                  description: 'Descrição 2',
                  id: 'send_reply_buttons',
                  title: 'Opção 2',
                },
                type: 'list_reply',
              },
            },
          ],
        }

        const dialog = new Dialog(licensee, dependencies)
        const messages = await dialog.responseToMessages(responseBody)

        expect(messages[0].licensee).toEqual(licensee._id)
        expect(messages[0].contact).toEqual(contact._id)
        expect(messages[0].kind).toEqual('interactive')
        expect(messages[0].messageWaId).toEqual('ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC')
        expect(messages[0].number).toEqual('150bdb15-4c55-42ac-bc6c-970d620fdb6d')
        expect(messages[0].destination).toEqual('to-messenger')
        expect(messages[0].trigger).toEqual(trigger._id)
        expect(messages[0].text).toEqual(undefined)
        expect(messages[0].url).toEqual(undefined)
        expect(messages[0].fileName).toEqual(undefined)
        expect(messages[0].latitude).toEqual(undefined)
        expect(messages[0].longitude).toEqual(undefined)
        expect(messages[0].departament).toEqual(undefined)

        expect(messages[1].licensee).toEqual(licensee._id)
        expect(messages[1].contact).toEqual(contact._id)
        expect(messages[1].kind).toEqual('interactive')
        expect(messages[1].messageWaId).toEqual('ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC')
        expect(messages[1].number).toEqual('150bdb15-4c55-42ac-bc6c-970d620fdb6d')
        expect(messages[1].destination).toEqual('to-messenger')
        expect(messages[1].trigger).toEqual(triggerOrder2._id)
        expect(messages[1].text).toEqual(undefined)
        expect(messages[1].url).toEqual(undefined)
        expect(messages[1].fileName).toEqual(undefined)
        expect(messages[1].latitude).toEqual(undefined)
        expect(messages[1].longitude).toEqual(undefined)
        expect(messages[1].departament).toEqual(undefined)

        expect(messages.length).toEqual(2)
      })

      it('returns message with text if does not have trigger', async () => {
        const contactRepository = dependencies.contactRepository
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            talkingWithChatBot: false,
            licensee,
          }),
        )

        const responseBody = {
          contacts: [
            {
              profile: {
                name: 'John Doe',
              },
              wa_id: '5511990283745',
            },
          ],
          messages: [
            {
              from: '5511990283745',
              id: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC',
              timestamp: '1632784639',
              type: 'interactive',
              interactive: {
                list_reply: {
                  description: 'Descrição 2',
                  id: 'send_reply_buttons',
                  title: 'Opção 2',
                },
                type: 'list_reply',
              },
            },
          ],
        }

        const dialog = new Dialog(licensee, dependencies)
        const messages = await dialog.responseToMessages(responseBody)

        expect(messages[0].licensee).toEqual(licensee._id)
        expect(messages[0].contact).toEqual(contact._id)
        expect(messages[0].kind).toEqual('text')
        expect(messages[0].messageWaId).toEqual('ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC')
        expect(messages[0].number).toEqual('150bdb15-4c55-42ac-bc6c-970d620fdb6d')
        expect(messages[0].destination).toEqual('to-chat')
        expect(messages[0].trigger).toEqual(undefined)
        expect(messages[0].text).toEqual('send_reply_buttons')
        expect(messages[0].url).toEqual(undefined)
        expect(messages[0].fileName).toEqual(undefined)
        expect(messages[0].latitude).toEqual(undefined)
        expect(messages[0].longitude).toEqual(undefined)
        expect(messages[0].departament).toEqual(undefined)

        expect(messages.length).toEqual(1)
      })
    })

    describe('interactive button_reply', () => {
      it('returns the response body transformed in messages', async () => {
        const contactRepository = dependencies.contactRepository
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            talkingWithChatBot: false,
            licensee,
          }),
        )

        const triggerOrder2 = await Trigger.create(triggerReplyButtonFactory.build({ licensee, order: 2 }))
        const trigger = await Trigger.create(triggerReplyButtonFactory.build({ licensee }))

        const responseBody = {
          contacts: [
            {
              profile: {
                name: 'John Doe',
              },
              wa_id: '5511990283745',
            },
          ],
          messages: [
            {
              from: '5511990283745',
              id: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC',
              timestamp: '1632784639',
              type: 'interactive',
              interactive: {
                button_reply: {
                  id: 'send_reply_buttons',
                  title: 'Opção 2',
                },
                type: 'button_reply',
              },
            },
          ],
        }

        const dialog = new Dialog(licensee, dependencies)
        const messages = await dialog.responseToMessages(responseBody)

        expect(messages[0].licensee).toEqual(licensee._id)
        expect(messages[0].contact).toEqual(contact._id)
        expect(messages[0].kind).toEqual('interactive')
        expect(messages[0].messageWaId).toEqual('ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC')
        expect(messages[0].number).toEqual('150bdb15-4c55-42ac-bc6c-970d620fdb6d')
        expect(messages[0].destination).toEqual('to-messenger')
        expect(messages[0].trigger).toEqual(trigger._id)
        expect(messages[0].text).toEqual(undefined)
        expect(messages[0].url).toEqual(undefined)
        expect(messages[0].fileName).toEqual(undefined)
        expect(messages[0].latitude).toEqual(undefined)
        expect(messages[0].longitude).toEqual(undefined)
        expect(messages[0].departament).toEqual(undefined)

        expect(messages[1].licensee).toEqual(licensee._id)
        expect(messages[1].contact).toEqual(contact._id)
        expect(messages[1].kind).toEqual('interactive')
        expect(messages[1].messageWaId).toEqual('ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC')
        expect(messages[1].number).toEqual('150bdb15-4c55-42ac-bc6c-970d620fdb6d')
        expect(messages[1].destination).toEqual('to-messenger')
        expect(messages[1].trigger).toEqual(triggerOrder2._id)
        expect(messages[1].text).toEqual(undefined)
        expect(messages[1].url).toEqual(undefined)
        expect(messages[1].fileName).toEqual(undefined)
        expect(messages[1].latitude).toEqual(undefined)
        expect(messages[1].longitude).toEqual(undefined)
        expect(messages[1].departament).toEqual(undefined)

        expect(messages.length).toEqual(2)
      })

      it('returns message with text if does not have trigger', async () => {
        const contactRepository = dependencies.contactRepository
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            talkingWithChatBot: false,
            licensee,
          }),
        )

        const responseBody = {
          contacts: [
            {
              profile: {
                name: 'John Doe',
              },
              wa_id: '5511990283745',
            },
          ],
          messages: [
            {
              from: '5511990283745',
              id: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC',
              timestamp: '1632784639',
              type: 'interactive',
              interactive: {
                button_reply: {
                  id: 'send_reply_buttons',
                  title: 'Opção 2',
                },
                type: 'button_reply',
              },
            },
          ],
        }

        const dialog = new Dialog(licensee, dependencies)
        const messages = await dialog.responseToMessages(responseBody)

        expect(messages[0].licensee).toEqual(licensee._id)
        expect(messages[0].contact).toEqual(contact._id)
        expect(messages[0].kind).toEqual('text')
        expect(messages[0].messageWaId).toEqual('ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC')
        expect(messages[0].number).toEqual('150bdb15-4c55-42ac-bc6c-970d620fdb6d')
        expect(messages[0].destination).toEqual('to-chat')
        expect(messages[0].trigger).toEqual(undefined)
        expect(messages[0].text).toEqual('send_reply_buttons')
        expect(messages[0].url).toEqual(undefined)
        expect(messages[0].fileName).toEqual(undefined)
        expect(messages[0].latitude).toEqual(undefined)
        expect(messages[0].longitude).toEqual(undefined)
        expect(messages[0].departament).toEqual(undefined)

        expect(messages.length).toEqual(1)
      })
    })

    it('updates the contact if contact exists and name is different', async () => {
      const contactRepository = dependencies.contactRepository
      await contactRepository.create(
        contactFactory.build({
          name: 'John Doe',
          talkingWithChatBot: false,
          licensee,
        }),
      )

      const responseBody = {
        contacts: [
          {
            profile: {
              name: 'Jonny Cash',
            },
            wa_id: '5511990283745',
          },
        ],
        messages: [
          {
            from: '5511990283745',
            id: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC',
            text: {
              body: 'Message',
            },
            timestamp: '1632784639',
            type: 'text',
          },
        ],
      }

      const dialog = new Dialog(licensee, dependencies)
      await dialog.responseToMessages(responseBody)

      const contactUpdated = await contactRepository.findFirst({
        number: '5511990283745',
        type: '@c.us',
        licensee: licensee._id,
      })

      expect(contactUpdated.name).toEqual('Jonny Cash')
    })

    it('updates the contact if contact exists and waId is different', async () => {
      const contactRepository = dependencies.contactRepository
      await contactRepository.create(
        contactFactory.build({
          name: 'John Doe',
          talkingWithChatBot: false,
          licensee,
        }),
      )

      const responseBody = {
        contacts: [
          {
            profile: {
              name: 'Jonny Cash',
            },
            wa_id: '5511990283745',
          },
        ],
        messages: [
          {
            from: '5511990283745',
            id: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC',
            text: {
              body: 'Message',
            },
            timestamp: '1632784639',
            type: 'text',
          },
        ],
      }

      const dialog = new Dialog(licensee, dependencies)
      await dialog.responseToMessages(responseBody)

      const contactUpdated = await contactRepository.findFirst({
        number: '5511990283745',
        type: '@c.us',
        licensee: licensee._id,
      })

      expect(contactUpdated.waId).toEqual('5511990283745')
    })

    it('does not update the contact if name is undefined', async () => {
      const contactRepository = dependencies.contactRepository
      await contactRepository.create(
        contactFactory.build({
          name: 'John Doe',
          talkingWithChatBot: false,
          waId: '5511990283745',
          licensee,
        }),
      )

      const responseBody = {
        contacts: [
          {
            profile: {},
            wa_id: '5511990283745',
          },
        ],
        messages: [
          {
            from: '5511990283745',
            id: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC',
            text: {
              body: 'Message',
            },
            timestamp: '1632784639',
            type: 'text',
          },
        ],
      }

      const dialog = new Dialog(licensee, dependencies)
      await dialog.responseToMessages(responseBody)

      const contactUpdated = await contactRepository.findFirst({
        number: '5511990283745',
        type: '@c.us',
        licensee: licensee._id,
      })

      expect(contactUpdated.name).toEqual('John Doe')
    })

    it('does not update the contact if wa_id is undefined', async () => {
      const contactRepository = dependencies.contactRepository
      await contactRepository.create(
        contactFactory.build({
          name: 'John Doe',
          talkingWithChatBot: false,
          waId: '5511990283745',
          licensee,
        }),
      )

      const responseBody = {
        contacts: [
          {
            profile: {
              name: 'John Doe',
            },
          },
        ],
        messages: [
          {
            from: '5511990283745',
            id: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC',
            text: {
              body: 'Message',
            },
            timestamp: '1632784639',
            type: 'text',
          },
        ],
      }

      const dialog = new Dialog(licensee, dependencies)
      await dialog.responseToMessages(responseBody)

      const contactUpdated = await contactRepository.findFirst({
        number: '5511990283745',
        type: '@c.us',
        licensee: licensee._id,
      })

      expect(contactUpdated.waId).toEqual('5511990283745')
    })

    it('updates the contact whatsapp start chat if field not filled', async () => {
      const contactRepository = dependencies.contactRepository
      await contactRepository.create(
        contactFactory.build({
          name: 'John Doe',
          talkingWithChatBot: false,
          waId: '5511990283745',
          licensee,
          wa_start_chat: null,
        }),
      )

      const responseBody = {
        contacts: [
          {
            profile: {},
            wa_id: '5511990283745',
          },
        ],
        messages: [
          {
            from: '5511990283745',
            id: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC',
            text: {
              body: 'Message',
            },
            timestamp: '1632784639',
            type: 'text',
          },
        ],
      }

      const dialog = new Dialog(licensee, dependencies)
      await dialog.responseToMessages(responseBody)

      const contactUpdated = await contactRepository.findFirst({
        number: '5511990283745',
        type: '@c.us',
        licensee: licensee._id,
      })

      expect(contactUpdated.wa_start_chat).not.toEqual(null)
    })

    it('does not update the contact whatsapp start chat if field already filled', async () => {
      const contactRepository = dependencies.contactRepository
      await contactRepository.create(
        contactFactory.build({
          name: 'John Doe',
          talkingWithChatBot: false,
          waId: '5511990283745',
          licensee,
          wa_start_chat: new Date('2023-04-15T12:36:10.018Z'),
        }),
      )

      const responseBody = {
        contacts: [
          {
            profile: {
              name: 'John Doe',
            },
          },
        ],
        messages: [
          {
            from: '5511990283745',
            id: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC',
            text: {
              body: 'Message',
            },
            timestamp: '1632784639',
            type: 'text',
          },
        ],
      }

      const dialog = new Dialog(licensee, dependencies)
      await dialog.responseToMessages(responseBody)

      const contactUpdated = await contactRepository.findFirst({
        number: '5511990283745',
        type: '@c.us',
        licensee: licensee._id,
      })

      expect(contactUpdated.wa_start_chat).toEqual(new Date('2023-04-15T12:36:10.018Z'))
    })

    describe('when the contact does not exists', () => {
      it('registers the contact and return the response body transformed in messages', async () => {
        const responseBody = {
          contacts: [
            {
              profile: {
                name: 'John Doe',
              },
              wa_id: '5593165392999',
            },
          ],
          messages: [
            {
              from: '5593165392999',
              id: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC',
              text: {
                body: 'Message',
              },
              timestamp: '1632784639',
              type: 'text',
            },
          ],
        }

        const dialog = new Dialog(licensee, dependencies)
        const messages = await dialog.responseToMessages(responseBody)

        const contactRepository = dependencies.contactRepository
        const contact = await contactRepository.findFirst({
          number: '5593165392999',
          type: '@c.us',
          licensee: licensee._id,
        })

        expect(contact.name).toEqual('John Doe')
        expect(contact.number).toEqual('5593165392999')
        expect(contact.type).toEqual('@c.us')
        expect(contact.waId).toEqual('5593165392999')
        expect(contact.talkingWithChatBot).toEqual(licensee.useChatbot)
        expect(contact.licensee).toEqual(licensee._id)
        expect(contact.wa_start_chat).not.toEqual(null)

        expect(messages.length).toEqual(1)
      })
    })

    describe('when the contact talking with chatbot', () => {
      it('returns the response body transformed in message with destination "to_chatbot"', async () => {
        const contactRepository = dependencies.contactRepository
        await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            talkingWithChatBot: true,
            licensee,
            waId: '5511990283745',
          }),
        )

        const responseBody = {
          contacts: [
            {
              profile: {
                name: 'John Doe',
              },
              wa_id: '5511990283745',
            },
          ],
          messages: [
            {
              from: '5511990283745',
              id: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC44',
              text: {
                body: 'Message',
              },
              timestamp: '1632784639',
              type: 'text',
            },
          ],
        }

        const dialog = new Dialog(licensee, dependencies)
        const messages = await dialog.responseToMessages(responseBody)

        expect(messages[0].destination).toEqual('to-chatbot')

        expect(messages.length).toEqual(1)
      })
    })

    it('return the empty data if body is blank', async () => {
      const responseBody = {}

      const dialog = new Dialog(licensee, dependencies)
      const messages = await dialog.responseToMessages(responseBody)

      expect(messages.length).toEqual(0)
    })

    it('return the empty data if body does not have messages', async () => {
      const responseBody = {
        instanceId: '244959',
      }

      const dialog = new Dialog(licensee, dependencies)
      const messages = await dialog.responseToMessages(responseBody)

      expect(messages.length).toEqual(0)
    })

    it('return the empty data if message kind is sticker', async () => {
      const responseBody = {
        contacts: [
          {
            profile: {
              name: 'John Doe',
            },
            wa_id: '5511990283745',
          },
        ],
        messages: [
          {
            from: '5511990283745',
            id: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC',
            sticker: {
              id: '52ab76ae-219d-4ed4-9514-dbe949351491',
              mime_type: 'image/webp',
              sha256: '95f7ae53f5306f4c7e92b1d866d9acf80f2b9b790b8854275fa9778ed6a03f6b',
            },
            timestamp: '1632784639',
            type: 'sticker',
          },
        ],
      }

      const dialog = new Dialog(licensee, dependencies)
      const messages = await dialog.responseToMessages(responseBody)

      expect(messages.length).toEqual(0)
    })

    describe('when the body has statuses', () => {
      it('fills the message sendedAt if status is sent', async () => {
        const contactRepository = dependencies.contactRepository
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            talkingWithChatBot: false,
            waId: '5593165392997',
            licensee,
          }),
        )

        const messageRepository = dependencies.messageRepository
        await messageRepository.create(
          messageFactory.build({
            text: 'Message to send',
            contact,
            licensee,
            sended: false,
            messageWaId: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC44',
          }),
        )

        const responseBody = {
          statuses: [
            {
              id: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC44',
              status: 'sent',
            },
          ],
        }

        const dialog = new Dialog(licensee, dependencies)
        const messages = await dialog.responseToMessages(responseBody)

        expect(messages).toEqual([])

        const messageEdited = await messageRepository.findFirst({
          licensee,
          messageWaId: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC44',
        })

        expect(messageEdited.sendedAt).not.toEqual(null)
      })

      it('fills the message deliveredAt if status is delivered', async () => {
        const contactRepository = dependencies.contactRepository
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            talkingWithChatBot: true,
            waId: '5593165392997',
            licensee,
          }),
        )

        const messageRepository = dependencies.messageRepository
        await messageRepository.create(
          messageFactory.build({
            text: 'Message to send',
            contact,
            licensee,
            sended: false,
            messageWaId: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC44',
          }),
        )

        const responseBody = {
          statuses: [
            {
              id: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC44',
              status: 'delivered',
            },
          ],
        }

        const dialog = new Dialog(licensee, dependencies)
        const messages = await dialog.responseToMessages(responseBody)

        expect(messages).toEqual([])

        const messageEdited = await messageRepository.findFirst({
          licensee,
          messageWaId: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC44',
        })

        expect(messageEdited.deliveredAt).not.toEqual(null)
      })

      it('fills the message readAt if status is read', async () => {
        const contactRepository = dependencies.contactRepository
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            talkingWithChatBot: true,
            waId: '5593165392997',
            licensee,
          }),
        )

        const messageRepository = dependencies.messageRepository
        await messageRepository.create(
          messageFactory.build({
            text: 'Message to send',
            contact,
            licensee,
            sended: false,
            messageWaId: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC44',
          }),
        )

        const responseBody = {
          statuses: [
            {
              id: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC44',
              status: 'read',
            },
          ],
        }

        const dialog = new Dialog(licensee, dependencies)
        const messages = await dialog.responseToMessages(responseBody)

        expect(messages).toEqual([])

        const messageEdited = await messageRepository.findFirst({
          licensee,
          messageWaId: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC44',
        })

        expect(messageEdited.readAt).not.toEqual(null)
      })
    })
  })

  describe('#sendMessage', () => {
    describe('endpoint', () => {
      it('posts to the Cloud API /messages path with the D360-API-KEY header', async () => {
        const contactRepository = dependencies.contactRepository
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            talkingWithChatBot: true,
            waId: '553165392832',
            licensee,
          }),
        )

        const messageRepository = dependencies.messageRepository
        const message = await messageRepository.create(
          messageFactory.build({
            _id: '60958703f415ed4008748637',
            text: 'Message to send',
            contact,
            licensee,
            sended: false,
          }),
        )

        request.post.mockResolvedValueOnce({
          status: 201,
          data: {
            messages: [{ id: 'gBEGVUiZKQggAgkTPoDDlOljYHY' }],
            meta: { api_status: 'stable', version: '2.35.4' },
          },
        })

        const dialog = new Dialog(licensee, dependencies)
        await dialog.sendMessage(message._id, 'https://waba-v2.360dialog.io/', 'token-dialog')

        expect(request.post).toHaveBeenCalledWith(
          'https://waba-v2.360dialog.io/messages',
          expect.objectContaining({ headers: { 'D360-API-KEY': 'token-dialog' } }),
        )
      })
    })

    describe('when the message was sent', () => {
      it('marks the message with was sent and logs the success message', async () => {
        const contactRepository = dependencies.contactRepository
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            talkingWithChatBot: true,
            waId: '553165392832',
            licensee,
          }),
        )

        const messageRepository = dependencies.messageRepository
        const message = await messageRepository.create(
          messageFactory.build({
            _id: '60958703f415ed4008748637',
            text: 'Message to send',
            contact,
            licensee,
            sended: false,
          }),
        )

        const expectedBodySendMessage = {
          recipient_type: 'individual',
          to: '553165392832',
          type: 'text',
          text: {
            body: 'Message to send',
          },
        }

        request.post.mockResolvedValueOnce({
          status: 201,
          data: {
            messages: [{ id: 'gBEGVUiZKQggAgkTPoDDlOljYHY' }],
            meta: { api_status: 'stable', version: '2.35.4' },
          },
        })

        expect(message.sended).toEqual(false)

        const dialog = new Dialog(licensee, dependencies)
        await dialog.sendMessage(message._id, 'https://waba-v2.360dialog.io/', 'token-dialog')
        const messageUpdated = await messageRepository.findFirst({ _id: message._id })
        expect(messageUpdated.sended).toEqual(true)
        expect(messageUpdated.messageWaId).toEqual('gBEGVUiZKQggAgkTPoDDlOljYHY')
        expect(logger.info).toHaveBeenCalledWith(
          'Mensagem 60958703f415ed4008748637 enviada para Dialog360 com sucesso! {"messages":[{"id":"gBEGVUiZKQggAgkTPoDDlOljYHY"}],"meta":{"api_status":"stable","version":"2.35.4"}}',
        )
      })

      describe('when the message is image', () => {
        it('marks the message with sended and log the success message', async () => {
          const contactRepository = dependencies.contactRepository
          const contact = await contactRepository.create(
            contactFactory.build({
              name: 'John Doe',
              talkingWithChatBot: true,
              licensee,
            }),
          )

          const messageRepository = dependencies.messageRepository
          const message = await messageRepository.create(
            messageFactory.build({
              _id: '60958703f415ed4008748637',
              text: 'Message to send',
              kind: 'file',
              url: 'https://octodex.github.com/images/dojocat.jpg',
              fileName: 'dojocat.jpg',
              contact,
              licensee,
              sended: false,
              messageWaId: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC44',
            }),
          )

          request.post.mockResolvedValueOnce({
            status: 200,
            data: {
              contacts: [{ input: '+5511990283745', status: 'valid', wa_id: '553165392832' }],
              meta: { api_status: 'stable', version: '2.35.4' },
            },
          })

          const expectedBodySendMessage = {
            recipient_type: 'individual',
            to: '553165392832',
            type: 'image',
            image: {
              link: 'https://octodex.github.com/images/dojocat.jpg',
            },
          }

          request.post.mockResolvedValueOnce({
            status: 201,
            data: {
              messages: [{ id: 'gBEGVUiZKQggAgkTPoDDlOljYHY' }],
              meta: { api_status: 'stable', version: '2.35.4' },
            },
          })

          expect(message.sended).toEqual(false)

          const dialog = new Dialog(licensee, dependencies)
          await dialog.sendMessage(message._id, 'https://waba-v2.360dialog.io/', 'token-dialog')
          const messageUpdated = await messageRepository.findFirst({ _id: message._id })
          expect(messageUpdated.sended).toEqual(true)
          expect(messageUpdated.messageWaId).toEqual('gBEGVUiZKQggAgkTPoDDlOljYHY')
          expect(logger.info).toHaveBeenCalledWith(
            'Mensagem 60958703f415ed4008748637 enviada para Dialog360 com sucesso! {"messages":[{"id":"gBEGVUiZKQggAgkTPoDDlOljYHY"}],"meta":{"api_status":"stable","version":"2.35.4"}}',
          )
        })
      })

      describe('when the message is video', () => {
        it('marks the message with sended and log the success message', async () => {
          const contactRepository = dependencies.contactRepository
          const contact = await contactRepository.create(
            contactFactory.build({
              name: 'John Doe',
              talkingWithChatBot: true,
              licensee,
            }),
          )

          const messageRepository = dependencies.messageRepository
          const message = await messageRepository.create(
            messageFactory.build({
              _id: '60958703f415ed4008748637',
              text: 'Message to send',
              kind: 'file',
              url: 'https://octodex.github.com/images/video.mpg',
              fileName: 'dojocat.jpg',
              contact,
              licensee,
              sended: false,
              messageWaId: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC44',
            }),
          )

          request.post.mockResolvedValueOnce({
            status: 200,
            data: {
              contacts: [{ input: '+5511990283745', status: 'valid', wa_id: '553165392832' }],
              meta: { api_status: 'stable', version: '2.35.4' },
            },
          })

          const expectedBodySendMessage = {
            recipient_type: 'individual',
            to: '553165392832',
            type: 'video',
            video: {
              link: 'https://octodex.github.com/images/video.mpg',
            },
          }

          request.post.mockResolvedValueOnce({
            status: 201,
            data: {
              messages: [{ id: 'gBEGVUiZKQggAgkTPoDDlOljYHY' }],
              meta: { api_status: 'stable', version: '2.35.4' },
            },
          })

          expect(message.sended).toEqual(false)

          const dialog = new Dialog(licensee, dependencies)
          await dialog.sendMessage(message._id, 'https://waba-v2.360dialog.io/', 'token-dialog')
          const messageUpdated = await messageRepository.findFirst({ _id: message._id })
          expect(messageUpdated.sended).toEqual(true)
          expect(messageUpdated.messageWaId).toEqual('gBEGVUiZKQggAgkTPoDDlOljYHY')
          expect(logger.info).toHaveBeenCalledWith(
            'Mensagem 60958703f415ed4008748637 enviada para Dialog360 com sucesso! {"messages":[{"id":"gBEGVUiZKQggAgkTPoDDlOljYHY"}],"meta":{"api_status":"stable","version":"2.35.4"}}',
          )
        })
      })

      describe('when the message is audio', () => {
        it('marks the message with sended and log the success message', async () => {
          const contactRepository = dependencies.contactRepository
          const contact = await contactRepository.create(
            contactFactory.build({
              name: 'John Doe',
              talkingWithChatBot: true,
              email: 'john@doe.com',
              licensee,
            }),
          )

          const messageRepository = dependencies.messageRepository
          const message = await messageRepository.create(
            messageFactory.build({
              _id: '60958703f415ed4008748637',
              text: 'Message to send',
              kind: 'file',
              url: 'https://octodex.github.com/images/message.ogg',
              fileName: 'message.ogg',
              contact,
              licensee,
              sended: false,
              messageWaId: 'ABEGVUiZKQggAhB1b33BM5Tk-yMHllM09TlC44',
            }),
          )

          request.post.mockResolvedValueOnce({
            status: 200,
            data: {
              contacts: [{ input: '+5511990283745', status: 'valid', wa_id: '553165392832' }],
              meta: { api_status: 'stable', version: '2.35.4' },
            },
          })

          const expectedBodySendMessage = {
            recipient_type: 'individual',
            to: '553165392832',
            type: 'audio',
            audio: {
              link: 'https://octodex.github.com/images/message.ogg',
            },
          }

          request.post.mockResolvedValueOnce({
            status: 201,
            data: {
              messages: [{ id: 'gBEGVUiZKQggAgkTPoDDlOljYHY' }],
              meta: { api_status: 'stable', version: '2.35.4' },
            },
          })

          expect(message.sended).toEqual(false)

          const dialog = new Dialog(licensee, dependencies)
          await dialog.sendMessage(message._id, 'https://waba-v2.360dialog.io/', 'token-dialog')
          const messageUpdated = await messageRepository.findFirst({ _id: message._id })
          expect(messageUpdated.sended).toEqual(true)
          expect(messageUpdated.messageWaId).toEqual('gBEGVUiZKQggAgkTPoDDlOljYHY')
          expect(logger.info).toHaveBeenCalledWith(
            'Mensagem 60958703f415ed4008748637 enviada para Dialog360 com sucesso! {"messages":[{"id":"gBEGVUiZKQggAgkTPoDDlOljYHY"}],"meta":{"api_status":"stable","version":"2.35.4"}}',
          )
        })
      })

      describe('when the message is document', () => {
        it('marks the message with sended and log the success message', async () => {
          const contactRepository = dependencies.contactRepository
          const contact = await contactRepository.create(
            contactFactory.build({
              name: 'John Doe',
              talkingWithChatBot: true,
              email: 'john@doe.com',
              licensee,
            }),
          )

          const messageRepository = dependencies.messageRepository
          const message = await messageRepository.create(
            messageFactory.build({
              _id: '60958703f415ed4008748637',
              text: 'Message to send',
              contact,
              licensee,
              sended: false,
              kind: 'file',
              url: 'https://octodex.github.com/images/document.pdf',
              fileName: 'document.pdf',
            }),
          )

          request.post.mockResolvedValueOnce({
            status: 200,
            data: {
              contacts: [{ input: '+5511990283745', status: 'valid', wa_id: '553165392832' }],
              meta: { api_status: 'stable', version: '2.35.4' },
            },
          })

          const expectedBodySendMessage = {
            recipient_type: 'individual',
            to: '553165392832',
            type: 'document',
            document: {
              link: 'https://octodex.github.com/images/document.pdf',
              filename: 'document.pdf',
            },
          }

          request.post.mockResolvedValueOnce({
            status: 201,
            data: {
              messages: [{ id: 'gBEGVUiZKQggAgkTPoDDlOljYHY' }],
              meta: { api_status: 'stable', version: '2.35.4' },
            },
          })

          expect(message.sended).toEqual(false)

          const dialog = new Dialog(licensee, dependencies)
          await dialog.sendMessage(message._id, 'https://waba-v2.360dialog.io/', 'token-dialog')
          const messageUpdated = await messageRepository.findFirst({ _id: message._id })
          expect(messageUpdated.sended).toEqual(true)
          expect(messageUpdated.messageWaId).toEqual('gBEGVUiZKQggAgkTPoDDlOljYHY')
          expect(logger.info).toHaveBeenCalledWith(
            'Mensagem 60958703f415ed4008748637 enviada para Dialog360 com sucesso! {"messages":[{"id":"gBEGVUiZKQggAgkTPoDDlOljYHY"}],"meta":{"api_status":"stable","version":"2.35.4"}}',
          )
        })
      })

      describe('when the message is interactive', () => {
        describe('if triggerKind is multi_product', () => {
          it('marks the message with sended and log the success message', async () => {
            const contactRepository = dependencies.contactRepository
            const contact = await contactRepository.create(
              contactFactory.build({
                name: 'John Doe',
                talkingWithChatBot: true,
                email: 'john@doe.com',
                licensee,
              }),
            )

            const trigger = await Trigger.create({
              ...triggerMultiProductFactory.build({ licensee }),
              catalogMulti: JSON.stringify({
                type: 'product_list',
                header: {
                  type: 'text',
                  text: 'Menu',
                },
                body: {
                  text: 'Itens',
                },
                footer: {
                  text: 'Selecione os itens desejados',
                },
                action: {
                  catalog_id: '889635565073049',
                  sections: [
                    {
                      title: 'Pizza',
                      product_items: [
                        {
                          product_retailer_id: '1010',
                        },
                        {
                          product_retailer_id: '1011',
                        },
                        {
                          product_retailer_id: '1021',
                        },
                      ],
                    },
                    {
                      title: 'Refrigerante',
                      product_items: [
                        {
                          product_retailer_id: '1016',
                        },
                      ],
                    },
                  ],
                },
              }),
            })

            const messageRepository = dependencies.messageRepository
            const message = await messageRepository.create(
              messageFactory.build({
                _id: '60958703f415ed4008748637',
                contact,
                licensee,
                sended: false,
                kind: 'interactive',
                trigger: trigger._id,
              }),
            )

            request.post.mockResolvedValueOnce({
              status: 200,
              data: {
                contacts: [{ input: '+5511990283745', status: 'valid', wa_id: '553165392832' }],
                meta: { api_status: 'stable', version: '2.35.4' },
              },
            })

            const expectedBodySendMessage = {
              recipient_type: 'individual',
              to: '553165392832',
              type: 'interactive',
              interactive: {
                type: 'product_list',
                header: {
                  type: 'text',
                  text: 'Menu',
                },
                body: {
                  text: 'Itens',
                },
                footer: {
                  text: 'Selecione os itens desejados',
                },
                action: {
                  catalog_id: '889635565073049',
                  sections: [
                    {
                      title: 'Pizza',
                      product_items: [
                        {
                          product_retailer_id: '1010',
                        },
                        {
                          product_retailer_id: '1011',
                        },
                        {
                          product_retailer_id: '1021',
                        },
                      ],
                    },
                    {
                      title: 'Refrigerante',
                      product_items: [
                        {
                          product_retailer_id: '1016',
                        },
                      ],
                    },
                  ],
                },
              },
            }

            request.post.mockResolvedValueOnce({
              status: 201,
              data: {
                messages: [{ id: 'gBEGVUiZKQggAgkTPoDDlOljYHY' }],
                meta: { api_status: 'stable', version: '2.35.4' },
              },
            })

            expect(message.sended).toEqual(false)

            const dialog = new Dialog(licensee, dependencies)
            await dialog.sendMessage(message._id, 'https://waba-v2.360dialog.io/', 'token-dialog')
            const messageUpdated = await messageRepository.findFirst({ _id: message._id })
            expect(messageUpdated.sended).toEqual(true)
            expect(messageUpdated.messageWaId).toEqual('gBEGVUiZKQggAgkTPoDDlOljYHY')
            expect(logger.info).toHaveBeenCalledWith(
              'Mensagem 60958703f415ed4008748637 enviada para Dialog360 com sucesso! {"messages":[{"id":"gBEGVUiZKQggAgkTPoDDlOljYHY"}],"meta":{"api_status":"stable","version":"2.35.4"}}',
            )
          })
        })

        describe('if triggerKind is single_product', () => {
          it('marks the message with sended and log the success message', async () => {
            const contactRepository = dependencies.contactRepository
            const contact = await contactRepository.create(
              contactFactory.build({
                name: 'John Doe',
                talkingWithChatBot: true,
                email: 'john@doe.com',
                licensee,
              }),
            )

            const trigger = await Trigger.create({
              ...triggerSingleProductFactory.build({ licensee }),
              catalogSingle: JSON.stringify({
                recipient_type: 'individual',
                to: '554899290820',
                type: 'interactive',
                interactive: {
                  type: 'product',
                  body: {
                    text: 'text-body-content',
                  },
                  footer: {
                    text: 'text-footer-content',
                  },
                  action: {
                    catalog_id: '889635565073049',
                    product_retailer_id: '1010',
                  },
                },
              }),
            })

            const messageRepository = dependencies.messageRepository
            const message = await messageRepository.create(
              messageFactory.build({
                _id: '60958703f415ed4008748637',
                contact,
                licensee,
                sended: false,
                kind: 'interactive',
                trigger: trigger._id,
              }),
            )

            request.post.mockResolvedValueOnce({
              status: 200,
              data: {
                contacts: [{ input: '+5511990283745', status: 'valid', wa_id: '553165392832' }],
                meta: { api_status: 'stable', version: '2.35.4' },
              },
            })

            const expectedBodySendMessage = {
              recipient_type: 'individual',
              to: '553165392832',
              type: 'interactive',
              interactive: {
                recipient_type: 'individual',
                to: '554899290820',
                type: 'interactive',
                interactive: {
                  type: 'product',
                  body: {
                    text: 'text-body-content',
                  },
                  footer: {
                    text: 'text-footer-content',
                  },
                  action: {
                    catalog_id: '889635565073049',
                    product_retailer_id: '1010',
                  },
                },
              },
            }

            request.post.mockResolvedValueOnce({
              status: 201,
              data: {
                messages: [{ id: 'gBEGVUiZKQggAgkTPoDDlOljYHY' }],
                meta: { api_status: 'stable', version: '2.35.4' },
              },
            })

            expect(message.sended).toEqual(false)

            const dialog = new Dialog(licensee, dependencies)
            await dialog.sendMessage(message._id, 'https://waba-v2.360dialog.io/', 'token-dialog')
            const messageUpdated = await messageRepository.findFirst({ _id: message._id })
            expect(messageUpdated.sended).toEqual(true)
            expect(messageUpdated.messageWaId).toEqual('gBEGVUiZKQggAgkTPoDDlOljYHY')
            expect(logger.info).toHaveBeenCalledWith(
              'Mensagem 60958703f415ed4008748637 enviada para Dialog360 com sucesso! {"messages":[{"id":"gBEGVUiZKQggAgkTPoDDlOljYHY"}],"meta":{"api_status":"stable","version":"2.35.4"}}',
            )
          })
        })

        describe('if triggerKind is reply_button', () => {
          it('marks the message with sended and log the success message', async () => {
            const contactRepository = dependencies.contactRepository
            const contact = await contactRepository.create(
              contactFactory.build({
                name: 'John Doe',
                talkingWithChatBot: true,
                email: 'john@doe.com',
                licensee,
              }),
            )

            const trigger = await Trigger.create({
              ...triggerReplyButtonFactory.build({ licensee }),
              textReplyButton: JSON.stringify({
                type: 'button',
                header: {
                  type: 'text',
                  text: 'Menu',
                },
                body: {
                  text: 'Itens',
                },
                footer: {
                  text: 'Selecione os itens desejados',
                },
                action: {
                  buttons: [
                    {
                      type: 'reply',
                      reply: {
                        id: 'resposta 1',
                        title: 'First Button Title',
                      },
                    },
                    {
                      type: 'reply',
                      reply: {
                        id: 'resposta 2',
                        title: 'Second Button Title',
                      },
                    },
                    {
                      type: 'reply',
                      reply: {
                        id: 'resposta 3',
                        title: 'Third Button Title',
                      },
                    },
                  ],
                },
              }),
            })

            const messageRepository = dependencies.messageRepository
            const message = await messageRepository.create(
              messageFactory.build({
                _id: '60958703f415ed4008748637',
                contact,
                licensee,
                sended: false,
                kind: 'interactive',
                trigger: trigger._id,
              }),
            )

            request.post.mockResolvedValueOnce({
              status: 200,
              data: {
                contacts: [{ input: '+5511990283745', status: 'valid', wa_id: '553165392832' }],
                meta: { api_status: 'stable', version: '2.35.4' },
              },
            })

            const expectedBodySendMessage = {
              recipient_type: 'individual',
              to: '553165392832',
              type: 'interactive',
              interactive: {
                type: 'button',
                header: {
                  type: 'text',
                  text: 'Menu',
                },
                body: {
                  text: 'Itens',
                },
                footer: {
                  text: 'Selecione os itens desejados',
                },
                action: {
                  buttons: [
                    {
                      type: 'reply',
                      reply: {
                        id: 'resposta 1',
                        title: 'First Button Title',
                      },
                    },
                    {
                      type: 'reply',
                      reply: {
                        id: 'resposta 2',
                        title: 'Second Button Title',
                      },
                    },
                    {
                      type: 'reply',
                      reply: {
                        id: 'resposta 3',
                        title: 'Third Button Title',
                      },
                    },
                  ],
                },
              },
            }

            request.post.mockResolvedValueOnce({
              status: 201,
              data: {
                messages: [{ id: 'gBEGVUiZKQggAgkTPoDDlOljYHY' }],
                meta: { api_status: 'stable', version: '2.35.4' },
              },
            })

            expect(message.sended).toEqual(false)

            const dialog = new Dialog(licensee, dependencies)
            await dialog.sendMessage(message._id, 'https://waba-v2.360dialog.io/', 'token-dialog')
            const messageUpdated = await messageRepository.findFirst({ _id: message._id })
            expect(messageUpdated.sended).toEqual(true)
            expect(messageUpdated.messageWaId).toEqual('gBEGVUiZKQggAgkTPoDDlOljYHY')
            expect(logger.info).toHaveBeenCalledWith(
              'Mensagem 60958703f415ed4008748637 enviada para Dialog360 com sucesso! {"messages":[{"id":"gBEGVUiZKQggAgkTPoDDlOljYHY"}],"meta":{"api_status":"stable","version":"2.35.4"}}',
            )
          })
        })

        describe('if triggerKind is list_message', () => {
          it('marks the message with sended and log the success message', async () => {
            const contactRepository = dependencies.contactRepository
            const contact = await contactRepository.create(
              contactFactory.build({
                name: 'John Doe',
                talkingWithChatBot: true,
                email: 'john@doe.com',
                licensee,
              }),
            )

            const trigger = await Trigger.create({
              ...triggerListMessageFactory.build({ licensee }),
              messagesList: JSON.stringify({
                type: 'list',
                header: {
                  type: 'text',
                  text: 'Menu',
                },
                body: {
                  text: 'Itens',
                },
                footer: {
                  text: 'Selecione os itens desejados',
                },
                action: {
                  button: 'cta-button-content',
                  sections: [
                    {
                      title: 'Opções',
                      rows: [
                        {
                          id: '1',
                          title: 'Opção 1',
                          description: 'Descrição 1',
                        },
                        {
                          id: '2',
                          title: 'Opção 2',
                          description: 'Descrição 2',
                        },
                        {
                          id: '3',
                          title: 'Opção 3',
                          description: 'Descrição 3',
                        },
                        {
                          id: '4',
                          title: 'Opção 4',
                          description: 'Descrição 4',
                        },
                      ],
                    },
                  ],
                },
              }),
            })

            const messageRepository = dependencies.messageRepository
            const message = await messageRepository.create(
              messageFactory.build({
                _id: '60958703f415ed4008748637',
                contact,
                licensee,
                sended: false,
                kind: 'interactive',
                trigger: trigger._id,
              }),
            )

            request.post.mockResolvedValueOnce({
              status: 200,
              data: {
                contacts: [{ input: '+5511990283745', status: 'valid', wa_id: '553165392832' }],
                meta: { api_status: 'stable', version: '2.35.4' },
              },
            })

            const expectedBodySendMessage = {
              recipient_type: 'individual',
              to: '553165392832',
              type: 'interactive',
              interactive: {
                type: 'list',
                header: {
                  type: 'text',
                  text: 'Menu',
                },
                body: {
                  text: 'Itens',
                },
                footer: {
                  text: 'Selecione os itens desejados',
                },
                action: {
                  button: 'cta-button-content',
                  sections: [
                    {
                      title: 'Opções',
                      rows: [
                        {
                          id: '1',
                          title: 'Opção 1',
                          description: 'Descrição 1',
                        },
                        {
                          id: '2',
                          title: 'Opção 2',
                          description: 'Descrição 2',
                        },
                        {
                          id: '3',
                          title: 'Opção 3',
                          description: 'Descrição 3',
                        },
                        {
                          id: '4',
                          title: 'Opção 4',
                          description: 'Descrição 4',
                        },
                      ],
                    },
                  ],
                },
              },
            }

            request.post.mockResolvedValueOnce({
              status: 201,
              data: {
                messages: [{ id: 'gBEGVUiZKQggAgkTPoDDlOljYHY' }],
                meta: { api_status: 'stable', version: '2.35.4' },
              },
            })

            expect(message.sended).toEqual(false)

            const dialog = new Dialog(licensee, dependencies)
            await dialog.sendMessage(message._id, 'https://waba-v2.360dialog.io/', 'token-dialog')
            const messageUpdated = await messageRepository.findFirst({ _id: message._id })
            expect(messageUpdated.sended).toEqual(true)
            expect(messageUpdated.messageWaId).toEqual('gBEGVUiZKQggAgkTPoDDlOljYHY')
            expect(logger.info).toHaveBeenCalledWith(
              'Mensagem 60958703f415ed4008748637 enviada para Dialog360 com sucesso! {"messages":[{"id":"gBEGVUiZKQggAgkTPoDDlOljYHY"}],"meta":{"api_status":"stable","version":"2.35.4"}}',
            )
          })
        })

        describe('if triggerKind is text', () => {
          it('marks the message with sended and log the success message', async () => {
            const contactRepository = dependencies.contactRepository
            const contact = await contactRepository.create(
              contactFactory.build({
                name: 'John Doe',
                talkingWithChatBot: true,
                email: 'john@doe.com',
                licensee,
              }),
            )

            const trigger = await Trigger.create({
              ...triggerTextFactory.build({ licensee }),
              text: 'Message normal with $contact_name',
            })

            const messageRepository = dependencies.messageRepository
            const message = await messageRepository.create(
              messageFactory.build({
                _id: '60958703f415ed4008748637',
                contact,
                licensee,
                sended: false,
                kind: 'interactive',
                trigger: trigger._id,
              }),
            )

            request.post.mockResolvedValueOnce({
              status: 200,
              data: {
                contacts: [{ input: '+5511990283745', status: 'valid', wa_id: '553165392832' }],
                meta: { api_status: 'stable', version: '2.35.4' },
              },
            })

            const expectedBodySendMessage = {
              recipient_type: 'individual',
              to: '553165392832',
              type: 'text',
              text: {
                body: 'Message normal with John Doe',
              },
            }

            request.post.mockResolvedValueOnce({
              status: 201,
              data: {
                messages: [{ id: 'gBEGVUiZKQggAgkTPoDDlOljYHY' }],
                meta: { api_status: 'stable', version: '2.35.4' },
              },
            })

            expect(message.sended).toEqual(false)

            const dialog = new Dialog(licensee, dependencies)
            await dialog.sendMessage(message._id, 'https://waba-v2.360dialog.io/', 'token-dialog')
            const messageUpdated = await messageRepository.findFirst({ _id: message._id })
            expect(messageUpdated.sended).toEqual(true)
            expect(messageUpdated.messageWaId).toEqual('gBEGVUiZKQggAgkTPoDDlOljYHY')
            expect(logger.info).toHaveBeenCalledWith(
              'Mensagem 60958703f415ed4008748637 enviada para Dialog360 com sucesso! {"messages":[{"id":"gBEGVUiZKQggAgkTPoDDlOljYHY"}],"meta":{"api_status":"stable","version":"2.35.4"}}',
            )
          })
        })

        describe('if does not has a trigger', () => {
          it('send the message as text', async () => {
            const contactRepository = dependencies.contactRepository
            const contact = await contactRepository.create(
              contactFactory.build({
                name: 'John Doe',
                talkingWithChatBot: true,
                email: 'john@doe.com',
                licensee,
              }),
            )

            const messageRepository = dependencies.messageRepository
            const message = await messageRepository.create(
              messageFactory.build({
                _id: '60958703f415ed4008748637',
                text: 'Hello World',
                contact,
                licensee,
                sended: false,
                kind: 'interactive',
              }),
            )

            const expectedBodyGetContact = {
              blocking: 'wait',
              contacts: ['+5511990283745'],
              force_check: true,
            }

            request.post.mockResolvedValueOnce({
              status: 200,
              data: {
                contacts: [{ input: '+5511990283745', status: 'valid', wa_id: '553165392832' }],
                meta: { api_status: 'stable', version: '2.35.4' },
              },
            })

            const expectedBodySendMessage = {
              recipient_type: 'individual',
              to: '553165392832',
              type: 'text',
              text: {
                body: 'Hello World',
              },
            }

            request.post.mockResolvedValueOnce({
              status: 201,
              data: {
                messages: [{ id: 'gBEGVUiZKQggAgkTPoDDlOljYHY' }],
                meta: { api_status: 'stable', version: '2.35.4' },
              },
            })

            expect(message.sended).toEqual(false)

            const dialog = new Dialog(licensee, dependencies)
            await dialog.sendMessage(message._id, 'https://waba-v2.360dialog.io/', 'token-dialog')
            const messageUpdated = await messageRepository.findFirst({ _id: message._id })
            expect(messageUpdated.sended).toEqual(true)
            expect(messageUpdated.messageWaId).toEqual('gBEGVUiZKQggAgkTPoDDlOljYHY')
            expect(logger.info).toHaveBeenCalledWith(
              'Mensagem 60958703f415ed4008748637 enviada para Dialog360 com sucesso! {"messages":[{"id":"gBEGVUiZKQggAgkTPoDDlOljYHY"}],"meta":{"api_status":"stable","version":"2.35.4"}}',
            )
          })
        })
      })

      describe('when the message is template', () => {
        it('marks the message with was sent and logs the success message', async () => {
          await Template.create(
            templateFactory.build({
              name: 'template-number-one',
              namespace: 'namespace',
              language: 'pt_BR',
              headerParams: [{ format: 'IMAGE' }],
              bodyParams: [
                { format: 'TEXT', number: '1' },
                { format: 'TEXT', number: '2' },
              ],
              footerParams: [{ format: 'TEXT', number: '1' }],
              licensee,
            }),
          )

          const contactRepository = dependencies.contactRepository
          const contact = await contactRepository.create(
            contactFactory.build({
              name: 'John Doe',
              talkingWithChatBot: true,
              licensee,
            }),
          )

          const messageRepository = dependencies.messageRepository
          const message = await messageRepository.create(
            messageFactory.build({
              _id: '60958703f415ed4008748637',
              kind: 'template',
              text: 'name {{template-number-one}} image {{https://image.url/image.png}} text {{1}}-{{Produto x}} obrigado {{John Doe}}',
              contact,
              licensee,
              sended: false,
            }),
          )

          request.post.mockResolvedValueOnce({
            status: 200,
            data: {
              contacts: [{ input: '+5511990283745', status: 'valid', wa_id: '553165392832' }],
              meta: { api_status: 'stable', version: '2.35.4' },
            },
          })

          const expectedBodySendMessage = {
            recipient_type: 'individual',
            to: '553165392832',
            type: 'template',
            template: {
              namespace: 'namespace',
              name: 'template-number-one',
              language: {
                code: 'pt_BR',
                policy: 'deterministic',
              },
              components: [
                {
                  type: 'header',
                  parameters: [
                    {
                      type: 'image',
                      image: {
                        link: 'https://image.url/image.png',
                      },
                    },
                  ],
                },
                {
                  type: 'body',
                  parameters: [
                    {
                      type: 'text',
                      text: '1',
                    },
                    {
                      type: 'text',
                      text: 'Produto x',
                    },
                  ],
                },
                {
                  type: 'footer',
                  parameters: [
                    {
                      type: 'text',
                      text: 'John Doe',
                    },
                  ],
                },
              ],
            },
          }

          request.post.mockResolvedValueOnce({
            status: 201,
            data: {
              messages: [{ id: 'gBEGVUiZKQggAgkTPoDDlOljYHY' }],
              meta: { api_status: 'stable', version: '2.35.4' },
            },
          })

          expect(message.sended).toEqual(false)

          const dialog = new Dialog(licensee, dependencies)
          await dialog.sendMessage(message._id, 'https://waba-v2.360dialog.io/', 'token-dialog')
          const messageUpdated = await messageRepository.findFirst({ _id: message._id })
          expect(messageUpdated.sended).toEqual(true)
          expect(messageUpdated.messageWaId).toEqual('gBEGVUiZKQggAgkTPoDDlOljYHY')
          expect(logger.info).toHaveBeenCalledWith(
            'Mensagem 60958703f415ed4008748637 enviada para Dialog360 com sucesso! {"messages":[{"id":"gBEGVUiZKQggAgkTPoDDlOljYHY"}],"meta":{"api_status":"stable","version":"2.35.4"}}',
          )
        })
      })
    })

    describe('when contact is invalid', () => {
      it('logs the error message', async () => {
        const contactRepository = dependencies.contactRepository
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            talkingWithChatBot: true,
            licensee,
          }),
        )

        const messageRepository = dependencies.messageRepository
        const message = await messageRepository.create(
          messageFactory.build({
            _id: '60958703f415ed4008748637',
            text: 'Message to send',
            contact,
            licensee,
            sended: false,
          }),
        )

        request.post.mockResolvedValueOnce({
          status: 200,
          data: {
            contacts: [{ input: '+5511990283745', status: 'invalid' }],
            meta: { api_status: 'stable', version: '2.35.4' },
          },
        })

        expect(message.sended).toEqual(false)

        const dialog = new Dialog(licensee, dependencies)
        await dialog.sendMessage(message._id, 'https://waba-v2.360dialog.io/', 'token-dialog')
        expect(logger.error).toHaveBeenCalledWith(
          'A mensagem não foi enviada para a Dialog pois o contato não é válido {"contacts":[{"input":"+5511990283745","status":"invalid"}],"meta":{"api_status":"stable","version":"2.35.4"}}',
        )
      })
    })

    describe('when can not send the message', () => {
      it('logs the error message', async () => {
        const contactRepository = dependencies.contactRepository
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            talkingWithChatBot: true,
            licensee,
          }),
        )

        const messageRepository = dependencies.messageRepository
        const message = await messageRepository.create(
          messageFactory.build({
            _id: '60958703f415ed4008748637',
            text: 'Message to send',
            contact,
            licensee,
            sended: false,
          }),
        )

        request.post.mockResolvedValueOnce({
          status: 200,
          data: {
            contacts: [{ input: '+5511990283745', status: 'valid', wa_id: '553165392832' }],
            meta: { api_status: 'stable', version: '2.35.4' },
          },
        })

        const expectedBodySendMessage = {
          recipient_type: 'individual',
          to: '553165392832',
          type: 'text',
          text: {
            body: 'Message to send',
          },
        }

        request.post.mockResolvedValueOnce({
          status: 400,
          data: {
            meta: { api_status: 'stable', version: '2.35.4' },
            errors: [{ code: 1021, title: 'Bad user', details: 'cannot send messages to myself' }],
          },
        })

        expect(message.sended).toEqual(false)

        const dialog = new Dialog(licensee, dependencies)
        await dialog.sendMessage(message._id, 'https://waba-v2.360dialog.io/', 'token-dialog')
        const messageUpdated = await messageRepository.findFirst({ _id: message._id })
        expect(messageUpdated.sended).toEqual(false)
        expect(messageUpdated.error).toEqual(
          '{"meta":{"api_status":"stable","version":"2.35.4"},"errors":[{"code":1021,"title":"Bad user","details":"cannot send messages to myself"}]}',
        )

        expect(logger.error).toHaveBeenCalledWith(
          'Mensagem 60958703f415ed4008748637 não enviada para Dialog360. {"meta":{"api_status":"stable","version":"2.35.4"},"errors":[{"code":1021,"title":"Bad user","details":"cannot send messages to myself"}]}',
        )
      })
    })
  })

  describe('#setWebhook', () => {
    it('config the webhook on dialog', async () => {
      const expectedBody = {
        url: `${licensee.urlWhatsappWebhook}`,
      }

      request.post.mockResolvedValueOnce({
        status: 200,
        data: {
          url: `${licensee.urlWhatsappWebhook}`,
        },
      })

      const dialog = new Dialog(licensee, dependencies)
      const setted = await dialog.setWebhook('https://waba.360dialog.io/', 'token-dialog')
      expect(setted).toEqual(true)
    })
  })

  describe('#searchTemplates', () => {
    it('returns the templates to licensee', async () => {
      request.get.mockResolvedValueOnce({
        status: 201,
        data: {
          count: 25,
          filters: {},
          limit: 1000,
          offset: 0,
          sort: ['id'],
          total: 25,
          waba_templates: [
            {
              category: 'TICKET_UPDATE',
              components: [
                {
                  format: 'IMAGE',
                  type: 'HEADER',
                },
                {
                  text: 'Tiket Anda untuk *{{1}}*\n*Waktu* - {{2}}\n*Tempat* - {{3}}\n*Kursi* - {{4}}',
                  type: 'BODY',
                },
                {
                  text: 'Pesan ini berasal dari bisnis yang tidak terverifikasi.',
                  type: 'FOOTER',
                },
              ],
              language: 'pt_BR',
              name: 'sample_movie_ticket_confirmation',
              namespace: '93aa6bf3_3bfc_4840_a76c_0f43073739e2',
              rejected_reason: 'NONE',
              status: 'approved',
            },
            {
              category: 'ISSUE_RESOLUTION',
              components: [
                {
                  format: 'DOCUMENT',
                  type: 'HEADER',
                },
                {
                  text: 'Ini merupakan konfirmasi penerbangan Anda untuk {{1}}-{{2}} di {{3}}.',
                  type: 'BODY',
                },
                {
                  text: 'This message is from an unverified business.',
                  type: 'FOOTER',
                },
              ],
              language: 'es',
              name: 'sample_purchase_feedback',
              namespace: '93aa6bf3_3bfc_4840_a76c_0f43073739e2',
              rejected_reason: 'NONE',
              status: 'approved',
            },
            {
              category: 'TICKET_UPDATE',
              components: [
                {
                  text: 'Ini merupakan konfirmasi penerbangan Anda untuk {{1}}-{{2}}.',
                  type: 'BODY',
                },
                {
                  text: 'This message is from an unverified business.',
                  type: 'FOOTER',
                },
              ],
              language: 'pt_BR',
              name: 'sample_purchase_feedback_2',
              namespace: '93aa6bf3_3bfc_4840_a76c_0f43073739e2',
              rejected_reason: 'Not aproval',
              status: 'rejected',
            },
          ],
        },
      })

      const dialog = new Dialog(licensee, dependencies)
      const templates = await dialog.searchTemplates('https://waba.360dialog.io/', 'token-dialog')
      expect(templates[0].name).toEqual('sample_movie_ticket_confirmation')
      expect(templates[0].namespace).toEqual('93aa6bf3_3bfc_4840_a76c_0f43073739e2')
      expect(templates[0].licensee).toEqual(licensee._id)
      expect(templates[0].language).toEqual('pt_BR')
      expect(templates[0].active).toEqual(true)
      expect(templates[0].category).toEqual('TICKET_UPDATE')
      expect(templates[0].headerParams[0].format).toEqual('IMAGE')
      expect(templates[0].bodyParams[0].format).toEqual('text')
      expect(templates[0].bodyParams[0].number).toEqual('1')
      expect(templates[0].bodyParams[1].format).toEqual('text')
      expect(templates[0].bodyParams[1].number).toEqual('2')
      expect(templates[0].bodyParams[2].format).toEqual('text')
      expect(templates[0].bodyParams[2].number).toEqual('3')
      expect(templates[0].bodyParams[3].format).toEqual('text')
      expect(templates[0].bodyParams[3].number).toEqual('4')
      expect(templates[0].footerParams.length).toEqual(0)

      expect(templates[1].name).toEqual('sample_purchase_feedback')
      expect(templates[1].namespace).toEqual('93aa6bf3_3bfc_4840_a76c_0f43073739e2')
      expect(templates[1].licensee).toEqual(licensee._id)
      expect(templates[1].language).toEqual('es')
      expect(templates[1].active).toEqual(true)
      expect(templates[1].category).toEqual('ISSUE_RESOLUTION')
      expect(templates[1].headerParams[0].format).toEqual('DOCUMENT')
      expect(templates[1].bodyParams[0].format).toEqual('text')
      expect(templates[1].bodyParams[0].number).toEqual('1')
      expect(templates[1].bodyParams[1].format).toEqual('text')
      expect(templates[1].bodyParams[1].number).toEqual('2')
      expect(templates[1].bodyParams[2].format).toEqual('text')
      expect(templates[1].bodyParams[2].number).toEqual('3')
      expect(templates[1].footerParams.length).toEqual(0)

      expect(templates[2].name).toEqual('sample_purchase_feedback_2')
      expect(templates[2].namespace).toEqual('93aa6bf3_3bfc_4840_a76c_0f43073739e2')
      expect(templates[2].licensee).toEqual(licensee._id)
      expect(templates[2].language).toEqual('pt_BR')
      expect(templates[2].active).toEqual(false)
      expect(templates[2].category).toEqual('TICKET_UPDATE')
      expect(templates[2].headerParams.length).toEqual(0)
      expect(templates[2].bodyParams[0].format).toEqual('text')
      expect(templates[2].bodyParams[0].number).toEqual('1')
      expect(templates[2].bodyParams[1].format).toEqual('text')
      expect(templates[2].bodyParams[1].number).toEqual('2')
      expect(templates[2].footerParams.length).toEqual(0)

      expect(templates.length).toEqual(3)
    })
  })

  describe('.action', () => {
    it('returns send-message-to-chat if message destination is to chat', () => {
      const dialog = new Dialog(licensee, dependencies)

      expect(dialog.action('to-chat')).toEqual('send-message-to-chat')
    })

    it('returns send-message-to-chatbot if message destination is to chatbot', () => {
      const dialog = new Dialog(licensee, dependencies)

      expect(dialog.action('to-chatbot')).toEqual('send-message-to-chatbot')
    })

    it('returns send-message-to-messenger if message destination is to messenger', () => {
      const dialog = new Dialog(licensee, dependencies)

      expect(dialog.action('to-messenger')).toEqual('send-message-to-messenger')
    })
  })
})
