import { LicenseeRepositoryMemory } from '@repositories/licensee'
import { UserRepositoryMemory } from '@repositories/user'
import { InboxRepositoryMemory } from '@repositories/inbox'
import { OnboardAccount } from './OnboardAccount'

const validInput = {
  licenseeName: 'Acme Corp',
  licenseeEmail: 'acme@acme.com',
  phone: '11999990000',
  document: '12345678000195',
  kind: 'company',
  userName: 'John Doe',
  userEmail: 'john@acme.com',
  password: 'senha123',
}

describe('OnboardAccount', () => {
  let licenseeRepository: LicenseeRepositoryMemory
  let userRepository: UserRepositoryMemory
  let inboxRepository: InboxRepositoryMemory
  let onboardAccount: OnboardAccount

  beforeEach(() => {
    licenseeRepository = new LicenseeRepositoryMemory()
    userRepository = new UserRepositoryMemory()
    inboxRepository = new InboxRepositoryMemory()
    onboardAccount = new OnboardAccount({ licenseeRepository, userRepository, inboxRepository })
  })

  it('creates a licensee and a user, returning both', async () => {
    const result = await onboardAccount.execute(validInput)

    expect(result.licensee).toBeDefined()
    expect(result.licensee.name).toEqual('Acme Corp')
    expect(result.user).toBeDefined()
    expect(result.user.name).toEqual('John Doe')
  })

  it('forces licenseKind to "demo" regardless of input', async () => {
    const result = await onboardAccount.execute({ ...validInput, licenseKind: 'paid' })

    expect(result.licensee.licenseKind).toEqual('demo')
  })

  it('forces user role to "admin"', async () => {
    const result = await onboardAccount.execute({ ...validInput, role: 'super' })

    expect(result.user.role).toEqual('admin')
  })

  it('links the user to the created licensee', async () => {
    const result = await onboardAccount.execute(validInput)

    expect(result.user.licensee.toString()).toEqual(result.licensee._id.toString())
  })

  it('maps licenseeName and licenseeEmail to licensee name and email', async () => {
    const result = await onboardAccount.execute(validInput)

    expect(result.licensee.name).toEqual('Acme Corp')
    expect(result.licensee.email).toEqual('acme@acme.com')
  })

  it('maps userName and userEmail to user name and email', async () => {
    const result = await onboardAccount.execute(validInput)

    expect(result.user.name).toEqual('John Doe')
    expect(result.user.email).toEqual('john@acme.com')
  })

  it('creates a chat inbox when chatDefault is provided', async () => {
    await onboardAccount.execute({
      ...validInput,
      chatDefault: 'rocketchat',
      chatUrl: 'https://chat.example.com',
    })

    const inboxes = await inboxRepository.find({ kind: 'chat' })
    expect(inboxes).toHaveLength(1)
    expect(inboxes[0].name).toEqual('Chat')
    expect(inboxes[0].chatDefault).toEqual('rocketchat')
    expect(inboxes[0].chatUrl).toEqual('https://chat.example.com')
  })

  it('creates a messenger inbox when whatsappDefault is provided', async () => {
    await onboardAccount.execute({
      ...validInput,
      whatsappDefault: 'baileys',
      whatsappToken: 'tk-123',
    })

    const inboxes = await inboxRepository.find({ kind: 'messenger' })
    expect(inboxes).toHaveLength(1)
    expect(inboxes[0].name).toEqual('WhatsApp')
    expect(inboxes[0].whatsappDefault).toEqual('baileys')
    expect(inboxes[0].whatsappToken).toEqual('tk-123')
  })

  it('creates two inboxes when both chat and WhatsApp are provided', async () => {
    await onboardAccount.execute({
      ...validInput,
      chatDefault: 'rocketchat',
      whatsappDefault: 'baileys',
    })

    const allInboxes = await inboxRepository.find()
    expect(allInboxes).toHaveLength(2)
    expect(allInboxes.map((i: any) => i.kind).sort()).toEqual(['chat', 'messenger'])
  })

  it('does not create any inbox when no plugin is provided', async () => {
    await onboardAccount.execute(validInput)

    const allInboxes = await inboxRepository.find()
    expect(allInboxes).toHaveLength(0)
  })

  it('links the inbox to the created licensee', async () => {
    const result = await onboardAccount.execute({ ...validInput, chatDefault: 'rocketchat' })

    const inboxes = await inboxRepository.find()
    expect(inboxes[0].licensee.toString()).toEqual(result.licensee._id.toString())
  })

  it('does not save plugin fields to the licensee record', async () => {
    const result = await onboardAccount.execute({
      ...validInput,
      chatDefault: 'rocketchat',
      whatsappDefault: 'baileys',
    })

    expect((result.licensee as any).chatDefault).toBeUndefined()
    expect((result.licensee as any).whatsappDefault).toBeUndefined()
  })

  it('forwards useDepartments to the licensee when provided', async () => {
    const result = await onboardAccount.execute({ ...validInput, useDepartments: true })

    expect(result.licensee.useDepartments).toEqual(true)
  })

  it('licensee defaults useDepartments to false when not provided', async () => {
    const result = await onboardAccount.execute(validInput)

    expect(result.licensee.useDepartments).toBeFalsy()
  })

  it('creates user with language: en when provided', async () => {
    const result = await onboardAccount.execute({ ...validInput, language: 'en' })

    expect(result.user.language).toEqual('en')
  })

  it('creates user with language: pt when language is omitted', async () => {
    const result = await onboardAccount.execute(validInput)

    expect(result.user.language).toEqual('pt')
  })

  it('generates a unique apiToken for the licensee', async () => {
    const result1 = await onboardAccount.execute(validInput)
    licenseeRepository = new LicenseeRepositoryMemory()
    userRepository = new UserRepositoryMemory()
    inboxRepository = new InboxRepositoryMemory()
    onboardAccount = new OnboardAccount({ licenseeRepository, userRepository, inboxRepository })
    const result2 = await onboardAccount.execute({
      ...validInput,
      licenseeEmail: 'other@acme.com',
      userEmail: 'other@doe.com',
    })

    expect(result1.licensee.apiToken).toBeTruthy()
    expect(result2.licensee.apiToken).toBeTruthy()
    expect(result1.licensee.apiToken).not.toEqual(result2.licensee.apiToken)
  })

  it('deletes the orphaned licensee and re-throws when user creation fails', async () => {
    jest.spyOn(userRepository, 'create').mockRejectedValueOnce(new Error('user creation failed'))
    const deleteSpy = jest.spyOn(licenseeRepository, 'delete')

    await expect(onboardAccount.execute(validInput)).rejects.toThrow('user creation failed')

    expect(deleteSpy).toHaveBeenCalledTimes(1)
    const allLicensees = await licenseeRepository.find()
    expect(allLicensees).toHaveLength(0)
  })
})
