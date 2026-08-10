import { installMemoryRepositories, resetMemoryRepositories } from '@repositories/testing'
import { MessagesFailedQuery } from './MessagesFailed'
import { licensee as licenseeFactory } from '@factories/licensee'
import { contact as contactFactory } from '@factories/contact'
import { message as messageFactory } from '@factories/message'

describe('MessagesFailedQuery', () => {
  let repos: ReturnType<typeof installMemoryRepositories>['repositories']
  let licensee: any
  let contact: any

  beforeEach(async () => {
    ;({ repositories: repos } = installMemoryRepositories())
    licensee = await repos.licenseeRepository.create(licenseeFactory.build())
    contact = await repos.contactRepository.create(contactFactory.build({ licensee }))
  })

  afterEach(() => {
    resetMemoryRepositories()
  })

  it('returns the messages that not sended filtered by licensee and period', async () => {
    const filteredMessageNotSended1 = await repos.messageRepository.create(
      messageFactory.build({
        contact,
        licensee,
        sended: false,
        createdAt: new Date(2021, 6, 3, 0, 0, 0),
      }),
    )
    const filteredMessageNotSended2 = await repos.messageRepository.create(
      messageFactory.build({
        contact,
        licensee,
        sended: false,
        createdAt: new Date(2021, 6, 3, 23, 59, 58),
      }),
    )
    const filteredMessageSended = await repos.messageRepository.create(
      messageFactory.build({
        contact,
        licensee,
        sended: true,
        createdAt: new Date(2021, 6, 3, 23, 59, 58),
      }),
    )
    const filteredMessageBefore = await repos.messageRepository.create(
      messageFactory.build({
        contact,
        licensee,
        sended: false,
        createdAt: new Date(2021, 6, 2, 23, 59, 59),
      }),
    )
    const filteredMessageAfter = await repos.messageRepository.create(
      messageFactory.build({
        contact,
        licensee,
        sended: false,
        createdAt: new Date(2021, 6, 4, 0, 0, 0),
      }),
    )
    const anotherLicensee = await repos.licenseeRepository.create(licenseeFactory.build())
    const messageSendedAnotherLicensee = await repos.messageRepository.create(
      messageFactory.build({
        contact,
        licensee: anotherLicensee,
        sended: false,
        createdAt: new Date(2021, 6, 3, 0, 0, 0),
      }),
    )
    const filteredMessageNotSendedChatEndedByAgent = await repos.messageRepository.create(
      messageFactory.build({
        text: 'Chat encerrado pelo agente',
        contact,
        licensee,
        sended: false,
        createdAt: new Date(2021, 6, 3, 23, 59, 58),
      }),
    )

    const messagesFailedQuery = new MessagesFailedQuery(
      new Date(2021, 6, 3, 0, 0, 0),
      new Date(2021, 6, 3, 23, 59, 59),
      licensee._id,
      {
        messageRepository: repos.messageRepository,
      },
    )
    const records = await messagesFailedQuery.all()

    expect(records.length).toEqual(2)
    expect(records).toEqual(expect.arrayContaining([expect.objectContaining({ _id: filteredMessageNotSended1._id })]))
    expect(records).toEqual(expect.arrayContaining([expect.objectContaining({ _id: filteredMessageNotSended2._id })]))
    expect(records).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ _id: filteredMessageNotSendedChatEndedByAgent._id })]),
    )
    expect(records).not.toEqual(expect.arrayContaining([expect.objectContaining({ _id: filteredMessageSended._id })]))
    expect(records).not.toEqual(expect.arrayContaining([expect.objectContaining({ _id: filteredMessageBefore._id })]))
    expect(records).not.toEqual(expect.arrayContaining([expect.objectContaining({ _id: filteredMessageAfter._id })]))
    expect(records).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ _id: messageSendedAnotherLicensee._id })]),
    )
  })
})
