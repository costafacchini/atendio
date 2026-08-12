const fetchMock = jest.fn()
global.fetch = fetchMock as unknown as typeof globalThis.fetch

import { HerokuScaler } from './HerokuScaler'

const appName = 'my-heroku-app'
const token = 'test-token-abc'
const workerTypes = ['worker', 'worker2', 'worker3']

function mockOkResponse(body: object) {
  return { ok: true, text: () => Promise.resolve(JSON.stringify(body)) } as unknown as Response
}

function mockErrorResponse(status: number, body = 'Bad Request') {
  return { ok: false, status, text: () => Promise.resolve(body) } as unknown as Response
}

describe('HerokuScaler', () => {
  let scaler: HerokuScaler

  beforeEach(() => {
    fetchMock.mockReset()
    scaler = new HerokuScaler({ appName, token, workerTypes })
  })

  describe('getCurrentWorkerCount', () => {
    it('returns the sum of active quantities across all worker types', async () => {
      fetchMock
        .mockResolvedValueOnce(mockOkResponse({ quantity: 1 }))
        .mockResolvedValueOnce(mockOkResponse({ quantity: 1 }))
        .mockResolvedValueOnce(mockOkResponse({ quantity: 0 }))

      const count = await scaler.getCurrentWorkerCount()

      expect(count).toBe(2)
    })

    it('calls GET /apps/{appName}/formation/{type} for each worker type', async () => {
      fetchMock.mockResolvedValue(mockOkResponse({ quantity: 0 }))

      await scaler.getCurrentWorkerCount()

      expect(fetchMock).toHaveBeenCalledTimes(3)
      expect(fetchMock).toHaveBeenCalledWith(
        `https://api.heroku.com/apps/${appName}/formation/worker`,
        expect.objectContaining({ method: 'GET' }),
      )
      expect(fetchMock).toHaveBeenCalledWith(
        `https://api.heroku.com/apps/${appName}/formation/worker2`,
        expect.objectContaining({ method: 'GET' }),
      )
    })

    it('sends the Bearer token in the Authorization header', async () => {
      fetchMock.mockResolvedValue(mockOkResponse({ quantity: 0 }))

      await scaler.getCurrentWorkerCount()

      const [, init] = fetchMock.mock.calls[0]
      expect(init.headers['Authorization']).toBe(`Bearer ${token}`)
    })

    it('returns 0 when all workers are inactive', async () => {
      fetchMock.mockResolvedValue(mockOkResponse({ quantity: 0 }))

      expect(await scaler.getCurrentWorkerCount()).toBe(0)
    })

    it('throws with worker type and status when the API returns an error', async () => {
      fetchMock.mockResolvedValueOnce(mockErrorResponse(401, 'Unauthorized'))

      await expect(scaler.getCurrentWorkerCount()).rejects.toThrow(/worker.*401/i)
    })
  })

  describe('setWorkerCount', () => {
    it('enables the first N worker types and disables the rest', async () => {
      fetchMock.mockResolvedValue(mockOkResponse({}))

      await scaler.setWorkerCount(2)

      const bodies = fetchMock.mock.calls.map(([, init]: [string, any]) => JSON.parse(init.body as string))
      expect(bodies[0]).toEqual({ quantity: 1 }) // worker
      expect(bodies[1]).toEqual({ quantity: 1 }) // worker2
      expect(bodies[2]).toEqual({ quantity: 0 }) // worker3
    })

    it('disables all workers when target is 0', async () => {
      fetchMock.mockResolvedValue(mockOkResponse({}))

      await scaler.setWorkerCount(0)

      const bodies = fetchMock.mock.calls.map(([, init]: [string, any]) => JSON.parse(init.body as string))
      expect(bodies.every((b) => b.quantity === 0)).toBe(true)
    })

    it('enables all workers when target equals the number of worker types', async () => {
      fetchMock.mockResolvedValue(mockOkResponse({}))

      await scaler.setWorkerCount(3)

      const bodies = fetchMock.mock.calls.map(([, init]: [string, any]) => JSON.parse(init.body as string))
      expect(bodies.every((b) => b.quantity === 1)).toBe(true)
    })

    it('calls PATCH /apps/{appName}/formation/{type} for each worker type', async () => {
      fetchMock.mockResolvedValue(mockOkResponse({}))

      await scaler.setWorkerCount(1)

      expect(fetchMock).toHaveBeenCalledTimes(3)
      expect(fetchMock).toHaveBeenCalledWith(
        `https://api.heroku.com/apps/${appName}/formation/worker`,
        expect.objectContaining({ method: 'PATCH' }),
      )
    })

    it('throws with worker type and status when any PATCH returns an error', async () => {
      fetchMock
        .mockResolvedValueOnce(mockOkResponse({}))
        .mockResolvedValueOnce(mockErrorResponse(422, 'Unprocessable'))
        .mockResolvedValueOnce(mockOkResponse({}))

      await expect(scaler.setWorkerCount(2)).rejects.toThrow(/worker2.*422/i)
    })
  })
})
