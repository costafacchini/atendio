import { FakeScaler } from './FakeScaler'

describe('FakeScaler', () => {
  let scaler: FakeScaler

  beforeEach(() => {
    scaler = new FakeScaler()
  })

  describe('getCurrentWorkerCount', () => {
    it('always returns 0', async () => {
      expect(await scaler.getCurrentWorkerCount()).toBe(0)
    })
  })

  describe('setWorkerCount', () => {
    it('resolves without throwing', async () => {
      await expect(scaler.setWorkerCount(5)).resolves.toBeUndefined()
    })

    it('resolves when target is 0', async () => {
      await expect(scaler.setWorkerCount(0)).resolves.toBeUndefined()
    })

    it('does not make any network calls', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch')

      await scaler.setWorkerCount(3)

      expect(fetchSpy).not.toHaveBeenCalled()
      fetchSpy.mockRestore()
    })
  })
})
