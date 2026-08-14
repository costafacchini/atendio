import { sendMessageToChat } from './SendMessageToChat'
import { Rocketchat } from '../plugins/chats/Rocketchat'
import { installMemoryRepositories, resetMemoryRepositories } from '@repositories/testing'
import { licensee as licenseeFactory } from '@factories/licensee'
import { inbox as inboxFactory } from '@factories/inbox'
import { contact as contactFactory } from '@factories/contact'
import { message as messageFactory } from '@factories/message'
import { LicenseeRepositoryDatabase } from '@repositories/licensee'
import { InboxRepositoryDatabase } from '@repositories/inbox'
import { ContactRepositoryDatabase } from '@repositories/contact'
import { MessageRepositoryDatabase } from '@repositories/message'
import { createRuntimeDependencies } from '../runtime/dependencies'

let dependencies

describe('sendMessageToChat', () => {
  const rocketchatSendMessageSpy = jest.spyOn(Rocketchat.prototype, 'sendMessage').mockImplementation(() => {})

  beforeEach(() => {
    jest.clearAllMocks()
    installMemoryRepositories()
    dependencies = createRuntimeDependencies()
  })

  afterEach(() => {
    resetMemoryRepositories()
  })

  it('asks the plugin to send message to chat', async () => {
    const licenseeRepository = new LicenseeRepositoryDatabase()
    const licensee = await licenseeRepository.create(licenseeFactory.build())

    const inboxRepository = new InboxRepositoryDatabase()
    await inboxRepository.create(
      inboxFactory.build({
        licensee,
        kind: 'chat',
        chatDefault: 'rocketchat',
        chatUrl: 'https://chat.url',
      }),
    )

    const contactRepository = new ContactRepositoryDatabase()
    const contact = await contactRepository.create(
      contactFactory.build({
        talkingWithChatBot: true,
        licensee,
      }),
    )

    const messageRepository = new MessageRepositoryDatabase()
    await messageRepository.create(
      messageFactory.build({
        contact,
        licensee,
        destination: 'to-chat',
        _id: '609dcb059f560046cde64748',
      }),
    )

    const data = {
      messageId: '609dcb059f560046cde64748',
      url: 'https://messenger.url',
      token: 'token',
    }

    await sendMessageToChat(data, dependencies)

    expect(rocketchatSendMessageSpy).toHaveBeenCalledWith('609dcb059f560046cde64748', 'https://messenger.url')
  })
})
