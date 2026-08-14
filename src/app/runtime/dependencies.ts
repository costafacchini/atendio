import { PrismaWhatsappSessionDatabaseRepository } from '../repositories/whatsappsession'
import { PrismaDepartmentDatabaseRepository } from '../repositories/department'
import { PrismaInboxDatabaseRepository } from '../repositories/inbox'
import { PrismaBodyDatabaseRepository } from '../repositories/body'
import { PrismaContactDatabaseRepository } from '../repositories/contact'
import { PrismaLicenseeDatabaseRepository } from '../repositories/licensee'
import { PrismaMessageDatabaseRepository } from '../repositories/message'
import { PrismaRoomDatabaseRepository } from '../repositories/room'
import { PrismaTemplateDatabaseRepository } from '../repositories/template'
import { RedisTrafficlightRepository } from '../repositories/trafficlight'
import { PrismaTriggerDatabaseRepository } from '../repositories/trigger'
import { PrismaUserDatabaseRepository } from '../repositories/user'
import { tryGetActiveRepositories } from '../repositories/activeState'
import { parseText as parseTextHelper } from '../helpers/ParseTriggerText'
import { createChatPlugin as createChatPluginFactory } from '../plugins/chats/factory'
import { createChatbotPlugin as createChatbotPluginFactory } from '../plugins/chatbots/factory'
import { createMessengerPlugin as createMessengerPluginFactory } from '../plugins/messengers/factory'
import { TemplatesImporter } from '../plugins/importers/template/index'
import { BaileysSocketManager } from '../services/BaileysSocketManager'
import { StartBaileysSocket } from '../usecases/licensees/StartBaileysSocket'
import { BootBaileysSocketSessions } from '../usecases/licensees/BootBaileysSocketSessions'
import { GetBaileysQrForInbox } from '../usecases/licensees/GetBaileysQrForInbox'
import { GetBaileysStatusForInbox } from '../usecases/licensees/GetBaileysStatusForInbox'
import { SyncBaileysDirectoryForInbox } from '../usecases/licensees/SyncBaileysDirectoryForInbox'
import { GetBaileysQrForDepartment } from '../usecases/licensees/GetBaileysQrForDepartment'
import { GetBaileysStatusForDepartment } from '../usecases/licensees/GetBaileysStatusForDepartment'
import { SyncBaileysDirectoryForDepartment } from '../usecases/licensees/SyncBaileysDirectoryForDepartment'
import { IngestMessengerMessage } from '../usecases/webhooks/IngestMessengerMessage'
import { queueServer } from '../../config/queue'

