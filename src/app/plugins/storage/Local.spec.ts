import fs from 'fs'

jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined)
jest.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined)

const mkdirSyncMock = fs.mkdirSync as jest.Mock
const writeFileSyncMock = fs.writeFileSync as jest.Mock

import { LocalStorage } from './Local'

describe('LocalStorage', () => {
  const licensee = { _id: 'lic1' }
  const contact = { number: '5511999990001' }
  const fileName = 'test.jpg'
  const rawBase64 = '/9j/abc123'
  const fileBase64WithPrefix = `data:image/jpeg;base64,${rawBase64}`

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('uploadFile', () => {
    it('saves the decoded base64 file to LOCAL_STORAGE_PATH/<date>/<number>/<fileName>', async () => {
      const storage = new LocalStorage(licensee, contact, fileName, fileBase64WithPrefix)
      await storage.uploadFile()

      const [writtenPath] = writeFileSyncMock.mock.calls[0]
      expect(writtenPath).toMatch(new RegExp(`${contact.number}[/\\\\]${fileName}$`))
    })

    it('creates intermediate directories if they do not exist', async () => {
      const storage = new LocalStorage(licensee, contact, fileName, fileBase64WithPrefix)
      await storage.uploadFile()

      expect(mkdirSyncMock).toHaveBeenCalledWith(expect.any(String), { recursive: true })
    })

    it('strips the data URI prefix before writing', async () => {
      const storage = new LocalStorage(licensee, contact, fileName, fileBase64WithPrefix)
      await storage.uploadFile()

      const [, writtenBuffer] = writeFileSyncMock.mock.calls[0]
      const expectedBuffer = Buffer.from(rawBase64, 'base64')
      expect((writtenBuffer as Buffer).equals(expectedBuffer)).toBe(true)
    })

    it('handles base64 without data URI prefix', async () => {
      const storage = new LocalStorage(licensee, contact, fileName, rawBase64)
      await storage.uploadFile()

      const [, writtenBuffer] = writeFileSyncMock.mock.calls[0]
      const expectedBuffer = Buffer.from(rawBase64, 'base64')
      expect((writtenBuffer as Buffer).equals(expectedBuffer)).toBe(true)
    })
  })

  describe('presignedUrl', () => {
    it('returns APP_URL/uploads/<date>/<number>/<fileName>', async () => {
      const storage = new LocalStorage(licensee, contact, fileName, '')
      const url = await storage.presignedUrl()

      expect(url).toMatch(new RegExp(`/uploads/.+[/\\\\]${contact.number}[/\\\\]${fileName}$`))
    })

    it('uses http://localhost:5001 as default APP_URL when env var is not set', async () => {
      const originalAppUrl = process.env.APP_URL
      delete process.env.APP_URL

      let Fresh: typeof LocalStorage
      jest.isolateModules(() => {
        Fresh = require('./Local').LocalStorage
      })

      const storage = new Fresh!(licensee, contact, fileName, '')
      const url = await storage.presignedUrl()

      expect(url).toMatch(/^http:\/\/localhost:5001\/uploads\//)

      if (originalAppUrl !== undefined) process.env.APP_URL = originalAppUrl
    })
  })
})
