import { Request, Response } from 'express'
import { sanitizeModelErrors } from '../helpers/SanitizeErrors'
import { IRepository } from '@repositories/repository'
import { IDepartment } from '../../types'
import { GetBaileysQrForDepartment } from '../usecases/licensees/GetBaileysQrForDepartment'
import { GetBaileysStatusForDepartment } from '../usecases/licensees/GetBaileysStatusForDepartment'
import { SyncBaileysDirectoryForDepartment } from '../usecases/licensees/SyncBaileysDirectoryForDepartment'

class DepartmentsController {
  departmentRepository: IRepository<IDepartment>
  getBaileysQrUseCase: GetBaileysQrForDepartment
  getBaileysStatusUseCase: GetBaileysStatusForDepartment
  syncBaileysDirectoryUseCase: SyncBaileysDirectoryForDepartment

  constructor({
    departmentRepository,
    licenseeRepository,
    inboxRepository,
    whatsappSessionRepository,
    contactRepository,
    createMessengerPlugin,
    startBaileysSocket,
    socketManager,
    getBaileysQrForInbox,
    getBaileysStatusForInbox,
    syncBaileysDirectoryForInbox,
  }: Record<string, any> = {}) {
    this.departmentRepository = departmentRepository!
    this.getBaileysQrUseCase = new GetBaileysQrForDepartment({
      departmentRepository,
      licenseeRepository,
      inboxRepository,
      createMessengerPlugin,
      startBaileysSocket,
      getBaileysQrForInbox,
    })
    this.getBaileysStatusUseCase = new GetBaileysStatusForDepartment({
      departmentRepository,
      licenseeRepository,
      inboxRepository,
      whatsappSessionRepository,
      startBaileysSocket,
      socketManager,
      getBaileysStatusForInbox,
    })
    this.syncBaileysDirectoryUseCase = new SyncBaileysDirectoryForDepartment({
      departmentRepository,
      licenseeRepository,
      inboxRepository,
      contactRepository,
      createMessengerPlugin,
      syncBaileysDirectoryForInbox,
    })

    this.index = this.index.bind(this)
    this.show = this.show.bind(this)
    this.create = this.create.bind(this)
    this.update = this.update.bind(this)
    this.destroy = this.destroy.bind(this)
    this.getBaileysQr = this.getBaileysQr.bind(this)
    this.getBaileysStatus = this.getBaileysStatus.bind(this)
    this.baileysSync = this.baileysSync.bind(this)
  }

  async index(req: Request, res: Response) {
    try {
      const params: Record<string, string> = {}
      if (req.query.licensee) params.licensee = req.query.licensee as string

      const departments = await this.departmentRepository.find(params, ['licensee', 'users'])
      return res.status(200).send(departments)
    } catch (err: any) {
      return res.status(500).send({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async show(req: Request, res: Response) {
    try {
      const department = await this.departmentRepository.findFirst({ _id: req.params.id as string }, [
        'licensee',
        'users',
      ])
      return res.status(200).send(department)
    } catch (err: any) {
      if (err.name === 'CastError' && err.kind === 'ObjectId') {
        return res.status(404).send({ errors: { message: `Departamento ${req.params.id as string} não encontrado` } })
      }
      return res.status(500).send({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async create(req: Request, res: Response) {
    try {
      const department = await this.departmentRepository.create(req.body)
      return res.status(201).send(department)
    } catch (err: any) {
      if (err?.errors) {
        return res.status(422).json({ errors: sanitizeModelErrors(err.errors) })
      }
      return res.status(500).send({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async update(req: Request, res: Response) {
    try {
      await this.departmentRepository.update(req.params.id as string, req.body)
      const department = await this.departmentRepository.findFirst({ _id: req.params.id as string })
      return res.status(200).send(department)
    } catch (err: any) {
      if (err?.errors) {
        return res.status(422).json({ errors: sanitizeModelErrors(err.errors) })
      }
      return res.status(500).send({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async destroy(req: Request, res: Response) {
    try {
      await this.departmentRepository.delete({ _id: req.params.id as string })
      return res.status(204).send()
    } catch (err: any) {
      return res.status(500).send({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async getBaileysQr(req: Request, res: Response) {
    try {
      const response = await this.getBaileysQrUseCase.execute(req.params.id as string)

      return res.status(200).send(response)
    } catch (err: any) {
      return res.status(408).send({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async getBaileysStatus(req: Request, res: Response) {
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

export { DepartmentsController }
