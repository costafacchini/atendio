import { GetBaileysStatus } from './GetBaileysStatus'
import { LicenseeRepositoryMemory } from '@repositories/licensee'
import { InboxRepositoryMemory } from '@repositories/inbox'
import { WhatsappSessionRepositoryMemory } from '@repositories/whatsappsession'
import { licenseeComplete as licenseeCompleteFactory } from '@factories/licensee'
import { inbox as inboxFactory } from '@factories/inbox'

function buildUseCase() {
  const licenseeRepository = new LicenseeRepositoryMemory()
  const inboxRepository = new InboxRepositoryMemory()
  const whatsappSessionRepository = new WhatsappSessionRepositoryMemory()
  const useCase = new GetBaileysStatus({ licenseeRepository, inboxRepository, whatsappSessionRepository })
  return { licenseeRepository, inboxRepository, whatsappSessionRepository, useCase }
}

describe('GetBaileysStatus', () => {
  it('returns { connected: false } when licensee is not found', async () => {
    const { useCase } = buildUseCase()

    const result = await useCase.execute('000000000000000000000000')

    expect(result).toEqual({ connected: false })
  })

  it('returns { connected: false } when licensee has no baileys inbox', async () => {
    const { licenseeRepository, inboxRepository, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(
      inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'dialog' }),
    )

    const result = await useCase.execute(licensee._id)

    expect(result).toEqual({ connected: false })
  })

  it('returns { connected: false } when no session exists for the licensee', async () => {
    const { licenseeRepository, inboxRepository, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(
      inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'baileys' }),
    )

    const result = await useCase.execute(licensee._id)

    expect(result).toEqual({ connected: false })
  })

  it('returns { connected: false } when session exists but creds are empty', async () => {
    const { licenseeRepository, inboxRepository, whatsappSessionRepository, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(
      inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'baileys' }),
    )
    await whatsappSessionRepository.create({ licensee: licensee._id, creds: {}, keys: {} })

    const result = await useCase.execute(licensee._id)

    expect(result).toEqual({ connected: false })
  })

  it('returns { connected: true } when session has non-empty creds', async () => {
    const { licenseeRepository, inboxRepository, whatsappSessionRepository, useCase } = buildUseCase()
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(
      inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'baileys' }),
    )
    await whatsappSessionRepository.create({
      licensee: licensee._id,
      creds: { registered: true, me: { id: '5511999999999' } },
    })

    const result = await useCase.execute(licensee._id)

    expect(result).toEqual({ connected: true })
  })
})
