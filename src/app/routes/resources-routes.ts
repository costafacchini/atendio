import express from 'express'
import jwt from 'jsonwebtoken'
import { UsersController } from '../controllers/UsersController'
import { LicenseesController } from '../controllers/LicenseesController'
import { DepartmentsController } from '../controllers/DepartmentsController'
import { InboxesController } from '../controllers/InboxesController'
import { ContactsController } from '../controllers/ContactsController'
import { TriggersController } from '../controllers/TriggersController'
import { MessagesController } from '../controllers/MessagesController'
import { TemplatesController } from '../controllers/TemplatesController'
import { DashboardController } from '../controllers/DashboardController'
import { RoomsController } from '../controllers/RoomsController'
import { ChatRoomsController } from '../controllers/ChatRoomsController'
import { IngestChatMessage } from '../usecases/webhooks/IngestChatMessage'
import { queueServer } from '../../config/queue'
import { redisConnection } from '../../config/redis'
import { LicenseesQuery } from '../queries/LicenseesQuery'
import { ContactsQuery } from '../queries/ContactsQuery'
import { TriggersQuery } from '../queries/TriggersQuery'
import { TemplatesQuery } from '../queries/TemplatesQuery'
import { MessagesQuery } from '../queries/MessagesQuery'
import { CreateLicensee } from '../usecases/licensees/CreateLicensee'
import { UpdateLicensee } from '../usecases/licensees/UpdateLicensee'
import { SetDialogWebhook } from '../usecases/licensees/SetDialogWebhook'
import { CreateContact } from '../usecases/contacts/CreateContact'
import { UpdateContact } from '../usecases/contacts/UpdateContact'
import { CreateTrigger } from '../usecases/triggers/CreateTrigger'
import { UpdateTrigger } from '../usecases/triggers/UpdateTrigger'
import { CreateUser } from '../usecases/users/CreateUser'
import { UpdateUser } from '../usecases/users/UpdateUser'
import { CreateMessage } from '../usecases/messages/CreateMessage'
import { createRuntimeDependencies } from '../runtime/dependencies'
import { UsersQuery } from '../queries/UsersQuery'

const router = express.Router()
const SECRET = process.env.SECRET as string

// Composition root for resource routes. Each route module creates its own dependency set;
// repos are stateless so separate instances across route files are safe.
const {
  userRepository,
  licenseeRepository,
  contactRepository,
  triggerRepository,
  templateRepository,
  messageRepository,
  roomRepository,
  bodyRepository,
  whatsappSessionRepository,
  departmentRepository,
  inboxRepository,
  createMessengerPlugin,
  createTemplatesImporter,
  startBaileysSocket,
  socketManager,
} = createRuntimeDependencies()

const usersController = new UsersController({
  userRepository,
  createUser: new CreateUser({ userRepository }),
  updateUser: new UpdateUser({ userRepository }),
  createUsersQuery: () => new UsersQuery({ userRepository }),
})
const licenseesController = new LicenseesController({
  licenseeRepository,
  inboxRepository,
  userRepository,
  createLicenseesQuery: () => new LicenseesQuery({ licenseeRepository }),
  createLicensee: new CreateLicensee({ licenseeRepository }),
  updateLicensee: new UpdateLicensee({ licenseeRepository }),
  setDialogWebhook: new SetDialogWebhook({ licenseeRepository, inboxRepository, createMessengerPlugin }),
  createMessengerPlugin,
  whatsappSessionRepository,
  contactRepository,
  startBaileysSocket,
  socketManager,
})
const contactsController = new ContactsController({
  contactRepository,
  userRepository,
  createContactsQuery: () => new ContactsQuery({ contactRepository }),
  createContact: new CreateContact({ contactRepository }),
  updateContact: new UpdateContact({ contactRepository }),
})
const triggersController = new TriggersController({
  triggerRepository,
  createTriggersQuery: () => new TriggersQuery({ triggerRepository }),
  createTrigger: new CreateTrigger({ triggerRepository }),
  updateTrigger: new UpdateTrigger({ triggerRepository }),
})
const messagesController = new MessagesController({
  createMessagesQuery: () => new MessagesQuery({ messageRepository }),
  userRepository,
  messageRepository,
  queueServer,
  createMessage: new CreateMessage({ messageRepository, contactRepository, jobQueue: queueServer }),
})
const departmentsController = new DepartmentsController({
  departmentRepository,
  licenseeRepository,
  inboxRepository,
  whatsappSessionRepository,
  contactRepository,
  createMessengerPlugin,
  startBaileysSocket,
  socketManager,
})

const inboxesController = new InboxesController({
  inboxRepository,
  licenseeRepository,
  whatsappSessionRepository,
  contactRepository,
  createMessengerPlugin,
  startBaileysSocket,
  socketManager,
})

const dashboardController = new DashboardController({
  userRepository,
  licenseeRepository,
  contactRepository,
  messageRepository,
  roomRepository,
  redisConnection,
})
const roomsController = new RoomsController({
  userRepository,
  roomRepository,
  messageRepository,
  departmentRepository,
  contactRepository,
})
const chatRoomsController = new ChatRoomsController({
  userRepository,
  roomRepository,
  ingestChatMessage: new IngestChatMessage({ chatRepository: bodyRepository, jobQueue: queueServer }),
})
const templatesController = new TemplatesController({
  templateRepository,
  createTemplatesQuery: () => new TemplatesQuery({ templateRepository }),
  createTemplatesImporter,
})

