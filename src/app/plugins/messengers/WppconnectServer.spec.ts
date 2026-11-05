import { WppconnectServer } from './WppconnectServer'
import { installMemoryRepositories, resetMemoryRepositories } from '@repositories/testing'
import { licensee as licenseeFactory } from '@factories/licensee'
import { contact as contactFactory } from '@factories/contact'
import { message as messageFactory } from '@factories/message'
import { LicenseeRepositoryDatabase } from '@repositories/licensee'
import { ContactRepositoryDatabase } from '@repositories/contact'
import { MessageRepositoryDatabase } from '@repositories/message'
import request from '../../services/request'

jest.mock('uuid', () => ({ v4: () => '150bdb15-4c55-42ac-bc6c-970d620fdb6d' }))
jest.mock('../../services/request')
jest.mock('../../helpers/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() },
}))
import { createRuntimeDependencies } from '../../runtime/dependencies'
import { logger } from '../../helpers/logger'

let dependencies: any

describe('WppconnectServer plugin', () => {
  let licensee: any

  beforeEach(async () => {
    installMemoryRepositories()
    dependencies = createRuntimeDependencies()
    jest.clearAllMocks()
    const licenseeRepository = new LicenseeRepositoryDatabase()
    licensee = await licenseeRepository.create(licenseeFactory.build())
  })

  afterEach(() => {
    resetMemoryRepositories()
  })

  describe('#responseToMessages', () => {
    describe('when the contact does not exist', () => {
      it('registers the contact and returns the response body transformed in a message', async () => {
        const wppconnectServer = new WppconnectServer(licensee, dependencies)

        const responseBody = {
          event: 'onmessage',
          session: 'atendio-inbox-1',
          id: 'true_5511990283745@c.us_ABC123',
          from: '5511990283745@c.us',
          fromMe: false,
          type: 'chat',
          body: 'Olá, quero fazer um pedido!',
          notifyName: 'John Doe',
        }

        const messages = await wppconnectServer.responseToMessages(responseBody)

        expect(messages).toHaveLength(1)
        expect(messages[0]).toMatchObject({
          text: 'Olá, quero fazer um pedido!',
          kind: 'text',
          messageWaId: 'true_5511990283745@c.us_ABC123',
          destination: 'to-chat',
        })

        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.findFirst({ number: '5511990283745', licensee })
        expect(contact).toMatchObject({ name: 'John Doe', waId: '5511990283745@c.us' })
      })
    })

    describe('when the contact is talking with the chatbot', () => {
      it('returns the message with destination to-chatbot', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        await contactRepository.create(
          contactFactory.build({ name: 'John Doe', number: '5511990283745', talkingWithChatBot: true, licensee }),
        )

        const wppconnectServer = new WppconnectServer(licensee, dependencies)

        const messages = await wppconnectServer.responseToMessages({
          event: 'onmessage',
          id: 'msg-1',
          from: '5511990283745@c.us',
          fromMe: false,
          type: 'chat',
          body: 'Oi',
          notifyName: 'John Doe',
        })

        expect(messages[0]).toMatchObject({ destination: 'to-chatbot' })
      })
    })

    describe('when the message is from me', () => {
      it('returns empty messages', async () => {
        const wppconnectServer = new WppconnectServer(licensee, dependencies)

        const messages = await wppconnectServer.responseToMessages({
          event: 'onmessage',
          id: 'msg-1',
          from: '5511990283745@c.us',
          fromMe: true,
          type: 'chat',
          body: 'Oi',
        })

        expect(messages).toEqual([])
      })
    })

    describe('when the event is not onmessage', () => {
      it('returns empty messages', async () => {
        const wppconnectServer = new WppconnectServer(licensee, dependencies)

        const messages = await wppconnectServer.responseToMessages({ event: 'onack', id: 'msg-1' })

        expect(messages).toEqual([])
      })
    })

    describe('when the message type is not chat', () => {
      it('returns empty messages', async () => {
        const wppconnectServer = new WppconnectServer(licensee, dependencies)

        const messages = await wppconnectServer.responseToMessages({
          event: 'onmessage',
          id: 'msg-1',
          from: '5511990283745@c.us',
          fromMe: false,
          type: 'image',
        })

        expect(messages).toEqual([])
      })
    })
  })

  describe('#sendMessage', () => {
    describe('when the message was sent', () => {
      it('marks the message as sended', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({ name: 'John Doe', number: '5511990283745', type: '@c.us', licensee }),
        )

        const messageRepository = new MessageRepositoryDatabase()
        const message = await messageRepository.create(
          messageFactory.build({ text: 'Message to send', kind: 'text', contact, licensee, sended: false }),
        )

        ;(request.post as jest.Mock).mockResolvedValueOnce({
          status: 201,
          data: { status: 'success', response: [{ id: 'true_...@c.us' }], mapper: 'return' },
        })

        const wppconnectServer = new WppconnectServer(licensee, { ...dependencies, inbox: { _id: '1' } })
        await wppconnectServer.sendMessage(message._id, 'https://my-wppconnect-server.com', 'session-token')

        expect(request.post).toHaveBeenCalledWith('https://my-wppconnect-server.com/api/atendio-inbox-1/send-message', {
          headers: { Authorization: 'Bearer session-token' },
          body: { phone: ['5511990283745'], isGroup: false, message: 'Message to send' },
        })

        const messageUpdated = await messageRepository.findFirst({ _id: message._id })
        expect(messageUpdated.sended).toEqual(true)
      })
    })

    describe('when the contact is a group', () => {
      it('sends with isGroup true and the group id without suffix', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'Group',
            number: '120363012345678901',
            waId: '120363012345678901@g.us',
            licensee,
          }),
        )

        const messageRepository = new MessageRepositoryDatabase()
        const message = await messageRepository.create(
          messageFactory.build({ text: 'Hello group', kind: 'text', contact, licensee, sended: false }),
        )

        ;(request.post as jest.Mock).mockResolvedValueOnce({ status: 201, data: { status: 'success' } })

        const wppconnectServer = new WppconnectServer(licensee, { ...dependencies, inbox: { _id: '1' } })
        await wppconnectServer.sendMessage(message._id, 'https://my-wppconnect-server.com', 'session-token')

        expect(request.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ body: { phone: ['120363012345678901'], isGroup: true, message: 'Hello group' } }),
        )
      })
    })

    describe('when the external instance returns an error', () => {
      it('sets the message error', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({ name: 'John Doe', number: '5511990283745', licensee }),
        )

        const messageRepository = new MessageRepositoryDatabase()
        const message = await messageRepository.create(
          messageFactory.build({ text: 'Message to send', kind: 'text', contact, licensee, sended: false }),
        )

        ;(request.post as jest.Mock).mockResolvedValueOnce({
          status: 500,
          data: { status: 'Error', message: 'Erro ao enviar a mensagem.' },
        })

        const wppconnectServer = new WppconnectServer(licensee, { ...dependencies, inbox: { _id: '1' } })
        await wppconnectServer.sendMessage(message._id, 'https://my-wppconnect-server.com', 'session-token')

        const messageUpdated = await messageRepository.findFirst({ _id: message._id })
        expect(messageUpdated.sended).toEqual(false)
        expect(messageUpdated.error).toContain('Erro ao enviar a mensagem.')
        expect(logger.error).toHaveBeenCalled()
      })
    })

    describe('when the message kind is not text', () => {
      it('does not call the external instance', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(contactFactory.build({ licensee }))

        const messageRepository = new MessageRepositoryDatabase()
        const message = await messageRepository.create(
          messageFactory.build({ kind: 'file', contact, licensee, sended: false }),
        )

        const wppconnectServer = new WppconnectServer(licensee, { ...dependencies, inbox: { _id: '1' } })
        await wppconnectServer.sendMessage(message._id, 'https://my-wppconnect-server.com', 'session-token')

        expect(request.post).not.toHaveBeenCalled()
      })
    })
  })

  describe('#getQrCode', () => {
    it('starts the session and returns the pending qrcode', async () => {
      ;(request.post as jest.Mock).mockResolvedValueOnce({ status: 200, data: { status: 'CLOSED', qrcode: null } })
      ;(request.get as jest.Mock).mockResolvedValueOnce({
        status: 200,
        data: { status: 'QRCODE', qrcode: 'data:image/png;base64,abc123' },
      })

      const wppconnectServer = new WppconnectServer(licensee, { ...dependencies, inbox: { _id: '1' } })
      const qr = await wppconnectServer.getQrCode('https://my-wppconnect-server.com', 'session-token')

      expect(qr).toEqual('data:image/png;base64,abc123')
      expect(request.post).toHaveBeenCalledWith('https://my-wppconnect-server.com/api/atendio-inbox-1/start-session', {
        headers: { Authorization: 'Bearer session-token' },
        body: { waitQrCode: false },
      })
    })

    it('returns null when already connected', async () => {
      ;(request.post as jest.Mock).mockResolvedValueOnce({ status: 200, data: { status: 'CONNECTED' } })
      ;(request.get as jest.Mock).mockResolvedValueOnce({ status: 200, data: { status: 'CONNECTED', qrcode: null } })

      const wppconnectServer = new WppconnectServer(licensee, { ...dependencies, inbox: { _id: '1' } })
      const qr = await wppconnectServer.getQrCode('https://my-wppconnect-server.com', 'session-token')

      expect(qr).toBeNull()
    })
  })

  describe('#getConnectionStatus', () => {
    it('returns true when the external session status is CONNECTED', async () => {
      ;(request.get as jest.Mock).mockResolvedValueOnce({ status: 200, data: { status: 'CONNECTED' } })

      const wppconnectServer = new WppconnectServer(licensee, { ...dependencies, inbox: { _id: '1' } })
      const connected = await wppconnectServer.getConnectionStatus('https://my-wppconnect-server.com', 'session-token')

      expect(connected).toEqual(true)
    })

    it('returns false when the external session status is not CONNECTED', async () => {
      ;(request.get as jest.Mock).mockResolvedValueOnce({ status: 200, data: { status: 'CLOSED' } })

      const wppconnectServer = new WppconnectServer(licensee, { ...dependencies, inbox: { _id: '1' } })
      const connected = await wppconnectServer.getConnectionStatus('https://my-wppconnect-server.com', 'session-token')

      expect(connected).toEqual(false)
    })
  })

  describe('#action', () => {
    it('returns send-message-to-chat if message destination is to-chat', () => {
      const wppconnectServer = new WppconnectServer(licensee, dependencies)
      expect(wppconnectServer.action('to-chat')).toEqual('send-message-to-chat')
    })

    it('returns send-message-to-chatbot otherwise', () => {
      const wppconnectServer = new WppconnectServer(licensee, dependencies)
      expect(wppconnectServer.action('to-chatbot')).toEqual('send-message-to-chatbot')
    })
  })
})
