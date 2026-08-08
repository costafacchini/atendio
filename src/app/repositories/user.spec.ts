import { UserRepositoryMemory } from '@repositories/user'
import { LicenseeRepositoryMemory } from '@repositories/licensee'
import { user as userFactory } from '@factories/user'
import { licensee as licenseeFactory } from '@factories/licensee'

describe('user repository memory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('#create', () => {
    it('creates a user with hashed password', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()
      const licensee = await licenseeRepository.create(licenseeFactory.build())

      const userRepository = new UserRepositoryMemory()
      const user = await userRepository.create(userFactory.build({ licensee: licensee._id }))

      expect(user).toEqual(
        expect.objectContaining({
          name: 'Raymond Reddington',
          email: 'raymond@reddington.com',
          active: true,
          role: 'agent',
          licensee: licensee._id,
        }),
      )
      expect(await user.validPassword('12345678')).toEqual(true)
    })
  })

  describe('#update', () => {
    it('updates a user field', async () => {
      const licenseeRepository = new LicenseeRepositoryMemory()
      const licensee = await licenseeRepository.create(licenseeFactory.build())

      const userRepository = new UserRepositoryMemory()
      const user = await userRepository.create(userFactory.build({ licensee: licensee._id }))

      await userRepository.update(user._id, { active: false })

      const userSaved = await userRepository.findFirst({ _id: user._id })
      expect(userSaved.active).toEqual(false)
    })
  })

  describe('#save', () => {
    it('hashes password on save when not already hashed', async () => {
      const userRepository = new UserRepositoryMemory()
      const user = await userRepository.create(userFactory.build())

      await userRepository.save({ ...user, password: 'newpassword' })

      const saved = await userRepository.findFirst({ _id: user._id })
      expect(await saved.validPassword('newpassword')).toEqual(true)
    })
  })
})
