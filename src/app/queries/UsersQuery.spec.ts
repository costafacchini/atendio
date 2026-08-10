import { UsersQuery } from '@queries/UsersQuery'
import { installMemoryRepositories, resetMemoryRepositories } from '@repositories/testing'
import { user as userFactory } from '@factories/user'
import { licensee as licenseeFactory } from '@factories/licensee'

describe('UsersQuery', () => {
  let repos: ReturnType<typeof installMemoryRepositories>['repositories']
  let licensee: any

  beforeEach(async () => {
    ;({ repositories: repos } = installMemoryRepositories())
    licensee = await repos.licenseeRepository.create(licenseeFactory.build())
  })

  afterEach(() => {
    resetMemoryRepositories()
  })

  const buildUsersQuery = () => new UsersQuery({ userRepository: repos.userRepository })

  it('returns all users ordered by createdAt asc', async () => {
    const user1 = await repos.userRepository.create(
      userFactory.build({
        licensee: licensee._id,
        email: 'user1@test.com',
        createdAt: new Date(2021, 6, 3, 0, 0, 0),
      }),
    )
    const user2 = await repos.userRepository.create(
      userFactory.build({
        licensee: licensee._id,
        email: 'user2@test.com',
        createdAt: new Date(2021, 6, 3, 0, 0, 1),
      }),
    )

    const usersQuery = buildUsersQuery()
    const records = await usersQuery.all()

    expect(records.length).toEqual(2)
    expect(records[0]).toEqual(expect.objectContaining({ _id: user1._id }))
    expect(records[1]).toEqual(expect.objectContaining({ _id: user2._id }))
  })

  describe('about pagination', () => {
    it('returns all by page respecting the limit', async () => {
      const user1 = await repos.userRepository.create(
        userFactory.build({
          licensee: licensee._id,
          email: 'user1@test.com',
          createdAt: new Date(2021, 6, 3, 0, 0, 0),
        }),
      )
      const user2 = await repos.userRepository.create(
        userFactory.build({
          licensee: licensee._id,
          email: 'user2@test.com',
          createdAt: new Date(2021, 6, 3, 0, 0, 1),
        }),
      )
      const user3 = await repos.userRepository.create(
        userFactory.build({
          licensee: licensee._id,
          email: 'user3@test.com',
          createdAt: new Date(2021, 6, 3, 0, 0, 2),
        }),
      )

      const usersQuery = buildUsersQuery()
      usersQuery.page(1)
      usersQuery.limit(2)

      let records = await usersQuery.all()

      expect(records.length).toEqual(2)
      expect(records[0]).toEqual(expect.objectContaining({ _id: user1._id }))
      expect(records[1]).toEqual(expect.objectContaining({ _id: user2._id }))

      usersQuery.page(2)
      records = await usersQuery.all()

      expect(records.length).toEqual(1)
      expect(records[0]).toEqual(expect.objectContaining({ _id: user3._id }))

      usersQuery.page(1)
      usersQuery.limit(1)

      records = await usersQuery.all()

      expect(records.length).toEqual(1)
      expect(records[0]).toEqual(expect.objectContaining({ _id: user1._id }))
    })
  })

  describe('filterByLicensee', () => {
    it('returns users filtered by licensee', async () => {
      const user1 = await repos.userRepository.create(
        userFactory.build({
          licensee,
          createdAt: new Date(2021, 6, 3, 0, 0, 0),
        }),
      )

      const anotherLicensee = await repos.licenseeRepository.create(licenseeFactory.build({ name: 'Wolf e cia' }))
      const user2 = await repos.userRepository.create(
        userFactory.build({
          licensee: anotherLicensee._id,
          createdAt: new Date(2021, 6, 3, 0, 0, 1),
        }),
      )

      const usersQuery = buildUsersQuery()
      usersQuery.filterByLicensee(licensee._id)

      const records = await usersQuery.all()

      expect(records.length).toEqual(1)
      expect(records).toEqual(expect.arrayContaining([expect.objectContaining({ _id: user1._id })]))
      expect(records).not.toEqual(expect.arrayContaining([expect.objectContaining({ _id: user2._id })]))
    })
  })

  describe('filterByExpression', () => {
    it('returns users filtered by expression on name and email', async () => {
      const user1 = await repos.userRepository.create(
        userFactory.build({
          licensee: licensee._id,
          name: 'Mary Ltda',
          email: 'maryltda@china.com',
        }),
      )
      const user2 = await repos.userRepository.create(
        userFactory.build({
          licensee: licensee._id,
          name: 'Doeland',
          email: 'doeland@china.com',
        }),
      )

      const usersQuery = buildUsersQuery()
      usersQuery.filterByExpression('Mary')
      let records = await usersQuery.all()

      expect(records.length).toEqual(1)
      expect(records).toEqual(expect.arrayContaining([expect.objectContaining({ _id: user1._id })]))
      expect(records).not.toEqual(expect.arrayContaining([expect.objectContaining({ _id: user2._id })]))

      usersQuery.filterByExpression('CHINA')
      records = await usersQuery.all()

      expect(records.length).toEqual(2)
      expect(records).toEqual(expect.arrayContaining([expect.objectContaining({ _id: user1._id })]))
      expect(records).toEqual(expect.arrayContaining([expect.objectContaining({ _id: user2._id })]))
    })
  })
})
