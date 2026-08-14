import { licenseeComplete as licenseeCompleteFactory } from '@factories/licensee'
import { LicenseeRepositoryMemory } from '@repositories/licensee'
import { CreateLicensee } from './CreateLicensee'

describe('CreateLicensee', () => {
  it('creates a licensee with the mapped fields and ignores unknown fields', async () => {
    const licenseeRepository = new LicenseeRepositoryMemory()
    const createLicensee = new CreateLicensee({ licenseeRepository })

    const licensee = await createLicensee.execute({
      ...licenseeCompleteFactory.build(),
      ignoredField: 'ignored',
    })

    expect(licensee).toEqual(
      expect.objectContaining({
        name: 'Alcateia Ltds',
        email: 'alcateia@alcateia.com',
      }),
    )
    expect(licensee.ignoredField).toBeUndefined()
  })

  it('always sets active to true regardless of what is passed', async () => {
    const licenseeRepository = new LicenseeRepositoryMemory()
    const createLicensee = new CreateLicensee({ licenseeRepository })

    const licensee = await createLicensee.execute({
      ...licenseeCompleteFactory.build(),
      active: false,
    })

    expect(licensee.active).toBe(true)
  })
})
