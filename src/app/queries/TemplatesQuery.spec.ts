import { TemplatesQuery } from '@queries/TemplatesQuery'
import { installMemoryRepositories, resetMemoryRepositories } from '@repositories/testing'
import { licensee as licenseeFactory } from '@factories/licensee'
import { template as templateFactory } from '@factories/template'

describe('TemplatesQuery', () => {
  let repos: ReturnType<typeof installMemoryRepositories>['repositories']
  let licensee: any

  beforeEach(async () => {
    ;({ repositories: repos } = installMemoryRepositories())
    licensee = await repos.licenseeRepository.create(licenseeFactory.build())
  })

  afterEach(() => {
    resetMemoryRepositories()
  })

  const buildTemplatesQuery = () => new TemplatesQuery({ templateRepository: repos.templateRepository })

  it('returns all templates ordered by createdAt asc', async () => {
    const template1 = await repos.templateRepository.create(
      templateFactory.build({ licensee, createdAt: new Date(2021, 6, 3, 0, 0, 0) }),
    )
    const template2 = await repos.templateRepository.create(
      templateFactory.build({ licensee, createdAt: new Date(2021, 6, 3, 0, 0, 1) }),
    )

    const templatesQuery = buildTemplatesQuery()
    const records = await templatesQuery.all()

    expect(records.length).toEqual(2)
    expect(records[0]).toEqual(expect.objectContaining({ _id: template1._id }))
    expect(records[1]).toEqual(expect.objectContaining({ _id: template2._id }))
  })

  describe('about pagination', () => {
    it('returns all by page respecting the limit', async () => {
      const template1 = await repos.templateRepository.create(
        templateFactory.build({
          licensee,
          createdAt: new Date(2021, 6, 3, 0, 0, 0),
        }),
      )
      const template2 = await repos.templateRepository.create(
        templateFactory.build({
          licensee,
          createdAt: new Date(2021, 6, 3, 0, 0, 1),
        }),
      )
      const template3 = await repos.templateRepository.create(
        templateFactory.build({
          licensee,
          createdAt: new Date(2021, 6, 3, 0, 0, 2),
        }),
      )

      const templatesQuery = buildTemplatesQuery()
      templatesQuery.page(1)
      templatesQuery.limit(2)

      let records = await templatesQuery.all()

      expect(records.length).toEqual(2)
      expect(records[0]).toEqual(expect.objectContaining({ _id: template1._id }))
      expect(records[1]).toEqual(expect.objectContaining({ _id: template2._id }))

      templatesQuery.page(2)
      records = await templatesQuery.all()

      expect(records.length).toEqual(1)
      expect(records[0]).toEqual(expect.objectContaining({ _id: template3._id }))

      templatesQuery.page(1)
      templatesQuery.limit(1)

      records = await templatesQuery.all()

      expect(records.length).toEqual(1)
      expect(records[0]).toEqual(expect.objectContaining({ _id: template1._id }))
    })
  })

  describe('filterByLicensee', () => {
    it('returns templates filtered by licensee', async () => {
      const template1 = await repos.templateRepository.create(
        templateFactory.build({ licensee, createdAt: new Date(2021, 6, 3, 0, 0, 0) }),
      )

      const anotherLicensee = await repos.licenseeRepository.create(licenseeFactory.build({ name: 'Wolf e cia' }))
      const template2 = await repos.templateRepository.create(
        templateFactory.build({ licensee: anotherLicensee._id, createdAt: new Date(2021, 6, 3, 0, 0, 1) }),
      )

      const templatesQuery = buildTemplatesQuery()
      templatesQuery.filterByLicensee(licensee._id)

      const records = await templatesQuery.all()

      expect(records.length).toEqual(1)
      expect(records).toEqual(expect.arrayContaining([expect.objectContaining({ _id: template1._id })]))
      expect(records).not.toEqual(expect.arrayContaining([expect.objectContaining({ _id: template2._id })]))
    })
  })

  describe('filterByExpression', () => {
    it('returns licensees filtered by expression on name, expression, catalogMulti, catalogSingle, textReplyButton and messagesList', async () => {
      const template1 = await repos.templateRepository.create(templateFactory.build({ name: 'template1', licensee }))
      const template2 = await repos.templateRepository.create(
        templateFactory.build({ namespace: 'template2', licensee }),
      )

      const templatesQuery = buildTemplatesQuery()
      templatesQuery.filterByExpression('template')
      let records = await templatesQuery.all()

      expect(records.length).toEqual(2)
      expect(records).toEqual(expect.arrayContaining([expect.objectContaining({ _id: template1._id })]))
      expect(records).toEqual(expect.arrayContaining([expect.objectContaining({ _id: template2._id })]))

      templatesQuery.filterByExpression('template1')
      records = await templatesQuery.all()

      expect(records.length).toEqual(1)
      expect(records).toEqual(expect.arrayContaining([expect.objectContaining({ _id: template1._id })]))
      expect(records).not.toEqual(expect.arrayContaining([expect.objectContaining({ _id: template2._id })]))

      templatesQuery.filterByExpression('template2')
      records = await templatesQuery.all()

      expect(records.length).toEqual(1)
      expect(records).toEqual(expect.arrayContaining([expect.objectContaining({ _id: template2._id })]))
      expect(records).not.toEqual(expect.arrayContaining([expect.objectContaining({ _id: template1._id })]))
    })
  })
})
