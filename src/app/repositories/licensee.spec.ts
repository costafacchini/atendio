import { LicenseeRepositoryMemory } from '@repositories/licensee'
import { licensee as licenseeFactory } from '@factories/licensee'

describe('licensee repository memory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('#create', () => {
    it('creates a new licensee', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()
      const licenseeSaved = await licenseeRepository.create({
        name: 'Alcateia Ltds',
        active: true,
        licenseKind: 'demo',
        apiToken: 'token-abc',
      })

      expect(licenseeSaved._id).toBeDefined()
      expect(licenseeSaved.name).toEqual('Alcateia Ltds')
      expect(licenseeSaved.active).toEqual(true)
      expect(licenseeSaved.licenseKind).toEqual('demo')
    })
  })

  describe('#findFirst', () => {
    it('finds a licensee', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()

      await licenseeRepository.create(licenseeFactory.build({ name: 'Company One' }))
      await licenseeRepository.create(licenseeFactory.build({ name: 'Company Two', active: true }))
      await licenseeRepository.create(licenseeFactory.build({ name: 'Company Two', active: false }))

      let result = await licenseeRepository.findFirst()
      expect(result).toEqual(expect.objectContaining({ name: 'Company One' }))

      result = await licenseeRepository.findFirst({ name: 'Company Two' })
      expect(result).toEqual(expect.objectContaining({ name: 'Company Two', active: true }))
    })
  })

  describe('#update', () => {
    it('updates licensee', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()
      const licensee = await licenseeRepository.create(licenseeFactory.build({ name: 'Alcateia Ltds' }))

      const status = await licenseeRepository.update(licensee._id, { name: 'Name Updated' })
      expect(status.acknowledged).toEqual(true)

      const updated = await licenseeRepository.findFirst({ _id: licensee._id })
      expect(updated.name).toEqual('Name Updated')
    })
  })

  describe('#find', () => {
    it('finds licensees by filter', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()

      await licenseeRepository.create(licenseeFactory.build({ name: 'Company One', active: true }))
      await licenseeRepository.create(licenseeFactory.build({ name: 'Company Two', active: true }))
      await licenseeRepository.create(licenseeFactory.build({ name: 'Company Three', active: false }))

      const result = await licenseeRepository.find({ active: true })
      expect(result.length).toEqual(2)
    })
  })

  describe('normalizeLicenseeFields', () => {
    it('sets whatsappUrl for utalk', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()
      const licensee = await licenseeRepository.create(licenseeFactory.build({ whatsappDefault: 'utalk' }))
      expect(licensee.whatsappUrl).toEqual('https://v1.utalk.chat/send/')
    })

    it('sets whatsappUrl for dialog', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()
      const licensee = await licenseeRepository.create(licenseeFactory.build({ whatsappDefault: 'dialog' }))
      expect(licensee.whatsappUrl).toEqual('https://waba.360dialog.io/')
    })
  })
})
