import { Chatwoot } from './Chatwoot'
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
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  },
}))
import { createRuntimeDependencies } from '../../runtime/dependencies'
import { logger } from '../../helpers/logger'

let dependencies

describe('Chatwoot plugin', () => {
  let licensee

  beforeEach(async () => {
    installMemoryRepositories()
    jest.clearAllMocks()

    const licenseeRepository = new LicenseeRepositoryDatabase()
    licensee = await licenseeRepository.create(licenseeFactory.build())

    const inbox = { chatIdentifier: 'inbox_123', chatKey: 'api_token_123', chatDefault: 'chatwoot' }
    dependencies = { ...createRuntimeDependencies(), inbox }
  })

  afterEach(() => {
    resetMemoryRepositories()
  })

  describe('#responseToMessages', () => {
    it('returns the response body transformed in messages', async () => {
      const contactRepository = new ContactRepositoryDatabase()
      const contact = await contactRepository.create(
        contactFactory.build({
          name: 'John Doe',
          chatwootId: 'contact_123',
          licensee,
        }),
      )

      const room = await Room.create(
        roomFactory.build({
          roomId: 'conversation_456',
          contact,
        }),
      )

      const responseBody = {
        event: 'message_created',
        message_type: 'outgoing',
        conversation: {
          id: 'conversation_456',
          contact_inbox: {
            contact_id: 'contact_123',
          },
          messages: [
            {
              content: 'Hello world',
              attachments: [],
            },
          ],
        },
      }

      const chatwoot = new Chatwoot(licensee, dependencies)
      const messages = await chatwoot.responseToMessages(responseBody)

      expect(messages[0].licensee).toEqual(licensee._id)
      expect(messages[0].contact).toEqual(contact._id)
      expect(messages[0].room).toEqual(room._id)
      expect(messages[0].kind).toEqual('text')
      expect(messages[0].number).toEqual('150bdb15-4c55-42ac-bc6c-970d620fdb6d')
      expect(messages[0].destination).toEqual('to-messenger')
      expect(messages[0].text).toEqual('Hello world')

      expect(messages.length).toEqual(1)
    })

    it('returns empty array if event is not message_created', async () => {
      const responseBody = {
        event: 'conversation_status_changed',
        message_type: 'outgoing',
        conversation: {
          id: 'conversation_456',
          messages: [],
        },
      }

      const chatwoot = new Chatwoot(licensee, dependencies)
      const messages = await chatwoot.responseToMessages(responseBody)

      expect(messages).toEqual([])
    })

    it('returns empty array if message_type is not outgoing', async () => {
      const responseBody = {
        event: 'message_created',
        message_type: 'incoming',
        conversation: {
          id: 'conversation_456',
          messages: [],
        },
      }

      const chatwoot = new Chatwoot(licensee, dependencies)
      const messages = await chatwoot.responseToMessages(responseBody)

      expect(messages).toEqual([])
    })

    it('returns empty array if contact is not found', async () => {
      const responseBody = {
        event: 'message_created',
        message_type: 'outgoing',
        conversation: {
          id: 'conversation_456',
          contact_inbox: {
            contact_id: 'non_existent_contact',
          },
          messages: [
            {
              content: 'Hello world',
              attachments: [],
            },
          ],
        },
      }

      const chatwoot = new Chatwoot(licensee, dependencies)
      const messages = await chatwoot.responseToMessages(responseBody)

      expect(messages).toEqual([])
    })

    it('resolves contact from meta.sender.id when contact_inbox.contact_id is absent', async () => {
      const contactRepository = new ContactRepositoryDatabase()
      const contact = await contactRepository.create(
        contactFactory.build({
          name: 'Juarez',
          chatwootId: 78059,
          licensee,
        }),
      )

      await Room.create(
        roomFactory.build({
          roomId: 396,
          contact,
        }),
      )

      const responseBody = {
        event: 'message_created',
        message_type: 'outgoing',
        content: 'Quem vai te atender é AMANDA TEODORO.',
        content_type: 'text',
        conversation: {
          id: 396,
          contact_inbox: {
            id: 82266,
            source_id: 'b3ceb73d-c4cc-47f7-a95e-d1cc4d6da0ef',
          },
          meta: {
            sender: {
              id: 78059,
              name: 'Juarez',
              type: 'contact',
            },
          },
          messages: [],
        },
      }

      const chatwoot = new Chatwoot(licensee, dependencies)
      const messages = await chatwoot.responseToMessages(responseBody)

      expect(messages.length).toEqual(1)
      expect(messages[0].contact).toEqual(contact._id)
      expect(messages[0].text).toEqual('Quem vai te atender é AMANDA TEODORO.')
    })

    it('returns empty array when contact_inbox.contact_id is absent and meta.sender is not a contact', async () => {
      const responseBody = {
        event: 'message_created',
        message_type: 'outgoing',
        conversation: {
          id: 'conversation_456',
          contact_inbox: {
            id: 82266,
            source_id: 'some-source-id',
          },
          meta: {
            sender: {
              id: 4,
              name: 'Jota - Assistente Virtual',
              type: 'user',
            },
          },
          messages: [],
        },
      }

      const chatwoot = new Chatwoot(licensee, dependencies)
      const messages = await chatwoot.responseToMessages(responseBody)

      expect(messages).toEqual([])
    })

    it('creates new room if room does not exist', async () => {
      const contactRepository = new ContactRepositoryDatabase()
      const contact = await contactRepository.create(
        contactFactory.build({
          name: 'John Doe',
          chatwootId: 'contact_123',
          licensee,
        }),
      )

      const responseBody = {
        event: 'message_created',
        message_type: 'outgoing',
        conversation: {
          id: 'new_conversation_789',
          contact_inbox: {
            contact_id: 'contact_123',
          },
          messages: [
            {
              content: 'Hello world',
              attachments: [],
            },
          ],
        },
      }

      const chatwoot = new Chatwoot(licensee, dependencies)
      const messages = await chatwoot.responseToMessages(responseBody)

      expect(messages).toEqual([])

      const newRoom = await Room.findOne({ roomId: 'new_conversation_789' })
      expect(newRoom).toBeTruthy()
      expect(newRoom.contact.toString()).toEqual(contact._id.toString())
    })

    it('returns close-chat message when conversation status is resolved', async () => {
      const contactRepository = new ContactRepositoryDatabase()
      const contact = await contactRepository.create(
        contactFactory.build({
          name: 'John Doe',
          chatwootId: 'contact_123',
          licensee,
        }),
      )

      const room = await Room.create(
        roomFactory.build({
          roomId: 'conversation_456',
          contact,
        }),
      )

      const responseBody = {
        event: 'conversation_status_changed',
        status: 'resolved',
        id: 'conversation_456',
        contact_inbox: {
          contact_id: 'contact_123',
        },
      }

      const chatwoot = new Chatwoot(licensee, dependencies)
      const messages = await chatwoot.responseToMessages(responseBody)

      expect(messages.length).toEqual(1)
      expect(messages[0].licensee).toEqual(licensee._id)
      expect(messages[0].contact).toEqual(contact._id)
      expect(messages[0].room).toEqual(room._id)
      expect(messages[0].kind).toEqual('text')
      expect(messages[0].number).toEqual('150bdb15-4c55-42ac-bc6c-970d620fdb6d')
      expect(messages[0].destination).toEqual('to-messenger')
      expect(messages[0].text).toEqual('Chat encerrado pelo agente')
    })

    describe('message types', () => {
      it('returns message from responseBody.content when content and content_type are present', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            chatwootId: 'contact_123',
            licensee,
          }),
        )

        await Room.create(
          roomFactory.build({
            roomId: 'conversation_456',
            contact,
          }),
        )

        const responseBody = {
          event: 'message_created',
          message_type: 'outgoing',
          content: 'Direct message from content',
          content_type: 'text',
          conversation: {
            id: 'conversation_456',
            contact_inbox: {
              contact_id: 'contact_123',
            },
            messages: [
              {
                content: 'This should be ignored',
                attachments: [],
              },
            ],
          },
        }

        const chatwoot = new Chatwoot(licensee, dependencies)
        const messages = await chatwoot.responseToMessages(responseBody)

        expect(messages.length).toEqual(1)
        expect(messages[0].kind).toEqual('text')
        expect(messages[0].text).toEqual('Direct message from content')
        expect(messages[0].text).not.toEqual('This should be ignored')
      })

      it('includes senderName when useSenderName is true and responseBody.content exists', async () => {
        const licenseeRepository = new LicenseeRepositoryDatabase()
        const licenseeWithSenderName = await licenseeRepository.create(
          licenseeFactory.build({ useSenderName: true }),
        )

        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            chatwootId: 'contact_123',
            licensee: licenseeWithSenderName,
          }),
        )

        await Room.create(
          roomFactory.build({
            roomId: 'conversation_456',
            contact,
          }),
        )

        const responseBody = {
          event: 'message_created',
          message_type: 'outgoing',
          content: 'Message with sender name',
          content_type: 'text',
          conversation: {
            id: 'conversation_456',
            contact_inbox: {
              contact_id: 'contact_123',
            },
            meta: {
              assignee: {
                available_name: 'Agent Smith',
              },
            },
            messages: [],
          },
        }

        const chatwoot = new Chatwoot(licenseeWithSenderName, dependencies)
        const messages = await chatwoot.responseToMessages(responseBody)

        expect(messages.length).toEqual(1)
        expect(messages[0].kind).toEqual('text')
        expect(messages[0].text).toEqual('Message with sender name')
        expect(messages[0].senderName).toEqual('Agent Smith')
      })

      it('does not include senderName when useSenderName is false and responseBody.content exists', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            chatwootId: 'contact_123',
            licensee,
          }),
        )

        await Room.create(
          roomFactory.build({
            roomId: 'conversation_456',
            contact,
          }),
        )

        const responseBody = {
          event: 'message_created',
          message_type: 'outgoing',
          content: 'Message without sender name',
          content_type: 'text',
          conversation: {
            id: 'conversation_456',
            contact_inbox: {
              contact_id: 'contact_123',
            },
            meta: {
              assignee: {
                available_name: 'Agent Smith',
              },
            },
            messages: [],
          },
        }

        const chatwoot = new Chatwoot(licensee, dependencies)
        const messages = await chatwoot.responseToMessages(responseBody)

        expect(messages.length).toEqual(1)
        expect(messages[0].kind).toEqual('text')
        expect(messages[0].text).toEqual('Message without sender name')
        expect(messages[0].senderName).toEqual(undefined)
      })

      it('returns messages with file data if message has attachments', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            chatwootId: 'contact_123',
            licensee,
          }),
        )

        await Room.create(
          roomFactory.build({
            roomId: 'conversation_456',
            contact,
          }),
        )

        const responseBody = {
          event: 'message_created',
          message_type: 'outgoing',
          conversation: {
            id: 'conversation_456',
            contact_inbox: {
              contact_id: 'contact_123',
            },
            messages: [
              {
                content: '',
                attachments: [
                  {
                    file_type: 'image/jpeg',
                    data_url: 'https://example.com/image.jpg',
                  },
                ],
              },
            ],
          },
        }

        const chatwoot = new Chatwoot(licensee, dependencies)
        const messages = await chatwoot.responseToMessages(responseBody)

        expect(messages[0].kind).toEqual('file')
        expect(messages[0].text).toEqual(undefined)
        expect(messages[0].url).toEqual('https://example.com/image.jpg')
        expect(messages[0].fileName).toEqual('image/jpeg')
      })

      it('returns messages with interactive data if text matches trigger expression', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            chatwootId: 'contact_123',
            licensee,
          }),
        )

        await Room.create(
          roomFactory.build({
            roomId: 'conversation_456',
            contact,
          }),
        )

        const trigger = await Trigger.create(
          triggerReplyButtonFactory.build({ licensee, expression: 'send_reply_buttons' }),
        )

        const responseBody = {
          event: 'message_created',
          message_type: 'outgoing',
          conversation: {
            id: 'conversation_456',
            contact_inbox: {
              contact_id: 'contact_123',
            },
            messages: [
              {
                content: 'send_reply_buttons',
                attachments: [],
              },
            ],
          },
        }

        const chatwoot = new Chatwoot(licensee, dependencies)
        const messages = await chatwoot.responseToMessages(responseBody)

        expect(messages[0].kind).toEqual('interactive')
        expect(messages[0].text).toEqual('send_reply_buttons')
        expect(messages[0].trigger).toEqual(trigger._id)
      })

      it('returns message of kind template if text contains {{ and }}', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            chatwootId: 'contact_123',
            licensee,
          }),
        )

        await Room.create(
          roomFactory.build({
            roomId: 'conversation_456',
            contact,
          }),
        )

        const responseBody = {
          event: 'message_created',
          message_type: 'outgoing',
          conversation: {
            id: 'conversation_456',
            contact_inbox: {
              contact_id: 'contact_123',
            },
            messages: [
              {
                content: '{{name}}',
                attachments: [],
              },
            ],
          },
        }

        const chatwoot = new Chatwoot(licensee, dependencies)
        const messages = await chatwoot.responseToMessages(responseBody)

        expect(messages[0].kind).toEqual('template')
        expect(messages[0].text).toEqual('{{name}}')
      })

      it('formats message for group contacts', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            chatwootId: 'contact_123',
            type: '@g.us',
            licensee,
          }),
        )

        await Room.create(
          roomFactory.build({
            roomId: 'conversation_456',
            contact,
          }),
        )

        const responseBody = {
          event: 'message_created',
          message_type: 'outgoing',
          conversation: {
            id: 'conversation_456',
            contact_inbox: {
              contact_id: 'contact_123',
            },
            messages: [
              {
                content: 'Hello group',
                attachments: [],
              },
            ],
          },
        }

        const chatwoot = new Chatwoot(licensee, dependencies)
        const messages = await chatwoot.responseToMessages(responseBody)

        expect(messages[0].text).toEqual('Hello group')
      })
    })
  })

  describe('#sendMessage', () => {
    describe('when contact has chatwootSourceId', () => {
      it('uses the injected room repository to create a conversation when no open room exists', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            chatwootSourceId: 'source_123',
            chatwootId: 'contact_123',
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

        const room = { roomId: 'new_conversation_789' }
        const roomRepository = {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(room),
        }

        request.post.mockResolvedValueOnce({
          status: 200,
          data: {
            id: 'new_conversation_789',
          },
        })

        const chatwoot = new Chatwoot(licensee, { ...dependencies, roomRepository })
        const postMessageSpy = jest.spyOn(chatwoot, 'postMessage').mockResolvedValue(true)

        await chatwoot.sendMessage(message._id, 'https://api.chatwoot.com/api/v1/')

        expect(roomRepository.findFirst).toHaveBeenCalledWith({
          contact: expect.objectContaining({ _id: contact._id }),
          closed: false,
        })
        expect(roomRepository.create).toHaveBeenCalledWith({
          roomId: 'new_conversation_789',
          contact: contact._id,
        })
        expect(postMessageSpy).toHaveBeenCalledWith(
          'https://api.chatwoot.com/api/v1/',
          expect.objectContaining({
            api_access_token: 'api_token_123',
            'Content-Type': 'application/json',
          }),
          expect.objectContaining({ _id: contact._id }),
          expect.objectContaining({ _id: message._id }),
          room,
        )
      })

      it('sends message to existing conversation', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            chatwootSourceId: 'source_123',
            licensee,
          }),
        )

        await Room.create(
          roomFactory.build({
            roomId: 'conversation_456',
            contact,
            closed: false,
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

        request.post.mockResolvedValue({
          status: 200,
          data: {
            id: 'conversation_id',
            error: false,
            success: true,
          },
        })

        const chatwoot = new Chatwoot(licensee, dependencies)
        await chatwoot.sendMessage(message._id, 'https://api.chatwoot.com/api/v1/')

        expect(request.post).toHaveBeenCalledWith(
          'https://api.chatwoot.com/api/v1/conversations/conversation_456/messages',
          expect.objectContaining({
            headers: expect.objectContaining({
              api_access_token: 'api_token_123',
            }),
          }),
        )
        expect(request.post).toHaveBeenCalledTimes(1)

        const messageUpdated = await messageRepository.findFirst({ _id: message._id })
        expect(messageUpdated.sended).toEqual(true)
        expect(messageUpdated.error).toBeUndefined()
        expect(messageUpdated.payload).toBe(
          JSON.stringify({
            id: 'conversation_id',
            error: false,
            success: true,
          }),
        )
        expect(messageUpdated.messageChatId).toEqual('conversation_id')
      })

      it('skips saving payload when Chatwoot response exceeds 1 MB', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            chatwootSourceId: 'source_123',
            licensee,
          }),
        )

        await Room.create(
          roomFactory.build({
            roomId: 'conversation_456',
            contact,
            closed: false,
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

        request.post.mockResolvedValue({
          status: 200,
          data: {
            id: 'conversation_id',
            history: 'x'.repeat(1_100_000),
          },
        })

        const chatwoot = new Chatwoot(licensee, dependencies)
        await chatwoot.sendMessage(message._id, 'https://api.chatwoot.com/api/v1/')

        const messageUpdated = await messageRepository.findFirst({ _id: message._id })
        expect(messageUpdated.sended).toEqual(true)
        expect(messageUpdated.messageChatId).toEqual('conversation_id')
        expect(messageUpdated.payload).toBeUndefined()
      })

      it('adds in_reply_to when sending file replies', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            chatwootSourceId: 'source_123',
            licensee,
          }),
        )

        await Room.create(
          roomFactory.build({
            roomId: 'conversation_456',
            contact,
            closed: false,
          }),
        )

        const messageRepository = new MessageRepositoryDatabase()
        await messageRepository.create(
          messageFactory.build({
            messageWaId: 'wamid-replied',
            messageChatId: 'chat-message-123',
            contact,
            licensee,
          }),
        )

        const message = await messageRepository.create(
          messageFactory.build({
            kind: 'file',
            url: 'http://example.com/file.pdf',
            fileName: 'file.pdf',
            contact,
            licensee,
            sended: false,
            replyMessageId: 'wamid-replied',
          }),
        )

        request.download.mockResolvedValue({
          data: Buffer.from('file-content'),
          headers: { get: () => 'application/pdf' },
        })

        request.post.mockResolvedValue({
          status: 200,
          data: {
            error: false,
            success: true,
          },
        })

        const chatwoot = new Chatwoot(licensee, dependencies)
        await chatwoot.sendMessage(message._id, 'https://api.chatwoot.com/api/v1/')

        expect(request.post).toHaveBeenCalledTimes(1)

        const multipartBody = request.post.mock.calls[0][1].body
        expect(Buffer.isBuffer(multipartBody)).toBe(true)

        const multipartString = multipartBody.toString()
        expect(multipartString).toContain('content_attributes')
        expect(multipartString).toContain('"in_reply_to":"chat-message-123"')

        const messageUpdated = await messageRepository.findFirst({ _id: message._id })
        expect(messageUpdated.sended).toEqual(true)
      })

      it('adds in_reply_to when sending text replies', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            chatwootSourceId: 'source_123',
            licensee,
          }),
        )

        await Room.create(
          roomFactory.build({
            roomId: 'conversation_456',
            contact,
            closed: false,
          }),
        )

        const messageRepository = new MessageRepositoryDatabase()
        await messageRepository.create(
          messageFactory.build({
            messageWaId: 'wamid-replied',
            messageChatId: 'chat-message-123',
            contact,
            licensee,
          }),
        )

        const message = await messageRepository.create(
          messageFactory.build({
            kind: 'text',
            text: 'message',
            contact,
            licensee,
            sended: false,
            replyMessageId: 'wamid-replied',
          }),
        )

        request.post.mockResolvedValue({
          status: 200,
          data: {
            error: false,
            success: true,
          },
        })

        const chatwoot = new Chatwoot(licensee, dependencies)
        await chatwoot.sendMessage(message._id, 'https://api.chatwoot.com/api/v1/')

        expect(request.post).toHaveBeenCalledTimes(1)

        const requestBody = request.post.mock.calls[0][1].body
        expect(requestBody).toMatchObject({
          content_attributes: { in_reply_to: 'chat-message-123' },
        })

        const messageUpdated = await messageRepository.findFirst({ _id: message._id })
        expect(messageUpdated.sended).toEqual(true)
      })

      it('creates new conversation if no open room exists', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            chatwootSourceId: 'source_123',
            chatwootId: 'contact_123',
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

        request.post
          .mockResolvedValueOnce({
            status: 200,
            data: {
              id: 'new_conversation_789',
            },
          })
          .mockResolvedValueOnce({
            status: 200,
            data: {
              error: false,
              success: true,
            },
          })

        const chatwoot = new Chatwoot(licensee, dependencies)
        await chatwoot.sendMessage(message._id, 'https://api.chatwoot.com/api/v1/')

        expect(request.post).toHaveBeenCalledTimes(2)
        expect(request.post).toHaveBeenNthCalledWith(
          1,
          'https://api.chatwoot.com/api/v1/conversations',
          expect.objectContaining({
            headers: expect.objectContaining({
              api_access_token: 'api_token_123',
            }),
          }),
        )
        expect(request.post).toHaveBeenNthCalledWith(
          2,
          'https://api.chatwoot.com/api/v1/conversations/new_conversation_789/messages',
          expect.objectContaining({
            headers: expect.objectContaining({
              api_access_token: 'api_token_123',
            }),
          }),
        )

        const messageUpdated = await messageRepository.findFirst({ _id: message._id })
        expect(messageUpdated.sended).toEqual(true)
      })
    })

    describe('when contact does not have chatwootSourceId', () => {
      it('searches for existing contact and updates it', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            number: '5511999999999',
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

        request.get.mockResolvedValueOnce({
          status: 200,
          data: {
            payload: [
              {
                id: 'contact_123',
                contact_inboxes: [
                  {
                    inbox: {
                      id: 'inbox_123',
                    },
                    source_id: 'source_123',
                  },
                ],
              },
            ],
          },
        })

        request.post
          .mockResolvedValueOnce({
            status: 200,
            data: {
              id: 'new_conversation_789',
            },
          })
          .mockResolvedValueOnce({
            status: 200,
            data: {
              error: false,
              success: true,
            },
          })

        const chatwoot = new Chatwoot(licensee, dependencies)
        await chatwoot.sendMessage(message._id, 'https://api.chatwoot.com/api/v1/')

        expect(request.get).toHaveBeenCalledTimes(1)
        expect(request.post).toHaveBeenCalledTimes(2)

        const contactUpdated = await contactRepository.findFirst({ _id: contact._id })
        expect(contactUpdated.chatwootId).toEqual('contact_123')
        expect(contactUpdated.chatwootSourceId).toEqual('source_123')

        const messageUpdated = await messageRepository.findFirst({ _id: message._id })
        expect(messageUpdated.sended).toEqual(true)
      })

      it('stores an error when it cannot find or create the contact in Chatwoot', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            number: '5511999999999',
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

        request.get.mockResolvedValueOnce({
          status: 200,
          data: {
            payload: [],
          },
        })

        request.post.mockResolvedValueOnce({
          status: 500,
          data: {},
        })

        const chatwoot = new Chatwoot(licensee, dependencies)
        await chatwoot.sendMessage(message._id, 'https://api.chatwoot.com/api/v1/')

        const messageUpdated = await messageRepository.findFirst({ _id: message._id })
        expect(messageUpdated.error).toEqual(
          'Chatwoot - erro: Não foi possível encontrar ou criar o contato na Chatwoot!',
        )
        expect(messageUpdated.sended).toEqual(false)
      })

      it('creates new contact if search returns no results', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            number: '5511999999999',
            email: 'john@example.com',
            address: 'Rua Teste',
            address_number: '123',
            address_complement: 'Apto 1',
            neighborhood: 'Centro',
            city: 'São Paulo',
            cep: '01234-567',
            uf: 'SP',
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

        // Mock contact search - no results
        request.get.mockResolvedValueOnce({
          status: 200,
          data: {
            payload: [],
          },
        })

        // Mock contact creation
        request.post.mockResolvedValueOnce({
          status: 200,
          data: {
            payload: {
              contact: {
                id: 'contact_123',
              },
              contact_inbox: {
                source_id: 'source_123',
              },
            },
          },
        })

        // Mock conversation creation
        request.post.mockResolvedValueOnce({
          status: 200,
          data: {
            id: 'new_conversation_789',
          },
        })

        // Mock message sending
        request.post.mockResolvedValueOnce({
          status: 200,
          data: {
            error: false,
            success: true,
          },
        })

        const chatwoot = new Chatwoot(licensee, dependencies)
        await chatwoot.sendMessage(message._id, 'https://api.chatwoot.com/api/v1/')

        expect(request.get).toHaveBeenCalledTimes(1)
        expect(request.post).toHaveBeenCalledTimes(3)

        const contactUpdated = await contactRepository.findFirst({ _id: contact._id })
        expect(contactUpdated.chatwootId).toEqual('contact_123')
        expect(contactUpdated.chatwootSourceId).toEqual('source_123')

        const messageUpdated = await messageRepository.findFirst({ _id: message._id })
        expect(messageUpdated.sended).toEqual(true)
      })
    })

    describe('message types', () => {
      it('sends file message with multipart form data', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            chatwootSourceId: 'source_123',
            licensee,
          }),
        )

        await Room.create(
          roomFactory.build({
            roomId: 'conversation_456',
            contact,
            closed: false,
          }),
        )

        const messageRepository = new MessageRepositoryDatabase()
        const message = await messageRepository.create(
          messageFactory.build({
            kind: 'file',
            fileName: 'file.pdf',
            url: 'https://example.com/file.pdf',
            contact,
            licensee,
            sended: false,
          }),
        )

        // Mock file download
        request.download.mockResolvedValueOnce({
          status: 200,
          data: Buffer.from('file content'),
          headers: {
            get: (name) => (name === 'content-type' ? 'application/pdf' : null),
          },
        })

        request.post.mockResolvedValueOnce({
          status: 200,
          data: {
            error: false,
            success: true,
          },
        })

        const chatwoot = new Chatwoot(licensee, dependencies)
        await chatwoot.sendMessage(message._id, 'https://api.chatwoot.com/api/v1/')

        expect(request.download).toHaveBeenCalledTimes(1)
        expect(request.post).toHaveBeenCalledTimes(1)

        const messageUpdated = await messageRepository.findFirst({ _id: message._id })
        expect(messageUpdated.sended).toEqual(true)
      })

      it('sends form message for other message types', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            chatwootSourceId: 'source_123',
            licensee,
          }),
        )

        await Room.create(
          roomFactory.build({
            roomId: 'conversation_456',
            contact,
            closed: false,
          }),
        )

        const messageRepository = new MessageRepositoryDatabase()
        const message = await messageRepository.create(
          messageFactory.build({
            kind: 'location',
            contact,
            licensee,
            sended: false,
          }),
        )

        request.post.mockResolvedValue({
          status: 200,
          data: {
            error: false,
            success: true,
          },
        })

        const chatwoot = new Chatwoot(licensee, dependencies)
        await chatwoot.sendMessage(message._id, 'https://api.chatwoot.com/api/v1/')

        expect(request.post).toHaveBeenCalledTimes(1)

        const messageUpdated = await messageRepository.findFirst({ _id: message._id })
        expect(messageUpdated.sended).toEqual(true)
      })
    })

    describe('error handling', () => {
      it('stores an error when conversation creation fails through the injected room repository path', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            chatwootSourceId: 'source_123',
            chatwootId: 'contact_123',
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

        const roomRepository = {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
        }

        request.post.mockResolvedValueOnce({
          status: 500,
          data: {
            error: true,
          },
        })

        const chatwoot = new Chatwoot(licensee, { ...dependencies, roomRepository })
        const postMessageSpy = jest.spyOn(chatwoot, 'postMessage')

        await chatwoot.sendMessage(message._id, 'https://api.chatwoot.com/api/v1/')

        expect(postMessageSpy).not.toHaveBeenCalled()

        const messageUpdated = await messageRepository.findFirst({ _id: message._id })
        expect(messageUpdated.error).toEqual(
          'Chatwoot - erro: Não foi possível criar a conversa na Chatwoot! Você vai encontrar mais detalhes nos logs do servidor.',
        )
        expect(messageUpdated.sended).toEqual(false)
      })

      it('closes the room through the injected repository when Chatwoot reports a missing resource', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            chatwootSourceId: 'source_123',
            chatwootId: 'contact_123',
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

        const room = await Room.create(
          roomFactory.build({
            roomId: 'conversation_456',
            contact,
            closed: false,
          }),
        )

        const roomRepository = {
          findFirst: jest.fn().mockResolvedValue(room),
          save: jest.fn().mockResolvedValue(room),
        }

        request.post.mockResolvedValue({
          status: 404,
          data: {
            error: 'Resource could not be found',
          },
        })

        const chatwoot = new Chatwoot(licensee, { ...dependencies, roomRepository })
        const sent = await chatwoot.postMessage(
          'https://api.chatwoot.com/api/v1/',
          { api_access_token: 'api_token_123', 'Content-Type': 'application/json' },
          contact,
          message,
          { roomId: room.roomId },
        )

        expect(sent).toEqual(false)
        expect(roomRepository.findFirst).toHaveBeenCalledWith({ roomId: room.roomId })
        expect(roomRepository.save).toHaveBeenCalledWith(expect.objectContaining({ _id: room._id, closed: true }))

        const contactUpdated = await contactRepository.findFirst({ _id: contact._id })
        expect(contactUpdated.chatwootSourceId).toEqual(undefined)
        expect(contactUpdated.chatwootId).toEqual(undefined)
      })

      it('retries with a recreated conversation when postMessage returns false', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            chatwootSourceId: 'source_123',
            chatwootId: 'contact_123',
            number: '5511999999999',
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

        const staleRoom = { roomId: 'stale_conversation_456' }
        const recreatedRoom = { roomId: 'recreated_conversation_789' }
        const roomRepository = {
          findFirst: jest.fn().mockResolvedValue(staleRoom),
          create: jest.fn().mockResolvedValue(recreatedRoom),
        }

        request.get.mockResolvedValueOnce({
          status: 200,
          data: {
            payload: [
              {
                id: 'contact_123',
                contact_inboxes: [
                  {
                    inbox: {
                      id: 'inbox_123',
                    },
                    source_id: 'source_456',
                  },
                ],
              },
            ],
          },
        })

        request.post.mockResolvedValueOnce({
          status: 200,
          data: {
            id: 'recreated_conversation_789',
          },
        })

        const chatwoot = new Chatwoot(licensee, { ...dependencies, roomRepository })
        const postMessageSpy = jest
          .spyOn(chatwoot, 'postMessage')
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(true)

        await chatwoot.sendMessage(message._id, 'https://api.chatwoot.com/api/v1/')

        expect(postMessageSpy).toHaveBeenCalledTimes(2)
        expect(roomRepository.create).toHaveBeenCalledWith({
          roomId: 'recreated_conversation_789',
          contact: contact._id,
        })
        expect(postMessageSpy).toHaveBeenLastCalledWith(
          'https://api.chatwoot.com/api/v1/',
          expect.objectContaining({
            api_access_token: 'api_token_123',
            'Content-Type': 'application/json',
          }),
          expect.objectContaining({ _id: contact._id }),
          expect.objectContaining({ _id: message._id }),
          recreatedRoom,
        )
      })

      it('logs error when message sending fails', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            chatwootSourceId: 'source_123',
            licensee,
          }),
        )

        await Room.create(
          roomFactory.build({
            roomId: 'conversation_456',
            contact,
            closed: false,
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

        request.post.mockResolvedValue({
          status: 400,
          data: {
            error: true,
            message: 'Invalid message',
          },
        })

        const chatwoot = new Chatwoot(licensee, dependencies)
        await chatwoot.sendMessage(message._id, 'https://api.chatwoot.com/api/v1/')

        expect(request.post).toHaveBeenCalledTimes(1)

        const messageUpdated = await messageRepository.findFirst({ _id: message._id })
        expect(messageUpdated.sended).toEqual(false)
        expect(messageUpdated.error).toEqual('mensagem: {"error":true,"message":"Invalid message"}')

        expect(logger.error).toHaveBeenCalledWith(
          `Chatwoot - erro: Mensagem 60958703f415ed4008748637 não enviada para Chatwoot.
           status: 400`,
        )
      })

      it('logs success message when message is sent successfully', async () => {
        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            name: 'John Doe',
            chatwootSourceId: 'source_123',
            licensee,
          }),
        )

        await Room.create(
          roomFactory.build({
            roomId: 'conversation_456',
            contact,
            closed: false,
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

        request.post.mockResolvedValue({
          status: 200,
          data: {
            error: false,
            success: true,
          },
        })

        const chatwoot = new Chatwoot(licensee, dependencies)
        await chatwoot.sendMessage(message._id, 'https://api.chatwoot.com/api/v1/')

        expect(request.post).toHaveBeenCalledTimes(1)

        expect(logger.info).toHaveBeenCalledWith(
          'Chatwoot: Mensagem 60958703f415ed4008748637 enviada para Chatwoot com sucesso!',
        )
      })
    })
  })

  describe('#transfer', () => {
    it('changes talkingWithChatBot to false and sends message', async () => {
      const sendMessageSpy = jest.spyOn(Chatwoot.prototype, 'sendMessage').mockImplementation(async () => {})

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

      const chatwoot = new Chatwoot(licensee, dependencies)
      await chatwoot.transfer(message._id, 'https://api.chatwoot.com/api/v1/')

      const modifiedContact = await contactRepository.findFirst({ _id: contact._id })
      expect(modifiedContact.talkingWithChatBot).toEqual(false)

      expect(sendMessageSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('#closeChat', () => {
    describe('when licensee uses chatbot', () => {
      it('changes talkingWithChatBot to true', async () => {
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
            roomId: 'conversation_456',
            contact,
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

        const chatwoot = new Chatwoot(licensee, dependencies)
        const messages = await chatwoot.closeChat(message._id)

        const modifiedContact = await contactRepository.findFirst({ _id: contact._id })
        expect(modifiedContact.talkingWithChatBot).toEqual(true)

        expect(messages.length).toEqual(0)
      })
    })

    describe('when licensee has messageOnCloseChat', () => {
      it('creates messages to send before closing chat', async () => {
        const licenseeRepository = new LicenseeRepositoryDatabase()
        const licensee = await licenseeRepository.create(
          licenseeFactory.build({
            useChatbot: true,
            chatbotDefault: 'landbot',
            chatbotUrl: 'https://url.com',
            chatbotAuthorizationToken: 'token',
            messageOnCloseChat: 'Chat closed message',
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
            roomId: 'conversation_456',
            contact,
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

        const chatwoot = new Chatwoot(licensee, dependencies)
        const messages = await chatwoot.closeChat(message._id)

        const modifiedContact = await contactRepository.findFirst({ _id: contact._id })
        expect(modifiedContact.talkingWithChatBot).toEqual(true)

        expect(messages.length).toEqual(1)
        expect(messages[0].text).toEqual('Chat closed message')
        expect(messages[0].kind).toEqual('text')
        expect(messages[0].destination).toEqual('to-messenger')
      })
    })
  })

  describe('#action', () => {
    it('returns "close-chat" when conversation status is resolved', () => {
      const responseBody = {
        event: 'conversation_status_changed',
        status: 'resolved',
      }

      const chatwoot = new Chatwoot(licensee, dependencies)
      expect(chatwoot.action(responseBody)).toEqual('close-chat')
    })

    it('returns "send-message-to-messenger" for other events', () => {
      const responseBody = {
        event: 'message_created',
        message_type: 'outgoing',
      }

      const chatwoot = new Chatwoot(licensee, dependencies)
      expect(chatwoot.action(responseBody)).toEqual('send-message-to-messenger')
    })
  })
})
