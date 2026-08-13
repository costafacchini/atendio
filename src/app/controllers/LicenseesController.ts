import { Request, Response } from 'express'
import { check, validationResult } from 'express-validator'
import { sanitizeExpressErrors, sanitizeModelErrors } from '../helpers/SanitizeErrors'
import { IRepository } from '@repositories/repository'
import { ILicensee, IUser } from '../../types'
import { CreateLicensee } from '../usecases/licensees/CreateLicensee'
import { UpdateLicensee } from '../usecases/licensees/UpdateLicensee'
import { SetDialogWebhook } from '../usecases/licensees/SetDialogWebhook'
import { GetBaileysQr } from '../usecases/licensees/GetBaileysQr'
import { GetBaileysStatus } from '../usecases/licensees/GetBaileysStatus'
import { SyncBaileysDirectory } from '../usecases/licensees/SyncBaileysDirectory'
import { LicenseesQuery } from '../queries/LicenseesQuery'

class LicenseesController {
  licenseeRepository: IRepository<ILicensee>
  userRepository: IRepository<IUser>
  createLicenseesQuery: () => LicenseesQuery
  createLicensee: CreateLicensee
  updateLicensee: UpdateLicensee
  setDialogWebhookUseCase: SetDialogWebhook
  getBaileysQrUseCase: GetBaileysQr
  getBaileysStatusUseCase: GetBaileysStatus
  syncBaileysDirectoryUseCase: SyncBaileysDirectory

  constructor({
    licenseeRepository,
    inboxRepository,
    userRepository,
    createLicenseesQuery,
    createLicensee,
    updateLicensee,
    setDialogWebhook,
    createMessengerPlugin,
    whatsappSessionRepository,
    contactRepository,
    startBaileysSocket,
    socketManager,
  }: Record<string, any> = {}) {
    this.licenseeRepository = licenseeRepository!
    this.userRepository = userRepository!
    this.createLicenseesQuery = createLicenseesQuery!
    this.createLicensee = createLicensee!
    this.updateLicensee = updateLicensee!
    this.setDialogWebhookUseCase = setDialogWebhook!
    this.getBaileysQrUseCase = new GetBaileysQr({ licenseeRepository, inboxRepository, createMessengerPlugin, startBaileysSocket })
    this.getBaileysStatusUseCase = new GetBaileysStatus({
      licenseeRepository,
      inboxRepository,
      whatsappSessionRepository,
      startBaileysSocket,
      socketManager,
    })
    this.syncBaileysDirectoryUseCase = new SyncBaileysDirectory({
      licenseeRepository,
      inboxRepository,
      contactRepository,
      createMessengerPlugin,
    })

    this.create = this.create.bind(this)
    this.update = this.update.bind(this)
    this.show = this.show.bind(this)
    this.index = this.index.bind(this)
    this.setDialogWebhook = this.setDialogWebhook.bind(this)
    this.getBaileysQr = this.getBaileysQr.bind(this)
    this.getBaileysStatus = this.getBaileysStatus.bind(this)
    this.baileysSync = this.baileysSync.bind(this)
  }

  validations() {
    return [
      check('email', 'Email deve ser preenchido com um valor válido')
        .optional({ checkFalsy: true })
        .isEmail()
        .normalizeEmail(),
    ]
  }

  async create(req: Request, res: Response) {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: sanitizeExpressErrors(errors.array()) })
    }

    try {
      const licensee = await this.createLicensee.execute(req.body)

      return res.status(201).send(licensee)
    } catch (err: any) {
      if (err?.errors) {
        return res.status(422).json({ errors: sanitizeModelErrors(err.errors) })
      }

      return res.status(500).send({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async update(req: Request, res: Response) {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: sanitizeExpressErrors(errors.array()) })
    }

    try {
      const licensee = await this.updateLicensee.execute(req.params.id as string, req.body)

      return res.status(200).send(licensee)
    } catch (err: any) {
      if (err?.errors) {
        return res.status(422).json({ errors: sanitizeModelErrors(err.errors) })
      }

      return res.status(500).send({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async show(req: Request, res: Response) {
    try {
      const licensee = await this.licenseeRepository.findFirst({ _id: req.params.id as string })

      res.status(200).send(licensee)
    } catch (err: any) {
      if (err.name === 'CastError' && err.kind === 'ObjectId') {
        return res.status(404).send({ errors: { message: 'Licenciado 12312 não encontrado' } })
      } else {
        return res.status(500).send({ errors: { message: `Erro interno do servidor: ${err.message}` } })
      }
    }
  }

  async index(req: Request, res: Response) {
    try {
      const page = req.query.page || 1
      const limit = req.query.limit || 30

      const licenseesQuery = this.createLicenseesQuery()

      licenseesQuery.page(page as number)
      licenseesQuery.limit(limit as number)

      if (req.query.chatDefault) {
        licenseesQuery.filterByChatDefault(req.query.chatDefault as string)
      }

      if (req.query.chatbotDefault) {
        licenseesQuery.filterByChatbotDefault(req.query.chatbotDefault as string)
      }

      if (req.query.whatsappDefault) {
        licenseesQuery.filterByWhatsappDefault(req.query.whatsappDefault as string)
      }

      if (req.query.expression) {
        licenseesQuery.filterByExpression(req.query.expression as string)
      }

      if (req.query.active) {
        licenseesQuery.filterByActive()
      }

      const user = await this.userRepository.findFirst({ _id: req.userId })
      if (user?.blockedLicensees?.length) {
        const ids = user.blockedLicensees.map((b) => (typeof b === 'string' ? b : (b._id as string)))
        licenseesQuery.filterExcludeLicensees(ids)
      }

      const licensees = await licenseesQuery.all()

      res.status(200).send(licensees)
    } catch (err: any) {
      res.status(500).send({ errors: { message: `Erro interno do servidor: ${err.message}` } })
    }
  }

  async setDialogWebhook(req: Request, res: Response) {
    try {
      const response = await this.setDialogWebhookUseCase.execute(req.params.id as string)

      return res.status(200).send(response)
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

export { LicenseesController }
