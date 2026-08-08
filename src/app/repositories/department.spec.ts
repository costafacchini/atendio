import { LicenseeRepositoryMemory } from '@repositories/licensee'
import { DepartmentRepositoryMemory } from '@repositories/department'
import { licensee as licenseeFactory } from '@factories/licensee'

describe('department repository memory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('#create', () => {
    it('creates a department', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()
      const licensee = await licenseeRepository.create(licenseeFactory.build())

      const departmentRepository = new DepartmentRepositoryMemory()
      const department = await departmentRepository.create({
        name: 'Vendas',
        licensee: licensee._id,
        users: ['aabbccddeeff001122334455'],
        active: true,
        departmentToken: 'token-123',
      })

      expect(department).toEqual(
        expect.objectContaining({
          name: 'Vendas',
          active: true,
        }),
      )
    })
  })

  describe('#find', () => {
    it('filters by licensee', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()
      const licensee = await licenseeRepository.create(licenseeFactory.build())
      const otherLicensee = await licenseeRepository.create(licenseeFactory.build())

      const departmentRepository = new DepartmentRepositoryMemory()
      await departmentRepository.create({
        name: 'Vendas',
        licensee: licensee._id,
        users: [],
        departmentToken: 'tok-1',
      })
      await departmentRepository.create({
        name: 'Suporte',
        licensee: otherLicensee._id,
        users: [],
        departmentToken: 'tok-2',
      })

      const departments = await departmentRepository.find({ licensee: licensee._id })

      expect(departments).toHaveLength(1)
      expect(departments[0].name).toEqual('Vendas')
    })
  })
})
