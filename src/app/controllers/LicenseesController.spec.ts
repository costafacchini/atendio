import { LicenseeRepositoryMemory } from '@repositories/licensee'
import { LicenseesController } from './LicenseesController'
import { WEBHOOK_CONFIGURED_MESSAGE } from '../usecases/licensees/SetDialogWebhook'

function buildResponse() {
  return {
    json: jest.fn(),
    send: jest.fn(),
    status: jest.fn().mockReturnThis(),
  }
}

async function runValidations(controller, req) {
  const validations = controller.validations()

  for (const validation of validations) {
    await validation.run(req)
  }
}

function buildController() {
  const licenseeRepository = new LicenseeRepositoryMemory()
  const userRepository = { findFirst: jest.fn().mockResolvedValue({ blockedLicensees: [] }) }
  const licenseesQueryInstance = {
    page: jest.fn(),
    limit: jest.fn(),
    filterByChatDefault: jest.fn(),
    filterByChatbotDefault: jest.fn(),
    filterByWhatsappDefault: jest.fn(),
    filterByExpression: jest.fn(),
    filterByActive: jest.fn(),
    filterExcludeLicensees: jest.fn(),
    all: jest.fn(),
  }
  const createLicenseesQuery = jest.fn().mockReturnValue(licenseesQueryInstance)
  const createLicensee = {
    execute: jest.fn(),
  }
  const updateLicensee = {
    execute: jest.fn(),
  }
  const setDialogWebhook = {
    execute: jest.fn(),
  }

  const controller = new LicenseesController({
    licenseeRepository,
    userRepository,
    createLicenseesQuery,
    createLicensee,
    updateLicensee,
    setDialogWebhook,
  })

  return {
    controller,
    licenseeRepository,
    userRepository,
    createLicenseesQuery,
    licenseesQueryInstance,
    createLicensee,
    updateLicensee,
    setDialogWebhook,
  }
}

