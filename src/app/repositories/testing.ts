import { BodyRepositoryMemory } from './body'
import { ContactRepositoryMemory } from './contact'
import { LicenseeRepositoryMemory } from './licensee'
import { MessageRepositoryMemory } from './message'
import { RoomRepositoryMemory } from './room'
import { TemplateRepositoryMemory } from './template'
import { TrafficlightRepositoryMemory } from './trafficlight'
import { TriggerRepositoryMemory } from './trigger'
import { UserRepositoryMemory } from './user'
import { WhatsappSessionRepositoryMemory } from './whatsappsession'
import { DepartmentRepositoryMemory } from './department'
import { InboxRepositoryMemory } from './inbox'
import { matchesFilter, sortRecords, comparableValue } from './repository'
import { parseText as parseTextHelper } from '../helpers/ParseTriggerText'
import { MessageKind } from '../../types'
import { setActiveRepositories } from './activeState'

let activeRestore: any = null
let activeRepositories: ReturnType<typeof createMemoryRepositories> | null = null

function getActiveRepositories(): ReturnType<typeof createMemoryRepositories> {
  if (!activeRepositories) {
    throw new Error('No active memory repositories — call installMemoryRepositories() first')
  }
  return activeRepositories
}

function serializeRelations(record: any, relations: any[] = []) {
  if (!record) {
    return record
  }

  const clone = { ...record }

  relations.forEach((relation: any) => {
    if (clone[relation] && typeof clone[relation] === 'object') {
      clone[relation] = clone[relation]._id ?? clone[relation]
    }
  })

  return clone
}

function createMemoryRepositories() {
  const state: Record<string, any[]> = {
    bodies: [] as any[],
    contacts: [] as any[],
    licensees: [] as any[],
    messages: [] as any[],
    rooms: [] as any[],
    templates: [] as any[],
    trafficlights: [] as any[],
    triggers: [] as any[],
    users: [] as any[],
    whatsappSessions: [] as any[],
    departments: [] as any[],
    inboxes: [] as any[],
  }

  const triggerRepository = new TriggerRepositoryMemory(state.triggers)
  const parseText = (text: any, contact: any) => parseTextHelper(text, contact, {})
  const messageRepository = new MessageRepositoryMemory({
    items: state.messages,
    triggerRepository,
    parseText,
  })
  const contactRepository = new ContactRepositoryMemory({
    items: state.contacts,
    messageRepository,
  })

  return {
    state,
    bodyRepository: new BodyRepositoryMemory(state.bodies),
    contactRepository,
    licenseeRepository: new LicenseeRepositoryMemory(state.licensees),
    messageRepository,
    roomRepository: new RoomRepositoryMemory(state.rooms),
    templateRepository: new TemplateRepositoryMemory(state.templates),
    trafficlightRepository: new TrafficlightRepositoryMemory(state.trafficlights),
    triggerRepository,
    userRepository: new UserRepositoryMemory(state.users),
    whatsappSessionRepository: new WhatsappSessionRepositoryMemory(state.whatsappSessions),
    departmentRepository: new DepartmentRepositoryMemory(state.departments),
    inboxRepository: new InboxRepositoryMemory(state.inboxes),
  }
}

class MemoryQuery {
  repository: any
  params: any
  single: boolean
  predicates: any[]
  skipCount: number
  limitCount: number | null
  sortClause: any
  currentField: any
  relations: any[]

  constructor(repository: any, params: any = {}, { single = false } = {}) {
    this.repository = repository
    this.params = params
    this.single = single
    this.predicates = []
    this.skipCount = 0
    this.limitCount = null
    this.sortClause = null
    this.currentField = null
    this.relations = []
  }

  sort(order = {}) {
    this.sortClause = order
    return this
  }

  skip(value = 0) {
    this.skipCount = value
    return this
  }

  limit(value: any) {
    this.limitCount = value
    return this
  }