// Builds the full runtime dependency graph from caller-supplied repositories.
// All repository arguments are required at call time; undefined repos will cause runtime errors
// when the corresponding factory functions are first invoked. Use createRuntimeDependencies()
// for production wiring — it supplies concrete Database instances for every repo.
function buildRuntimeDependencies({
  bodyRepository,
  contactRepository,
  licenseeRepository,
  messageRepository,
  roomRepository,
  departmentRepository,
  inboxRepository,
  templateRepository,
  trafficlightRepository,
  triggerRepository,
  userRepository,
  whatsappSessionRepository,
}: Record<string, any> = {}) {
  const parseText = (text: any, contact: any) => parseTextHelper(text, contact, {})
  const createChatPlugin = (licensee: any, extras: Record<string, any> = {}) => {
    const { inbox = null, ...rest } = extras
    return createChatPluginFactory(
      licensee,
      {
        contactRepository,
        messageRepository,
        roomRepository,
        triggerRepository,
        ...rest,
      },
      inbox,
    )
  }
  const createChatbotPlugin = (licensee: any) =>
    createChatbotPluginFactory(licensee, {
      contactRepository,
      messageRepository,
      roomRepository,
      triggerRepository,
    })
  const createMessengerPlugin = (licensee: any, extras: Record<string, any> = {}) => {
    const { inbox = null, ...rest } = extras
    return createMessengerPluginFactory(
      licensee,
      {
        contactRepository,
        messageRepository,
        triggerRepository,
        templateRepository,
        parseText,
        whatsappSessionRepository,
        ...rest,
      },
      inbox,
    )
  }
  const createTemplatesImporter = (licenseeId: any) =>
    new TemplatesImporter(licenseeId, {
      licenseeRepository,
      inboxRepository,
      templateRepository,
      createMessengerPlugin,
    })

  const socketManager = new BaileysSocketManager({ whatsappSessionRepository })
  const startBaileysSocket = (licensee: any, inbox: any = null) =>
    new StartBaileysSocket({
      socketManager,
      whatsappSessionRepository,
      createMessengerPlugin,
      ingestMessengerMessage: new IngestMessengerMessage({
        messengerRepository: bodyRepository,
        jobQueue: queueServer,
      }),
    }).execute(licensee, inbox)

  const bootBaileysSocketSessions = () =>
    new BootBaileysSocketSessions({
      licenseeRepository,
      inboxRepository,
      whatsappSessionRepository,
      startBaileysSocket,
    }).execute()

  const getBaileysQrForInbox = new GetBaileysQrForInbox({
    inboxRepository,
    licenseeRepository,
    createMessengerPlugin,
    startBaileysSocket,
  })

  const getBaileysStatusForInbox = new GetBaileysStatusForInbox({
    inboxRepository,
    licenseeRepository,
    whatsappSessionRepository,
    startBaileysSocket,
    socketManager,
  })

  const syncBaileysDirectoryForInbox = new SyncBaileysDirectoryForInbox({
    inboxRepository,
    licenseeRepository,
    contactRepository,
    createMessengerPlugin,
  })

  const getBaileysQrForDepartment = new GetBaileysQrForDepartment({
    departmentRepository,
    licenseeRepository,
    inboxRepository,
    createMessengerPlugin,
    startBaileysSocket,
    getBaileysQrForInbox,
  })

  const getBaileysStatusForDepartment = new GetBaileysStatusForDepartment({
    departmentRepository,
    licenseeRepository,
    inboxRepository,
    whatsappSessionRepository,
    startBaileysSocket,
    socketManager,
    getBaileysStatusForInbox,
  })

  const syncBaileysDirectoryForDepartment = new SyncBaileysDirectoryForDepartment({
    departmentRepository,
    licenseeRepository,
    inboxRepository,
    contactRepository,
    createMessengerPlugin,
    syncBaileysDirectoryForInbox,
  })

  return {
    bodyRepository,
    contactRepository,
    licenseeRepository,
    messageRepository,
    roomRepository,
    departmentRepository,
    inboxRepository,
    templateRepository,
    trafficlightRepository,
    triggerRepository,
    userRepository,
    whatsappSessionRepository,
    parseText,
    createChatPlugin,
    createChatbotPlugin,
    createMessengerPlugin,
    createTemplatesImporter,
    socketManager,
    startBaileysSocket,
    bootBaileysSocketSessions,
    getBaileysQrForInbox,
    getBaileysStatusForInbox,
    syncBaileysDirectoryForInbox,
    getBaileysQrForDepartment,
    getBaileysStatusForDepartment,
    syncBaileysDirectoryForDepartment,
  }
}

function createRuntimeDependencies(overrides: Record<string, any> = {}) {
  // When memory repositories are active (e.g. in tests), use them as defaults
  // so callers don't need to pass every repo explicitly.
  const memRepos = tryGetActiveRepositories()

  const mem = (key: string, fallback: () => any) =>
    overrides[key] ?? memRepos?.[key as keyof typeof memRepos] ?? fallback()

  return buildRuntimeDependencies({
    bodyRepository: mem('bodyRepository', () => new PrismaBodyDatabaseRepository()),
    contactRepository: mem('contactRepository', () => new PrismaContactDatabaseRepository()),
    licenseeRepository: mem('licenseeRepository', () => new PrismaLicenseeDatabaseRepository()),
    messageRepository: mem('messageRepository', () => new PrismaMessageDatabaseRepository()),
    roomRepository: mem('roomRepository', () => new PrismaRoomDatabaseRepository()),
    templateRepository: mem('templateRepository', () => new PrismaTemplateDatabaseRepository()),
    trafficlightRepository: mem('trafficlightRepository', () => new RedisTrafficlightRepository()),
    triggerRepository: mem('triggerRepository', () => new PrismaTriggerDatabaseRepository()),
    userRepository: mem('userRepository', () => new PrismaUserDatabaseRepository()),
    departmentRepository: mem('departmentRepository', () => new PrismaDepartmentDatabaseRepository()),
    inboxRepository: mem('inboxRepository', () => new PrismaInboxDatabaseRepository()),
    whatsappSessionRepository: mem('whatsappSessionRepository', () => new PrismaWhatsappSessionDatabaseRepository()),
  })
}

export { buildRuntimeDependencies, createRuntimeDependencies }
