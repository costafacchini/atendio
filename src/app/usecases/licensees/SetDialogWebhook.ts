import { IRepository } from '@repositories/repository'
import { ILicensee, IInbox } from '../../../types'

const WEBHOOK_CONFIGURED_MESSAGE = 'Webhook configurado!'

interface SetDialogWebhookDeps {
  licenseeRepository: IRepository<ILicensee>
  inboxRepository: IRepository<IInbox>
  createMessengerPlugin: (licensee: ILicensee, extras: Record<string, any>) => any
}

class SetDialogWebhook {
  licenseeRepository: IRepository<ILicensee>
  inboxRepository: IRepository<IInbox>
  createMessengerPlugin: SetDialogWebhookDeps['createMessengerPlugin']

  constructor({ licenseeRepository, inboxRepository, createMessengerPlugin }: SetDialogWebhookDeps) {
    this.licenseeRepository = licenseeRepository
    this.inboxRepository = inboxRepository
    this.createMessengerPlugin = createMessengerPlugin
  }

  async execute(id: string): Promise<{ message: string }> {
    const licensee = await this.licenseeRepository.findFirst({ _id: id })
    if (!licensee) return { message: WEBHOOK_CONFIGURED_MESSAGE }

    const inbox = await this.inboxRepository.findFirst({ licensee: id, kind: 'messenger', whatsappDefault: 'dialog' })
    if (inbox) {
      const messengerPlugin = this.createMessengerPlugin(licensee, { inbox })
      await messengerPlugin.setWebhook(inbox.whatsappUrl, inbox.whatsappToken)
    }

    return { message: WEBHOOK_CONFIGURED_MESSAGE }
  }
}

export { SetDialogWebhook, WEBHOOK_CONFIGURED_MESSAGE }
