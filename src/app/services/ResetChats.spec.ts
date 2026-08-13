import { resetChats } from './ResetChats'
import { installMemoryRepositories, resetMemoryRepositories } from '@repositories/testing'
import { licenseeComplete as licenseeFactory } from '@factories/licensee'
import { contact as contactFactory } from '@factories/contact'
import { inbox as inboxFactory } from '@factories/inbox'
import moment from 'moment'
import { Rocketchat } from '../plugins/chats/Rocketchat'
import { LicenseeRepositoryDatabase } from '@repositories/licensee'
import { InboxRepositoryDatabase } from '@repositories/inbox'
import { ContactRepositoryDatabase } from '@repositories/contact'
import { MessageRepositoryDatabase } from '@repositories/message'

const spySendMessage = jest.spyOn(Rocketchat.prototype, 'sendMessage').mockImplementation()
jest.mock('../helpers/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() },
}))
import { createRuntimeDependencies } from '../runtime/dependencies'

let dependencies

describe('resetChats', () => {
  beforeEach(() => {
    installMemoryRepositories()
    dependencies = createRuntimeDependencies()
    jest.clearAllMocks()
  })

  afterEach(() => {
    resetMemoryRepositories()
  })

  describe('when the licensee uses messenger plugin dialog and use whatsapp window', () => {
    describe('when the contact starts a whatsapp chat 23 hours and 50 minutes ago', () => {
      it('send the message to warn the chat that the conversation window is ending', async () => {
        const licenseeRepository = new LicenseeRepositoryDatabase()
        const inboxRepository = new InboxRepositoryDatabase()

        const licensee = await licenseeRepository.create(
          licenseeFactory.build({ useWhatsappWindow: true }),
        )
        await inboxRepository.create(inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'dialog' }))
        await inboxRepository.create(inboxFactory.build({ licensee: licensee._id, kind: 'chat', chatDefault: 'rocketchat', chatUrl: 'https://chat.url' }))

        const contactRepository = new ContactRepositoryDatabase()
        const contactWithWhatsappWindowEnding = await contactRepository.create(
          contactFactory.build({
            licensee,
            wa_start_chat: moment().subtract(23, 'hours').subtract(55, 'minutes'),
          }),
        )

        const contactWithWhatsappWindowOnLimitEnding1 = await contactRepository.create(
          contactFactory.build({
            licensee,
            wa_start_chat: moment().subtract(23, 'hours').subtract(50, 'minutes'),
          }),
        )

        const contactWithWhatsappWindowOnLimitEnding2 = await contactRepository.create(
          contactFactory.build({
            licensee,
            wa_start_chat: moment().subtract(23, 'hours').subtract(59, 'minutes'),
          }),
        )

        const contactWithWhatsappWindowExpired1 = await contactRepository.create(
          contactFactory.build({
            licensee,
            wa_start_chat: moment().subtract(23, 'hours').subtract(49, 'minutes'),
          }),
        )

        const licenseeWhatsappWindowOff = await licenseeRepository.create(
          licenseeFactory.build({ useWhatsappWindow: false }),
        )
        await inboxRepository.create(inboxFactory.build({ licensee: licenseeWhatsappWindowOff._id, kind: 'messenger', whatsappDefault: 'dialog' }))

        const contactLicenseeWindowOff = await contactRepository.create(
          contactFactory.build({
            licensee: licenseeWhatsappWindowOff,
            wa_start_chat: moment().subtract(23, 'hours').subtract(55, 'minutes'),
          }),
        )

        const licenseeThatNotUseDialog = await licenseeRepository.create(
          licenseeFactory.build({ useWhatsappWindow: true }),
        )
        await inboxRepository.create(inboxFactory.build({ licensee: licenseeThatNotUseDialog._id, kind: 'messenger', whatsappDefault: 'utalk' }))

        const contactLicenseeThatNotUseDialog = await contactRepository.create(
          contactFactory.build({
            licensee: licenseeThatNotUseDialog,
            wa_start_chat: moment().subtract(23, 'hours').subtract(55, 'minutes'),
          }),
        )

        await resetChats(dependencies)

        const messageRepository = new MessageRepositoryDatabase()
        const messages = await messageRepository.find()

        expect(messages.length).toEqual(3)
        expect(spySendMessage).toHaveBeenCalledTimes(3)

        expect(messages).toEqual(
          expect.arrayContaining([expect.objectContaining({ contact: contactWithWhatsappWindowEnding._id })]),
        )
        expect(messages).toEqual(
          expect.arrayContaining([expect.objectContaining({ contact: contactWithWhatsappWindowOnLimitEnding1._id })]),
        )
        expect(messages).toEqual(
          expect.arrayContaining([expect.objectContaining({ contact: contactWithWhatsappWindowOnLimitEnding2._id })]),
        )
        expect(messages).toEqual(
          expect.arrayContaining([expect.not.objectContaining({ contact: contactWithWhatsappWindowExpired1._id })]),
        )
        expect(messages).toEqual(
          expect.arrayContaining([expect.not.objectContaining({ contact: contactLicenseeWindowOff._id })]),
        )
        expect(messages).toEqual(
          expect.arrayContaining([expect.not.objectContaining({ contact: contactLicenseeThatNotUseDialog._id })]),
        )
      })

      it('send the message to notify the chat that the conversation window has expired ans clear field on contact', async () => {
        const licenseeRepository = new LicenseeRepositoryDatabase()
        const inboxRepository = new InboxRepositoryDatabase()

        const licensee = await licenseeRepository.create(
          licenseeFactory.build({ useWhatsappWindow: true }),
        )
        await inboxRepository.create(inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'dialog' }))
        await inboxRepository.create(inboxFactory.build({ licensee: licensee._id, kind: 'chat', chatDefault: 'rocketchat', chatUrl: 'https://chat.url' }))

        const contactRepository = new ContactRepositoryDatabase()
        const contactWithWhatsappWindowEnding = await contactRepository.create(
          contactFactory.build({
            licensee,
            wa_start_chat: moment().subtract(24, 'hours').subtract(10, 'minutes'),
          }),
        )

        const contactWithWhatsappWindowOnLimitEnding1 = await contactRepository.create(
          contactFactory.build({
            licensee,
            wa_start_chat: moment().subtract(24, 'hours'),
          }),
        )

        const licenseeWhatsappWindowOff = await licenseeRepository.create(
          licenseeFactory.build({ useWhatsappWindow: false }),
        )
        await inboxRepository.create(inboxFactory.build({ licensee: licenseeWhatsappWindowOff._id, kind: 'messenger', whatsappDefault: 'dialog' }))

        const contactLicenseeWindowOff = await contactRepository.create(
          contactFactory.build({
            licensee: licenseeWhatsappWindowOff,
            wa_start_chat: moment().subtract(24, 'hours').subtract(10, 'minutes'),
          }),
        )

        const licenseeThatNotUseDialog = await licenseeRepository.create(
          licenseeFactory.build({ useWhatsappWindow: true }),
        )
        await inboxRepository.create(inboxFactory.build({ licensee: licenseeThatNotUseDialog._id, kind: 'messenger', whatsappDefault: 'utalk' }))

        const contactLicenseeThatNotUseDialog = await contactRepository.create(
          contactFactory.build({
            licensee: licenseeThatNotUseDialog,
            wa_start_chat: moment().subtract(24, 'hours').subtract(10, 'minutes'),
          }),
        )

        await resetChats(dependencies)

        const messageRepository = new MessageRepositoryDatabase()
        const messages = await messageRepository.find()

        expect(messages.length).toEqual(2)
        expect(spySendMessage).toHaveBeenCalledTimes(2)

        expect(messages).toEqual(
          expect.arrayContaining([expect.objectContaining({ contact: contactWithWhatsappWindowEnding._id })]),
        )
        expect(messages).toEqual(
          expect.arrayContaining([expect.objectContaining({ contact: contactWithWhatsappWindowOnLimitEnding1._id })]),
        )
        expect(messages).toEqual(
          expect.arrayContaining([expect.not.objectContaining({ contact: contactLicenseeWindowOff._id })]),
        )
        expect(messages).toEqual(
          expect.arrayContaining([expect.not.objectContaining({ contact: contactLicenseeThatNotUseDialog._id })]),
        )

        const contactWithWhatsappWindowEndingUpdated = await contactRepository.findFirst({
          _id: contactWithWhatsappWindowEnding._id,
        })
        expect(contactWithWhatsappWindowEndingUpdated.wa_start_chat).toEqual(null)

        const contactWithWhatsappWindowOnLimitEnding1Updated = await contactRepository.findFirst({
          _id: contactWithWhatsappWindowOnLimitEnding1._id,
        })
        expect(contactWithWhatsappWindowOnLimitEnding1Updated.wa_start_chat).toEqual(null)
      })
    })
  })
})
