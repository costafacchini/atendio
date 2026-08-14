import { resetChatbots } from './ResetChatbots'
import { installMemoryRepositories, resetMemoryRepositories } from '@repositories/testing'
import { licensee as licenseeFactory } from '@factories/licensee'
import { contact as contactFactory } from '@factories/contact'
import { message as messageFactory } from '@factories/message'
import { inbox as inboxFactory } from '@factories/inbox'
import { LicenseeRepositoryDatabase } from '@repositories/licensee'
import { InboxRepositoryDatabase } from '@repositories/inbox'
import { ContactRepositoryDatabase } from '@repositories/contact'
import { MessageRepositoryDatabase } from '@repositories/message'
import request from '../services/request'

jest.mock('../services/request')
jest.mock('../helpers/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() },
}))
import { createRuntimeDependencies } from '../runtime/dependencies'

let dependencies

describe('resetChatbots', () => {
  beforeEach(() => {
    installMemoryRepositories()
    dependencies = createRuntimeDependencies()
    jest.clearAllMocks()
  })

  afterEach(() => {
    resetMemoryRepositories()
  })

  describe('if licensees uses chatbot and contacts that talking with chatbot and the last message has destination to messenger and the sended a hour ago', () => {
    it('calls the drop conversation to reset chatbot', async () => {
      const licenseeRepository = new LicenseeRepositoryDatabase()
      const inboxRepository = new InboxRepositoryDatabase()
      const licensee = await licenseeRepository.create(
        licenseeFactory.build({
          chatbotDefault: 'landbot',
          chatbotUrl: 'https://landbot.url',
          chatbotAuthorizationToken: 'ljsdf12g',
          useChatbot: true,
          chatbotApiToken: 'api-token',
        }),
      )
      await inboxRepository.create(
        inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'dialog' }),
      )

      const contactRepository = new ContactRepositoryDatabase()
      const contact = await contactRepository.create(
        contactFactory.build({
          talkingWithChatBot: true,
          landbotId: 'landbot-id',
          licensee,
        }),
      )

      const messageRepository = new MessageRepositoryDatabase()
      await messageRepository.create(
        messageFactory.build({
          contact,
          licensee,
          destination: 'to-messenger',
          createdAt: new Date(2021, 6, 3, 0, 0, 0),
        }),
      )

      const contactThatMessageDoesNotCreatedInTimeLimit = await contactRepository.create(
        contactFactory.build({
          talkingWithChatBot: true,
          landbotId: 'landbot-id',
          licensee,
        }),
      )

      await messageRepository.create(
        messageFactory.build({
          contact: contactThatMessageDoesNotCreatedInTimeLimit,
          licensee,
          destination: 'to-messenger',
          createdAt: new Date(),
        }),
      )

      const contactThatMessageDoesNotSended = await contactRepository.create(
        contactFactory.build({
          talkingWithChatBot: true,
          landbotId: 'landbot-id',
          licensee,
        }),
      )

      await messageRepository.create(
        messageFactory.build({
          contact: contactThatMessageDoesNotSended,
          licensee,
          destination: 'to-messenger',
          sended: false,
          createdAt: new Date(2021, 6, 3, 0, 0, 0),
        }),
      )

      const contactThatNotTalkingWithChatbot = await contactRepository.create(
        contactFactory.build({
          talkingWithChatBot: false,
          landbotId: 'landbot-id',
          licensee,
        }),
      )

      await messageRepository.create(
        messageFactory.build({
          contact: contactThatNotTalkingWithChatbot,
          licensee,
          destination: 'to-messenger',
          sended: true,
          createdAt: new Date(2021, 6, 3, 0, 0, 0),
        }),
      )

      const contactWithoutLandbotId = await contactRepository.create(
        contactFactory.build({
          talkingWithChatBot: true,
          licensee,
        }),
      )

      await messageRepository.create(
        messageFactory.build({
          contact: contactWithoutLandbotId,
          licensee,
          destination: 'to-messenger',
          sended: true,
          createdAt: new Date(2021, 6, 3, 0, 0, 0),
        }),
      )

      const licenseeWhithoutChatbot = await licenseeRepository.create(
        licenseeFactory.build({
          chatbotDefault: 'landbot',
          chatbotUrl: 'https://landbot.url',
          chatbotAuthorizationToken: 'ljsdf12g',
          useChatbot: false,
          chatbotApiToken: 'api-token',
        }),
      )

      const contact2 = await contactRepository.create(
        contactFactory.build({
          talkingWithChatBot: true,
          landbotId: 'landbot-id',
          licensee: licenseeWhithoutChatbot,
        }),
      )

      await messageRepository.create(
        messageFactory.build({
          contact: contact2,
          licensee: licenseeWhithoutChatbot,
          destination: 'to-messenger',
          sended: true,
          createdAt: new Date(2021, 6, 3, 0, 0, 0),
        }),
      )

      const licenseeWithoutChatbotApiToken = await licenseeRepository.create(
        licenseeFactory.build({
          chatbotDefault: 'landbot',
          chatbotUrl: 'https://landbot.url',
          chatbotAuthorizationToken: 'ljsdf12g',
          useChatbot: true,
        }),
      )

      const contact3 = await contactRepository.create(
        contactFactory.build({
          talkingWithChatBot: true,
          landbotId: 'landbot-id',
          licensee: licenseeWithoutChatbotApiToken,
        }),
      )

      await messageRepository.create(
        messageFactory.build({
          contact: contact3,
          licensee: licenseeWithoutChatbotApiToken,
          destination: 'to-messenger',
          sended: true,
          createdAt: new Date(2021, 6, 3, 0, 0, 0),
        }),
      )

      request.delete.mockResolvedValue({
        status: 204,
        data: {},
      })

      expect(contact.landbotId).toEqual('landbot-id')

      await resetChatbots(dependencies)

      const contactChanged = await contactRepository.findFirst({ _id: contact._id })
      expect(contactChanged.landbotId).toEqual(null)

      const contactThatMessageDoesNotCreatedInTimeLimitChanged = await contactRepository.findFirst({
        _id: contactThatMessageDoesNotCreatedInTimeLimit._id,
      })
      expect(contactThatMessageDoesNotCreatedInTimeLimitChanged.landbotId).toEqual('landbot-id')

      const contactcontactThatMessageDoesNotSended = await contactRepository.findFirst({
        _id: contactThatMessageDoesNotSended._id,
      })
      expect(contactcontactThatMessageDoesNotSended.landbotId).toEqual('landbot-id')

      const contactThatNotTalkingWithChatbotChanged = await contactRepository.findFirst({
        _id: contactThatNotTalkingWithChatbot._id,
      })
      expect(contactThatNotTalkingWithChatbotChanged.landbotId).toEqual('landbot-id')

      const contact2NotChanged = await contactRepository.findFirst({ _id: contact2._id })
      expect(contact2NotChanged.landbotId).toEqual('landbot-id')

      const contact3NotChanged = await contactRepository.findFirst({ _id: contact3._id })
      expect(contact3NotChanged.landbotId).toEqual('landbot-id')
    })

    describe('when the licensee has a message on reset chatbot', () => {
      it('sends a message to the contact that the chatbot conversation has been closed', async () => {
        const licenseeRepository = new LicenseeRepositoryDatabase()
        const inboxRepository = new InboxRepositoryDatabase()
        const licensee = await licenseeRepository.create(
          licenseeFactory.build({
            chatbotDefault: 'landbot',
            chatbotUrl: 'https://landbot.url',
            chatbotAuthorizationToken: 'ljsdf12g',
            useChatbot: true,
            chatbotApiToken: 'api-token',
            messageOnResetChatbot: 'Encerrando',
          }),
        )
        await inboxRepository.create(
          inboxFactory.build({
            licensee: licensee._id,
            kind: 'messenger',
            whatsappDefault: 'utalk',
            whatsappToken: 'WTIgtlBwDk4kJNv7oMMderfTWihceFm2mI9K',
            whatsappUrl: 'https://v1.utalk.chat/send/',
          }),
        )

        const contactRepository = new ContactRepositoryDatabase()
        const contact = await contactRepository.create(
          contactFactory.build({
            talkingWithChatBot: true,
            landbotId: 'landbot-id',
            licensee,
          }),
        )

        const messageRepository = new MessageRepositoryDatabase()
        const message = await messageRepository.create(
          messageFactory.build({
            contact,
            licensee,
            destination: 'to-messenger',
            sended: true,
            createdAt: new Date(2021, 6, 3, 0, 0, 0),
          }),
        )

        request.delete.mockResolvedValueOnce({
          status: 204,
          data: {},
        })

        request.post.mockResolvedValueOnce({
          status: 200,
          data: {
            type: 'send message',
            cmd: 'chat',
            to: '5593165392832@c.us',
            servidor: 'res_utalk',
          },
        })

        await resetChatbots(dependencies)

        const messageUpdated = await messageRepository.findFirst({ _id: message._id })
        expect(messageUpdated.sended).toBe(true)
      })
    })
  })
})
