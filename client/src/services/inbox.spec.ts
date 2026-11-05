import * as auth from './auth'
import * as apiModule from './api'
import {
  getInboxes,
  getInbox,
  createInbox,
  updateInbox,
  deleteInbox,
  getInboxBaileysStatus,
  getInboxBaileysQr,
  syncInboxBaileys,
  getInboxWppconnectServerV2Status,
  getInboxWppconnectServerV2Qr,
} from './inbox'

vi.mock('./auth')
vi.mock('./api')

describe('inbox service', () => {
  let mockGet: any
  let mockPost: any
  let mockDelete: any

  beforeEach(() => {
    mockGet = vi.fn().mockResolvedValue({ data: [] })
    mockPost = vi.fn().mockResolvedValue({ data: {} })
    mockDelete = vi.fn().mockResolvedValue({ data: {} })
    ;(apiModule.default as any).mockReturnValue({ get: mockGet, post: mockPost, delete: mockDelete })
    ;(auth.getToken as any).mockReturnValue('test-token')
  })

  it('reads the token at call time, not at module initialization', async () => {
    ;(auth.getToken as any).mockReturnValue('token-after-login')
    await getInboxes({ licensee: 'lic-id' })
    expect(mockGet).toHaveBeenCalledWith(
      expect.any(String),
      { headers: { 'x-access-token': 'token-after-login' } }
    )
  })

  describe('getInboxes', () => {
    it('sends GET to resources/inboxes/ with auth header and query params', async () => {
      await getInboxes({ licensee: 'lic-id' })
      expect(mockGet).toHaveBeenCalledWith(
        'resources/inboxes/?licensee=lic-id',
        { headers: { 'x-access-token': 'test-token' } }
      )
    })
  })

  describe('getInbox', () => {
    it('sends GET to resources/inboxes/:id with auth header', async () => {
      await getInbox('inbox-id')
      expect(mockGet).toHaveBeenCalledWith(
        'resources/inboxes/inbox-id',
        { headers: { 'x-access-token': 'test-token' } }
      )
    })
  })

  describe('createInbox', () => {
    it('sends POST to resources/inboxes/ with auth header and body', async () => {
      const data = { name: 'WhatsApp Principal', kind: 'messenger', active: true }
      await createInbox(data)
      expect(mockPost).toHaveBeenCalledWith(
        'resources/inboxes/',
        { body: data, headers: { 'x-access-token': 'test-token' } }
      )
    })
  })

  describe('updateInbox', () => {
    it('sends POST to resources/inboxes/:id with auth header and body', async () => {
      const data = { name: 'WhatsApp Updated', active: false }
      await updateInbox('inbox-id', data)
      expect(mockPost).toHaveBeenCalledWith(
        'resources/inboxes/inbox-id',
        { headers: { 'x-access-token': 'test-token' }, body: data }
      )
    })
  })

  describe('deleteInbox', () => {
    it('sends DELETE to resources/inboxes/:id with auth header', async () => {
      await deleteInbox('inbox-id')
      expect(mockDelete).toHaveBeenCalledWith(
        'resources/inboxes/inbox-id',
        { headers: { 'x-access-token': 'test-token' } }
      )
    })
  })

  describe('getInboxBaileysStatus', () => {
    it('sends GET to resources/inboxes/:id/baileys-status', async () => {
      await getInboxBaileysStatus('inbox-id')
      expect(mockGet).toHaveBeenCalledWith(
        'resources/inboxes/inbox-id/baileys-status',
        { headers: { 'x-access-token': 'test-token' } }
      )
    })
  })

  describe('getInboxBaileysQr', () => {
    it('sends POST to resources/inboxes/:id/baileys-qr', async () => {
      await getInboxBaileysQr('inbox-id')
      expect(mockPost).toHaveBeenCalledWith(
        'resources/inboxes/inbox-id/baileys-qr',
        { headers: { 'x-access-token': 'test-token' } }
      )
    })
  })

  describe('syncInboxBaileys', () => {
    it('sends POST to resources/inboxes/:id/baileys-sync', async () => {
      await syncInboxBaileys('inbox-id')
      expect(mockPost).toHaveBeenCalledWith(
        'resources/inboxes/inbox-id/baileys-sync',
        { headers: { 'x-access-token': 'test-token' } }
      )
    })
  })

  describe('getInboxWppconnectServerV2Status', () => {
    it('sends GET to resources/inboxes/:id/wppconnect-server-v2-status', async () => {
      await getInboxWppconnectServerV2Status('inbox-id')
      expect(mockGet).toHaveBeenCalledWith(
        'resources/inboxes/inbox-id/wppconnect-server-v2-status',
        { headers: { 'x-access-token': 'test-token' } }
      )
    })
  })

  describe('getInboxWppconnectServerV2Qr', () => {
    it('sends POST to resources/inboxes/:id/wppconnect-server-v2-qr', async () => {
      await getInboxWppconnectServerV2Qr('inbox-id')
      expect(mockPost).toHaveBeenCalledWith(
        'resources/inboxes/inbox-id/wppconnect-server-v2-qr',
        { headers: { 'x-access-token': 'test-token' } }
      )
    })
  })
})
