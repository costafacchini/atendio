import { licensee as licenseeFactory } from '@factories/licensee'
import { LicenseeRepositoryMemory } from '@repositories/licensee'
import { UpdateLicensee } from './UpdateLicensee'

describe('UpdateLicensee', () => {
  it('updates a licensee with permitted fields and ignores unknown fields', async () => {
    const licenseeRepository = new LicenseeRepositoryMemory()
    const updateLicensee = new UpdateLicensee({ licenseeRepository })
    const licensee = await licenseeRepository.create(licenseeFactory.build())

    const updatedLicensee = await updateLicensee.execute(licensee._id, {
      _id: 'ignored',
      name: 'Name modified',
    })

    expect(updatedLicensee).toEqual(
      expect.objectContaining({
        _id: licensee._id,
        name: 'Name modified',
      }),
    )
  })
})
