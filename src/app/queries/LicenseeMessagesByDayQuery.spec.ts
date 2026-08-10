import { LicenseeMessagesByDayQuery } from '@queries/LicenseeMessagesByDayQuery'
import { installMemoryRepositories, resetMemoryRepositories } from '@repositories/testing'
import { licensee as licenseeFactory } from '@factories/licensee'
import { contact as contactFactory } from '@factories/contact'
import { message as messageFactory } from '@factories/message'
import moment from 'moment-timezone'

describe('LicenseeMessagesByDayQuery', () => {
  let repos: ReturnType<typeof installMemoryRepositories>['repositories']
  const startDate = moment.tz('2022-01-01T00:00:00', 'UTC').toDate()
  const endDate = moment.tz('2022-01-03T23:59:59', 'UTC').toDate()

  beforeEach(() => {
    ;({ repositories: repos } = installMemoryRepositories())
  })

  afterEach(() => {
    resetMemoryRepositories()
  })

  it('returns messages grouped by licensee and day inside the period', async () => {
    const licenseeRepository = repos.licenseeRepository
    const contactRepository = repos.contactRepository
    const messageRepository = repos.messageRepository

    const licenseeAlpha = await licenseeRepository.create(licenseeFactory.build({ name: 'Alpha' }))
    const contactAlpha = await contactRepository.create(contactFactory.build({ licensee: licenseeAlpha }))

    await messageRepository.create(
      messageFactory.build({
        contact: contactAlpha,
        licensee: licenseeAlpha,
        createdAt: moment.tz('2022-01-01T08:00:00', 'UTC').toDate(),
      }),
    )
    await messageRepository.create(
      messageFactory.build({
        contact: contactAlpha,
        licensee: licenseeAlpha,
        createdAt: moment.tz('2022-01-01T09:00:00', 'UTC').toDate(),
      }),
    )
    await messageRepository.create(
      messageFactory.build({
        contact: contactAlpha,
        licensee: licenseeAlpha,
        createdAt: moment.tz('2022-01-02T12:00:00', 'UTC').toDate(),
      }),
    )

    const licenseeBeta = await licenseeRepository.create(licenseeFactory.build({ name: 'Beta' }))
    const contactBeta = await contactRepository.create(contactFactory.build({ licensee: licenseeBeta }))

    await messageRepository.create(
      messageFactory.build({
        contact: contactBeta,
        licensee: licenseeBeta,
        createdAt: moment.tz('2022-01-02T03:00:00', 'UTC').toDate(),
      }),
    )
    await messageRepository.create(
      messageFactory.build({
        contact: contactBeta,
        licensee: licenseeBeta,
        createdAt: moment.tz('2022-01-03T10:00:00', 'UTC').toDate(),
      }),
    )

    const licenseeGamma = await licenseeRepository.create(licenseeFactory.build({ name: 'Gamma' }))
    await contactRepository.create(contactFactory.build({ licensee: licenseeGamma }))

    const query = new LicenseeMessagesByDayQuery(startDate, endDate, { messageRepository, licenseeRepository })
    const records = await query.all()

    expect(records.length).toEqual(3)

    const alphaRecord = records.find((record) => record._id.toString() === licenseeAlpha._id.toString())
    expect(alphaRecord.days).toEqual([
      { date: '2022-01-01', count: 2 },
      { date: '2022-01-02', count: 1 },
      { date: '2022-01-03', count: 0 },
    ])

    const betaRecord = records.find((record) => record._id.toString() === licenseeBeta._id.toString())
    expect(betaRecord.days).toEqual([
      { date: '2022-01-01', count: 0 },
      { date: '2022-01-02', count: 1 },
      { date: '2022-01-03', count: 1 },
    ])

    const gammaRecord = records.find((record) => record._id.toString() === licenseeGamma._id.toString())
    expect(gammaRecord.days).toEqual([
      { date: '2022-01-01', count: 0 },
      { date: '2022-01-02', count: 0 },
      { date: '2022-01-03', count: 0 },
    ])
  })

  it('filters the report by licensee when configured', async () => {
    const licenseeRepository = repos.licenseeRepository
    const contactRepository = repos.contactRepository
    const messageRepository = repos.messageRepository

    const licenseeOne = await licenseeRepository.create(licenseeFactory.build({ name: 'Ones' }))
    const contactOne = await contactRepository.create(contactFactory.build({ licensee: licenseeOne }))
    await messageRepository.create(
      messageFactory.build({
        licensee: licenseeOne,
        contact: contactOne,
        createdAt: moment.tz('2022-01-02T08:00:00', 'UTC').toDate(),
      }),
    )

    const licenseeTwo = await licenseeRepository.create(licenseeFactory.build({ name: 'Twos' }))
    const contactTwo = await contactRepository.create(contactFactory.build({ licensee: licenseeTwo }))
    await messageRepository.create(
      messageFactory.build({
        licensee: licenseeTwo,
        contact: contactTwo,
        createdAt: moment.tz('2022-01-02T09:00:00', 'UTC').toDate(),
      }),
    )

    const query = new LicenseeMessagesByDayQuery(startDate, endDate, { messageRepository, licenseeRepository })
    query.filterByLicensee(licenseeTwo._id)
    const records = await query.all()

    expect(records.length).toEqual(1)
    expect(records[0]._id.toString()).toEqual(licenseeTwo._id.toString())
    expect(records[0].days).toEqual([
      { date: '2022-01-01', count: 0 },
      { date: '2022-01-02', count: 1 },
      { date: '2022-01-03', count: 0 },
    ])
  })
})