function authenticate(req: any, res: any, next: any) {
  const token = req.headers['x-access-token']
  if (!token) return res.status(401).json({ auth: false, message: 'Token não informado.' })

  jwt.verify(token, SECRET, function (err: any, decoded: any) {
    if (err) return res.status(401).json({ auth: false, message: 'Falha na autenticação com token.' })

    req.userId = decoded.id
    next()
  })
}

function authorize(...roles: string[]) {
  return async (req: any, res: any, next: any) => {
    try {
      const user = await userRepository.findFirst({ _id: req.userId })
      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ message: 'Acesso negado.' })
      }
      req.user = user
      next()
    } catch (err) {
      next(err)
    }
  }
}

router.use(authenticate)

router.post('/users', authorize('super', 'admin'), usersController.validations(), usersController.create)
router.post('/users/:id', authorize('super', 'admin'), usersController.validations(), usersController.update)
router.get('/users/:id', usersController.show)
router.get('/users', authorize('admin', 'super'), usersController.index)

router.post('/licensees', authorize('super'), licenseesController.validations(), licenseesController.create)
router.post(
  '/licensees/:id',
  authorize('super', 'admin'),
  licenseesController.validations(),
  licenseesController.update,
)
router.get('/licensees/:id', licenseesController.show)
router.get('/licensees', authorize('admin', 'super'), licenseesController.index)

router.post('/contacts', authorize('admin', 'super'), contactsController.validations(), contactsController.create)
router.post('/contacts/:id', authorize('admin', 'super'), contactsController.validations(), contactsController.update)
router.get('/contacts/:id', contactsController.show)
router.get('/contacts', contactsController.index)

router.post('/triggers', authorize('admin', 'super'), triggersController.create)
router.post('/triggers/:id', authorize('admin', 'super'), triggersController.update)
router.get('/triggers/:id', triggersController.show)
router.get('/triggers', triggersController.index)

router.post('/templates', authorize('admin', 'super'), templatesController.create)
router.post('/templates/:id', authorize('admin', 'super'), templatesController.update)
router.get('/templates/:id', templatesController.show)
router.get('/templates', templatesController.index)
router.post('/templates/:id/importation', templatesController.importation)

router.post('/licensees/:id/dialogwebhook', licenseesController.setDialogWebhook)
router.get('/licensees/:id/baileys-status', licenseesController.getBaileysStatus)
router.post('/licensees/:id/baileys-qr', (req, res) => licenseesController.getBaileysQr(req, res))
router.post('/licensees/:id/baileys-sync', licenseesController.baileysSync)

router.get('/departments', authorize('admin', 'super'), departmentsController.index)
router.get('/departments/:id', authorize('admin', 'super'), departmentsController.show)
router.post('/departments', authorize('admin', 'super'), departmentsController.create)
router.post('/departments/:id', authorize('admin', 'super'), departmentsController.update)
router.delete('/departments/:id', authorize('admin', 'super'), departmentsController.destroy)
router.post('/departments/:id/baileys-qr', authorize('admin', 'super'), departmentsController.getBaileysQr)
router.get('/departments/:id/baileys-status', authorize('admin', 'super'), departmentsController.getBaileysStatus)
router.post('/departments/:id/baileys-sync', authorize('admin', 'super'), departmentsController.baileysSync)

router.get('/inboxes', authorize('admin', 'super'), inboxesController.index)
router.post('/inboxes', authorize('admin', 'super'), inboxesController.create)
router.get('/inboxes/:id', authorize('admin', 'super'), inboxesController.show)
router.post('/inboxes/:id', authorize('admin', 'super'), inboxesController.update)
router.delete('/inboxes/:id', authorize('admin', 'super'), inboxesController.destroy)
router.post('/inboxes/:id/baileys-qr', authorize('admin', 'super'), inboxesController.baileysQr)
router.get('/inboxes/:id/baileys-status', authorize('admin', 'super'), inboxesController.baileysStatus)
router.post('/inboxes/:id/baileys-sync', authorize('admin', 'super'), inboxesController.baileysSync)

router.get('/messages', messagesController.index)
router.post('/messages', messagesController.create)
router.post('/messages/:id/resend', messagesController.resend)
router.post('/messages/:id/ignore', messagesController.ignore)

router.get('/dashboard/licensees', dashboardController.licensees)
router.get('/dashboard/message-volume', dashboardController.messageVolume)
router.get('/dashboard/delivery-rate', dashboardController.deliveryRate)
router.get('/dashboard/queue', dashboardController.queue)
router.get('/dashboard/conversations', dashboardController.conversations)
router.get('/dashboard/contacts', dashboardController.contacts)
router.get('/dashboard/messages-today', dashboardController.messagesToday)
router.get('/dashboard/messages-per-day', dashboardController.messagesPerDay)
router.get('/dashboard/open-rooms', dashboardController.openRooms)
router.post('/dashboard/rooms/:roomId/close', dashboardController.closeRoom)

router.get('/rooms', (req, res) => roomsController.index(req, res))
router.post('/rooms', (req, res) => roomsController.create(req, res))
router.get('/rooms/:roomId/messages', (req, res) => roomsController.messages(req, res))
router.post('/rooms/:roomId/messages', (req, res) => chatRoomsController.replyToRoom(req, res))
router.post('/rooms/:roomId/close', (req, res) => roomsController.closeRoom(req, res))

export default router
