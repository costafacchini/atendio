import { closeChat } from './CloseChat'
import { Rocketchat } from '../plugins/chats/Rocketchat'
import { installMemoryRepositories, resetMemoryRepositories } from '@repositories/testing'
import { licensee as licenseeFactory } from '@factories/licensee'
import { contact as contactFactory } from '@factories/contact'
import { message as messageFactory } from '@factories/message'
import { inbox as inboxFactory } from '@factories/inbox'
import { LicenseeRepositoryDatabase } from '@repositories/licensee'
import { InboxRepositoryDatabase } from '@repositories/inbox'
import { ContactRepositoryDatabase } from '@repositories/contact'
import { MessageRepositoryDatabase } from '@repositories/message'
import { createRuntimeDependencies } from '../runtime/dependencies'

describe('closeChat', () => {
  let dependencies

  beforeEach(() => {
    jest.clearAllMocks()
    installMemoryRepositories()
    dependencies = createRuntimeDependencies()
  })

  afterEach(() => {
    resetMemoryRepositories()
  })

  it('asks the plugin to close the chat', async () => {
    const rocketchatCloseChatSpy = jest.spyOn(Rocketchat.prototype, 'closeChat').mockImplementation(() => [])

    const licenseeRepository = new LicenseeRepositoryDatabase()
    const licensee = await licenseeRepository.create(licenseeFactory.build())

    const inboxRepository = new InboxRepositoryDatabase()
    await inboxRepository.create(
      inboxFactory.build({
        licensee: licensee._id,
        kind: 'chat',
        chatDefault: 'rocketchat',
        chatUrl: 'https://chat.url',
      }),
    )

    const contactRepository = new ContactRepositoryDatabase()
    const contact = await contactRepository.create(
      contactFactory.build({
        licensee: licensee,
      }),
    )

    const messageRepository = new MessageRepositoryDatabase()
    await messageRepository.create(
      messageFactory.build({
        contact,
        licensee,
        _id: '609dcb059f560046cde64748',
      }),
    )

    await closeChat({ messageId: '609dcb059f560046cde64748' }, dependencies)

    expect(rocketchatCloseChatSpy).toHaveBeenCalledWith('609dcb059f560046cde64748')

    rocketchatCloseChatSpy.mockRestore()
  })

  it('returns empty actions when licensee has no chat inbox', async () => {
    const rocketchatCloseChatSpy = jest.spyOn(Rocketchat.prototype, 'closeChat').mockImplementation(() => [])

    const licenseeRepository = new LicenseeRepositoryDatabase()
    const licensee = await licenseeRepository.create(licenseeFactory.build())

    const contactRepository = new ContactRepositoryDatabase()
    const contact = await contactRepository.create(contactFactory.build({ licensee }))

    const messageRepository = new MessageRepositoryDatabase()
    await messageRepository.create(messageFactory.build({ contact, licensee, _id: '609dcb059f560046cde64748' }))

    const actions = await closeChat({ messageId: '609dcb059f560046cde64748' }, dependencies)

    expect(actions).toEqual([])
    expect(rocketchatCloseChatSpy).not.toHaveBeenCalled()

    rocketchatCloseChatSpy.mockRestore()
  })

  describe('when the licensee has a message on close chat', () => {
    it('returns actions to do after run', async () => {
      const rocketchatCloseChatSpy = jest.spyOn(Rocketchat.prototype, 'closeChat').mockImplementation(() => {
        return [{ _id: 'KSDF656DSD91NSE' }, { _id: 'OAR8Q54LDN02T' }]
      })

      const licenseeRepository = new LicenseeRepositoryDatabase()
      const licensee = await licenseeRepository.create(
        licenseeFactory.build({ messageOnCloseChat: 'Send on close chat' }),
      )

      const inboxRepository = new InboxRepositoryDatabase()
      await inboxRepository.create(
        inboxFactory.build({
          licensee: licensee._id,
          kind: 'chat',
          chatDefault: 'rocketchat',
          chatUrl: 'https://chat.url',
        }),
      )
      await inboxRepository.create(
        inboxFactory.build({
          licensee: licensee._id,
          kind: 'messenger',
          whatsappDefault: 'dialog',
          whatsappUrl: 'www.whatsappurl.com',
          whatsappToken: 'token-whats',
        }),
      )

      const contactRepository = new ContactRepositoryDatabase()
      const contact = await contactRepository.create(
        contactFactory.build({
          licensee: licensee,
        }),
      )

      const messageRepository = new MessageRepositoryDatabase()
      await messageRepository.create(
        messageFactory.build({
          contact,
          licensee,
          _id: '609dcb059f560046cde64748',
        }),
      )

      const actions = await closeChat({ messageId: '609dcb059f560046cde64748' }, dependencies)

      expect(actions.length).toEqual(2)
      expect(actions[0]).toEqual(
        expect.objectContaining({
          action: 'send-message-to-messenger',
          body: {
            messageId: 'KSDF656DSD91NSE',
            licenseeId: licensee._id,
            contactId: contact._id,
            token: 'token-whats',
            url: 'www.whatsappurl.com',
          },
        }),
      )

      rocketchatCloseChatSpy.mockRestore()
    })
  })
})
