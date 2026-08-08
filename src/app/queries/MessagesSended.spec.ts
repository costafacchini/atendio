import { installMemoryRepositories, resetMemoryRepositories } from '@repositories/testing'
import { MessagesSendedQuery } from './MessagesSended'
import { licensee as licenseeFactory } from '@factories/licensee'
import { contact as contactFactory } from '@factories/contact'
import { message as messageFactory } from '@factories/message'

describe('MessagesSendedQuery', () => {
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

  it('returns the messages that sended filtered by licensee and period', async () => {
    const filteredMessageSended1 = await repos.messageRepository.create(
      messageFactory.build({
        contact,
        licensee,
        sended: true,
        createdAt: new Date(2021, 6, 3, 0, 0, 0),
      }),
    )
    const filteredMessageSended2 = await repos.messageRepository.create(
      messageFactory.build({
        contact,
        licensee,
        sended: true,
        createdAt: new Date(2021, 6, 3, 23, 59, 58),
      }),
    )
    const filteredMessageNotSended = await repos.messageRepository.create(
      messageFactory.build({
        contact,
        licensee,
        sended: false,
        createdAt: new Date(2021, 6, 3, 23, 59, 58),
      }),
    )
    const filteredMessageBefore = await repos.messageRepository.create(
      messageFactory.build({
        contact,
        licensee,
        sended: true,
        createdAt: new Date(2021, 6, 2, 23, 59, 59),
      }),
    )
    const filteredMessageAfter = await repos.messageRepository.create(
      messageFactory.build({
        contact,
        licensee,
        sended: true,
        createdAt: new Date(2021, 6, 4, 0, 0, 0),
      }),
    )

    const anotherLicensee = await repos.licenseeRepository.create(licenseeFactory.build())
    const messageSendedAnotherLicensee = await repos.messageRepository.create(
      messageFactory.build({
        contact,
        licensee: anotherLicensee,
        sended: true,
        createdAt: new Date(2021, 6, 3, 0, 0, 0),
      }),
    )

    const messagesSendedQuery = new MessagesSendedQuery(
      new Date(2021, 6, 3, 0, 0, 0),
      new Date(2021, 6, 3, 23, 59, 59),
      licensee._id,
      {
        messageRepository: repos.messageRepository,
      },
    )
    const records = await messagesSendedQuery.all()

    expect(records.length).toEqual(2)
    expect(records).toEqual(expect.arrayContaining([expect.objectContaining({ _id: filteredMessageSended1._id })]))
    expect(records).toEqual(expect.arrayContaining([expect.objectContaining({ _id: filteredMessageSended2._id })]))
    expect(records).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ _id: filteredMessageNotSended._id })]),
    )
    expect(records).not.toEqual(expect.arrayContaining([expect.objectContaining({ _id: filteredMessageBefore._id })]))
    expect(records).not.toEqual(expect.arrayContaining([expect.objectContaining({ _id: filteredMessageAfter._id })]))
    expect(records).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ _id: messageSendedAnotherLicensee._id })]),
    )
  })
})
