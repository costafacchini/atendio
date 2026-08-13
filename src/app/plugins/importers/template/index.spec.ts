import Template from '@models/Template'
import { Dialog } from '@plugins/messengers/Dialog'
import { TemplatesImporter } from '@plugins/importers/template/index'
import { licensee as licenseeFactory } from '@factories/licensee'
import { inbox as inboxFactory } from '@factories/inbox'
import { template as templateFactory } from '@factories/template'
import { installMemoryRepositories, resetMemoryRepositories } from '@repositories/testing'
import { LicenseeRepositoryDatabase } from '@repositories/licensee'
import { InboxRepositoryDatabase } from '@repositories/inbox'
import { createRuntimeDependencies } from '../../../runtime/dependencies'

let dependencies

describe('TemplatesImporter', () => {
  beforeAll(() => {
    installMemoryRepositories()
    dependencies = createRuntimeDependencies()
  })

  afterAll(() => {
    resetMemoryRepositories()
  })

  it('imports the templates of whatsapp', async () => {
    const licenseeRepository = new LicenseeRepositoryDatabase()
    const inboxRepository = new InboxRepositoryDatabase()
    const licensee = await licenseeRepository.create(licenseeFactory.build())
    await inboxRepository.create(
      inboxFactory.build({
        licensee: licensee._id,
        kind: 'messenger',
        whatsappDefault: 'dialog',
        whatsappUrl: 'https://dialog.com',
        whatsappToken: 'token',
      }),
    )
    const template = await Template.create(templateFactory.build({ licensee }))

    jest.spyOn(Dialog.prototype, 'searchTemplates').mockImplementation(() => {
      return [
        {
          name: 'sample_movie_ticket_confirmation',
          namespace: '93aa6bf3_3bfc_4840_a76c_0f43073739e2',
          licensee: licensee,
          language: 'en',
          active: true,
          cagtegory: 'TICKET_UPDATE',
        },
        {
          name: 'sample_movie_ticket',
          namespace: '93aa6bf3_3bfc_4840_a76c_0f43073739e2',
          licensee: licensee,
          language: 'en',
          active: true,
          cagtegory: 'TICKET_UPDATE',
        },
      ]
    })

    const templatesImporter = new TemplatesImporter(licensee._id, dependencies)
    await templatesImporter.import()

    const oldTemplate = await Template.findById(template._id)
    expect(oldTemplate).toEqual(null)
    expect(await Template.where({ licensee }).countDocuments()).toEqual(2)
  })
})
