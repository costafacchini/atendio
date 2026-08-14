import { Request, Response } from 'express'
import { sanitizeModelErrors } from '../helpers/SanitizeErrors'
import { IRepository } from '@repositories/repository'
import { IInbox } from '../../types'
import { GetBaileysQrForInbox } from '../usecases/licensees/GetBaileysQrForInbox'
import { GetBaileysStatusForInbox } from '../usecases/licensees/GetBaileysStatusForInbox'
import { SyncBaileysDirectoryForInbox } from '../usecases/licensees/SyncBaileysDirectoryForInbox'

class InboxesController {
  inboxRepository: IRepository<IInbox>
  getBaileysQrUseCase: GetBaileysQrForInbox
  getBaileysStatusUseCase: GetBaileysStatusForInbox
  syncBaileysDirectoryUseCase: SyncBaileysDirectoryForInbox

  constructor({
    inboxRepository,
    licenseeRepository,
    whatsappSessionRepository,
    contactRepository,
    createMessengerPlugin,
    startBaileysSocket,
    socketManager,
  }: Record<string, any> = {}) {
    this.inboxRepository = inboxRepository!
    this.getBaileysQrUseCase = new GetBaileysQrForInbox({
      inboxRepository,
      licenseeRepository,
      createMessengerPlugin,
      startBaileysSocket,
    })
    this.getBaileysStatusUseCase = new GetBaileysStatusForInbox({
      inboxRepository,
      licenseeRepository,
      whatsappSessionRepository,
      startBaileysSocket,
      socketManager,
    })
    this.syncBaileysDirectoryUseCase = new SyncBaileysDirectoryForInbox({
      inboxRepository,
      licenseeRepository,
      contactRepository,
      createMessengerPlugin,
    })

    this.index = this.index.bind(this)
    this.show = this.show.bind(this)
    this.create = this.create.bind(this)
    this.update = this.update.bind(this)
    this.destroy = this.destroy.bind(this)
    this.baileysQr = this.baileysQr.bind(this)
    this.baileysStatus = this.baileysStatus.bind(this)
    this.baileysSync = this.baileysSync.bind(this)
  }

  async index(req: Request, res: Response) {
    try {
      const params: Record<string, unknown> = {}
      if (req.query.licensee) params.licensee = req.query.licensee as string
      if (req.query.kind) params.kind = req.query.kind as string
      if (req.query.active !== undefined) params.active = req.query.active === 'true'

      const inboxes = await this.inboxRepository.find(params, ['licensee'])
      return res.status(200).send(inboxes)
    } catch (err: any) {
      return res.status(500).send({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async show(req: Request, res: Response) {
    try {
      const inbox = await this.inboxRepository.findFirst({ _id: req.params.id as string })
      if (!inbox) return res.status(404).send({ errors: { message: 'Inbox não encontrada' } })
      return res.status(200).send(inbox)
    } catch (err: any) {
      return res.status(500).send({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async create(req: Request, res: Response) {
    try {
      const inbox = await this.inboxRepository.create(req.body)
      return res.status(201).send(inbox)
    } catch (err: any) {
      if (err?.errors) {
        return res.status(422).json({ errors: sanitizeModelErrors(err.errors) })
      }
      return res.status(500).send({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async update(req: Request, res: Response) {
    try {
      await this.inboxRepository.update(req.params.id as string, req.body)
      const inbox = await this.inboxRepository.findFirst({ _id: req.params.id as string })
      return res.status(200).send(inbox)
    } catch (err: any) {
      if (err?.errors) {
        return res.status(422).json({ errors: sanitizeModelErrors(err.errors) })
      }
      return res.status(500).send({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async destroy(req: Request, res: Response) {
    try {
      await this.inboxRepository.delete({ _id: req.params.id as string })
      return res.status(204).send()
    } catch (err: any) {
      return res.status(500).send({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async baileysQr(req: Request, res: Response) {
    try {
      const response = await this.getBaileysQrUseCase.execute(req.params.id as string)

      return res.status(200).send(response)
    } catch (err: any) {
      return res.status(408).send({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async baileysStatus(req: Request, res: Response) {
    try {
      const response = await this.getBaileysStatusUseCase.execute(req.params.id as string)

      return res.status(200).send(response)
    } catch (err: any) {
      return res.status(500).send({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async baileysSync(req: Request, res: Response) {
    try {
      const response = await this.syncBaileysDirectoryUseCase.execute(req.params.id as string)

      return res.status(200).send(response)
    } catch (err: any) {
      return res.status(500).send({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }
}

export { InboxesController }