  where(fieldOrFilter: any = {}) {
    if (typeof fieldOrFilter === 'string') {
      this.currentField = fieldOrFilter
      return this
    }

    this.predicates.push((record: any) => matchesFilter(record, fieldOrFilter))
    return this
  }

  equals(value: any) {
    const field = this.currentField
    this.predicates.push((record: any) => matchesFilter(record, { [field]: value }))
    return this
  }

  ne(value: any) {
    const field = this.currentField
    this.predicates.push((record: any) => matchesFilter(record, { [field]: { $ne: value } }))
    return this
  }

  nin(values: any[]) {
    const field = this.currentField
    this.predicates.push((record: any) => matchesFilter(record, { [field]: { $nin: values } }))
    return this
  }

  gt(value: any) {
    const field = this.currentField
    this.predicates.push((record: any) => matchesFilter(record, { [field]: { $gt: value } }))
    return this
  }

  gte(value: any) {
    const field = this.currentField
    this.predicates.push((record: any) => matchesFilter(record, { [field]: { $gte: value } }))
    return this
  }

  lt(value: any) {
    const field = this.currentField
    this.predicates.push((record: any) => matchesFilter(record, { [field]: { $lt: value } }))
    return this
  }

  lte(value: any) {
    const field = this.currentField
    this.predicates.push((record: any) => matchesFilter(record, { [field]: { $lte: value } }))
    return this
  }

  or(filters: any[] = []) {
    this.predicates.push((record: any) => filters.some((filter: any) => matchesFilter(record, filter)))
    return this
  }

  lean() {
    // No-op in memory — records are already plain objects.
    return this
  }

  select(_fields: any) {
    // Field projection not needed for in-memory records.
    return this
  }

  populate(relation: any) {
    this.relations.push(relation)
    return this
  }

  async countDocuments() {
    return (await this.resolve()).length
  }

  async exec() {
    const records = await this.resolve()
    return this.single ? (records[0] ?? null) : records
  }

  then(resolve: any, reject: any) {
    return this.exec().then(resolve, reject)
  }

  async resolve() {
    let records = await this.repository.find(this.params)

    records = records.filter((record: any) => this.predicates.every((predicate: any) => predicate(record)))

    if (this.sortClause) {
      records = sortRecords(records, this.sortClause)
    }

    if (this.skipCount) {
      records = records.slice(this.skipCount)
    }

    if (this.limitCount != null) {
      records = records.slice(0, this.limitCount)
    }

    if (this.relations.length > 0 && typeof this.repository.populateRecords === 'function') {
      records = await this.repository.populateRecords(records, this.relations)
    }

    return records
  }
}

function aggregateMessageCounts(repository: any, pipeline: any[] = []) {
  const matchStage = pipeline.find((stage) => stage?.$match)?.$match ?? {}
  const records = repository.items.filter((record: any) => matchesFilter(record, matchStage))
  const grouped = new Map()

  records.forEach((record: any) => {
    const licenseeId = comparableValue(record.licensee)
    const day = new Date(record.createdAt).toISOString().slice(0, 10)
    const key = `${licenseeId}:${day}`
    const current = grouped.get(key) ?? { _id: { licensee: record.licensee, day }, count: 0 }
    current.count += 1
    grouped.set(key, current)
  })

  const groupedByLicensee = new Map()

  Array.from(grouped.values())
    .sort((left, right) => {
      const leftLicensee = comparableValue(left._id.licensee)
      const rightLicensee = comparableValue(right._id.licensee)

      if (leftLicensee !== rightLicensee) {
        return leftLicensee > rightLicensee ? 1 : -1
      }

      return left._id.day > right._id.day ? 1 : -1
    })
    .forEach((entry: any) => {
      // Use the comparable (string) ID as both the map key and the _id value so that
      // callers can do `current._id.toString()` and get the licensee ID string back.
      const licenseeKey = comparableValue(entry._id.licensee)
      const current = groupedByLicensee.get(licenseeKey) ?? {
        _id: licenseeKey,
        days: [],
      }

      current.days.push({ date: entry._id.day, count: entry.count })
      groupedByLicensee.set(licenseeKey, current)
    })

  return Array.from(groupedByLicensee.values())
}

