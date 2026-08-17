import { transformChatBody } from './ChatMessage'
import Body from '@models/Body'
import { Rocketchat } from '../plugins/chats/Rocketchat'
import { installMemoryRepositories, resetMemoryRepositories } from '@repositories/testing'
import { licensee as licenseeFactory } from '@factories/licensee'
import { body as bodyFactory } from '@factories/body'
import { contact as contactFactory } from '@factories/contact'
import { inbox as inboxFactory } from '@factories/inbox'
import { LicenseeRepositoryDatabase } from '@repositories/licensee'
import { InboxRepositoryDatabase } from '@repositories/inbox'
import { ContactRepositoryDatabase } from '@repositories/contact'
import { createRuntimeDependencies } from '../runtime/dependencies'

let dependencies

describe('transformChatBody', () => {
  let licensee
  let inbox

  beforeEach(async () => {
    installMemoryRepositories()
    dependencies = createRuntimeDependencies()
    jest.clearAllMocks()

    const licenseeRepository = new LicenseeRepositoryDatabase()
    licensee = await licenseeRepository.create(licenseeFactory.build())

    const inboxRepository = new InboxRepositoryDatabase()
    inbox = await inboxRepository.create(
      inboxFactory.build({
        licensee: licensee._id,
        kind: 'chat',
        chatDefault: 'rocketchat',
        chatUrl: 'https://www.jivo.chat.com',
        whatsappDefault: 'dialog',
        whatsappUrl: 'https://waba.360dialog.io/',
        whatsappToken: 'token',
      }),
    )
  })

  afterEach(() => {
    resetMemoryRepositories()
  })

  it('responds with action to dispatcher action of plugin and delete body', async () => {
    const chatPluginResponseToMessages = jest
      .spyOn(Rocketchat.prototype, 'responseToMessages')
      .mockImplementation(() => {
        return [
          { _id: 'KSDF656DSD91NSE', contact: { _id: 'id-contact-1' } },
          { _id: 'OAR8Q54LDN02T', contact: { _id: 'id-contact-2' } },
        ]
      })

    jest.spyOn(ContactRepositoryDatabase.prototype, 'contactWithWhatsappWindowClosed').mockResolvedValue(false)

    const body = await Body.create(
      bodyFactory.build({
        licensee: licensee,
        inbox: inbox._id,
        concluded: false,
      }),
    )

    const data = {
      bodyId: body._id,
    }

    const actions = await transformChatBody(data, dependencies)

    expect(chatPluginResponseToMessages).toHaveBeenCalledWith(body.content)

    const bodyUpdated = await Body.findById(body._id)
    expect(bodyUpdated.concluded).toEqual(true)

    expect(actions[0].action).toEqual('send-message-to-messenger')
    expect(actions[0].body).toEqual({
      messageId: 'KSDF656DSD91NSE',
      licenseeId: licensee._id,
      contactId: 'id-contact-1',
      url: 'https://waba.360dialog.io/',
      token: 'token',
    })

    expect(actions[1].action).toEqual('send-message-to-messenger')
    expect(actions[1].body).toEqual({
      messageId: 'OAR8Q54LDN02T',
      licenseeId: licensee._id,
      contactId: 'id-contact-2',
      url: 'https://waba.360dialog.io/',
      token: 'token',
    })

    expect(actions.length).toEqual(2)
  })

  it('responds message to chat if contact with whatsapp window closed and message is not template', async () => {
    const chatPluginResponseToMessages = jest
      .spyOn(Rocketchat.prototype, 'responseToMessages')
      .mockImplementation(() => {
        return [
          { _id: 'KSDF656DSD91NSE', contact: { _id: contact._id }, kind: 'text' },
          { _id: 'OAR8Q54LDN02T', contact: { _id: contact._id } },
        ]
      })

    jest.spyOn(ContactRepositoryDatabase.prototype, 'contactWithWhatsappWindowClosed').mockResolvedValue(true)

    const licenseeRepository = new LicenseeRepositoryDatabase()
    const licensee2 = await licenseeRepository.create(licenseeFactory.build({ useWhatsappWindow: true }))

    const inboxRepository = new InboxRepositoryDatabase()
    const inbox2 = await inboxRepository.create(
      inboxFactory.build({
        licensee: licensee2._id,
        kind: 'chat',
        chatDefault: 'rocketchat',
        chatUrl: 'https://www.jivo.chat.com',
        whatsappDefault: 'dialog',
        whatsappUrl: 'https://waba.360dialog.io/',
        whatsappToken: 'token',
      }),
    )

    const contactRepository = new ContactRepositoryDatabase()
    const contact = await contactRepository.create(contactFactory.build({ licensee: licensee2 }))

    const body = await Body.create(
      bodyFactory.build({
        licensee: licensee2,
        inbox: inbox2._id,
        concluded: false,
      }),
    )

    const data = {
      bodyId: body._id,
    }

    const actions = await transformChatBody(data, dependencies)

    expect(chatPluginResponseToMessages).toHaveBeenCalledWith(body.content)

    const bodyUpdated = await Body.findById(body._id)
    expect(bodyUpdated.concluded).toEqual(true)

    expect(actions[0].action).toEqual('send-message-to-chat')
    expect(actions[0].body).toEqual(expect.objectContaining({ url: 'https://www.jivo.chat.com', token: '' }))

    expect(actions.length).toEqual(1)
  })

  it('responds with action to dispatcher action of plugin if contact with whatsapp window closed and message is template', async () => {
    const chatPluginResponseToMessages = jest
      .spyOn(Rocketchat.prototype, 'responseToMessages')
      .mockImplementation(() => {
        return [{ _id: 'KSDF656DSD91NSE', contact: { _id: 'id-contact-1' }, kind: 'template' }]
      })

    jest.spyOn(ContactRepositoryDatabase.prototype, 'contactWithWhatsappWindowClosed').mockResolvedValue(true)

    const body = await Body.create(
      bodyFactory.build({
        licensee: licensee,
        inbox: inbox._id,
        concluded: false,
      }),
    )

    const data = {
      bodyId: body._id,
    }

    const actions = await transformChatBody(data, dependencies)

    expect(chatPluginResponseToMessages).toHaveBeenCalledWith(body.content)

    const bodyUpdated = await Body.findById(body._id)
    expect(bodyUpdated.concluded).toEqual(true)

    expect(actions[0].action).toEqual('send-message-to-messenger')
    expect(actions[0].body).toEqual({
      messageId: 'KSDF656DSD91NSE',
      licenseeId: licensee._id,
      contactId: 'id-contact-1',
      kind: 'template',
      url: 'https://waba.360dialog.io/',
      token: 'token',
    })

    expect(actions.length).toEqual(1)
  })

  it('returns empty actions when no inbox is found for the licensee', async () => {
    const licenseeWithoutInbox = await new LicenseeRepositoryDatabase().create(licenseeFactory.build())
    // intentionally no inbox created for this licensee

    const body = await Body.create(
      bodyFactory.build({
        licensee: licenseeWithoutInbox,
        concluded: false,
      }),
    )

    const data = { bodyId: body._id }

    const actions = await transformChatBody(data, dependencies)

    expect(actions.length).toEqual(0)
  })

  it('responds with blank actions if body is invalid and update body', async () => {
    const chatPluginResponseToMessages = jest
      .spyOn(Rocketchat.prototype, 'responseToMessages')
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
        licensee: licensee,
        inbox: inbox._id,
        concluded: false,
      }),
    )

    const data = {
      bodyId: body._id,
    }

    const actions = await transformChatBody(data, dependencies)

    expect(chatPluginResponseToMessages).toHaveBeenCalledWith(body.content)

    const bodyUpdated = await Body.findById(body._id)
    expect(bodyUpdated.concluded).toEqual(true)

    expect(actions.length).toEqual(0)
  })
})
