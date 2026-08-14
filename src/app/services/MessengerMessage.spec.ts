jest.mock('../../config/queue', () => ({ queueServer: {} }))
jest.mock('../../config/redis', () => ({ redisConnection: { duplicate: jest.fn().mockReturnValue({}) } }))

import { generateObjectId } from '@repositories/repository'
import { transformMessengerBody } from './MessengerMessage'
import Body from '@models/Body'
import { Dialog } from '../plugins/messengers/Dialog'
import { installMemoryRepositories, resetMemoryRepositories } from '@repositories/testing'
import { licensee as licenseeFactory } from '@factories/licensee'
import { body as bodyFactory } from '@factories/body'
import { inbox as inboxFactory } from '@factories/inbox'
import { LicenseeRepositoryDatabase } from '@repositories/licensee'
import { InboxRepositoryDatabase } from '@repositories/inbox'
import { createRuntimeDependencies } from '../runtime/dependencies'

let dependencies

describe('transformMessengerBody', () => {
  let licensee
  let inbox

  beforeEach(async () => {
    installMemoryRepositories()
    dependencies = createRuntimeDependencies()
    jest.clearAllMocks()

    const licenseeRepository = new LicenseeRepositoryDatabase()
    licensee = await licenseeRepository.create(
      licenseeFactory.build({
        chatbotUrl: 'https://whatsapp.url',
        chatbotAuthorizationToken: 'ljsdf12g',
      }),
    )

    const inboxRepository = new InboxRepositoryDatabase()
    inbox = await inboxRepository.create(
      inboxFactory.build({
        licensee: licensee._id,
        kind: 'messenger',
        whatsappDefault: 'dialog',
        whatsappUrl: 'https://waba.360dialog.io/',
        whatsappToken: 'bshg25f',
        chatUrl: 'https://chat.url',
      }),
    )
  })

  afterEach(() => {
    resetMemoryRepositories()
  })

  it('responds with action to send message to chat and chatbot and update body', async () => {
    const messengerPluginResponseToMessages = jest
      .spyOn(Dialog.prototype, 'responseToMessages')
      .mockImplementation(() => {
        return [
          { _id: 'KSDF656DSD91NSE', destination: 'to-chatbot', contact: { _id: 'id-contact-1' } },
          { _id: 'OAR8Q54LDN02T', destination: 'to-chat', contact: { _id: 'id-contact-2' } },
          { _id: 'OAR8Q54743HGD', destination: 'to-messenger', contact: { _id: 'id-contact-3' } },
        ]
      })

    const body = await Body.create(
      bodyFactory.build({
        content: {
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
        },
        licensee,
        inbox: inbox._id,
        concluded: false,
      }),
    )

    const data = {
      bodyId: body._id,
    }

    const actions = await transformMessengerBody(data, dependencies)

    expect(messengerPluginResponseToMessages).toHaveBeenCalledWith(body.content, { departmentId: null })

    const bodyUpdated = await Body.findById(body._id)
    expect(bodyUpdated.concluded).toEqual(true)

    expect(actions.length).toEqual(3)

    expect(actions[0].action).toEqual('send-message-to-chatbot')
    expect(actions[0].body).toEqual({
      messageId: 'KSDF656DSD91NSE',
      licenseeId: licensee._id,
      contactId: 'id-contact-1',
      url: 'https://whatsapp.url',
      token: 'ljsdf12g',
    })

    expect(actions[1].action).toEqual('send-message-to-chat')
    expect(actions[1].body).toEqual({
      messageId: 'OAR8Q54LDN02T',
      licenseeId: licensee._id,
      contactId: 'id-contact-2',
      url: 'https://chat.url',
      token: '',
    })

    expect(actions[2].action).toEqual('send-message-to-messenger')
    expect(actions[2].body).toEqual({
      messageId: 'OAR8Q54743HGD',
      licenseeId: licensee._id,
      contactId: 'id-contact-3',
      url: 'https://waba.360dialog.io/',
      token: 'bshg25f',
    })
  })

  it('passes departmentId extracted from body to responseToMessages', async () => {
    const departmentObjectId = generateObjectId()

    const messengerPluginResponseToMessages = jest
      .spyOn(Dialog.prototype, 'responseToMessages')
      .mockImplementation(() => {
        return []
      })

    const body = await Body.create(
      bodyFactory.build({
        content: { message: { type: 'text' } },
        licensee,
        inbox: inbox._id,
        concluded: false,
        department: departmentObjectId,
      }),
    )

    await transformMessengerBody({ bodyId: body._id }, dependencies)

    expect(messengerPluginResponseToMessages).toHaveBeenCalledWith(body.content, {
      departmentId: departmentObjectId,
    })
  })

  it('returns empty actions when body has no linked inbox', async () => {
    const messengerPluginResponseToMessages = jest
      .spyOn(Dialog.prototype, 'responseToMessages')
      .mockImplementation(() => [])

    const body = await Body.create(
      bodyFactory.build({
        content: { message: { type: 'typein' } },
        licensee,
        concluded: false,
      }),
    )

    const actions = await transformMessengerBody({ bodyId: body._id }, dependencies)

    expect(messengerPluginResponseToMessages).not.toHaveBeenCalled()
    expect(actions.length).toEqual(0)
  })

  it('responds with blank actions if body is invalid and update body', async () => {
    const messengerPluginResponseToMessages = jest
      .spyOn(Dialog.prototype, 'responseToMessages')
      .mockImplementation(() => {
        return []
      })

    const body = await Body.create(
      bodyFactory.build({
        content: {
          message: {
            type: 'typein',
          },
        },
        licensee,
        inbox: inbox._id,
        concluded: false,
      }),
    )

    const data = {
      bodyId: body._id,
    }

    const actions = await transformMessengerBody(data, dependencies)

    expect(messengerPluginResponseToMessages).toHaveBeenCalledWith(body.content, { departmentId: null })

    const bodyUpdated = await Body.findById(body._id)
    expect(bodyUpdated.concluded).toEqual(true)

    expect(actions.length).toEqual(0)
  })
})
