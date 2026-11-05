import { InboxRepositoryMemory } from '@repositories/inbox'
import { InboxesController } from './InboxesController'

function buildResponse() {
  return {
    json: jest.fn(),
    send: jest.fn(),
    status: jest.fn().mockReturnThis(),
  }
}

function buildController() {
  const inboxRepository = new InboxRepositoryMemory()

  const controller = new InboxesController({ inboxRepository })

  return { controller, inboxRepository }
}

describe('InboxesController', () => {
  describe('#create', () => {
    it('creates an inbox with a unique inboxToken and returns 201', async () => {
      const { controller, inboxRepository } = buildController()
      const licenseeId = 'license-id'
      const req = { body: { name: 'Suporte', licensee: licenseeId, kind: 'messenger' } }
      const res = buildResponse()

      await controller.create(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ name: 'Suporte' }))
      expect(inboxRepository.items).toHaveLength(1)
    })

    it('returns 422 when name is missing', async () => {
      const inboxRepository = {
        create: jest.fn().mockRejectedValue({ errors: { name: { message: 'Nome: Você deve preencher o campo' } } }),
      }
      const controller = new InboxesController({ inboxRepository })
      const req = { body: { licensee: 'license-id', kind: 'messenger' } }
      const res = buildResponse()

      await controller.create(req, res)

      expect(res.status).toHaveBeenCalledWith(422)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errors: expect.any(Array) }))
    })

    it('returns 422 when kind is missing', async () => {
      const inboxRepository = {
        create: jest.fn().mockRejectedValue({ errors: { kind: { message: 'Kind: Você deve preencher o campo' } } }),
      }
      const controller = new InboxesController({ inboxRepository })
      const req = { body: { name: 'Suporte', licensee: 'license-id' } }
      const res = buildResponse()

      await controller.create(req, res)

      expect(res.status).toHaveBeenCalledWith(422)
    })
  })

  describe('#index', () => {
    it('returns all inboxes for the given licensee', async () => {
      const { controller, inboxRepository } = buildController()
      const licenseeId = 'license-id'
      const otherLicenseeId = 'other-license-id'

      await inboxRepository.create({ name: 'Suporte', licensee: licenseeId, kind: 'messenger' })
      await inboxRepository.create({ name: 'Vendas', licensee: otherLicenseeId, kind: 'messenger' })

      const req = { query: { licensee: licenseeId } }
      const res = buildResponse()

      await controller.index(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      const sent = res.send.mock.calls[0][0]
      expect(sent).toHaveLength(1)
      expect(sent[0].name).toEqual('Suporte')
    })

    it('returns empty array when licensee has no inboxes', async () => {
      const { controller } = buildController()
      const req = { query: { licensee: 'license-id' } }
      const res = buildResponse()

      await controller.index(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.send.mock.calls[0][0]).toHaveLength(0)
    })

    it('returns 500 when repository throws an unexpected error', async () => {
      const inboxRepository = {
        find: jest.fn().mockRejectedValue(new Error('connection lost')),
      }
      const controller = new InboxesController({ inboxRepository })
      const req = { query: {} }
      const res = buildResponse()

      await controller.index(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ errors: expect.any(Object) }))
    })

    it('calls find with licensee relation so webhookUrl virtual resolves', async () => {
      const inboxRepository = {
        find: jest.fn().mockResolvedValue([]),
      }
      const controller = new InboxesController({ inboxRepository })
      const req = { query: { licensee: 'lic-id' } }
      const res = buildResponse()

      await controller.index(req, res)

      expect(inboxRepository.find).toHaveBeenCalledWith({ licensee: 'lic-id' }, ['licensee'])
    })
  })

  describe('#destroy', () => {
    it('removes the inbox and returns 204', async () => {
      const { controller, inboxRepository } = buildController()

      const inbox = await inboxRepository.create({ name: 'Suporte', licensee: 'license-id', kind: 'messenger' })

      const req = { params: { id: inbox._id } }
      const res = buildResponse()

      await controller.destroy(req, res)

      expect(res.status).toHaveBeenCalledWith(204)
      expect(inboxRepository.items).toHaveLength(0)
    })

    it('returns 500 when repository throws an unexpected error', async () => {
      const inboxRepository = {
        delete: jest.fn().mockRejectedValue(new Error('disk failure')),
      }
      const controller = new InboxesController({ inboxRepository })
      const req = { params: { id: 'some-id' } }
      const res = buildResponse()

      await controller.destroy(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ errors: expect.any(Object) }))
    })
  })

  describe('#update', () => {
    it('returns 200 with the updated inbox', async () => {
      const { controller, inboxRepository } = buildController()

      const inbox = await inboxRepository.create({ name: 'Suporte', licensee: 'license-id', kind: 'messenger' })

      const req = { params: { id: inbox._id }, body: { name: 'Vendas' } }
      const res = buildResponse()

      await controller.update(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ name: 'Vendas' }))
    })

    it('returns 422 when validation error occurs', async () => {
      const inboxRepository = {
        update: jest.fn().mockRejectedValue({ errors: { name: { message: 'Nome: Você deve preencher o campo' } } }),
        findFirst: jest.fn(),
      }
      const controller = new InboxesController({ inboxRepository })
      const req = { params: { id: 'some-id' }, body: { name: '' } }
      const res = buildResponse()

      await controller.update(req, res)

      expect(res.status).toHaveBeenCalledWith(422)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errors: expect.any(Array) }))
    })
  })

  describe('#baileysQr', () => {
    it('returns 200 with the response from the use case', async () => {
      const { controller } = buildController()
      const qrResponse = { qr: 'data:image/png;base64,abc123' }
      controller.getBaileysQrUseCase = { execute: jest.fn().mockResolvedValue(qrResponse) }

      const req = { params: { id: 'inbox-id' } }
      const res = buildResponse()

      await controller.baileysQr(req, res)

      expect(controller.getBaileysQrUseCase.execute).toHaveBeenCalledWith('inbox-id')
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.send).toHaveBeenCalledWith(qrResponse)
    })

    it('returns 408 on error', async () => {
      const { controller } = buildController()
      controller.getBaileysQrUseCase = { execute: jest.fn().mockRejectedValue(new Error('timeout')) }

      const req = { params: { id: 'inbox-id' } }
      const res = buildResponse()

      await controller.baileysQr(req, res)

      expect(res.status).toHaveBeenCalledWith(408)
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ errors: expect.any(Object) }))
    })
  })

  describe('#baileysStatus', () => {
    it('returns 200 with the response from the use case', async () => {
      const { controller } = buildController()
      const statusResponse = { connected: true }
      controller.getBaileysStatusUseCase = { execute: jest.fn().mockResolvedValue(statusResponse) }

      const req = { params: { id: 'inbox-id' } }
      const res = buildResponse()

      await controller.baileysStatus(req, res)

      expect(controller.getBaileysStatusUseCase.execute).toHaveBeenCalledWith('inbox-id')
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.send).toHaveBeenCalledWith(statusResponse)
    })

    it('returns 500 on error', async () => {
      const { controller } = buildController()
      controller.getBaileysStatusUseCase = { execute: jest.fn().mockRejectedValue(new Error('internal error')) }

      const req = { params: { id: 'inbox-id' } }
      const res = buildResponse()

      await controller.baileysStatus(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ errors: expect.any(Object) }))
    })
  })

  describe('#baileysSync', () => {
    it('returns 200 with the response from the use case', async () => {
      const { controller } = buildController()
      const syncResponse = { synced: true }
      controller.syncBaileysDirectoryUseCase = { execute: jest.fn().mockResolvedValue(syncResponse) }

      const req = { params: { id: 'inbox-id' } }
      const res = buildResponse()

      await controller.baileysSync(req, res)

      expect(controller.syncBaileysDirectoryUseCase.execute).toHaveBeenCalledWith('inbox-id')
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.send).toHaveBeenCalledWith(syncResponse)
    })

    it('returns 500 on error', async () => {
      const { controller } = buildController()
      controller.syncBaileysDirectoryUseCase = { execute: jest.fn().mockRejectedValue(new Error('sync failed')) }

      const req = { params: { id: 'inbox-id' } }
      const res = buildResponse()

      await controller.baileysSync(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ errors: expect.any(Object) }))
    })
  })

  describe('#wppconnectServerV2Qr', () => {
    it('returns 200 with the response from the use case', async () => {
      const { controller } = buildController()
      const qrResponse = { qr: 'data:image/png;base64,abc123' }
      controller.getWppconnectServerV2QrUseCase = { execute: jest.fn().mockResolvedValue(qrResponse) }

      const req = { params: { id: 'inbox-id' } }
      const res = buildResponse()

      await controller.wppconnectServerV2Qr(req, res)

      expect(controller.getWppconnectServerV2QrUseCase.execute).toHaveBeenCalledWith('inbox-id')
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.send).toHaveBeenCalledWith(qrResponse)
    })

    it('returns 408 on error', async () => {
      const { controller } = buildController()
      controller.getWppconnectServerV2QrUseCase = { execute: jest.fn().mockRejectedValue(new Error('timeout')) }

      const req = { params: { id: 'inbox-id' } }
      const res = buildResponse()

      await controller.wppconnectServerV2Qr(req, res)

      expect(res.status).toHaveBeenCalledWith(408)
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ errors: expect.any(Object) }))
    })
  })

  describe('#wppconnectServerV2Status', () => {
    it('returns 200 with the response from the use case', async () => {
      const { controller } = buildController()
      const statusResponse = { connected: true }
      controller.getWppconnectServerV2StatusUseCase = { execute: jest.fn().mockResolvedValue(statusResponse) }

      const req = { params: { id: 'inbox-id' } }
      const res = buildResponse()

      await controller.wppconnectServerV2Status(req, res)

      expect(controller.getWppconnectServerV2StatusUseCase.execute).toHaveBeenCalledWith('inbox-id')
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.send).toHaveBeenCalledWith(statusResponse)
    })

    it('returns 500 on error', async () => {
      const { controller } = buildController()
      controller.getWppconnectServerV2StatusUseCase = { execute: jest.fn().mockRejectedValue(new Error('boom')) }

      const req = { params: { id: 'inbox-id' } }
      const res = buildResponse()

      await controller.wppconnectServerV2Status(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ errors: expect.any(Object) }))
    })
  })
})
