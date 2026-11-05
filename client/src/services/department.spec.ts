import * as auth from './auth'
import * as apiModule from './api'
import {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentBaileysStatus,
  getDepartmentBaileysQr,
  syncDepartmentBaileys,
  getDepartmentWppconnectServerStatus,
  getDepartmentWppconnectServerQr,
} from './department'

vi.mock('./auth')
vi.mock('./api')

describe('department service', () => {
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
    await getDepartments({})
    expect(mockGet).toHaveBeenCalledWith(
      expect.any(String),
      { headers: { 'x-access-token': 'token-after-login' } }
    )
  })

  describe('getDepartments', () => {
    it('sends GET to resources/departments/ with auth header and query params', async () => {
      await getDepartments({ page: 1, licensee: 'lic-id' })
      expect(mockGet).toHaveBeenCalledWith(
        'resources/departments/?page=1&licensee=lic-id',
        { headers: { 'x-access-token': 'test-token' } }
      )
    })
  })

  describe('getDepartment', () => {
    it('sends GET to resources/departments/:id with auth header', async () => {
      await getDepartment('department-id')
      expect(mockGet).toHaveBeenCalledWith(
        'resources/departments/department-id',
        { headers: { 'x-access-token': 'test-token' } }
      )
    })
  })

  describe('createDepartment', () => {
    it('sends POST to resources/departments/ with auth header and body', async () => {
      const values = { name: 'Suporte', active: true }
      await createDepartment(values)
      expect(mockPost).toHaveBeenCalledWith(
        'resources/departments/',
        { body: values, headers: { 'x-access-token': 'test-token' } }
      )
    })
  })

  describe('updateDepartment', () => {
    it('sends POST to resources/departments/:id with auth header and body', async () => {
      const department = { id: 'department-id', name: 'Suporte Updated' }
      await updateDepartment(department)
      expect(mockPost).toHaveBeenCalledWith(
        'resources/departments/department-id',
        { headers: { 'x-access-token': 'test-token' }, body: department }
      )
    })
  })

  describe('deleteDepartment', () => {
    it('sends DELETE to resources/departments/:id with auth header', async () => {
      await deleteDepartment('department-id')
      expect(mockDelete).toHaveBeenCalledWith(
        'resources/departments/department-id',
        { headers: { 'x-access-token': 'test-token' } }
      )
    })
  })

  describe('getDepartmentBaileysStatus', () => {
    it('sends GET to resources/departments/:id/baileys-status', async () => {
      await getDepartmentBaileysStatus({ id: 'department-id' })
      expect(mockGet).toHaveBeenCalledWith(
        'resources/departments/department-id/baileys-status',
        { headers: { 'x-access-token': 'test-token' } }
      )
    })
  })

  describe('getDepartmentBaileysQr', () => {
    it('sends POST to resources/departments/:id/baileys-qr', async () => {
      await getDepartmentBaileysQr({ id: 'department-id' })
      expect(mockPost).toHaveBeenCalledWith(
        'resources/departments/department-id/baileys-qr',
        { headers: { 'x-access-token': 'test-token' } }
      )
    })
  })

  describe('syncDepartmentBaileys', () => {
    it('sends POST to resources/departments/:id/baileys-sync', async () => {
      await syncDepartmentBaileys({ id: 'department-id' })
      expect(mockPost).toHaveBeenCalledWith(
        'resources/departments/department-id/baileys-sync',
        { headers: { 'x-access-token': 'test-token' } }
      )
    })
  })

  describe('getDepartmentWppconnectServerStatus', () => {
    it('sends GET to resources/departments/:id/wppconnect-server-status', async () => {
      await getDepartmentWppconnectServerStatus({ id: 'department-id' })
      expect(mockGet).toHaveBeenCalledWith(
        'resources/departments/department-id/wppconnect-server-status',
        { headers: { 'x-access-token': 'test-token' } }
      )
    })
  })

  describe('getDepartmentWppconnectServerQr', () => {
    it('sends POST to resources/departments/:id/wppconnect-server-qr', async () => {
      await getDepartmentWppconnectServerQr({ id: 'department-id' })
      expect(mockPost).toHaveBeenCalledWith(
        'resources/departments/department-id/wppconnect-server-qr',
        { headers: { 'x-access-token': 'test-token' } }
      )
    })
  })
})
