import { LicenseesQuery } from '@queries/LicenseesQuery'
import { installMemoryRepositories, resetMemoryRepositories } from '@repositories/testing'
import { licensee as licenseeFactory } from '@factories/licensee'

describe('LicenseesQuery', () => {
  let repos: ReturnType<typeof installMemoryRepositories>['repositories']

  beforeEach(() => {
    ;({ repositories: repos } = installMemoryRepositories())
  })

  afterEach(() => {
    resetMemoryRepositories()
  })

  const buildLicenseesQuery = () => new LicenseesQuery({ licenseeRepository: repos.licenseeRepository })

  it('returns all licensees ordered by createdAt asc', async () => {
    const licensee1 = await repos.licenseeRepository.create(
      licenseeFactory.build({
        createdAt: new Date(2021, 6, 3, 0, 0, 0),
      }),
    )
    const licensee2 = await repos.licenseeRepository.create(
      licenseeFactory.build({
        createdAt: new Date(2021, 6, 3, 0, 0, 1),
      }),
    )

    const licenseesQuery = buildLicenseesQuery()
    const records = await licenseesQuery.all()

    expect(records.length).toEqual(2)
    expect(records[0]).toEqual(expect.objectContaining({ _id: licensee1._id }))
    expect(records[1]).toEqual(expect.objectContaining({ _id: licensee2._id }))
  })

  describe('about pagination', () => {
    it('returns all by page respecting the limit', async () => {
      const licensee1 = await repos.licenseeRepository.create(
        licenseeFactory.build({
          createdAt: new Date(2021, 6, 3, 0, 0, 0),
        }),
      )
      const licensee2 = await repos.licenseeRepository.create(
        licenseeFactory.build({
          createdAt: new Date(2021, 6, 3, 0, 0, 1),
        }),
      )
      const licensee3 = await repos.licenseeRepository.create(
        licenseeFactory.build({
          createdAt: new Date(2021, 6, 3, 0, 0, 2),
        }),
      )

      const licenseesQuery = buildLicenseesQuery()
      licenseesQuery.page(1)
      licenseesQuery.limit(2)

      let records = await licenseesQuery.all()

      expect(records.length).toEqual(2)
      expect(records[0]).toEqual(expect.objectContaining({ _id: licensee1._id }))
      expect(records[1]).toEqual(expect.objectContaining({ _id: licensee2._id }))

      licenseesQuery.page(2)
      records = await licenseesQuery.all()

      expect(records.length).toEqual(1)
      expect(records[0]).toEqual(expect.objectContaining({ _id: licensee3._id }))

      licenseesQuery.page(1)
      licenseesQuery.limit(1)

      records = await licenseesQuery.all()

      expect(records.length).toEqual(1)
      expect(records[0]).toEqual(expect.objectContaining({ _id: licensee1._id }))
    })
  })

  describe('filterByChatbotDefault', () => {
    it('returns licensees filtered by chatbot default', async () => {
      const licensee1 = await repos.licenseeRepository.create(
        licenseeFactory.build({
          useChatbot: true,
          chatbotDefault: 'landbot',
          chatbotUrl: 'http://chat.com',
          chatbotAuthorizationToken: 'key',
        }),
      )
      const licensee2 = await repos.licenseeRepository.create(
        licenseeFactory.build({
          useChatbot: false,
        }),
      )

      const licenseesQuery = buildLicenseesQuery()
      licenseesQuery.filterByChatbotDefault('landbot')
      const records = await licenseesQuery.all()

      expect(records.length).toEqual(1)
      expect(records).toEqual(expect.arrayContaining([expect.objectContaining({ _id: licensee1._id })]))
      expect(records).not.toEqual(expect.arrayContaining([expect.objectContaining({ _id: licensee2._id })]))
    })
  })

  describe('filterByExpression', () => {
    it('returns licensees filtered by expression on name, email and phone', async () => {
      const licensee1 = await repos.licenseeRepository.create(
        licenseeFactory.build({
          email: 'alcateia@gmail.com',
          phone: '551123459',
        }),
      )
      const licensee2 = await repos.licenseeRepository.create(
        licenseeFactory.build({
          name: 'Doeland',
          email: 'doeland@china.com',
          phone: '56009234687',
        }),
      )
      const licensee3 = await repos.licenseeRepository.create(
        licenseeFactory.build({
          name: 'Mary Ltda',
          email: 'maryltda@china.com',
          phone: '457654635',
        }),
      )

      const licenseesQuery = buildLicenseesQuery()
      licenseesQuery.filterByExpression('Alcateia 56')
      let records = await licenseesQuery.all()

      expect(records.length).toEqual(2)
      expect(records).toEqual(expect.arrayContaining([expect.objectContaining({ _id: licensee1._id })]))
      expect(records).toEqual(expect.arrayContaining([expect.objectContaining({ _id: licensee2._id })]))
      expect(records).not.toEqual(expect.arrayContaining([expect.objectContaining({ _id: licensee3._id })]))

      licenseesQuery.filterByExpression('CHINA')
      records = await licenseesQuery.all()

      expect(records.length).toEqual(2)
      expect(records).toEqual(expect.arrayContaining([expect.objectContaining({ _id: licensee2._id })]))
      expect(records).toEqual(expect.arrayContaining([expect.objectContaining({ _id: licensee3._id })]))
      expect(records).not.toEqual(expect.arrayContaining([expect.objectContaining({ _id: licensee1._id })]))
    })
  })

  describe('filterByActive', () => {
    it('returns only active licensees', async () => {
      const licensee1 = await repos.licenseeRepository.create(licenseeFactory.build())
      const licenseeInactive = await repos.licenseeRepository.create(licenseeFactory.build({ active: false }))

      const licenseesQuery = buildLicenseesQuery()
      licenseesQuery.filterByActive()
      const records = await licenseesQuery.all()

      expect(records.length).toEqual(1)
      expect(records).toEqual(expect.arrayContaining([expect.objectContaining({ _id: licensee1._id })]))
      expect(records).not.toEqual(expect.arrayContaining([expect.objectContaining({ _id: licenseeInactive._id })]))
    })
  })

  describe('filterExcludeLicensees', () => {
    it('excludes licensees whose ids are in the blocked list', async () => {
      const licensee1 = await repos.licenseeRepository.create(licenseeFactory.build())
      const licensee2 = await repos.licenseeRepository.create(licenseeFactory.build())
      const licensee3 = await repos.licenseeRepository.create(licenseeFactory.build())

      const licenseesQuery = buildLicenseesQuery()
      licenseesQuery.filterExcludeLicensees([licensee2._id])
      const records = await licenseesQuery.all()

      expect(records.length).toEqual(2)
      expect(records).toEqual(expect.arrayContaining([expect.objectContaining({ _id: licensee1._id })]))
      expect(records).toEqual(expect.arrayContaining([expect.objectContaining({ _id: licensee3._id })]))
      expect(records).not.toEqual(expect.arrayContaining([expect.objectContaining({ _id: licensee2._id })]))
    })

    it('returns all licensees when the excluded list is empty', async () => {
      await repos.licenseeRepository.create(licenseeFactory.build())
      await repos.licenseeRepository.create(licenseeFactory.build())

      const licenseesQuery = buildLicenseesQuery()
      licenseesQuery.filterExcludeLicensees([])
      const records = await licenseesQuery.all()

      expect(records.length).toEqual(2)
    })
  })
})