describe('LicenseesController delegation', () => {
  it('delegates create to the createLicensee use case and returns status 201', async () => {
    const { controller, createLicensee } = buildController()
    const req = {
      body: {
        name: 'Alcateia Ltds',
        email: 'alcateia@alcateia.com',
      },
    }
    const res = buildResponse()
    const licensee = { _id: 'licensee-id', name: 'Alcateia Ltds' }

    createLicensee.execute.mockResolvedValue(licensee)

    await controller.create(req, res)

    expect(createLicensee.execute).toHaveBeenCalledWith(req.body)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.send).toHaveBeenCalledWith(licensee)
  })

  it('returns status 422 when create validation fails before delegating to the use case', async () => {
    const { controller, createLicensee } = buildController()
    const req = {
      body: { email: 'emailinvalid.com' },
    }
    const res = buildResponse()

    await runValidations(controller, req)
    await controller.create(req, res)

    expect(createLicensee.execute).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(422)
    expect(res.json).toHaveBeenCalledWith({
      errors: [{ message: 'Email deve ser preenchido com um valor válido' }],
    })
  })

  it('returns status 422 when createLicensee raises model validation errors', async () => {
    const { controller, createLicensee } = buildController()
    const req = {
      body: { name: '', email: 'alcateia@alcateia.com' },
    }
    const res = buildResponse()

    createLicensee.execute.mockRejectedValue({
      errors: {
        name: { message: 'Nome: Você deve preencher o campo' },
      },
    })

    await controller.create(req, res)

    expect(res.status).toHaveBeenCalledWith(422)
    expect(res.json).toHaveBeenCalledWith({
      errors: [{ message: 'Nome: Você deve preencher o campo' }],
    })
  })

  it('returns status 500 when createLicensee throws an unexpected error', async () => {
    const { controller, createLicensee } = buildController()
    const req = {
      body: { name: 'Alcateia Ltds', email: 'alcateia@alcateia.com' },
    }
    const res = buildResponse()

    createLicensee.execute.mockRejectedValue(new Error('some error'))

    await controller.create(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.send).toHaveBeenCalledWith({
      errors: { message: 'Erro interno do servidor: some error' },
    })
  })

  it('delegates update to the updateLicensee use case and returns status 200', async () => {
    const { controller, updateLicensee } = buildController()
    const req = {
      params: { id: 'licensee-id' },
      body: {
        name: 'Name modified',
        email: 'modified@alcateia.com',
      },
    }
    const res = buildResponse()
    const licensee = { _id: 'licensee-id', name: 'Name modified' }

    updateLicensee.execute.mockResolvedValue(licensee)

    await controller.update(req, res)

    expect(updateLicensee.execute).toHaveBeenCalledWith('licensee-id', req.body)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith(licensee)
  })

  it('returns status 422 when update validation fails before delegating to the use case', async () => {
    const { controller, updateLicensee } = buildController()
    const req = {
      params: { id: 'licensee-id' },
      body: { email: 'modifiedalcateia.com' },
    }
    const res = buildResponse()

    await runValidations(controller, req)
    await controller.update(req, res)

    expect(updateLicensee.execute).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(422)
    expect(res.json).toHaveBeenCalledWith({
      errors: [{ message: 'Email deve ser preenchido com um valor válido' }],
    })
  })

  it('returns status 422 when updateLicensee raises model validation errors', async () => {
    const { controller, updateLicensee } = buildController()
    const req = {
      params: { id: 'licensee-id' },
      body: { name: '' },
    }
    const res = buildResponse()

    updateLicensee.execute.mockRejectedValue({
      errors: {
        name: { message: 'Nome: Você deve preencher o campo' },
      },
    })

    await controller.update(req, res)

    expect(res.status).toHaveBeenCalledWith(422)
    expect(res.json).toHaveBeenCalledWith({
      errors: [{ message: 'Nome: Você deve preencher o campo' }],
    })
  })

  it('returns status 500 when updateLicensee throws an unexpected error', async () => {
    const { controller, updateLicensee } = buildController()
    const req = {
      params: { id: 'licensee-id' },
      body: { name: 'Name modified' },
    }
    const res = buildResponse()

    updateLicensee.execute.mockRejectedValue(new Error('some error'))

    await controller.update(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.send).toHaveBeenCalledWith({
      errors: { message: 'Erro interno do servidor: some error' },
    })
  })

  it('delegates show to licenseeRepository.findFirst and returns status 200', async () => {
    const { controller, licenseeRepository } = buildController()
    const seeded = await licenseeRepository.create({ name: 'Alcateia' })

    const req = { params: { id: seeded._id } }
    const res = buildResponse()

    await controller.show(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ _id: seeded._id, name: 'Alcateia' }))
  })

  it('delegates index to licenseesQuery and returns status 200', async () => {
    const { controller, licenseesQueryInstance } = buildController()
    const licensees = [{ _id: 'licensee-id' }]
    licenseesQueryInstance.all.mockResolvedValue(licensees)

    const req = { query: { page: '1', limit: '3', expression: 'Alca' }, userId: 'user-id' }
    const res = buildResponse()

    await controller.index(req, res)

    expect(licenseesQueryInstance.page).toHaveBeenCalledWith('1')
    expect(licenseesQueryInstance.limit).toHaveBeenCalledWith('3')
    expect(licenseesQueryInstance.filterByExpression).toHaveBeenCalledWith('Alca')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith(licensees)
  })

  it('applies filterExcludeLicensees when user has blockedLicensees', async () => {
    const { controller, licenseesQueryInstance, userRepository } = buildController()
    const blockedId = 'blocked-licensee-id'
    userRepository.findFirst.mockResolvedValue({ blockedLicensees: [blockedId] })
    licenseesQueryInstance.all.mockResolvedValue([])

    const req = { query: {}, userId: 'user-id' }
    const res = buildResponse()

    await controller.index(req, res)

    expect(licenseesQueryInstance.filterExcludeLicensees).toHaveBeenCalledWith([blockedId])
  })

  it('does not call filterExcludeLicensees when user has no blockedLicensees', async () => {
    const { controller, licenseesQueryInstance } = buildController()
    licenseesQueryInstance.all.mockResolvedValue([])

    const req = { query: {}, userId: 'user-id' }
    const res = buildResponse()

    await controller.index(req, res)

    expect(licenseesQueryInstance.filterExcludeLicensees).not.toHaveBeenCalled()
  })

  it('delegates setDialogWebhook to the use case and returns status 200', async () => {
    const { controller, setDialogWebhook } = buildController()
    const req = {
      params: { id: 'licensee-id' },
    }
    const res = buildResponse()

    setDialogWebhook.execute.mockResolvedValue({ message: WEBHOOK_CONFIGURED_MESSAGE })

    await controller.setDialogWebhook(req, res)

    expect(setDialogWebhook.execute).toHaveBeenCalledWith('licensee-id')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith({ message: WEBHOOK_CONFIGURED_MESSAGE })
  })

  it('returns status 500 when an external-action use case throws an unexpected error', async () => {
    const { controller, setDialogWebhook } = buildController()
    const req = {
      params: { id: 'licensee-id' },
    }
    const res = buildResponse()

    setDialogWebhook.execute.mockRejectedValue(new Error('some error'))

    await controller.setDialogWebhook(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.send).toHaveBeenCalledWith({
      errors: { message: 'Erro interno do servidor: some error' },
    })
  })

  it('delegates baileysSync to the syncBaileysDirectoryUseCase and returns status 200', async () => {
    const syncBaileysDirectoryUseCase = { execute: jest.fn() }
    const licenseeRepository = new LicenseeRepositoryMemory()
    const controller = new LicenseesController({ licenseeRepository })
    controller.syncBaileysDirectoryUseCase = syncBaileysDirectoryUseCase

    const req = { params: { id: 'licensee-id' } }
    const res = buildResponse()
    const syncResult = { importedContacts: 0, updatedContacts: 0, importedGroups: 3, updatedGroups: 1, skipped: 0 }

    syncBaileysDirectoryUseCase.execute.mockResolvedValue(syncResult)

    await controller.baileysSync(req, res)

    expect(syncBaileysDirectoryUseCase.execute).toHaveBeenCalledWith('licensee-id')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith(syncResult)
  })

  it('returns status 500 when baileysSync use case throws an error', async () => {
    const syncBaileysDirectoryUseCase = { execute: jest.fn() }
    const licenseeRepository = new LicenseeRepositoryMemory()
    const controller = new LicenseesController({ licenseeRepository })
    controller.syncBaileysDirectoryUseCase = syncBaileysDirectoryUseCase

    const req = { params: { id: 'licensee-id' } }
    const res = buildResponse()

    syncBaileysDirectoryUseCase.execute.mockRejectedValue(new Error('sync failed'))

    await controller.baileysSync(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.send).toHaveBeenCalledWith({
      errors: { message: 'Erro interno do servidor: sync failed' },
    })
  })

  it('delegates getWppconnectServerQr to the use case and returns status 200', async () => {
    const getWppconnectServerQrUseCase = { execute: jest.fn() }
    const licenseeRepository = new LicenseeRepositoryMemory()
    const controller = new LicenseesController({ licenseeRepository })
    controller.getWppconnectServerQrUseCase = getWppconnectServerQrUseCase

    const req = { params: { id: 'licensee-id' } }
    const res = buildResponse()
    const qrResponse = { qr: 'data:image/png;base64,abc123' }

    getWppconnectServerQrUseCase.execute.mockResolvedValue(qrResponse)

    await controller.getWppconnectServerQr(req, res)

    expect(getWppconnectServerQrUseCase.execute).toHaveBeenCalledWith('licensee-id')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith(qrResponse)
  })

  it('returns status 408 when getWppconnectServerQr use case throws an error', async () => {
    const getWppconnectServerQrUseCase = { execute: jest.fn() }
    const licenseeRepository = new LicenseeRepositoryMemory()
    const controller = new LicenseesController({ licenseeRepository })
    controller.getWppconnectServerQrUseCase = getWppconnectServerQrUseCase

    const req = { params: { id: 'licensee-id' } }
    const res = buildResponse()

    getWppconnectServerQrUseCase.execute.mockRejectedValue(new Error('timeout'))

    await controller.getWppconnectServerQr(req, res)

    expect(res.status).toHaveBeenCalledWith(408)
    expect(res.send).toHaveBeenCalledWith({
      errors: { message: 'Erro interno do servidor: timeout' },
    })
  })

  it('delegates getWppconnectServerStatus to the use case and returns status 200', async () => {
    const getWppconnectServerStatusUseCase = { execute: jest.fn() }
    const licenseeRepository = new LicenseeRepositoryMemory()
    const controller = new LicenseesController({ licenseeRepository })
    controller.getWppconnectServerStatusUseCase = getWppconnectServerStatusUseCase

    const req = { params: { id: 'licensee-id' } }
    const res = buildResponse()
    const statusResponse = { connected: true }

    getWppconnectServerStatusUseCase.execute.mockResolvedValue(statusResponse)

    await controller.getWppconnectServerStatus(req, res)

    expect(getWppconnectServerStatusUseCase.execute).toHaveBeenCalledWith('licensee-id')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith(statusResponse)
  })

  it('returns status 500 when getWppconnectServerStatus use case throws an error', async () => {
    const getWppconnectServerStatusUseCase = { execute: jest.fn() }
    const licenseeRepository = new LicenseeRepositoryMemory()
    const controller = new LicenseesController({ licenseeRepository })
    controller.getWppconnectServerStatusUseCase = getWppconnectServerStatusUseCase

    const req = { params: { id: 'licensee-id' } }
    const res = buildResponse()

    getWppconnectServerStatusUseCase.execute.mockRejectedValue(new Error('boom'))

    await controller.getWppconnectServerStatus(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.send).toHaveBeenCalledWith({
      errors: { message: 'Erro interno do servidor: boom' },
    })
  })
})
