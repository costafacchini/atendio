import { licenseeComplete as licenseeCompleteFactory } from '@factories/licensee'
import { inbox as inboxFactory } from '@factories/inbox'
import { LicenseeRepositoryMemory } from '@repositories/licensee'
import { InboxRepositoryMemory } from '@repositories/inbox'
import { SetDialogWebhook, WEBHOOK_CONFIGURED_MESSAGE } from './SetDialogWebhook'

describe('SetDialogWebhook', () => {
  it('configures the webhook when the licensee has a dialog inbox', async () => {
    const licenseeRepository = new LicenseeRepositoryMemory()
    const inboxRepository = new InboxRepositoryMemory()
    const messengerPlugin = { setWebhook: jest.fn() }
    const createMessengerPlugin = jest.fn().mockReturnValue(messengerPlugin)
    const setDialogWebhook = new SetDialogWebhook({ licenseeRepository, inboxRepository, createMessengerPlugin })
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    const inbox = await inboxRepository.create(
      inboxFactory.build({
        licensee: licensee._id,
        kind: 'messenger',
        whatsappDefault: 'dialog',
        whatsappUrl: 'https://dialog.url',
        whatsappToken: 'dialog-token',
      }),
    )

    const response = await setDialogWebhook.execute(licensee._id)

    expect(createMessengerPlugin).toHaveBeenCalledWith(licensee, { inbox })
    expect(messengerPlugin.setWebhook).toHaveBeenCalledWith(inbox.whatsappUrl, inbox.whatsappToken)
    expect(response).toEqual({ message: WEBHOOK_CONFIGURED_MESSAGE })
  })

  it('returns success without calling the plugin when the licensee has no dialog inbox', async () => {
    const licenseeRepository = new LicenseeRepositoryMemory()
    const inboxRepository = new InboxRepositoryMemory()
    const messengerPlugin = { setWebhook: jest.fn() }
    const createMessengerPlugin = jest.fn().mockReturnValue(messengerPlugin)
    const setDialogWebhook = new SetDialogWebhook({ licenseeRepository, inboxRepository, createMessengerPlugin })
    const licensee = await licenseeRepository.create(licenseeCompleteFactory.build())
    await inboxRepository.create(
      inboxFactory.build({ licensee: licensee._id, kind: 'messenger', whatsappDefault: 'utalk' }),
    )

    const response = await setDialogWebhook.execute(licensee._id)

    expect(createMessengerPlugin).not.toHaveBeenCalled()
    expect(messengerPlugin.setWebhook).not.toHaveBeenCalled()
    expect(response).toEqual({ message: WEBHOOK_CONFIGURED_MESSAGE })
  })
})
