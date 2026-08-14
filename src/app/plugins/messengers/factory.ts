import { Utalk } from './Utalk'
import { Dialog } from './Dialog'
import { YCloud } from './YCloud'
import { Pabbly } from './Pabbly'
import { Baileys } from './Baileys'
import { IMessengerPlugin } from './Base'
import { ILicensee, IInbox } from '../../../types'

function createMessengerPlugin(
  licensee: ILicensee,
  dependencies: Record<string, unknown> = {},
  inbox: IInbox | null = null,
): IMessengerPlugin {
  const plugin = inbox?.whatsappDefault
  const deps = { ...dependencies, inbox }
  switch (plugin) {
    case 'utalk':
      return new Utalk(licensee, deps)
    case 'dialog':
      return new Dialog(licensee, deps)
    case 'ycloud':
      return new YCloud(licensee, deps)
    case 'pabbly':
      return new Pabbly(licensee, deps)
    case 'baileys':
      return new Baileys(licensee, deps)
    default:
      throw `Plugin de messenger não configurado: ${plugin}`
  }
}

export { createMessengerPlugin }
