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
  switch (plugin) {
    case 'utalk':
      return new Utalk(licensee, dependencies)
    case 'dialog':
      return new Dialog(licensee, dependencies)
    case 'ycloud':
      return new YCloud(licensee, dependencies)
    case 'pabbly':
      return new Pabbly(licensee, dependencies)
    case 'baileys':
      return new Baileys(licensee, { ...dependencies, inbox })
    default:
      throw `Plugin de messenger não configurado: ${plugin}`
  }
}

export { createMessengerPlugin }
