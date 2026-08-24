import { CreateMessage } from './CreateMessage'
import { MessageRepositoryMemory } from '@repositories/message'
import { ContactRepositoryMemory } from '@repositories/contact'
import { licensee as licenseeFactory } from '@factories/licensee'
import { contact as contactFactory } from '@factories/contact'

const LICENSEE_ID = '60000000000000000000000a'

function buildRepositoryAndUseCase(jobQueue) {
  const messageRepository = new MessageRepositoryMemory()
  const contactRepository = new ContactRepositoryMemory()
  const useCase = new CreateMessage({ messageRepository, contactRepository, jobQueue })
  return { messageRepository, contactRepository, useCase }
}

describe('CreateMessage', () => {
  describe('licensee validation', () => {
    it('throws when licensee is not provided', async () => {
      const jobQueue = { addJob: jest.fn() }
      const { useCase } = buildRepositoryAndUseCase(jobQueue)

      await expect(useCase.execute({ kind: 'text', destination: 'to-chat', text: 'Hello' })).rejects.toThrow(
        'licensee is required',
      )
    })
  })

  describe('field filtering', () => {
    it('creates a message with whitelisted fields and ignores unknown ones', async () => {
      const jobQueue = { addJob: jest.fn() }
      const { useCase } = buildRepositoryAndUseCase(jobQueue)

      const message = await useCase.execute({
        licensee: LICENSEE_ID,
        contact: contactFactory.build()._id,
        kind: 'text',
        destination: 'to-chat',
        text: 'Hello',
        ignoredField: 'should be dropped',
      })

      expect(message.text).toEqual('Hello')
      expect(message.kind).toEqual('text')
      expect(message.ignoredField).toBeUndefined()
    })
  })

  describe('phone lookup', () => {
    it('resolves contact from phone number when contact is not provided', async () => {
      const jobQueue = { addJob: jest.fn() }
      const { contactRepository, useCase } = buildRepositoryAndUseCase(jobQueue)

      const contact = await contactRepository.create(
        contactFactory.build({ number: '5511990283745', type: '@c.us', licensee: LICENSEE_ID }),
      )

      const message = await useCase.execute({
        licensee: LICENSEE_ID,
        phone: '5511990283745',
        kind: 'text',
        destination: 'to-chat',
        text: 'Hello',
      })

      expect(String(message.contact)).toEqual(String(contact._id))
    })

    it('does not store phone on the persisted message', async () => {
      const jobQueue = { addJob: jest.fn() }
      const { contactRepository, useCase } = buildRepositoryAndUseCase(jobQueue)

      await contactRepository.create(
        contactFactory.build({ number: '5511990283745', type: '@c.us', licensee: LICENSEE_ID }),
      )

      const message = await useCase.execute({
        licensee: LICENSEE_ID,
        phone: '5511990283745',
        kind: 'text',
        destination: 'to-chat',
        text: 'Hello',
      })

      expect(message.phone).toBeUndefined()
    })

    it('throws when phone is provided but no matching contact is found', async () => {
      const jobQueue = { addJob: jest.fn() }
      const { useCase } = buildRepositoryAndUseCase(jobQueue)

      await expect(
        useCase.execute({
          licensee: LICENSEE_ID,
          phone: '5511999999999',
          kind: 'text',
          destination: 'to-chat',
          text: 'Hello',
        }),
      ).rejects.toThrow('Contact not found for phone 5511999999999')
    })

    it('uses contact directly when contact id is provided alongside phone', async () => {
      const jobQueue = { addJob: jest.fn() }
      const { contactRepository, useCase } = buildRepositoryAndUseCase(jobQueue)

      const contactRepositorySpy = jest.spyOn(contactRepository, 'getContactByNumber')
      const contact = await contactRepository.create(contactFactory.build())

      const message = await useCase.execute({
        licensee: LICENSEE_ID,
        contact: contact._id,
        phone: '5511990283745',
        kind: 'text',
        destination: 'to-chat',
        text: 'Hello',
      })

      expect(String(message.contact)).toEqual(String(contact._id))
      expect(contactRepositorySpy).not.toHaveBeenCalled()
    })
  })

  describe('job queuing', () => {
    it('queues send-message-to-messenger when destination is to-messenger', async () => {
      const jobQueue = { addJob: jest.fn().mockResolvedValue({}) }
      const { useCase } = buildRepositoryAndUseCase(jobQueue)

      const message = await useCase.execute({
        licensee: LICENSEE_ID,
        contact: contactFactory.build()._id,
        kind: 'text',
        destination: 'to-messenger',
        text: 'Hello',
      })

      expect(jobQueue.addJob).toHaveBeenCalledWith('send-message-to-messenger', { messageId: message._id }, {})
    })

    it.each([['to-chat'], ['to-chatbot'], ['to-transfer']])(
      'does not queue a job when destination is %s',
      async (destination) => {
        const jobQueue = { addJob: jest.fn() }
        const { useCase } = buildRepositoryAndUseCase(jobQueue)

        await useCase.execute({
          licensee: LICENSEE_ID,
          contact: contactFactory.build()._id,
          kind: 'text',
          destination,
          text: 'Hello',
        })

        expect(jobQueue.addJob).not.toHaveBeenCalled()
      },
    )
  })

  describe('scheduledAt', () => {
    // --- schedule-message plan: Scenario 4 ---
    it.todo('queues send-message-to-messenger with delay when scheduledAt is valid and future')

    // --- schedule-message plan: Scenario 5 ---
    it.todo('throws validation error when scheduledAt is in the past')

    // --- schedule-message plan: additional ---
    it.todo('queues send-message-to-chat with delay when destination is to-chat and scheduledAt is future')
    it.todo('dispatches immediately (no delay) when scheduledAt is absent')
  })
})
