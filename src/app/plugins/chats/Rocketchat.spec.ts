import { Rocketchat } from './Rocketchat'
import Room from '@models/Room'
import Trigger from '@models/Trigger'
import { installMemoryRepositories, resetMemoryRepositories } from '@repositories/testing'
import { licensee as licenseeFactory } from '@factories/licensee'
import { contact as contactFactory } from '@factories/contact'
import { room as roomFactory } from '@factories/room'
import { message as messageFactory } from '@factories/message'
import { triggerReplyButton as triggerReplyButtonFactory } from '@factories/trigger'
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

let dependencies

describe('Rocketchat plugin', () => {
  let licensee
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

  describe('#responseToMessage', () => {
    it('returns the response body transformed in message', async () => {
      const contactRepository = new ContactRepositoryDatabase()
      const contact = await contactRepository.create(
        contactFactory.build({
          name: 'John Doe',
          talkingWithChatBot: true,
          licensee,
        }),
      )

      const room = await Room.create(
        roomFactory.build({
          roomId: '4sqv8qitNqhgLdvB4',
          contact,
        }),
      )

      const triggerOrder2 = await Trigger.create(triggerReplyButtonFactory.build({ licensee, order: 2 }))
      const trigger = await Trigger.create(triggerReplyButtonFactory.build({ licensee }))

      const responseBody = {
        _id: '4sqv8qitNqhgLdvB4',
        type: 'Message',
        messages: [
          {
            msg: 'Hello message',
          },
          {
            attachments: [
              {
                description: 'Message with image',
                title: 'dojocat.jpg',
              },
            ],
            fileUpload: {
              publicFilePath: 'https://octodex.github.com/images/dojocat.jpg',
            },
          },
          {
            msg: 'send_reply_buttons',
          },
          {
            msg: '{{name}}',
          },
        ],
      }

      const rocketchat = new Rocketchat(licensee, dependencies)
      const messages = await rocketchat.responseToMessages(responseBody)

      expect(messages.length).toEqual(5)

      expect(messages[0].licensee).toEqual(licensee._id)
      expect(messages[0].contact).toEqual(contact._id)
      expect(messages[0].room).toEqual(room._id)
      expect(messages[0].kind).toEqual('text')
      expect(messages[0].number).toEqual('150bdb15-4c55-42ac-bc6c-970d620fdb6d')
      expect(messages[0].destination).toEqual('to-messenger')
      expect(messages[0].text).toEqual('Hello message')
      expect(messages[0].trigger).toEqual(undefined)
      expect(messages[0].url).toEqual(undefined)
      expect(messages[0].fileName).toEqual(undefined)
      expect(messages[0].latitude).toEqual(undefined)
      expect(messages[0].longitude).toEqual(undefined)
      expect(messages[0].departament).toEqual(undefined)

      expect(messages[1].licensee).toEqual(licensee._id)
      expect(messages[1].contact).toEqual(contact._id)
      expect(messages[1].room).toEqual(room._id)
      expect(messages[1].kind).toEqual('file')
      expect(messages[1].number).toEqual('150bdb15-4c55-42ac-bc6c-970d620fdb6d')
      expect(messages[1].destination).toEqual('to-messenger')
      expect(messages[1].text).toEqual('Message with image')
      expect(messages[1].trigger).toEqual(undefined)
      expect(messages[1].url).toEqual('https://octodex.github.com/images/dojocat.jpg')
      expect(messages[1].fileName).toEqual('dojocat.jpg')
      expect(messages[1].latitude).toEqual(undefined)
      expect(messages[1].longitude).toEqual(undefined)
      expect(messages[1].departament).toEqual(undefined)

      expect(messages[2].licensee).toEqual(licensee._id)
      expect(messages[2].contact).toEqual(contact._id)
      expect(messages[2].room).toEqual(room._id)
      expect(messages[2].kind).toEqual('interactive')
      expect(messages[2].number).toEqual('150bdb15-4c55-42ac-bc6c-970d620fdb6d')
      expect(messages[2].destination).toEqual('to-messenger')
      expect(messages[2].text).toEqual('send_reply_buttons')
      expect(messages[2].trigger).toEqual(trigger._id)
      expect(messages[2].url).toEqual(undefined)
      expect(messages[2].fileName).toEqual(undefined)
      expect(messages[2].latitude).toEqual(undefined)
      expect(messages[2].longitude).toEqual(undefined)
      expect(messages[2].departament).toEqual(undefined)

      expect(messages[3].licensee).toEqual(licensee._id)
      expect(messages[3].contact).toEqual(contact._id)
      expect(messages[3].room).toEqual(room._id)
      expect(messages[3].kind).toEqual('interactive')
      expect(messages[3].number).toEqual('150bdb15-4c55-42ac-bc6c-970d620fdb6d')
      expect(messages[3].destination).toEqual('to-messenger')
      expect(messages[3].text).toEqual('send_reply_buttons')
      expect(messages[3].trigger).toEqual(triggerOrder2._id)
      expect(messages[3].url).toEqual(undefined)
      expect(messages[3].fileName).toEqual(undefined)
      expect(messages[3].latitude).toEqual(undefined)
      expect(messages[3].longitude).toEqual(undefined)
      expect(messages[3].departament).toEqual(undefined)

      expect(messages[4].kind).toEqual('template')
      expect(messages[4].text).toEqual('{{name}}')
    })

    it('return the empty data if body is blank', async () => {
      const responseBody = {}

      const rocketchat = new Rocketchat(licensee, dependencies)
      const messages = await rocketchat.responseToMessages(responseBody)

      expect(messages.length).toEqual(0)
    })

    it('return the empty data if room is not exists', async () => {
      const responseBody = {
        _id: '4sqv8qitNqhgLdvB4',
      }

      const rocketchat = new Rocketchat(licensee, dependencies)
      const messages = await rocketchat.responseToMessages(responseBody)

      expect(messages.length).toEqual(0)
    })

    describe('when the message is LivechatSession', () => {
      it('returns the response body transformed in message to close-chat', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            talkingWithChatBot: true,
            licensee,
          }),
        )

        const room = await Room.create(
          contactFactory.build({
            roomId: '4sqv8qitNqhgLdvB4',
            contact,
          }),
        )

        const responseBody = {
          _id: '4sqv8qitNqhgLdvB4',
          type: 'LivechatSession',
          messages: [
            {
              _id: 'ou4LGLFdsi8tynQb3',
              username: 'amanda',
              msg: 'Hello message',
            },
            {
              _id: 'ou4LGLFdsi8tynQb4',
              username: 'amanda',
              msg: ' Estou encerrando seu atendimento. Precisando de algo é só nos chamar novamente :) A Bennemann deseja a você um ótimo dia!',
              agentId: 'ZnTJu5mzqdDeaZKoo',
              closingMessage: true,
            },
          ],
        }

        const rocketchat = new Rocketchat(licensee, dependencies)
        const messages = await rocketchat.responseToMessages(responseBody)

        expect(messages[0].licensee).toEqual(licensee._id)
        expect(messages[0].contact).toEqual(contact._id)
        expect(messages[0].room).toEqual(room._id)
        expect(messages[0].kind).toEqual('text')
        expect(messages[0].number).toEqual('150bdb15-4c55-42ac-bc6c-970d620fdb6d')
        expect(messages[0].destination).toEqual('to-messenger')
        expect(messages[0].text).toEqual('Chat encerrado pelo agente')
        expect(messages[0].url).toEqual(undefined)
        expect(messages[0].fileName).toEqual(undefined)
        expect(messages[0].latitude).toEqual(undefined)
        expect(messages[0].longitude).toEqual(undefined)
        expect(messages[0].departament).toEqual(undefined)

        expect(messages.length).toEqual(1)
      })
    })
  })

  describe('#sendMessage', () => {
    describe('when response status is 200', () => {
      it('marks the message with sended', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            talkingWithChatBot: true,
            licensee,
          }),
        )

        const messageRepository = new MessageRepositoryDatabase()
        const message = await messageRepository.create(
          messageFactory.build({
            text: 'Message to send',
            contact,
            licensee,
            sended: false,
          }),
        )

        const expectedBodyVisitor = {
          visitor: {
            name: 'John Doe - 5511990283745 - WhatsApp',
            email: '5511990283745@c.us',
            token: `${contact._id.toString()}`,
          },
        }

        request.post.mockResolvedValueOnce({
          status: 200,
          data: {
            visitor: {
              _id: 'Z4pqikNyvjvwksYfE',
              username: 'guest-1208',
              ts: '2021-04-19T10:52:59.481Z',
              _updatedAt: '2021-04-19T10:52:59.483Z',
              name: 'John Doe - 5511990283745 - WhatsApp',
              token: `${contact._id.toString()}`,
              visitorEmails: [{ address: 'john@doe.com' }],
            },
            success: true,
          },
        })

        request.get.mockResolvedValueOnce({
          status: 200,
          data: {
            room: {
              _id: 'HNpDrzmTdJB4Z3TR8',
              msgs: 0,
              usersCount: 1,
              lm: '2021-04-19T10:51:04.027Z',
              fname: '5511990283745 - WhatsApp',
              t: 'l',
              ts: '2021-04-19T10:51:04.027Z',
              v: {
                _id: 'gwniTTrz84Lc9e7jH',
                username: 'guest-569',
                token: `${contact._id.toString()}`,
                status: 'online',
              },
              cl: false,
              open: true,
              waitingResponse: true,
              _updatedAt: '2021-04-19T10:51:04.027Z',
            },
            newRoom: true,
            success: true,
          },
        })

        const expectedBody = {
          token: `${contact._id.toString()}`,
          rid: 'HNpDrzmTdJB4Z3TR8',
          msg: 'Message to send',
        }

        request.post.mockResolvedValueOnce({
          status: 200,
          data: {
            message: {
              _id: 'ZNDvoAqpx6dKRTRHr',
              rid: 'HNpDrzmTdJB4Z3TR8',
              msg: 'message',
              token: `${contact._id.toString()}`,
              alias: 'John Doe - 5511990283745 - WhatsApp',
              ts: '2021-04-19T10:52:59.817Z',
              u: { _id: 'HNpDrzmTdJB4Z3TR8', username: 'guest-1208', name: 'John Doe - 5511990283745 - WhatsApp' },
              _updatedAt: '2021-04-19T10:52:59.905Z',
              mentions: [],
              channels: [],
            },
            success: true,
          },
        })

        expect(message.sended).toEqual(false)

        const rocketchat = new Rocketchat(licensee, dependencies)
        await rocketchat.sendMessage(message._id, 'https://rocket.com.br')
        const messageUpdated = await messageRepository.findFirst({ _id: message._id })
        expect(messageUpdated.sended).toEqual(true)
      })

      it('logs the success message', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            talkingWithChatBot: true,
            email: 'john@doe.com',
            licensee,
          }),
        )

        const messageRepository = new MessageRepositoryDatabase()
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
            visitor: {
              _id: 'Z4pqikNyvjvwksYfE',
              username: 'guest-1208',
              ts: '2021-04-19T10:52:59.481Z',
              _updatedAt: '2021-04-19T10:52:59.483Z',
              name: 'John Doe - 5511990283745 - WhatsApp',
              token: `${contact._id.toString()}`,
              visitorEmails: [{ address: 'john@doe.com' }],
            },
            success: true,
          },
        })

        request.get.mockResolvedValueOnce({
          status: 200,
          data: {
            room: {
              _id: 'HNpDrzmTdJB4Z3TR8',
              msgs: 0,
              usersCount: 1,
              lm: '2021-04-19T10:51:04.027Z',
              fname: '5511990283745 - WhatsApp',
              t: 'l',
              ts: '2021-04-19T10:51:04.027Z',
              v: {
                _id: 'gwniTTrz84Lc9e7jH',
                username: 'guest-569',
                token: `${contact._id.toString()}`,
                status: 'online',
              },
              cl: false,
              open: true,
              waitingResponse: true,
              _updatedAt: '2021-04-19T10:51:04.027Z',
            },
            newRoom: true,
            success: true,
          },
        })

        request.post.mockResolvedValueOnce({
          status: 200,
          data: {
            message: {
              _id: 'ZNDvoAqpx6dKRTRHr',
              rid: 'HNpDrzmTdJB4Z3TR8',
              msg: 'message',
              token: `${contact._id.toString()}`,
              alias: 'John Doe - 5511990283745 - WhatsApp',
              ts: '2021-04-19T10:52:59.817Z',
              u: { _id: 'HNpDrzmTdJB4Z3TR8', username: 'guest-1208', name: 'John Doe - 5511990283745 - WhatsApp' },
              _updatedAt: '2021-04-19T10:52:59.905Z',
              mentions: [],
              channels: [],
            },
            success: true,
          },
        })

        expect(message.sended).toEqual(false)

        const rocketchat = new Rocketchat(licensee, dependencies)
        await rocketchat.sendMessage(message._id, 'https://rocket.com.br')
        expect(logger.info).toHaveBeenCalledWith(
          'Mensagem 60958703f415ed4008748637 enviada para Rocketchat com sucesso!',
        )
      })

      describe('when message is for group', () => {
        it('send message formatted to group', async () => {
          const contactRepository = new ContactRepositoryDatabase()
          const contact = await contactRepository.create(
            contactFactory.build({
              name: 'Grupo Teste',
              number: '5511989187726-1622497000@g.us',
              type: '@g.us',
              talkingWithChatBot: true,
              email: 'john@doe.com',
              licensee,
            }),
          )

          const messageRepository = new MessageRepositoryDatabase()
          const message = await messageRepository.create(
            messageFactory.build({
              text: 'Message to send',
              contact,
              licensee,
              sended: false,
              senderName: 'John Doe',
            }),
          )

          request.post.mockResolvedValueOnce({
            status: 200,
            data: {
              visitor: {
                _id: 'Z4pqikNyvjvwksYfE',
                username: 'guest-1208',
                ts: '2021-04-19T10:52:59.481Z',
                _updatedAt: '2021-04-19T10:52:59.483Z',
                name: 'Grupo Teste - 5511989187726-1622497000 - WhatsApp',
                token: `${contact._id.toString()}`,
                visitorEmails: [{ address: 'john@doe.com' }],
              },
              success: true,
            },
          })

          request.get.mockResolvedValueOnce({
            status: 200,
            data: {
              room: {
                _id: 'HNpDrzmTdJB4Z3TR8',
                msgs: 0,
                usersCount: 1,
                lm: '2021-04-19T10:51:04.027Z',
                fname: '5511990283745 - WhatsApp',
                t: 'l',
                ts: '2021-04-19T10:51:04.027Z',
                v: {
                  _id: 'gwniTTrz84Lc9e7jH',
                  username: 'guest-569',
                  token: `${contact._id.toString()}`,
                  status: 'online',
                },
                cl: false,
                open: true,
                waitingResponse: true,
                _updatedAt: '2021-04-19T10:51:04.027Z',
              },
              newRoom: true,
              success: true,
            },
          })

          request.post.mockResolvedValueOnce({
            status: 200,
            data: {
              message: {
                _id: 'ZNDvoAqpx6dKRTRHr',
                rid: 'HNpDrzmTdJB4Z3TR8',
                msg: 'message',
                token: `${contact._id.toString()}`,
                alias: 'Grupo Teste - 5511989187726-1622497000 - WhatsApp',
                ts: '2021-04-19T10:52:59.817Z',
                u: {
                  _id: 'HNpDrzmTdJB4Z3TR8',
                  username: 'guest-1208',
                  name: 'Grupo Teste - 5511989187726-1622497000 - WhatsApp',
                },
                _updatedAt: '2021-04-19T10:52:59.905Z',
                mentions: [],
                channels: [],
              },
              success: true,
            },
          })

          expect(message.sended).toEqual(false)

          const rocketchat = new Rocketchat(licensee, dependencies)
          await rocketchat.sendMessage(message._id, 'https://rocket.com.br')
          const messageUpdated = await messageRepository.findFirst({ _id: message._id })
          expect(messageUpdated.sended).toEqual(true)
        })
      })

      describe('when the message has a department', () => {
        it('transfers to departament and send message', async () => {
          const contactRepository = new ContactRepositoryDatabase()
          const contact = await contactRepository.create(
            contactFactory.build({
              name: 'John Doe',
              talkingWithChatBot: true,
              licensee,
            }),
          )

          const messageRepository = new MessageRepositoryDatabase()
          const message = await messageRepository.create(
            messageFactory.build({
              text: 'Message to send',
              contact,
              licensee,
              sended: false,
              departament: 'department',
            }),
          )

          request.post.mockResolvedValueOnce({
            status: 200,
            data: {
              visitor: {
                _id: 'Z4pqikNyvjvwksYfE',
                username: 'guest-1208',
                ts: '2021-04-19T10:52:59.481Z',
                _updatedAt: '2021-04-19T10:52:59.483Z',
                name: 'John Doe - 5511990283745 - WhatsApp',
                token: `${contact._id.toString()}`,
                visitorEmails: [{ address: 'john@doe.com' }],
              },
              success: true,
            },
          })

          request.get.mockResolvedValueOnce({
            status: 200,
            data: {
              room: {
                _id: 'HNpDrzmTdJB4Z3TR8',
                msgs: 0,
                usersCount: 1,
                lm: '2021-04-19T10:51:04.027Z',
                fname: '5511990283745 - WhatsApp',
                t: 'l',
                ts: '2021-04-19T10:51:04.027Z',
                v: {
                  _id: 'gwniTTrz84Lc9e7jH',
                  username: 'guest-569',
                  token: `${contact._id.toString()}`,
                  status: 'online',
                },
                cl: false,
                open: true,
                waitingResponse: true,
                _updatedAt: '2021-04-19T10:51:04.027Z',
              },
              newRoom: true,
              success: true,
            },
          })

          request.post.mockResolvedValueOnce({
            status: 200,
            body: {
              message: {
                _id: 'ZNDvoAqpx6dKRTRHr',
                rid: 'HNpDrzmTdJB4Z3TR8',
                msg: 'message',
                token: `${contact._id.toString()}`,
                alias: 'John Doe - 5511990283745 - WhatsApp',
                ts: '2021-04-19T10:52:59.817Z',
                u: { _id: 'HNpDrzmTdJB4Z3TR8', username: 'guest-1208', name: 'John Doe - 5511990283745 - WhatsApp' },
                _updatedAt: '2021-04-19T10:52:59.905Z',
                mentions: [],
                channels: [],
              },
              success: true,
            },
          })

          request.post.mockResolvedValueOnce({
            status: 200,
            data: {
              message: {
                _id: 'ZNDvoAqpx6dKRTRHr',
                rid: 'HNpDrzmTdJB4Z3TR8',
                msg: 'message',
                token: `${contact._id.toString()}`,
                alias: 'John Doe - 5511990283745 - WhatsApp',
                ts: '2021-04-19T10:52:59.817Z',
                u: { _id: 'HNpDrzmTdJB4Z3TR8', username: 'guest-1208', name: 'John Doe - 5511990283745 - WhatsApp' },
                _updatedAt: '2021-04-19T10:52:59.905Z',
                mentions: [],
                channels: [],
              },
              success: true,
            },
          })

          expect(message.sended).toEqual(false)

          const rocketchat = new Rocketchat(licensee, dependencies)
          await rocketchat.sendMessage(message._id, 'https://rocket.com.br')
          const messageUpdated = await messageRepository.findFirst({ _id: message._id })
          expect(messageUpdated.sended).toEqual(true)
        })
      })

      describe('when message is file', () => {
        it('send message file', async () => {
          const contactRepository = new ContactRepositoryDatabase()
          const contact = await contactRepository.create(
            contactFactory.build({
              name: 'John Doe',
              talkingWithChatBot: true,
              email: 'john@doe.com',
              licensee,
            }),
          )

          const messageRepository = new MessageRepositoryDatabase()
          const message = await messageRepository.create(
            messageFactory.build({
              text: '',
              kind: 'file',
              url: 'https://file-url.com',
              fileName: 'file-url',
              contact,
              licensee,
              sended: false,
            }),
          )

          request.post.mockResolvedValueOnce({
            status: 200,
            data: {
              visitor: {
                _id: 'Z4pqikNyvjvwksYfE',
                username: 'guest-1208',
                ts: '2021-04-19T10:52:59.481Z',
                _updatedAt: '2021-04-19T10:52:59.483Z',
                name: 'John Doe - 5511990283745 - WhatsApp',
                token: `${contact._id.toString()}`,
                visitorEmails: [{ address: 'john@doe.com' }],
              },
              success: true,
            },
          })

          request.get.mockResolvedValueOnce({
            status: 200,
            data: {
              room: {
                _id: 'HNpDrzmTdJB4Z3TR8',
                msgs: 0,
                usersCount: 1,
                lm: '2021-04-19T10:51:04.027Z',
                fname: '5511990283745 - WhatsApp',
                t: 'l',
                ts: '2021-04-19T10:51:04.027Z',
                v: {
                  _id: 'gwniTTrz84Lc9e7jH',
                  username: 'guest-569',
                  token: `${contact._id.toString()}`,
                  status: 'online',
                },
                cl: false,
                open: true,
                waitingResponse: true,
                _updatedAt: '2021-04-19T10:51:04.027Z',
              },
              newRoom: true,
              success: true,
            },
          })

          const expectedBody = {
            token: `${contact._id.toString()}`,
            rid: 'HNpDrzmTdJB4Z3TR8',
            msg: 'https://file-url.com',
          }

          request.post.mockResolvedValueOnce({
            status: 200,
            data: {
              message: {
                _id: 'ZNDvoAqpx6dKRTRHr',
                rid: 'HNpDrzmTdJB4Z3TR8',
                msg: 'message',
                token: `${contact._id.toString()}`,
                alias: 'John Doe - 5511990283745 - WhatsApp',
                ts: '2021-04-19T10:52:59.817Z',
                u: { _id: 'HNpDrzmTdJB4Z3TR8', username: 'guest-1208', name: 'John Doe - 5511990283745 - WhatsApp' },
                _updatedAt: '2021-04-19T10:52:59.905Z',
                mentions: [],
                channels: [],
              },
              success: true,
            },
          })

          expect(message.sended).toEqual(false)

          const rocketchat = new Rocketchat(licensee, dependencies)
          await rocketchat.sendMessage(message._id, 'https://rocket.com.br')
          const messageUpdated = await messageRepository.findFirst({ _id: message._id })
          expect(messageUpdated.sended).toEqual(true)
        })
      })

      describe('when does not create visitor', () => {
        it('logs the error and does not send message', async () => {
          const contactRepository = new ContactRepositoryDatabase()
          const contact = await contactRepository.create(
            contactFactory.build({
              name: 'John Doe',
              email: 'john@doe.com',
              talkingWithChatBot: true,
              licensee,
            }),
          )

          const messageRepository = new MessageRepositoryDatabase()
          const message = await messageRepository.create(
            messageFactory.build({
              _id: '60958703f415ed4008748637',
              text: 'Message to send',
              contact,
              licensee,
              sended: false,
            }),
          )

          request.post.mockResolvedValueOnce({ status: 200, data: { success: false } })

          expect(message.sended).toEqual(false)

          const rocketchat = new Rocketchat(licensee, dependencies)
          await rocketchat.sendMessage(message._id, 'https://rocket.com.br')
          const messageUpdated = await messageRepository.findFirst({ _id: message._id })
          expect(messageUpdated.sended).toEqual(false)

          expect(logger.error).toHaveBeenCalledWith(
            'Não foi possível criar o visitante na Rocketchat {"success":false}',
          )
        })
      })

      describe('when does not create room', () => {
        it('logs the error and does not send message', async () => {
          const contactRepository = new ContactRepositoryDatabase()
          const contact = await contactRepository.create(
            contactFactory.build({
              name: 'John Doe',
              email: 'john@doe.com',
              talkingWithChatBot: true,
              licensee,
            }),
          )

          const messageRepository = new MessageRepositoryDatabase()
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
              visitor: {
                _id: 'Z4pqikNyvjvwksYfE',
                username: 'guest-1208',
                ts: '2021-04-19T10:52:59.481Z',
                _updatedAt: '2021-04-19T10:52:59.483Z',
                name: 'John Doe - 5511990283745 - WhatsApp',
                token: `${contact._id.toString()}`,
                visitorEmails: [{ address: 'john@doe.com' }],
              },
              success: true,
            },
          })

          request.get.mockResolvedValueOnce({
            status: 200,
            data: { success: false },
          })

          expect(message.sended).toEqual(false)

          const rocketchat = new Rocketchat(licensee, dependencies)
          await rocketchat.sendMessage(message._id, 'https://rocket.com.br')
          const messageUpdated = await messageRepository.findFirst({ _id: message._id })
          expect(messageUpdated.sended).toEqual(false)

          expect(logger.error).toHaveBeenCalledWith('Não foi possível criar a sala na Rocketchat {"success":false}')
        })
      })

      describe('when does not send message', () => {
        it('logs the error', async () => {
          const contactRepository = new ContactRepositoryDatabase()
          const contact = await contactRepository.create(
            contactFactory.build({
              name: 'John Doe',
              talkingWithChatBot: true,
              email: 'john@doe.com',
              licensee,
            }),
          )

          const messageRepository = new MessageRepositoryDatabase()
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
              visitor: {
                _id: 'Z4pqikNyvjvwksYfE',
                username: 'guest-1208',
                ts: '2021-04-19T10:52:59.481Z',
                _updatedAt: '2021-04-19T10:52:59.483Z',
                name: 'John Doe - 5511990283745 - WhatsApp',
                token: `${contact._id.toString()}`,
                visitorEmails: [{ address: 'john@doe.com' }],
              },
              success: true,
            },
          })

          request.get.mockResolvedValueOnce({
            status: 200,
            data: {
              room: {
                _id: 'HNpDrzmTdJB4Z3TR8',
                msgs: 0,
                usersCount: 1,
                lm: '2021-04-19T10:51:04.027Z',
                fname: '5511990283745 - WhatsApp',
                t: 'l',
                ts: '2021-04-19T10:51:04.027Z',
                v: {
                  _id: 'gwniTTrz84Lc9e7jH',
                  username: 'guest-569',
                  token: `${contact._id.toString()}`,
                  status: 'online',
                },
                cl: false,
                open: true,
                waitingResponse: true,
                _updatedAt: '2021-04-19T10:51:04.027Z',
              },
              newRoom: true,
              success: true,
            },
          })

          const expectedBody = {
            token: `${contact._id.toString()}`,
            rid: 'HNpDrzmTdJB4Z3TR8',
            msg: 'Message to send',
          }

          request.post.mockResolvedValueOnce({ status: 200, data: { success: false } })

          expect(message.sended).toEqual(false)

          const rocketchat = new Rocketchat(licensee, dependencies)
          await rocketchat.sendMessage(message._id, 'https://rocket.com.br')
          const messageUpdated = await messageRepository.findFirst({ _id: message._id })
          expect(messageUpdated.sended).toEqual(false)
          expect(messageUpdated.error).toEqual('{"success":false}')

          expect(logger.error).toHaveBeenCalledWith(
            'Mensagem 60958703f415ed4008748637 não enviada para a Rocketchat {"success":false}',
          )
        })

        it('close room and retry send message if error includes room-closed', async () => {
          const contactRepository = new ContactRepositoryDatabase()
          const contact = await contactRepository.create(
            contactFactory.build({
              name: 'John Doe',
              talkingWithChatBot: true,
              email: 'john@doe.com',
              licensee,
            }),
          )

          const room = await Room.create(
            roomFactory.build({
              roomId: 'room',
              token: contact._id.toString(),
              contact: contact,
            }),
          )

          const messageRepository = new MessageRepositoryDatabase()
          const message = await messageRepository.create(
            messageFactory.build({
              _id: '60958703f415ed4008748637',
              text: 'Message to send',
              contact,
              licensee,
              room,
              sended: false,
            }),
          )

          const expectedBody = {
            token: `${contact._id.toString()}`,
            rid: 'room',
            msg: 'Message to send',
          }

          request.post.mockResolvedValueOnce({ status: 200, data: { success: false, error: 'room-closed' } })

          request.post.mockResolvedValueOnce({
            status: 200,
            data: {
              visitor: {
                _id: 'Z4pqikNyvjvwksYfE',
                username: 'guest-1208',
                ts: '2021-04-19T10:52:59.481Z',
                _updatedAt: '2021-04-19T10:52:59.483Z',
                name: 'John Doe - 5511990283745 - WhatsApp',
                token: `${contact._id.toString()}`,
                visitorEmails: [{ address: 'john@doe.com' }],
              },
              success: true,
            },
          })

          request.get.mockResolvedValueOnce({
            status: 200,
            data: {
              room: {
                _id: 'HNpDrzmTdJB4Z3TR8',
                msgs: 0,
                usersCount: 1,
                lm: '2021-04-19T10:51:04.027Z',
                fname: '5511990283745 - WhatsApp',
                t: 'l',
                ts: '2021-04-19T10:51:04.027Z',
                v: {
                  _id: 'gwniTTrz84Lc9e7jH',
                  username: 'guest-569',
                  token: `${contact._id.toString()}`,
                  status: 'online',
                },
                cl: false,
                open: true,
                waitingResponse: true,
                _updatedAt: '2021-04-19T10:51:04.027Z',
              },
              newRoom: true,
              success: true,
            },
          })

          const expectedSecondBody = {
            token: `${contact._id.toString()}`,
            rid: 'HNpDrzmTdJB4Z3TR8',
            msg: 'Message to send',
          }

          request.post.mockResolvedValueOnce({
            status: 200,
            data: { success: true },
          })

          expect(message.sended).toEqual(false)

          const rocketchat = new Rocketchat(licensee, dependencies)
          await rocketchat.sendMessage(message._id, 'https://rocket.com.br')
          const messageUpdated = await messageRepository.findFirst({ _id: message._id }, ['room'])
          expect(messageUpdated.sended).toEqual(true)
          expect(messageUpdated.room).not.toEqual(room)

          const newRoom = await Room.findById(messageUpdated.room)
          expect(newRoom.closed).toEqual(false)

          const roomClosed = await Room.findById(room._id)
          expect(roomClosed.closed).toEqual(true)

          expect(logger.info).toHaveBeenCalledWith(
            'Mensagem 60958703f415ed4008748637 enviada para Rocketchat com sucesso!',
          )
        })
      })
    })
  })

  describe('#transfer', () => {
    it('changes the talking with chatbot in contact to false', async () => {
      jest.spyOn(Rocketchat.prototype, 'sendMessage').mockImplementation()

      const contactRepository = new ContactRepositoryDatabase()
      const contact = await contactRepository.create(
        contactFactory.build({
          name: 'John Doe',
          talkingWithChatBot: true,
          licensee,
        }),
      )

      const messageRepository = new MessageRepositoryDatabase()
      const message = await messageRepository.create(
        messageFactory.build({
          _id: '60958703f415ed4008748637',
          text: 'Message to send',
          contact,
          licensee,
          sended: false,
        }),
      )

      expect(contact.talkingWithChatBot).toEqual(true)

      const rocketchat = new Rocketchat(licensee, dependencies)
      await rocketchat.transfer(message._id, 'url')

      const modifiedContact = await contactRepository.findFirst({ _id: contact._id })
      expect(modifiedContact.talkingWithChatBot).toEqual(false)
    })

    it('sends message to chat', async () => {
      const sendMessageSpy = jest.spyOn(Rocketchat.prototype, 'sendMessage').mockImplementation()

      const contactRepository = new ContactRepositoryDatabase()
      const contact = await contactRepository.create(
        contactFactory.build({
          name: 'John Doe',
          talkingWithChatBot: true,
          licensee,
        }),
      )

      const messageRepository = new MessageRepositoryDatabase()
      const message = await messageRepository.create(
        messageFactory.build({
          _id: '60958703f415ed4008748637',
          text: 'Message to send',
          contact,
          licensee,
          sended: false,
        }),
      )

      const rocketchat = new Rocketchat(licensee, dependencies)
      await rocketchat.transfer(message._id.toString(), 'url')

      expect(sendMessageSpy).toHaveBeenCalledTimes(1)
      expect(sendMessageSpy).toHaveBeenCalledWith('60958703f415ed4008748637', 'url')
    })
  })

  describe('#closeChat', () => {
    it('closes the room', async () => {
      const contactRepository = new ContactRepositoryDatabase()
      const contact = await contactRepository.create(
        contactFactory.build({
          name: 'John Doe',
          talkingWithChatBot: false,
          licensee,
        }),
      )

      const room = await Room.create(
        roomFactory.build({
          roomId: 'ka3DiV9CuHD765',
          token: contact._id.toString(),
          contact: contact,
        }),
      )

      const messageRepository = new MessageRepositoryDatabase()
      const message = await messageRepository.create(
        messageFactory.build({
          _id: '60958703f415ed4008748637',
          text: 'Message to send',
          contact,
          licensee,
          room,
          sended: false,
        }),
      )

      expect(contact.talkingWithChatBot).toEqual(false)
      expect(room.roomId).toEqual('ka3DiV9CuHD765')
      expect(room.closed).toEqual(false)

      const rocketchat = new Rocketchat(licensee, dependencies)
      await rocketchat.closeChat(message._id)

      const modifiedRoom = await Room.findById(room._id)
      expect(modifiedRoom.roomId).toEqual('ka3DiV9CuHD765')
      expect(modifiedRoom.closed).toEqual(true)
    })

    describe('when the licensee use chatbot', () => {
      it('changes the talking with chatbot in contact to true', async () => {
        const licenseeRepository = new LicenseeRepositoryDatabase()
        const licensee = await licenseeRepository.create(
          licenseeFactory.build({
            useChatbot: true,
            chatbotDefault: 'landbot',
            chatbotUrl: 'https://url.com',
            chatbotAuthorizationToken: 'token',
          }),
        )

        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            talkingWithChatBot: false,
            licensee,
          }),
        )

        const room = await Room.create(
          roomFactory.build({
            roomId: 'ka3DiV9CuHD765',
            token: contact._id.toString(),
            contact: contact,
          }),
        )

        const messageRepository = new MessageRepositoryDatabase()
        const message = await messageRepository.create(
          messageFactory.build({
            _id: '60958703f415ed4008748637',
            text: 'Message to send',
            contact,
            licensee,
            room,
            sended: false,
          }),
        )

        expect(contact.talkingWithChatBot).toEqual(false)

        const rocketchat = new Rocketchat(licensee, dependencies)
        await rocketchat.closeChat(message._id)

        const modifiedContact = await contactRepository.findFirst({ _id: contact._id })
        expect(modifiedContact.talkingWithChatBot).toEqual(true)
      })
    })

    describe('when the licensee has a message on close chat', () => {
      it('creates the messages to send to messenger before close chat', async () => {
        const licenseeRepository = new LicenseeRepositoryDatabase()
        const licensee = await licenseeRepository.create(
          licenseeFactory.build({
            useChatbot: true,
            chatbotDefault: 'landbot',
            chatbotUrl: 'https://url.com',
            chatbotAuthorizationToken: 'token',
            messageOnCloseChat: 'Send on close chat',
          }),
        )

        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            talkingWithChatBot: false,
            licensee,
          }),
        )

        const room = await Room.create(
          roomFactory.build({
            roomId: 'ka3DiV9CuHD765',
            token: contact._id.toString(),
            contact: contact,
          }),
        )

        const messageRepository = new MessageRepositoryDatabase()
        const message = await messageRepository.create(
          messageFactory.build({
            _id: '60958703f415ed4008748637',
            text: 'Message to send',
            contact,
            licensee,
            room,
            sended: false,
          }),
        )

        expect(contact.talkingWithChatBot).toEqual(false)

        const rocketchat = new Rocketchat(licensee, dependencies)
        const messages = await rocketchat.closeChat(message._id)

        expect(messages.length).toEqual(1)
        expect(messages[0].text).toEqual('Send on close chat')
      })
    })
  })

  describe('#action', () => {
    it('returns "close-chat" if message type is "LivechatSession"', () => {
      const responseBody = {
        type: 'LivechatSession',
      }

      const rocketchat = new Rocketchat(licensee, dependencies)
      expect(rocketchat.action(responseBody)).toEqual('close-chat')
    })

    it('returns "close-chat" if message have a message with closingMessage attribute', () => {
      const responseBody = {
        type: 'Message',
        messages: [
          {
            msg: 'Hello message',
          },
          {
            closingMessage: true,
          },
        ],
      }

      const rocketchat = new Rocketchat(licensee, dependencies)
      expect(rocketchat.action(responseBody)).toEqual('close-chat')
    })

    it('returns "send-message-to-messenger" if message type is not "LivechatSession"', () => {
      const responseBody = {
        type: 'Message',
      }

      const rocketchat = new Rocketchat(licensee, dependencies)
      expect(rocketchat.action(responseBody)).toEqual('send-message-to-messenger')
    })
  })
})
