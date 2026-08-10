import { TemplateRepositoryMemory, createTemplate } from '@repositories/template'
import { LicenseeRepositoryMemory } from '@repositories/licensee'
import { licensee as licenseeFactory } from '@factories/licensee'

describe('template repository memory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('#createTemplate', () => {
    it('creates a template', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()
      const licensee = await licenseeRepository.create(licenseeFactory.build())
      const templateRepository = new TemplateRepositoryMemory()

      const template = await createTemplate(
        {
          licensee: licensee._id,
          name: 'template',
          namespace: 'Namespace',
        },
        { templateRepository },
      )

      expect(template).toEqual(
        expect.objectContaining({
          licensee: licensee._id,
          name: 'template',
          namespace: 'Namespace',
        }),
      )
    })
  })
})
