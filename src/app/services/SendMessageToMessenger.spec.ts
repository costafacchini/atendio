import { sendMessageToMessenger } from './SendMessageToMessenger'
import { Dialog } from '../plugins/messengers/Dialog'
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

let dependencies

describe('sendMessageToMessenger', () => {
  const dialogSendMessageSpy = jest.spyOn(Dialog.prototype, 'sendMessage').mockImplementation(() => {})

  beforeEach(() => {
    installMemoryRepositories()
    dependencies = createRuntimeDependencies()
    jest.clearAllMocks()
  })

  afterEach(() => {
    resetMemoryRepositories()
  })

  it('asks the plugin to send message to messenger', async () => {
    const licenseeRepository = new LicenseeRepositoryDatabase()
    const licensee = await licenseeRepository.create(licenseeFactory.build())

    const inboxRepository = new InboxRepositoryDatabase()
    await inboxRepository.create(
      inboxFactory.build({
        licensee: licensee._id,
        kind: 'messenger',
        whatsappDefault: 'dialog',
        whatsappUrl: 'https://chat.url',
        whatsappToken: 'token',
      }),
    )

    const contactRepository = new ContactRepositoryDatabase()
    const contact = await contactRepository.create(
      contactFactory.build({
        licensee,
      }),
    )

    const messageRepository = new MessageRepositoryDatabase()
    const message = await messageRepository.create(
      messageFactory.build({
        contact,
        licensee,
        sended: false,
      }),
    )

    const data = {
      messageId: message._id,
      url: 'https://www.dialog.com',
      token: 'k4d5h8fyt',
    }

    await sendMessageToMessenger(data, dependencies)

    expect(dialogSendMessageSpy).toHaveBeenCalledWith(message._id, 'https://www.dialog.com', 'k4d5h8fyt')
  })

  it('falls back to inbox whatsappUrl and whatsappToken when url and token are absent from data', async () => {
    const licenseeRepository = new LicenseeRepositoryDatabase()
    const licensee = await licenseeRepository.create(licenseeFactory.build())

    const inboxRepository = new InboxRepositoryDatabase()
    await inboxRepository.create(
      inboxFactory.build({
        licensee: licensee._id,
        kind: 'messenger',
        whatsappDefault: 'dialog',
        whatsappUrl: 'https://waba.360dialog.io/',
        whatsappToken: 'inbox-token',
      }),
    )

    const contactRepository = new ContactRepositoryDatabase()
    const contact = await contactRepository.create(contactFactory.build({ licensee }))

    const messageRepository = new MessageRepositoryDatabase()
    const message = await messageRepository.create(messageFactory.build({ contact, licensee, sended: false }))

    await sendMessageToMessenger({ messageId: message._id }, dependencies)

    expect(dialogSendMessageSpy).toHaveBeenCalledWith(message._id, 'https://waba.360dialog.io/', 'inbox-token')
  })

  it('skips messenger plugin and marks message as sent when contact type is web', async () => {
    const licenseeRepository = new LicenseeRepositoryDatabase()
    const licensee = await licenseeRepository.create(licenseeFactory.build())

    const inboxRepository = new InboxRepositoryDatabase()
    await inboxRepository.create(
      inboxFactory.build({
        licensee: licensee._id,
        kind: 'messenger',
        whatsappDefault: 'dialog',
        whatsappUrl: 'https://chat.url',
        whatsappToken: 'token',
      }),
    )

    const contactRepository = new ContactRepositoryDatabase()
    const contact = await contactRepository.create(
      contactFactory.build({
        licensee,
        number: '00000000000',
        type: 'web',
        talkingWithChatBot: false,
      }),
    )

    const messageRepository = new MessageRepositoryDatabase()
    const message = await messageRepository.create(
      messageFactory.build({
        contact,
        licensee,
      }),
    )

    await sendMessageToMessenger({ messageId: message._id }, dependencies)

    expect(dialogSendMessageSpy).not.toHaveBeenCalled()

    const savedMessage = await messageRepository.findFirst({ _id: message._id }, [])
    expect(savedMessage.sended).toBe(true)
  })

  it('returns early without sending when message is already sended (approach C idempotency)', async () => {
    const licenseeRepository = new LicenseeRepositoryDatabase()
    const licensee = await licenseeRepository.create(licenseeFactory.build())

    const messageRepository = new MessageRepositoryDatabase()
    const message = await messageRepository.create(
      messageFactory.build({ licensee, sended: true }),
    )

    await sendMessageToMessenger({ messageId: message._id }, dependencies)

    expect(dialogSendMessageSpy).not.toHaveBeenCalled()
  })
})
