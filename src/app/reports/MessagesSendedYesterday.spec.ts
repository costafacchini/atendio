import { installMemoryRepositories, resetMemoryRepositories } from '@repositories/testing'
import { MessagesSendedYesterday } from './MessagesSendedYesterday'
import moment from 'moment'
import { licensee as licenseeFactory } from '@factories/licensee'
import { contact as contactFactory } from '@factories/contact'
import { message as messageFactory } from '@factories/message'

describe('MessagesSendedYesterday', () => {
  let repos: ReturnType<typeof installMemoryRepositories>['repositories']

  beforeEach(() => {
    ;({ repositories: repos } = installMemoryRepositories())
  })

  afterEach(() => {
    resetMemoryRepositories()
  })

  it('returns the resume os messages sended yesterday', async () => {
    const licenseeRepository = repos.licenseeRepository
    const licensee1 = await licenseeRepository.create(licenseeFactory.build({ name: 'Alcateia', licenseKind: 'paid' }))

    const contactRepository = repos.contactRepository
    const contact1 = await contactRepository.create(contactFactory.build({ licensee: licensee1 }))
    const messageRepository = repos.messageRepository
    const messageOfYesterday1 = await messageRepository.create(
      messageFactory.build({
        contact: contact1,
        licensee: licensee1,
        sended: true,
        createdAt: moment().subtract(1, 'days'),
      }),
    )
    const messageOfYesterday2 = await messageRepository.create(
      messageFactory.build({
        contact: contact1,
        licensee: licensee1,
        sended: true,
        createdAt: moment().subtract(1, 'days'),
      }),
    )
    const messageOfYesterday3 = await messageRepository.create(
      messageFactory.build({
        contact: contact1,
        licensee: licensee1,
        sended: false,
        createdAt: moment().subtract(1, 'days'),
      }),
    )
    const messageOfTwoDays1 = await messageRepository.create(
      messageFactory.build({
        contact: contact1,
        licensee: licensee1,
        sended: true,
        createdAt: moment().subtract(2, 'days'),
      }),
    )
    const messageOfToday1 = await messageRepository.create(
      messageFactory.build({
        contact: contact1,
        licensee: licensee1,
        sended: true,
        createdAt: moment(),
      }),
    )

    const licensee2 = await licenseeRepository.create(
      licenseeFactory.build({ name: 'Alcateia II', licenseKind: 'paid' }),
    )
    const contact2 = await contactRepository.create(contactFactory.build({ licensee: licensee2 }))
    const messageOfYesterday4 = await messageRepository.create(
      messageFactory.build({
        contact: contact2,
        licensee: licensee2,
        sended: true,
        createdAt: moment().subtract(1, 'days'),
      }),
    )
    const messageOfYesterday5 = await messageRepository.create(
      messageFactory.build({
        contact: contact2,
        licensee: licensee2,
        sended: true,
        createdAt: moment().subtract(1, 'days'),
      }),
    )
    const messageOfYesterday6 = await messageRepository.create(
      messageFactory.build({
        contact: contact2,
        licensee: licensee2,
        sended: false,
        createdAt: moment().subtract(1, 'days'),
      }),
    )
    const messageOfTwoDays2 = await messageRepository.create(
      messageFactory.build({
        contact: contact2,
        licensee: licensee2,
        sended: true,
        createdAt: moment().subtract(2, 'days'),
      }),
    )
    const messageOfToday2 = await messageRepository.create(
      messageFactory.build({
        contact: contact2,
        licensee: licensee2,
        sended: true,
        createdAt: moment(),
      }),
    )

    const messagesSendedYesterday = new MessagesSendedYesterday({ licenseeRepository, messageRepository })
    const records = await messagesSendedYesterday.report()

    expect(records.length).toEqual(2)
    expect(records[0]).toEqual(
      expect.objectContaining({
        licensee: expect.objectContaining({ name: 'Alcateia' }),
        success: {
          count: 2,
          messages: expect.arrayContaining([
            expect.objectContaining({ _id: messageOfYesterday1._id }),
            expect.objectContaining({ _id: messageOfYesterday2._id }),
          ]),
        },
        error: {
          count: 1,
          messages: expect.arrayContaining([expect.objectContaining({ _id: messageOfYesterday3._id })]),
        },
      }),
    )
    expect(records[0].success.messages).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _id: messageOfTwoDays1._id }),
        expect.objectContaining({ _id: messageOfToday1._id }),
      ]),
    )

    expect(records[1]).toEqual(
      expect.objectContaining({
        licensee: expect.objectContaining({ name: 'Alcateia II' }),
        success: {
          count: 2,
          messages: expect.arrayContaining([
            expect.objectContaining({ _id: messageOfYesterday4._id }),
            expect.objectContaining({ _id: messageOfYesterday5._id }),
          ]),
        },
        error: {
          count: 1,
          messages: expect.arrayContaining([expect.objectContaining({ _id: messageOfYesterday6._id })]),
        },
      }),
    )
    expect(records[1].success.messages).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _id: messageOfTwoDays2._id }),
        expect.objectContaining({ _id: messageOfToday2._id }),
      ]),
    )
  })
})