function createMemoryModelAdapter(repository: any, { aggregate }: { aggregate?: any } = {}) {
  return {
    create: async (fields = {}) => await repository.create(fields),
    find: (params = {}) => new MemoryQuery(repository, params),
    findOne: (params = {}) => new MemoryQuery(repository, params, { single: true }),
    findById: (id: any) => new MemoryQuery(repository, { _id: id?._id ?? id }, { single: true }),
    deleteMany: async (params = {}) => await repository.delete(params),
    where: (params = {}) => new MemoryQuery(repository).where(params),
    aggregate: async (pipeline: any[] = []) => (aggregate ? await aggregate(repository, pipeline) : []),
  }
}

function patchMember(target: any, key: any, replacement: any, restores: any) {
  const hasOwnProperty = Object.prototype.hasOwnProperty.call(target, key)
  const original = target[key]

  target[key] = replacement

  restores.push(() => {
    if (hasOwnProperty) {
      target[key] = original
      return
    }

    delete target[key]
  })
}

function installMemoryRepositories() {
  resetMemoryRepositories()

  const repositories = createMemoryRepositories()
  const restores: any[] = []
  const loadRelation = (repository: any) => async (value: any) => {
    const identifier = value?._id ?? value

    if (identifier == null) {
      return value
    }

    return await repository.findFirst({ _id: identifier }, [])
  }
  const originalMessageCreate = repositories.messageRepository.create.bind(repositories.messageRepository)
  const originalMessageFind = repositories.messageRepository.find.bind(repositories.messageRepository)
  const originalRoomFind = repositories.roomRepository.find.bind(repositories.roomRepository)

  repositories.messageRepository.create = async (fields = {}) => {
    return await originalMessageCreate({
      kind: MessageKind.Text,
      sended: false,
      ...(fields ?? {}),
    })
  }

  repositories.messageRepository.find = async (params = {}) => {
    return (await originalMessageFind(params)).map((message: any) =>
      serializeRelations(message, ['contact', 'licensee', 'room', 'trigger', 'department']),
    )
  }

  repositories.messageRepository.findFirst = async (params = {}, relations = []) => {
    const message = (await originalMessageFind(params))[0] ?? null

    if (!message) {
      return null
    }

    if (!relations || relations.length === 0) {
      return serializeRelations(message, ['contact', 'licensee', 'room', 'trigger', 'department'])
    }

    const [populatedMessage] = await repositories.messageRepository.populateRecords([message], relations)
    return populatedMessage
  }

  repositories.roomRepository.find = async (params = {}) => {
    return (await originalRoomFind(params)).map((room: any) => serializeRelations(room, ['contact']))
  }

  repositories.roomRepository.findFirst = async (params = {}, relations = ['contact']) => {
    const room = (await originalRoomFind(params))[0] ?? null

    if (!room) {
      return null
    }

    if (!relations || relations.length === 0) {
      return serializeRelations(room, ['contact'])
    }

    const [populatedRoom] = await repositories.roomRepository.populateRecords([room], relations)
    return populatedRoom
  }

  repositories.bodyRepository.relationLoaders = {
    licensee: loadRelation(repositories.licenseeRepository),
    inbox: loadRelation(repositories.inboxRepository),
  }
  repositories.contactRepository.relationLoaders = {
    licensee: loadRelation(repositories.licenseeRepository),
  }
  repositories.messageRepository.relationLoaders = {
    contact: loadRelation(repositories.contactRepository),
    licensee: loadRelation(repositories.licenseeRepository),
    room: loadRelation(repositories.roomRepository),
    trigger: loadRelation(repositories.triggerRepository),
    department: loadRelation(repositories.departmentRepository),
  }
  repositories.roomRepository.relationLoaders = {
    contact: loadRelation(repositories.contactRepository),
  }
  repositories.templateRepository.relationLoaders = {
    licensee: loadRelation(repositories.licenseeRepository),
  }
  repositories.triggerRepository.relationLoaders = {
    licensee: loadRelation(repositories.licenseeRepository),
  }
  repositories.userRepository.relationLoaders = {
    licensee: loadRelation(repositories.licenseeRepository),
  }
  repositories.whatsappSessionRepository.relationLoaders = {
    licensee: loadRelation(repositories.licenseeRepository),
  }
  repositories.departmentRepository.relationLoaders = {
    licensee: loadRelation(repositories.licenseeRepository),
  }
  repositories.inboxRepository.relationLoaders = {
    licensee: loadRelation(repositories.licenseeRepository),
  }

  // Patch MemoryQuery adapters onto the memory repositories so that use-cases
  // and queries that call Model.find(...).sort(...).lean() style chains still work.
  patchMember(
    repositories.bodyRepository,
    'model',
    () => createMemoryModelAdapter(repositories.bodyRepository),
    restores,
  )
  patchMember(
    repositories.contactRepository,
    'model',
    () => createMemoryModelAdapter(repositories.contactRepository),
    restores,
  )
  patchMember(
    repositories.licenseeRepository,
    'model',
    () => createMemoryModelAdapter(repositories.licenseeRepository),
    restores,
  )
  patchMember(
    repositories.messageRepository,
    'model',
    () => createMemoryModelAdapter(repositories.messageRepository, { aggregate: aggregateMessageCounts }),
    restores,
  )
  patchMember(
    repositories.roomRepository,
    'model',
    () => createMemoryModelAdapter(repositories.roomRepository),
    restores,
  )
  patchMember(
    repositories.templateRepository,
    'model',
    () => createMemoryModelAdapter(repositories.templateRepository),
    restores,
  )
  patchMember(
    repositories.triggerRepository,
    'model',
    () => createMemoryModelAdapter(repositories.triggerRepository),
    restores,
  )
  patchMember(
    repositories.userRepository,
    'model',
    () => createMemoryModelAdapter(repositories.userRepository),
    restores,
  )
  patchMember(
    repositories.whatsappSessionRepository,
    'model',
    () => createMemoryModelAdapter(repositories.whatsappSessionRepository),
    restores,
  )
  patchMember(
    repositories.departmentRepository,
    'model',
    () => createMemoryModelAdapter(repositories.departmentRepository),
    restores,
  )
  patchMember(
    repositories.inboxRepository,
    'model',
    () => createMemoryModelAdapter(repositories.inboxRepository),
    restores,
  )

  patchMember(
    repositories.roomRepository,
    'findById',
    async (id: any) =>
      serializeRelations(await repositories.roomRepository.findFirst({ _id: id?._id ?? id }, []), ['contact']),
    restores,
  )
  patchMember(
    repositories.roomRepository,
    'findOne',
    async (params = {}) => serializeRelations(await repositories.roomRepository.findFirst(params, []), ['contact']),
    restores,
  )

  activeRestore = () => {
    while (restores.length > 0) {
      const restore = restores.pop()
      restore()
    }
  }

  activeRepositories = repositories
  setActiveRepositories(repositories)

  return { repositories, restore: activeRestore }
}

function resetMemoryRepositories() {
  if (activeRestore) {
    activeRestore()
    activeRestore = null
  }
  activeRepositories = null
  setActiveRepositories(null)
}

// Returns the active repos, or null if none are installed (non-throwing variant for internal use).
function tryGetActiveRepositories(): ReturnType<typeof createMemoryRepositories> | null {
  return activeRepositories
}

export {
  createMemoryRepositories,
  createMemoryModelAdapter,
  installMemoryRepositories,
  resetMemoryRepositories,
  getActiveRepositories,
  tryGetActiveRepositories,
}
